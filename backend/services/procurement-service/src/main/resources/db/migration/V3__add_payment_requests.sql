CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY,
  payment_number VARCHAR(80) NOT NULL UNIQUE,
  invoice_id UUID NOT NULL UNIQUE REFERENCES invoices(id) ON DELETE RESTRICT,
  requested_by UUID NOT NULL,
  approved_by UUID,
  payment_date DATE,
  amount NUMERIC(14, 2) NOT NULL,
  status VARCHAR(40) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
