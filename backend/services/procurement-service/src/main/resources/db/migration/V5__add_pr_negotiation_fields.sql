alter table purchase_requisitions
    add column if not exists negotiation_vendor_id uuid,
    add column if not exists negotiated_amount numeric(19, 2),
    add column if not exists negotiation_notes text,
    add column if not exists negotiation_updated_at timestamp with time zone;
