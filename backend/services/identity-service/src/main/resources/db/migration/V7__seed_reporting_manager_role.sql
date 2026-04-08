insert into roles (id, name, created_at)
values ('00000000-0000-0000-0000-000000000010', 'ROLE_REPORTING_MANAGER', now())
on conflict (name) do nothing;
