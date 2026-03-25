CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  account_email VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_calendar_connections_user_provider
  ON calendar_connections (user_id, provider);

CREATE TABLE calendar_oauth_states (
  state VARCHAR(64) PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  return_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE portal_credentials (
  id UUID PRIMARY KEY,
  platform VARCHAR(50) NOT NULL UNIQUE,
  client_id TEXT,
  client_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  account_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
