alter table task_space_members
  add column if not exists permissions text;

alter table task_space_invitations
  add column if not exists permissions text;
