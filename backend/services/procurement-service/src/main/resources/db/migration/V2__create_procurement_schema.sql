CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY,
  module VARCHAR(80) NOT NULL,
  workflow_name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_steps (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  approver_role VARCHAR(80),
  approver_user_id UUID,
  min_amount NUMERIC(14, 2),
  max_amount NUMERIC(14, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_approval_steps_workflow_order UNIQUE (workflow_id, step_order)
);

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY,
  vendor_code VARCHAR(40) NOT NULL UNIQUE,
  vendor_name VARCHAR(160) NOT NULL,
  email VARCHAR(160),
  phone VARCHAR(40),
  tax_identifier VARCHAR(80),
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(80),
  state VARCHAR(80),
  country VARCHAR(80),
  postal_code VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id UUID PRIMARY KEY,
  pr_number VARCHAR(40) NOT NULL UNIQUE,
  requester_id UUID NOT NULL,
  department VARCHAR(120) NOT NULL,
  purpose TEXT,
  needed_by_date DATE,
  status VARCHAR(40) NOT NULL,
  workflow_id UUID REFERENCES approval_workflows(id),
  current_step_order INTEGER,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pr_items (
  id UUID PRIMARY KEY,
  purchase_requisition_id UUID NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  sku VARCHAR(60) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category VARCHAR(80),
  unit VARCHAR(20) NOT NULL,
  quantity NUMERIC(14, 2) NOT NULL,
  estimated_unit_price NUMERIC(14, 2) NOT NULL,
  line_total NUMERIC(14, 2) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY,
  po_number VARCHAR(40) NOT NULL UNIQUE,
  purchase_requisition_id UUID NOT NULL UNIQUE REFERENCES purchase_requisitions(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  status VARCHAR(40) NOT NULL,
  notes TEXT,
  total_amount NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_items (
  id UUID PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  sku VARCHAR(60) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category VARCHAR(80),
  unit VARCHAR(20) NOT NULL,
  quantity NUMERIC(14, 2) NOT NULL,
  unit_price NUMERIC(14, 2) NOT NULL,
  line_total NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY,
  grn_number VARCHAR(40) NOT NULL UNIQUE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  receipt_date DATE NOT NULL,
  received_by UUID NOT NULL,
  status VARCHAR(40) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY,
  invoice_number VARCHAR(80) NOT NULL UNIQUE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  amount NUMERIC(14, 2) NOT NULL,
  status VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_logs (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES approval_workflows(id) ON DELETE SET NULL,
  step_id UUID REFERENCES approval_steps(id) ON DELETE SET NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(40) NOT NULL,
  actor_id UUID NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_status ON purchase_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_pr_items_pr ON pr_items(purchase_requisition_id);
CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON po_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_grn_po ON goods_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_po ON invoices(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_entity ON approval_logs(entity_type, entity_id);

INSERT INTO approval_workflows (id, module, workflow_name, is_active, created_at, updated_at)
VALUES ('4fef8d2e-c43d-4e5b-bbf8-343aa48826a1', 'PROCUREMENT', 'Default PR Approval', TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO approval_steps (id, workflow_id, step_order, approver_role, approver_user_id, min_amount, max_amount, created_at, updated_at)
VALUES
  ('7c14daa6-82f7-4d9f-840b-8d3c3d5cf9c0', '4fef8d2e-c43d-4e5b-bbf8-343aa48826a1', 1, 'ROLE_MANAGER', NULL, NULL, NULL, NOW(), NOW()),
  ('a94c929d-a653-456a-a738-bc5e2da5ef69', '4fef8d2e-c43d-4e5b-bbf8-343aa48826a1', 2, 'ROLE_FINANCE', NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
