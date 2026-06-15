ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(80),
  ADD COLUMN IF NOT EXISTS salutation VARCHAR(20),
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(80),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(80),
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(160),
  ADD COLUMN IF NOT EXISTS work_phone VARCHAR(40),
  ADD COLUMN IF NOT EXISTS mobile VARCHAR(40),
  ADD COLUMN IF NOT EXISTS vendor_language VARCHAR(60),
  ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS website VARCHAR(255),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS remarks VARCHAR(4000);

UPDATE vendors
SET gst_number = COALESCE(gst_number, tax_identifier)
WHERE gst_number IS NULL AND tax_identifier IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_vendors_email_ci
  ON vendors ((LOWER(email)))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_vendors_mobile
  ON vendors (mobile)
  WHERE mobile IS NOT NULL;

CREATE TABLE IF NOT EXISTS vendor_addresses (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  address_type VARCHAR(20) NOT NULL,
  label VARCHAR(80),
  attention VARCHAR(160),
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(80),
  state VARCHAR(80),
  country VARCHAR(80),
  postal_code VARCHAR(20),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_contact_persons (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  salutation VARCHAR(20),
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80),
  email VARCHAR(160),
  work_phone VARCHAR(40),
  mobile VARCHAR(40),
  skype_name VARCHAR(120),
  designation VARCHAR(120),
  department VARCHAR(120),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_bank_accounts (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  account_holder_name VARCHAR(160) NOT NULL,
  bank_name VARCHAR(160) NOT NULL,
  account_number VARCHAR(64) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  branch_name VARCHAR(160),
  upi_id VARCHAR(120),
  account_type VARCHAR(30),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO vendor_addresses (
  id,
  vendor_id,
  address_type,
  label,
  attention,
  address_line_1,
  address_line_2,
  city,
  state,
  country,
  postal_code,
  is_primary,
  created_at,
  updated_at
)
SELECT
  (
    substr(md5(id::text || '-billing'), 1, 8) || '-' ||
    substr(md5(id::text || '-billing'), 9, 4) || '-' ||
    substr(md5(id::text || '-billing'), 13, 4) || '-' ||
    substr(md5(id::text || '-billing'), 17, 4) || '-' ||
    substr(md5(id::text || '-billing'), 21, 12)
  )::uuid,
  id,
  'BILLING',
  'Billing Address',
  vendor_name,
  address_line_1,
  address_line_2,
  city,
  state,
  country,
  postal_code,
  TRUE,
  created_at,
  updated_at
FROM vendors v
WHERE NOT EXISTS (
  SELECT 1
  FROM vendor_addresses a
  WHERE a.vendor_id = v.id
    AND a.address_type = 'BILLING'
);

CREATE INDEX IF NOT EXISTS idx_vendor_addresses_vendor ON vendor_addresses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contact_persons_vendor ON vendor_contact_persons(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bank_accounts_vendor ON vendor_bank_accounts(vendor_id);
