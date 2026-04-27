create table if not exists pr_documents (
  id uuid primary key,
  purchase_requisition_id uuid not null references purchase_requisitions(id) on delete cascade,
  document_type varchar(20) not null,
  file_name varchar(255) not null,
  content_type varchar(120),
  file_size bigint not null,
  file_data bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pr_documents_pr on pr_documents(purchase_requisition_id);
