# Daycare Tracking Platform

A Next.js application that aggregates daily daycare reports from Gmail and provides analytics for parents.

## Features

- **Multi-Provider Gmail Integration**: Fetches and processes daily reports from user-configured daycare providers. The system can parse emails from different providers, with current support for:
    - Standard Tadpoles emails (`tadpoles_v1`)
    - Goddard schools using the Tadpoles email format (`goddard_tadpoles_v1`)
    - Placeholder for direct Montessori emails (`montessori_v1` - under development)
- **Child Tracking**: Tracks activities, meals, sleep, and diaper changes.
- **Analytics Dashboard**: Visualizes historical trends and patterns.
- **Photo Gallery**: Stores and organizes photos from reports.
- **Family Sharing**: Allows inviting additional caregivers.
- **User-Configurable Providers**: Manage daycare provider settings, including sender emails and specific email parsing logic.

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

# Gmail Integration (Optional)
# GMAIL_FETCH_MAX_MESSAGES=10 # Max number of emails to fetch from Gmail per run by the API
# Note: The default is 10 if not specified.

# Logging Level (Optional)
# LOG_LEVEL=info # Options: error, warn, info, debug
```

## Development

### Running Locally

```bash
yarn dev
```

### Key Directories

- `app/`: Next.js app router routes
- `lib/`: Shared utilities and business logic
  - `lib/gmail/parser.ts`: Contains email parsing strategies.
  - `lib/gmail/processor.ts`: Handles email processing pipeline and parser dispatch.
- `supabase/`: Database migrations
- `components/`: UI components
- `app/settings/providers/`: UI for managing daycare provider configurations.

## Configuring Daycare Providers

Users can configure their daycare providers through the application settings, typically found at `/settings/providers`. This allows the system to correctly identify and parse daily reports from different sources.

For each provider, you'll need to provide the following:

-   **Provider Name**: A friendly name for your reference (e.g., "Goddard School Main St.", "My Tadpoles Center", "Montessori Downtown").
-   **Report Sender Email**: The exact email address from which the daily reports are sent (e.g., "notifications@tadpoles.com", "reports@goddardexample.com", "updates@montessorischool.org"). This is crucial for identifying the correct emails.
-   **Parser Strategy** (Optional): This is an advanced setting that tells the system how to interpret the content of the report emails. If left blank, the system will attempt to infer the correct parser based on the sender's email address or the provider name. Specifying a strategy can ensure accuracy. Available strategies include:
    *   `tadpoles_v1`: For standard Tadpoles report emails.
    *   `goddard_tadpoles_v1`: For Goddard schools that send reports using the Tadpoles email format.
    *   `montessori_v1`: (Placeholder) Intended for direct Montessori email formats. *Note: This parser is currently a placeholder and not fully implemented pending diverse email samples.*

Proper configuration ensures that reports are accurately fetched and processed.

## API Documentation

### Gmail Integration

**Endpoint**: `GET /api/gmail/fetch`

Fetches and processes daycare reports from Gmail based on the user's configured daycare providers. See [app/api/gmail/fetch/route.ts](app/api/gmail/fetch/route.ts) for implementation details.

**Flow**:
1. Authenticates with Google OAuth using the user's session.
2. Retrieves the user's configured daycare providers (sender emails and parser strategies) from the database.
3. Constructs a Gmail query based on these configured sender emails.
4. Fetches recent messages matching the query.
5. Processes each message through a pipeline:
   - Determines the correct parser based on sender email, configured `parser_strategy`, or fallback logic (see `lib/gmail/processor.ts#getParserForProvider`).
   - Content extraction using the selected parser.
   - Data validation.
   - Child matching.
   - Database storage of parsed data (daily reports, naps, meals, activities, photos).

### Provider Configuration API

- `GET /api/user-daycare-providers`: Lists all provider configurations for the authenticated user.
- `POST /api/user-daycare-providers`: Creates a new provider configuration.
- `PUT /api/user-daycare-providers/[id]`: Updates an existing provider configuration.
- `DELETE /api/user-daycare-providers/[id]`: Deletes a provider configuration.

See [app/api/user-daycare-providers/route.ts](app/api/user-daycare-providers/route.ts) and [app/api/user-daycare-providers/[id]/route.ts](app/api/user-daycare-providers/[id]/route.ts) for details.

### Analytics Endpoints

- Sleep: `GET /api/analytics/sleep`
- Meals: `GET /api/analytics/meals`
- Activities: `GET /api/analytics/activities`
- Photos: `GET /api/analytics/photos`

## Testing

Unit tests are written with **Jest** and can be found in `*.test.ts` files.

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

- **Expand Parser Library**:
    - Develop and refine parsers for more daycare systems and email formats (e.g., fully implement `montessori_v1`, add support for other Goddard email systems if they differ, Bright Horizons, etc.) based on available email samples.
- **Configuration UI Enhancements**:
    - Allow users to test a parser strategy with a sample email snippet directly in the UI.
- **Gmail Integration Enhancements**:
    - Add batch processing for large initial message sets.
    - Implement Google API token refresh mechanisms more robustly if needed.
    - Implement rate limiting for API calls.
- **Advanced Analytics**:
    - Offer more detailed insights and customizable reports.
- **Notifications**:
    - Alert users to important items noted in reports (e.g., "low on diapers").
