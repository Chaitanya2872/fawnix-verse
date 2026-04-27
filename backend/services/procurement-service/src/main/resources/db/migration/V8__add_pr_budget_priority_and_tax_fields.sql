alter table purchase_requisitions
    add column if not exists title varchar(200),
    add column if not exists description text,
    add column if not exists priority varchar(20) not null default 'MEDIUM',
    add column if not exists request_category varchar(80),
    add column if not exists budget_name varchar(160),
    add column if not exists budget_type varchar(40),
    add column if not exists budget_period varchar(40),
    add column if not exists allocated_budget numeric(19, 2),
    add column if not exists committed_amount numeric(19, 2),
    add column if not exists actual_spend numeric(19, 2),
    add column if not exists budget_validation_notes text,
    add column if not exists budget_exception_justification text,
    add column if not exists negotiation_delivery_timeline varchar(200),
    add column if not exists negotiation_payment_terms text,
    add column if not exists negotiation_discount_percent numeric(8, 2),
    add column if not exists negotiation_discount_amount numeric(19, 2);

update purchase_requisitions
set title = coalesce(nullif(trim(purpose), ''), pr_number)
where title is null;

update purchase_requisitions
set allocated_budget = coalesce(allocated_budget, 0),
    committed_amount = coalesce(committed_amount, 0),
    actual_spend = coalesce(actual_spend, 0)
where allocated_budget is null
   or committed_amount is null
   or actual_spend is null;

alter table pr_items
    add column if not exists tax_percent numeric(6, 2);
