alter table hiring_requests add column if not exists approval_request_id varchar(255);
alter table offers add column if not exists approval_request_id varchar(255);

create index if not exists idx_hiring_requests_approval_request_id on hiring_requests(approval_request_id);
create index if not exists idx_offers_approval_request_id on offers(approval_request_id);
