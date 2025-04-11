-- Create users table
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    email TEXT UNIQUE,
    "emailVerified" TIMESTAMPTZ,
    image TEXT
);

-- Create accounts table
CREATE TABLE accounts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    UNIQUE (provider, "providerAccountId")
);

-- Create sessions table
CREATE TABLE sessions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sessionToken" TEXT NOT NULL UNIQUE,
    "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL
);

-- Create verification_tokens table
CREATE TABLE verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires TIMESTAMPTZ NOT NULL,
    UNIQUE (identifier, token)
);

-- Optional: Indexes for performance
CREATE INDEX accounts_userId_idx ON accounts("userId");
CREATE INDEX sessions_userId_idx ON sessions("userId");
