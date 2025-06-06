# Gmail Sync Feature

## Overview

The Gmail Sync feature allows authenticated users to manually import daycare reports from their Gmail account into the application. This feature provides a simple "Sync Gmail Now" button that triggers the import process.

## How It Works

### Data Flow

1. **User clicks "Sync Gmail Now"** button in the header
2. **API endpoint `/api/sync-gmail`** is called
3. **Gmail API** fetches messages from configured daycare providers
4. **Parser** transforms email content into structured data
5. **Supabase** stores the parsed reports
6. **Dashboard** refreshes to show new data (if any)

### Components

#### 1. Gmail Sync Button (`/components/gmail-sync-button.tsx`)
- Reusable button component with loading states
- Shows sync progress and results
- Displays last sync time
- Toast notifications for success/error states

#### 2. Sync API Endpoint (`/app/api/sync-gmail/route.ts`)
- Wraps existing `/api/gmail/fetch` functionality
- Returns user-friendly response format
- Supports both GET and POST methods

#### 3. Gmail Fetch Logic (`/app/api/gmail/fetch/route.ts`)
- Authenticates with Google OAuth
- Fetches emails from configured providers
- Rate limiting (5 requests per minute)
- Batch processing with pagination

#### 4. Email Parsing (`/lib/gmail/parser.ts`)
- Supports multiple daycare formats:
  - Tadpoles standard reports
  - Goddard School via Tadpoles
  - Placeholder for Montessori (not implemented)

#### 5. Processing Pipeline (`/lib/gmail/processor.ts`)
- Prevents duplicate imports
- Matches children by name
- Stores data atomically in Supabase

## Usage

### For Users

1. **Configure Daycare Providers**
   - Navigate to Settings > Providers
   - Add daycare email addresses
   - Select appropriate parser strategy

2. **Sync Reports**
   - Click "Sync Gmail Now" button in header
   - Wait for sync to complete
   - View imported reports in dashboard

### For Developers

#### Adding the Sync Button

```tsx
import { GmailSyncButton } from '@/components/gmail-sync-button';

// Basic usage
<GmailSyncButton />

// With callback
<GmailSyncButton 
  onSyncComplete={(result) => {
    if (result.success && result.hasNewReports) {
      // Refresh your data
    }
  }}
/>

// Customized appearance
<GmailSyncButton
  variant="outline"
  size="sm"
  className="custom-class"
/>
```

#### API Response Format

```typescript
interface SyncResponse {
  success: boolean;
  message: string;
  stats: {
    totalFound: number;
    imported: number;
    skipped: number;
    errors: number;
  } | null;
  hasNewReports: boolean;
  timestamp: string;
}
```

## Configuration

### Environment Variables

- `GOOGLE_CLIENT_ID`: OAuth client ID
- `GOOGLE_CLIENT_SECRET`: OAuth client secret
- `GMAIL_FETCH_MAX_MESSAGES`: Max messages per sync (default: 10)
- `NEXTAUTH_URL`: Base URL for authentication
- `NEXTAUTH_SECRET`: Session encryption key

### User Permissions

Users must:
1. Be authenticated via Google OAuth
2. Grant Gmail read permissions
3. Have configured daycare providers

## Error Handling

The sync process handles various error scenarios:

- **No providers configured**: Shows helpful message
- **Authentication errors**: Attempts token refresh
- **Rate limiting**: Shows appropriate error message
- **Network errors**: Displays connection error
- **Parse errors**: Skips invalid messages, continues with others

## Future Enhancements

1. **Background Sync**: Add scheduled sync via cron jobs
2. **Real-time Updates**: WebSocket notifications for new reports
3. **Bulk Actions**: Select date range for historical import
4. **Custom Parsers**: Allow users to define custom email formats
5. **Analytics**: Show sync history and statistics