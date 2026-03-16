alter table if exists users
  add column if not exists phone_number varchar(40);
