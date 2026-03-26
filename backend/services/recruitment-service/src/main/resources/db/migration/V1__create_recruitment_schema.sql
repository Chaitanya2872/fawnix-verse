create table if not exists hiring_requests (
  id uuid primary key,
  job_title varchar(255) not null,
  department_id varchar(255),
  approval_flow_id varchar(255),
  hiring_manager_id varchar(255),
  description text,
  skills jsonb,
  qualifications text,
  experience_years integer,
  salary_min numeric,
  salary_max numeric,
  headcount integer default 1,
  priority varchar(50),
  expected_date date,
  status varchar(50),
  requested_by varchar(255),
  notes text,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists approvals (
  id uuid primary key,
  hiring_request_id uuid,
  approver_id varchar(255),
  level integer,
  role varchar(100),
  status varchar(50),
  comments text,
  decided_at timestamptz,
  created_at timestamptz
);

create index if not exists idx_approvals_hiring_request_id on approvals(hiring_request_id);

create table if not exists job_positions (
  id uuid primary key,
  hiring_request_id uuid,
  title varchar(255) not null,
  department_id varchar(255),
  assigned_recruiter_id varchar(255),
  level varchar(100),
  hiring_manager_id varchar(255),
  headcount integer,
  target_start_date date,
  budget numeric,
  approval_flow_id varchar(255),
  application_form_id varchar(255),
  interview_rounds text,
  status varchar(50),
  created_at timestamptz
);

create index if not exists idx_job_positions_hiring_request_id on job_positions(hiring_request_id);

create table if not exists job_postings (
  id uuid primary key,
  position_id uuid,
  title varchar(255) not null,
  description text,
  requirements text,
  location varchar(255),
  job_type varchar(100),
  work_mode varchar(100),
  salary_range varchar(255),
  status varchar(50),
  platforms jsonb,
  deadline date,
  published_at timestamptz,
  created_at timestamptz
);

create index if not exists idx_job_postings_position_id on job_postings(position_id);

create table if not exists posting_platforms (
  id uuid primary key,
  posting_id uuid,
  platform varchar(100) not null,
  status varchar(50),
  external_id varchar(255),
  external_url varchar(500),
  posted_at timestamptz,
  error_message text,
  created_at timestamptz,
  updated_at timestamptz
);

create index if not exists idx_posting_platforms_posting_id on posting_platforms(posting_id);

create table if not exists candidates (
  id uuid primary key,
  full_name varchar(255) not null,
  email varchar(255) not null,
  phone varchar(100),
  location varchar(255),
  linkedin_url varchar(500),
  portfolio_url varchar(500),
  resume_url varchar(500),
  skills jsonb,
  experience_years integer,
  current_company varchar(255),
  current_title varchar(255),
  education jsonb,
  tags jsonb,
  source varchar(100),
  notes text,
  ai_match_score integer,
  is_in_talent_pool boolean default false,
  created_at timestamptz,
  updated_at timestamptz
);

create unique index if not exists ux_candidates_email on candidates(email);

create table if not exists candidate_applications (
  id uuid primary key,
  candidate_id uuid,
  position_id uuid,
  status varchar(50),
  cover_letter text,
  salary_expectation numeric,
  notice_period_days integer,
  consent_given boolean,
  applied_at timestamptz,
  updated_at timestamptz,
  rejection_reason text,
  rejection_notes text,
  notes text
);

create index if not exists idx_candidate_applications_candidate_id on candidate_applications(candidate_id);
create index if not exists idx_candidate_applications_position_id on candidate_applications(position_id);

create table if not exists hr_screenings (
  id uuid primary key,
  application_id uuid,
  screened_by varchar(255),
  salary_expectation numeric,
  notice_period varchar(100),
  availability varchar(255),
  notes text,
  score integer,
  result varchar(100),
  screened_at timestamptz
);

create index if not exists idx_hr_screenings_application_id on hr_screenings(application_id);

create table if not exists interviews (
  id uuid primary key,
  application_id uuid,
  round_number integer,
  interview_type varchar(50),
  mode varchar(50),
  scheduled_at timestamptz,
  duration_minutes integer,
  location varchar(255),
  meeting_link varchar(500),
  calendar_provider varchar(100),
  calendar_event_id varchar(255),
  status varchar(50),
  created_at timestamptz
);

create index if not exists idx_interviews_application_id on interviews(application_id);

create table if not exists interview_panels (
  id uuid primary key,
  interview_id uuid,
  interviewer_id varchar(255),
  role varchar(100)
);

create index if not exists idx_interview_panels_interview_id on interview_panels(interview_id);

create table if not exists interview_feedback (
  id uuid primary key,
  interview_id uuid,
  interviewer_id varchar(255),
  technical_score integer,
  communication_score integer,
  cultural_score integer,
  overall_score integer,
  strengths text,
  weaknesses text,
  notes text,
  recommendation varchar(100),
  submitted_at timestamptz
);

create index if not exists idx_interview_feedback_interview_id on interview_feedback(interview_id);

create table if not exists offers (
  id uuid primary key,
  application_id uuid,
  created_by varchar(255),
  approval_flow_id varchar(255),
  base_salary numeric,
  bonus numeric,
  equity varchar(255),
  benefits text,
  joining_date date,
  offer_expiry date,
  terms text,
  status varchar(50),
  candidate_response varchar(100),
  candidate_notes text,
  responded_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

create index if not exists idx_offers_application_id on offers(application_id);

create table if not exists offer_approvals (
  id uuid primary key,
  offer_id uuid,
  approver_id varchar(255),
  level integer,
  status varchar(50),
  comments text,
  decided_at timestamptz
);

create index if not exists idx_offer_approvals_offer_id on offer_approvals(offer_id);

create table if not exists application_form_submissions (
  id uuid primary key,
  form_id varchar(255) not null,
  form_name varchar(255),
  candidate_id uuid not null,
  application_id uuid not null,
  answers jsonb not null,
  resume_url varchar(500),
  submitted_at timestamptz,
  source varchar(100)
);

create index if not exists idx_form_submissions_candidate_id on application_form_submissions(candidate_id);
create index if not exists idx_form_submissions_application_id on application_form_submissions(application_id);
