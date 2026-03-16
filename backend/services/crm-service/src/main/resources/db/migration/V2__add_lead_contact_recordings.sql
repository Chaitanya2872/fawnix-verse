create table if not exists lead_contact_recordings (
  id varchar(36) primary key,
  lead_id varchar(36) not null references leads(id) on delete cascade,
  audio_file_name varchar(255) not null,
  audio_content_type varchar(120),
  audio_size bigint not null,
  audio_storage_path varchar(500) not null,
  transcript text not null,
  remarks_summary text not null,
  conversation_summary text,
  created_by_user_id varchar(36),
  created_by_name varchar(120),
  contacted_at timestamptz not null,
  created_at timestamptz not null
);

create index if not exists idx_lead_contact_recordings_lead on lead_contact_recordings(lead_id);
