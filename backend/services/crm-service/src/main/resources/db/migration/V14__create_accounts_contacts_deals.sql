CREATE TABLE accounts (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  industry VARCHAR(120),
  website VARCHAR(200),
  address TEXT,
  owner_user_id VARCHAR(36),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE contacts (
  id VARCHAR(36) PRIMARY KEY,
  account_id VARCHAR(36),
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160),
  phone VARCHAR(50),
  title VARCHAR(120),
  source VARCHAR(40),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_contacts_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE deals (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  account_id VARCHAR(36),
  contact_id VARCHAR(36),
  lead_id VARCHAR(36),
  stage VARCHAR(40) NOT NULL,
  value NUMERIC(14,2) NOT NULL,
  probability INTEGER,
  expected_close_at TIMESTAMP,
  owner_user_id VARCHAR(36),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_deals_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_deals_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contacts_source ON contacts(source);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_owner ON deals(owner_user_id);
