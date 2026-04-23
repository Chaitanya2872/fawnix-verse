alter table purchase_requisitions
    add column if not exists evaluation_decision varchar(120),
    add column if not exists evaluation_notes text,
    add column if not exists evaluation_updated_at timestamp with time zone;
