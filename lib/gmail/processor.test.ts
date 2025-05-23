import { SupabaseClient } from '@supabase/supabase-js';
import { gmail_v1 } from 'googleapis';
import pino from 'pino';
import { processGmailMessage, ProcessMessageStatus, UserDaycareProviderConfig } from './processor';
import *   as ParserModule from './parser'; // To mock individual parsers
// import mainLogger from '@/lib/logger'; // REMOVED as per current task instruction

// Mock the Supabase client
const mockSupabaseRpc = jest.fn();

// --- New Granular Mocks for Supabase Client Query Builder ---

// For 'children' table queries:
const mockChildMaybeSingleExact = jest.fn().mockName('mockChildMaybeSingleExact'); // Final .maybeSingle() for exact child match
const mockChildIlikePartial = jest.fn().mockName('mockChildIlikePartial');       // Final .ilike() for partial child match (returns Promise)

// Represents the object returned by .eq('first_name', ...) which then allows .maybeSingle()
const mockEqFirstNameReturnsMaybeSingle = jest.fn()
    .mockName('mockEqFirstNameReturnsMaybeSingle');

// Represents the object returned by .eq('user_id', ...) which then allows .eq('first_name', ...) or .ilike('first_name', ...)
const mockEqUserIdReturnsEqAndIlike = jest.fn()
    .mockName('mockEqUserIdReturnsEqAndIlike');

// Represents the object returned by .select(...) for 'children' table, which then allows .eq('user_id', ...)
const mockChildrenSelectReturnsEq = jest.fn()
    .mockName('mockChildrenSelectReturnsEq');

// For 'daily_reports' table queries:
const mockReportMaybeSingle = jest.fn().mockName('mockReportMaybeSingle'); // Final .maybeSingle() for report lookup

// Represents the object returned by .eq(...) for 'daily_reports', which then allows .maybeSingle()
const mockReportEqReturnsMaybeSingle = jest.fn()
    .mockName('mockReportEqReturnsMaybeSingle');

// Represents the object returned by .select(...) for 'daily_reports', which then allows .eq(...)
const mockReportSelectReturnsEq = jest.fn()
    .mockName('mockReportSelectReturnsEq');

// The main supabase.from(...) mock
const mockFrom = jest.fn().mockName('mockFrom');

const supabase = {
    rpc: mockSupabaseRpc,
    from: mockFrom, // Use the new top-level mockFrom
} as unknown as SupabaseClient;

// Mock the Gmail API client
const mockGmailMessagesGet = jest.fn();
const gmail = {
    users: {
        messages: {
            get: mockGmailMessagesGet,
        },
    },
} as unknown as gmail_v1.Gmail;

// Mock the logger
const mockLoggerInstance = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(), // Initialize child here, will be configured in beforeEach
};
jest.mock('@/lib/logger', () => ({
    __esModule: true,
    default: mockLoggerInstance,
}));


// Mock parsers
const mockParseTadpolesReport = jest.spyOn(ParserModule, 'parseTadpolesReport');
// Mock other parsers if they exist and are used by getParserForProvider
// For now, we'll focus on a scenario where parseTadpolesReport is chosen.

const sampleParsedReport: ParserModule.ParsedReport = {
    childName: 'Test Child',
    reportDate: '2023-10-30',
    teacherNotes: 'Had a great day!',
    naps: [{ startTime: '12:00', endTime: '14:00', durationText: '2 hours' }],
    meals: [{ time: '10:00', food: 'Snack', details: 'Ate well', initials: ['TC'] }],
    bathroomEvents: [{ time: '11:00', type: 'diaper', status: 'Wet', initials: ['TC'] }],
    activities: [{ description: 'Played outside' }],
    photos: [{ src: 'http://example.com/photo.jpg', description: 'Fun time' }],
};

const sampleUserProviderConfigs: UserDaycareProviderConfig[] = [
    { report_sender_email: 'sender@tadpoles.com', parser_strategy: 'tadpoles_v1', provider_name: 'Tadpoles School' },
];

const sampleChildId = 'child-uuid-123';

