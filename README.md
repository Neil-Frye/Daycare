# Daycare Tracking Platform

A Next.js application that aggregates daily daycare reports from Gmail and provides analytics for parents.

## Features

- **Gmail Integration**: Fetches and processes daily reports from configured email domains
- **Child Tracking**: Tracks activities, meals, sleep, and diaper changes
- **Analytics Dashboard**: Visualizes historical trends and patterns
- **Photo Gallery**: Stores and organizes photos from reports
- **Family Sharing**: Allows inviting additional caregivers

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js with Google OAuth
- **Logging**: Custom logger (`lib/logger.ts`)

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Google OAuth credentials
- Yarn or npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Copy `.env.example` to `.env.local` and fill in the values:
   ```bash
   cp .env.example .env.local
   ```

### Environment Variables

Create `.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Development

### Running Locally

```bash
yarn dev
```

### Key Directories

- `app/`: Next.js app router routes
- `lib/`: Shared utilities and business logic
- `supabase/`: Database migrations
- `components/`: UI components

## API Documentation

### Gmail Integration

**Endpoint**: `GET /api/gmail/fetch`

Fetches and processes daycare reports from Gmail. See [app/api/gmail/fetch/route.ts](app/api/gmail/fetch/route.ts) for implementation details.

**Flow**:
1. Authenticates with Google OAuth
2. Fetches messages from configured sender
3. Processes each message through pipeline:
   - Content extraction
   - Data validation
   - Child matching
   - Database storage

### Analytics Endpoints

- Sleep: `GET /api/analytics/sleep`
- Meals: `GET /api/analytics/meals`
- Activities: `GET /api/analytics/activities`
- Photos: `GET /api/analytics/photos`

## Testing

Run tests with:

```bash
yarn test
```

## Deployment

The application is configured for Vercel deployment. Ensure all environment variables are set in production.

## Contributing

1. Create a new branch
2. Add tests for new features
3. Submit a pull request

## Roadmap

- [ ] Make Gmail query parameters configurable
- [ ] Add batch processing for large message sets
- [ ] Implement Google API token refresh
- [ ] Add rate limiting
