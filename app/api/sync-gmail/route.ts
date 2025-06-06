import { NextResponse, type NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { Session } from 'next-auth';
import logger from '@/lib/logger';

/**
 * Gmail Sync API Route
 * 
 * This route provides a simple endpoint for manually triggering Gmail synchronization.
 * It wraps the existing /api/gmail/fetch functionality and returns a simplified response
 * suitable for frontend UI components.
 * 
 * Returns:
 * - success: boolean indicating if sync completed
 * - message: human-readable status message
 * - stats: detailed statistics about the sync operation
 * - timestamp: when the sync was performed
 */
export const GET = withApiHandler(async (request: NextRequest, session: Session) => {
  const userId = session.user.id;

  try {
    // Import and directly call the Gmail fetch handler
    const { GET: fetchGmailRoute } = await import('@/app/api/gmail/fetch/route');
    
    // Call the Gmail fetch handler directly with the original request
    const response = await fetchGmailRoute(request, { params: {} });
    const result = await response.json();

    // Transform the response into a user-friendly format
    const stats = {
      totalFound: result.totalMessagesFound || 0,
      imported: result.processedSuccessfully || 0,
      skipped: (result.skippedAlreadyExists || 0) + 
                (result.skippedChildNotFound || 0) + 
                (result.skippedInvalidData || 0) +
                (result.skippedNoParserFound || 0) +
                (result.skippedAmbiguousChildMatch || 0),
      errors: result.errorsEncountered || 0,
    };

    const hasNewReports = stats.imported > 0;
    const message = result.message || (
      hasNewReports 
        ? `Successfully imported ${stats.imported} new report${stats.imported !== 1 ? 's' : ''}`
        : stats.totalFound > 0
        ? 'No new reports to import'
        : 'No reports found in Gmail'
    );

    logger.info('Gmail sync completed', { userId, stats });

    return NextResponse.json({
      success: true,
      message,
      stats,
      hasNewReports,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Gmail sync failed', { userId, error: error.message });
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to sync Gmail. Please try again.',
        error: error.message,
        stats: null,
        hasNewReports: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

export const POST = GET; // Support both GET and POST methods