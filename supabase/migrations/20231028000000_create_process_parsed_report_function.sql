-- Function to process and store a parsed email report atomically
CREATE OR REPLACE FUNCTION public.process_parsed_email_report(p_report_data JSONB)
RETURNS UUID -- Returns the ID of the newly created daily_report
LANGUAGE plpgsql
SECURITY INVOKER -- Default, but explicit for clarity
AS $$
DECLARE
    v_daily_report_id UUID;
    v_child_id UUID;
BEGIN
    -- Extract child_id from the top level of the JSONB payload
    v_child_id := (p_report_data->>'child_id')::UUID;

    -- 1. Insert into daily_reports
    INSERT INTO public.daily_reports (
        child_id,
        report_date,
        teacher_notes,
        raw_email_id,
        parent_notes
    )
    VALUES (
        v_child_id,
        (p_report_data->>'report_date')::DATE,
        p_report_data->>'teacher_notes',
        p_report_data->>'raw_email_id',
        p_report_data->>'parent_notes' -- Optional, defaults to NULL if not present
    )
    RETURNING id INTO v_daily_report_id;

    -- 2. Insert into naps
    IF p_report_data->'naps_data' IS NOT NULL AND jsonb_array_length(p_report_data->'naps_data') > 0 THEN
        INSERT INTO public.naps (
            report_id, -- Assuming this is FK to the original daily_reports.id for naps
            child_id,
            start_time,
            end_time,
            duration_text
            -- notes -- Add if your naps table has a notes field
        )
        SELECT
            v_daily_report_id,
            v_child_id, -- Use child_id from the top-level p_report_data
            (nap->>'start_time')::TIME,
            (nap->>'end_time')::TIME,
            nap->>'duration_text'
            -- nap->>'notes'
        FROM jsonb_to_recordset(p_report_data->'naps_data') AS nap(
            start_time TEXT,
            end_time TEXT,
            duration_text TEXT
            -- notes TEXT
        );
    END IF;

    -- 3. Insert into meals
    IF p_report_data->'meals_data' IS NOT NULL AND jsonb_array_length(p_report_data->'meals_data') > 0 THEN
        INSERT INTO public.meals (
            daily_report_id,
            child_id,
            meal_time,
            description,
            amount
        )
        SELECT
            v_daily_report_id,
            v_child_id,
            (meal->>'meal_time')::TIMESTAMPTZ,
            meal->>'description',
            meal->>'amount' -- This might be NULL if not provided by parser
        FROM jsonb_to_recordset(p_report_data->'meals_data') AS meal(
            meal_time TEXT, -- Assuming input as text, convert to TIMESTAMPTZ
            description TEXT,
            amount TEXT -- Assuming input as text, actual type might vary
        );
    END IF;

    -- 4. Insert into bathroom_events
    IF p_report_data->'bathroom_events_data' IS NOT NULL AND jsonb_array_length(p_report_data->'bathroom_events_data') > 0 THEN
        INSERT INTO public.bathroom_events (
            report_id, -- Assuming FK to original daily_reports.id
            child_id,
            event_time,
            event_type,
            status,
            initials
            -- notes -- Add if your bathroom_events table has a notes field
        )
        SELECT
            v_daily_report_id,
            v_child_id,
            (event->>'event_time')::TIMESTAMPTZ,
            event->>'event_type',
            event->>'status',
            ARRAY(SELECT jsonb_array_elements_text(event->'initials')) -- Convert JSON array to text array
            -- event->>'notes'
        FROM jsonb_to_recordset(p_report_data->'bathroom_events_data') AS event(
            event_time TEXT,
            event_type TEXT,
            status TEXT,
            initials JSONB -- Assuming initials come as a JSON array e.g. ["MD", "AB"]
            -- notes TEXT
        );
    END IF;

    -- 5. Insert into activities
    IF p_report_data->'activities_data' IS NOT NULL AND jsonb_array_length(p_report_data->'activities_data') > 0 THEN
        INSERT INTO public.activities (
            daily_report_id,
            child_id,
            activity_time,
            description,
            categories,
            goals
            -- weekly_theme, -- Add if these columns exist
            -- teacher_comment -- Add if these columns exist
        )
        SELECT
            v_daily_report_id,
            v_child_id,
            (act->>'activity_time')::TIMESTAMPTZ, -- Will be NULL if not provided
            act->>'description',
            (SELECT jsonb_agg(c) FROM jsonb_array_elements_text(act->'categories') c), -- Convert JSON array of strings to text[] or jsonb
            (SELECT jsonb_agg(g) FROM jsonb_array_elements_text(act->'goals') g)
            -- act->>'weekly_theme',
            -- act->>'teacher_comment'
        FROM jsonb_to_recordset(p_report_data->'activities_data') AS act(
            activity_time TEXT,
            description TEXT,
            categories JSONB, -- Expecting JSON array of strings
            goals JSONB       -- Expecting JSON array of strings
            -- weekly_theme TEXT,
            -- teacher_comment TEXT
        );
    END IF;

    -- 6. Insert into photos
    IF p_report_data->'photos_data' IS NOT NULL AND jsonb_array_length(p_report_data->'photos_data') > 0 THEN
        INSERT INTO public.photos (
            daily_report_id,
            child_id,
            image_url,
            thumbnail_url,
            source_domain,
            description
        )
        SELECT
            v_daily_report_id,
            v_child_id,
            photo->>'image_url',
            photo->>'thumbnail_url', -- Will be NULL if not provided
            photo->>'source_domain',
            photo->>'description'
        FROM jsonb_to_recordset(p_report_data->'photos_data') AS photo(
            image_url TEXT,
            thumbnail_url TEXT,
            source_domain TEXT,
            description TEXT
        );
    END IF;

    RETURN v_daily_report_id;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error (PostgreSQL logs errors by default, but you can add more specific logging if needed)
        RAISE WARNING 'Error in process_parsed_email_report: %', SQLERRM;
        -- Re-raise the exception to ensure transaction rollback
        RAISE;
END;
$$;

-- Example of how to call the function (for testing in Supabase SQL editor):
/*
SELECT process_parsed_email_report('{
    "child_id": "your_child_uuid_here",
    "report_date": "2023-10-28",
    "teacher_notes": "Had a great day!",
    "raw_email_id": "test_email_id_123",
    "parent_notes": "Thanks for the update.",
    "naps_data": [
        {"start_time": "12:30:00", "end_time": "14:00:00", "duration_text": "1.5 hours"}
    ],
    "meals_data": [
        {"meal_time": "2023-10-28 08:30:00", "description": "Breakfast - Cereal", "amount": "all"}
    ],
    "bathroom_events_data": [
        {"event_time": "2023-10-28 09:00:00", "event_type": "diaper", "status": "Wet", "initials": ["AB"]}
    ],
    "activities_data": [
        {"activity_time": null, "description": "Played with blocks", "categories": ["Cognitive"], "goals": ["Fine motor skills"]}
    ],
    "photos_data": [
        {"image_url": "http://example.com/photo1.jpg", "thumbnail_url": null, "source_domain": "example.com", "description": "Fun times"}
    ]
}');
*/
