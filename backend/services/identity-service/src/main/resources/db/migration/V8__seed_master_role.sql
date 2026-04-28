insert into roles (id, name, created_at)
values ('00000000-0000-0000-0000-000000000011', 'ROLE_MASTER', now())
on conflict (name) do nothing;
