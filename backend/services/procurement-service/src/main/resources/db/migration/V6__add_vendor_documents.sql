create table if not exists vendor_documents (
    id uuid primary key,
    vendor_id uuid not null references vendors(id) on delete cascade,
    file_name varchar(255) not null,
    content_type varchar(255),
    file_size bigint not null,
    file_data bytea not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create index if not exists idx_vendor_documents_vendor_id
    on vendor_documents(vendor_id);
