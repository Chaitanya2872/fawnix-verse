alter table purchase_requisitions
    add column if not exists request_type varchar(40) not null default 'INTERNAL_USE';

alter table pr_items
    alter column product_id drop not null;

alter table pr_items
    alter column sku drop not null;

alter table po_items
    alter column product_id drop not null;

alter table po_items
    alter column sku drop not null;