describe('processGmailMessage - RPC Handling', () => {
    beforeEach(() => {
        // Clear mock call history and implementations before each test
        mockSupabaseRpc.mockReset();
        mockGmailMessagesGet.mockReset();
        
        // Reset new granular mocks
        mockFrom.mockReset(); // Use mockReset to also clear mockImplementation if set directly
        
        mockChildrenSelectReturnsEq.mockReset();
        mockEqUserIdReturnsEqAndIlike.mockReset();
        mockEqFirstNameReturnsMaybeSingle.mockReset();
        mockChildMaybeSingleExact.mockReset();
        mockChildIlikePartial.mockReset();
        
        mockReportSelectReturnsEq.mockReset();
        mockReportEqReturnsMaybeSingle.mockReset();
        mockReportMaybeSingle.mockReset();

        // Reset logger mocks
        mockLoggerInstance.info.mockClear();
        mockLoggerInstance.warn.mockClear();
        mockLoggerInstance.error.mockClear();
        mockLoggerInstance.debug.mockClear();
        mockLoggerInstance.child.mockClear(); // Clear any previous settings or calls

        // Crucially, ensure 'child' is set to return 'this' (the mock instance) for each test
        mockLoggerInstance.child.mockReturnThis(); 
        
        mockParseTadpolesReport.mockReset();

        // Default mock implementations
        mockGmailMessagesGet.mockResolvedValueOnce({ // For headers
            data: {
                payload: {
                    headers: [{ name: 'From', value: 'Test Sender <sender@tadpoles.com>' }],
                },
            },
        }).mockResolvedValueOnce({ // For full message content
            data: {
                payload: {
                    mimeType: 'text/html',
                    body: { data: Buffer.from('<html><body>Mock HTML</body></html>').toString('base64url') },
                },
            },
        });
        
        // Default: no existing report
        mockReportMaybeSingle.mockResolvedValue({ data: null, error: null }); 
        
        mockParseTadpolesReport.mockReturnValue(sampleParsedReport); // Default: parser returns sample data
        
        // Default behavior for mocks. Tests can override these using mockResolvedValueOnce if needed.
        mockChildMaybeSingleExact.mockResolvedValue({ data: { id: sampleChildId }, error: null }); // Default: Exact child found
        mockChildIlikePartial.mockResolvedValue({ data: [{ id: sampleChildId }], error: null });   // Default: Partial child found (if exact fails)
        mockReportMaybeSingle.mockResolvedValue({ data: null, error: null });                     // Default: No existing report

        // --- Configure mockFrom Implementation ---
        mockFrom.mockImplementation((tableName: string) => {
            if (tableName === 'children') {
                // .select(...) returns an object with .eq()
                mockChildrenSelectReturnsEq.mockImplementation((selectArgs) => {
                    if (selectArgs !== 'id, user_id, first_name') { // Basic check
                        console.warn(`mockChildrenSelectReturnsEq: Unexpected select args: ${selectArgs}`);
                    }
                    return { eq: mockEqUserIdReturnsEqAndIlike };
                });

                // .eq('user_id', ...) returns an object with .eq() and .ilike()
                mockEqUserIdReturnsEqAndIlike.mockImplementation((column, value) => {
                    if (column === 'user_id') {
                        return { 
                            eq: mockEqFirstNameReturnsMaybeSingle, // For .eq('first_name', ...)
                            ilike: mockChildIlikePartial          // For .ilike('first_name', ...)
                        };
                    }
                    // Fallback for unexpected column in the first .eq() call
                    return { 
                        eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: new Error(`mockEqUserIdReturnsEqAndIlike: Unexpected column '${column}'`) }) }),
                        ilike: jest.fn().mockResolvedValue({ data: [], error: new Error(`mockEqUserIdReturnsEqAndIlike: Unexpected column '${column}' for ilike`) })
                    };
                });

                // .eq('first_name', ...) returns an object with .maybeSingle()
                mockEqFirstNameReturnsMaybeSingle.mockImplementation((column, value) => {
                    if (column === 'first_name') {
                        return { maybeSingle: mockChildMaybeSingleExact };
                    }
                    // Fallback for unexpected column in the second .eq() call
                    return { 
                        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: new Error(`mockEqFirstNameReturnsMaybeSingle: Unexpected column '${column}'`) })
                    };
                });
                
                return { select: mockChildrenSelectReturnsEq };
            }
            
            if (tableName === 'daily_reports') {
                mockReportSelectReturnsEq.mockImplementation((selectArgs) => {
                     return { eq: mockReportEqReturnsMaybeSingle };
                });
                mockReportEqReturnsMaybeSingle.mockImplementation((column, value) => {
                    // Can add column check if specific (e.g. raw_email_id, child_id, report_date)
                    return { maybeSingle: mockReportMaybeSingle };
                });
                return { select: mockReportSelectReturnsEq };
            }

            // Fallback for any other table name
            console.error(`mockFrom: UNEXPECTED TABLE NAME: ${tableName}`);
            const fallbackMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: new Error(`mockFrom: Default fallback for unknown table '${tableName}'`) });
            const fallbackEq = jest.fn().mockReturnValue({ maybeSingle: fallbackMaybeSingle });
            const fallbackSelect = jest.fn().mockReturnValue({ eq: fallbackEq });
            return { select: fallbackSelect };
        });
    });

    test('should call supabase.rpc with correctly structured payload on successful parsing', async () => {
        const rpcResponseData = { id: 'new-report-uuid' }; 
        mockSupabaseRpc.mockResolvedValue({ data: rpcResponseData, error: null });

        const result = await processGmailMessage(
            gmail,
            supabase,
            'test-message-id',
            'test-user-id',
            sampleUserProviderConfigs
        );

        expect(result.status).toBe(ProcessMessageStatus.Success);
        expect(mockSupabaseRpc).toHaveBeenCalledTimes(1);
        expect(mockSupabaseRpc).toHaveBeenCalledWith(
            'process_parsed_email_report',
            {
                p_report_data: expect.objectContaining({
                    child_id: sampleChildId,
                    report_date: '2023-10-30', // from sampleParsedReport, after new Date() and toISOString().split('T')[0]
                    teacher_notes: 'Had a great day!',
                    raw_email_id: 'test-message-id',
                    parent_notes: null,
                    naps_data: expect.arrayContaining([
                        expect.objectContaining({ start_time: '12:00:00', end_time: '14:00:00', duration_text: '2 hours' })
                    ]),
                    meals_data: expect.arrayContaining([
                        expect.objectContaining({ 
                            meal_time: '2023-10-30 10:00:00', // Date + formatted time
                            description: 'Snack (Ate well) [TC]',
                            amount: null 
                        })
                    ]),
                    bathroom_events_data: expect.arrayContaining([
                        expect.objectContaining({ 
                            event_time: '2023-10-30 11:00:00', // Date + formatted time
                            event_type: 'diaper', 
                            status: 'Wet',
                            initials: ['TC']
                        })
                    ]),
                    activities_data: expect.arrayContaining([
                        expect.objectContaining({ description: 'Played outside', activity_time: null })
                    ]),
                    photos_data: expect.arrayContaining([
                        expect.objectContaining({ image_url: 'http://example.com/photo.jpg', description: 'Fun time', source_domain: 'example.com' })
                    ])
                })
            }
        );
        expect(mockLoggerInstance.info).toHaveBeenCalledWith(expect.objectContaining({ newReportId: rpcResponseData }), "Successfully processed report via RPC.");
    });

    test('should return ProcessMessageStatus.Error if supabase.rpc returns an error', async () => {
        const dbError = { message: 'Database RPC error', code: 'DB001', details: 'Some details', hint: 'Some hint' };
        mockSupabaseRpc.mockResolvedValue({ data: null, error: dbError });

        const result = await processGmailMessage(
            gmail,
            supabase,
            'test-message-id-rpc-error',
            'test-user-id',
            sampleUserProviderConfigs
        );

        expect(result.status).toBe(ProcessMessageStatus.Error);
        expect(result.error).toBe(`RPC Error: ${dbError.message}`);
        expect(mockSupabaseRpc).toHaveBeenCalledTimes(1);
        expect(mockLoggerInstance.error).toHaveBeenCalledWith(
            expect.objectContaining({ err: dbError, details: dbError.details, hint: dbError.hint }),
            "Error calling process_parsed_email_report RPC"
        );
    });
    
    test('should correctly format meal_time and event_time with reportDate', async () => {
        mockSupabaseRpc.mockResolvedValue({ data: { id: 'report-id-timeformat' }, error: null }); // Success
        const specificReportData: ParserModule.ParsedReport = {
            ...sampleParsedReport,
            reportDate: '2024-01-15', // Specific date for this test
            meals: [{ time: '08:30', food: 'Breakfast', details: 'Cereal', initials: ['M'] }],
            bathroomEvents: [{ time: '09:15', type: 'diaper', status: 'Dry', initials: ['M'] }],
        };
        mockParseTadpolesReport.mockReturnValue(specificReportData);

        await processGmailMessage(
            gmail,
            supabase,
            'test-message-id-timeformat',
            'test-user-id',
            sampleUserProviderConfigs
        );

        expect(mockSupabaseRpc).toHaveBeenCalledWith(
            'process_parsed_email_report',
            {
                p_report_data: expect.objectContaining({
                    report_date: '2024-01-15',
                    meals_data: expect.arrayContaining([
                        expect.objectContaining({ meal_time: '2024-01-15 08:30:00' })
                    ]),
                    bathroom_events_data: expect.arrayContaining([
                        expect.objectContaining({ event_time: '2024-01-15 09:15:00' })
                    ]),
                })
            }
        );
    });
    
    // Test for child lookup failure (SkippedChildNotFound)
    test('should return SkippedChildNotFound if child lookup fails', async () => {
        // Override the default mock behavior for this specific test case
        
        // Pass 1: Exact match fails
        mockChildMaybeSingleExact.mockResolvedValueOnce({ data: null, error: null });
        
        // Pass 2: Partial match also fails (ilike returns a promise with an array of results)
        mockChildIlikePartial.mockResolvedValueOnce({ data: [], error: null });

        const result = await processGmailMessage(
            gmail,
            supabase,
            'test-message-id-no-child',
            'test-user-id',
            sampleUserProviderConfigs
        );

        expect(result.status).toBe(ProcessMessageStatus.SkippedChildNotFound);
        expect(result.error).toContain(`No child found matching name '${sampleParsedReport.childName}' for user 'test-user-id' after exact and partial checks.`);
        expect(mockSupabaseRpc).not.toHaveBeenCalled();
        
        // Verify the calls to child lookup mocks
        expect(mockFrom).toHaveBeenCalledWith('children'); 
        // from('children') is called for both exact and partial attempts due to how the code is structured
        expect(mockFrom).toHaveBeenCalledTimes(2); 
        
        expect(mockChildrenSelectReturnsEq).toHaveBeenCalledWith('id, user_id, first_name'); 
        expect(mockChildrenSelectReturnsEq).toHaveBeenCalledTimes(2); 
        
        expect(mockEqUserIdReturnsEqAndIlike).toHaveBeenCalledWith('user_id', 'test-user-id');
        expect(mockEqUserIdReturnsEqAndIlike).toHaveBeenCalledTimes(2); 
        
        // Exact match attempt: .from('children').select(...).eq('user_id',...).eq('first_name',...).maybeSingle()
        expect(mockEqFirstNameReturnsMaybeSingle).toHaveBeenCalledWith('first_name', sampleParsedReport.childName);
        expect(mockEqFirstNameReturnsMaybeSingle).toHaveBeenCalledTimes(1); 
        expect(mockChildMaybeSingleExact).toHaveBeenCalledTimes(1);
        
        // Partial match attempt: .from('children').select(...).eq('user_id',...).ilike('first_name',...)
        expect(mockChildIlikePartial).toHaveBeenCalledWith('first_name', `%${sampleParsedReport.childName}%`);
        expect(mockChildIlikePartial).toHaveBeenCalledTimes(1); 
    });


    // Test for when parser returns null
     test('should return SkippedInvalidData if parser returns null', async () => {
        mockParseTadpolesReport.mockReturnValue(null); // Simulate parser failure

        const result = await processGmailMessage(
            gmail,
            supabase,
            'test-message-id-parser-null',
            'test-user-id',
            sampleUserProviderConfigs
        );

        expect(result.status).toBe(ProcessMessageStatus.SkippedInvalidData);
        expect(result.error).toBe('Failed to parse report data.');
        expect(mockSupabaseRpc).not.toHaveBeenCalled();
    });

});
