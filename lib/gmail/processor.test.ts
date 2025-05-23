import { SupabaseClient } from '@supabase/supabase-js';
import { gmail_v1 } from 'googleapis';
import pino from 'pino';
import { processGmailMessage, ProcessMessageStatus, UserDaycareProviderConfig } from './processor';
import *   as ParserModule from './parser'; // To mock individual parsers
import mainLogger from '@/lib/logger'; // Actual logger to mock its methods

// Mock the Supabase client
const mockSupabaseRpc = jest.fn();
const mockSupabaseFrom = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn(),
        }),
    }),
});
const supabase = {
    rpc: mockSupabaseRpc,
    from: mockSupabaseFrom, // For existing report check
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
// We need to mock the main logger and its child method
const mockLoggerInstance = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(), // child() returns the same mock for chained calls
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
        (mockSupabaseFrom().select().eq().maybeSingle as jest.Mock).mockReset();
        mockLoggerInstance.info.mockClear();
        mockLoggerInstance.warn.mockClear();
        mockLoggerInstance.error.mockClear();
        mockLoggerInstance.debug.mockClear();
        mockLoggerInstance.child.mockClear();
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
        (mockSupabaseFrom().select().eq().maybeSingle as jest.Mock).mockResolvedValue({ data: null, error: null }); // Default: no existing report
        mockParseTadpolesReport.mockReturnValue(sampleParsedReport); // Default: parser returns sample data
        
        // Mock the children table lookup
        (supabase.from('children').select().eq().ilike as jest.Mock) = jest.fn().mockReturnValue({
             maybeSingle: jest.fn().mockResolvedValue({ data: { id: sampleChildId }, error: null })
        });
         // Mock the exact children table lookup
        (supabase.from('children').select().eq().eq as jest.Mock) = jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: sampleChildId }, error: null })
        });


    });

    test('should call supabase.rpc with correctly structured payload on successful parsing', async () => {
        const rpcResponseData = { /* Supabase RPC doesn't usually return data for insert functions unless specified, often it's null or a status */ }; 
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
        mockSupabaseRpc.mockResolvedValue({ data: {}, error: null }); // Success
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
        // Override the default mock for child lookup to simulate child not found
        (supabase.from('children').select().eq().eq as jest.Mock).mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) // No exact match
        });
        (supabase.from('children').select().eq().ilike as jest.Mock).mockReturnValue({
             // .ilike() returns an array, so simulate empty array for no partial match
            mockResolvedValue({ data: [], error: null }) 
        });
         // Re-mock the specific part of the chain for ilike if it's more complex
        const mockIlikeQuery = jest.fn().mockResolvedValue({ data: [], error: null });
        (supabase.from('children').select().eq().ilike as jest.Mock) = jest.fn(() => mockIlikeQuery());


        const result = await processGmailMessage(
            gmail,
            supabase,
            'test-message-id-no-child',
            'test-user-id',
            sampleUserProviderConfigs
        );

        expect(result.status).toBe(ProcessMessageStatus.SkippedChildNotFound);
        expect(result.error).toContain(`No child found matching`);
        expect(mockSupabaseRpc).not.toHaveBeenCalled();
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
