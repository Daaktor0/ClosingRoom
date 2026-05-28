-- ClosingRoom v1 persistence contract.
-- Target: Neon Postgres. Every application query must scope by organization_id.

create extension if not exists pgcrypto;

create type membership_role as enum ('firm_admin', 'lawyer', 'viewer', 'cs_user');
create type deal_status as enum ('active', 'closed', 'on_hold');
create type task_status as enum (
  'Not Started',
  'In Progress',
  'With Client',
  'With Investor Counsel',
  'Under Review',
  'Completed',
  'Waived',
  'Converted to CS',
  'Blocked',
  'Not Applicable'
);
create type document_status as enum ('Not Started', 'Draft Shared', 'Under Review', 'Agreed Form', 'Executed', 'Filed');
create type audit_entity_type as enum ('deal', 'deal_task', 'deal_dependency', 'deal_note', 'template', 'membership');

create table organization (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  firm_logo_url text,
  firm_accent_hex text,
  created_at timestamptz not null default now()
);

create table membership (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  user_id text not null,
  email text not null,
  role membership_role not null default 'lawyer',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table template (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organization(id) on delete cascade,
  name text not null,
  version integer not null,
  jurisdiction text not null default 'IN',
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, name, version)
);

create table template_task (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organization(id) on delete cascade,
  template_id uuid not null references template(id) on delete cascade,
  source_task_id text not null,
  serial_number text not null,
  phase text not null,
  timeline text not null,
  action text not null,
  parties jsonb not null default '[]'::jsonb,
  comments text not null default '',
  priority text not null,
  blocker boolean not null default false,
  evidence jsonb not null default '{}'::jsonb,
  risk_category text not null,
  owner_label text not null default '',
  reviewer_label text not null default '',
  source_reference text not null,
  document_category text not null,
  document_status document_status not null default 'Not Started',
  filing jsonb,
  statutory_deadline_note text,
  agreed_form_required boolean not null default false,
  mandatory_for_closing boolean not null default false
);

create table template_dependency (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organization(id) on delete cascade,
  template_id uuid not null references template(id) on delete cascade,
  template_task_id uuid not null references template_task(id) on delete cascade,
  prerequisite_template_task_id uuid not null references template_task(id) on delete restrict,
  label text not null
);

create table deal (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  template_id uuid references template(id) on delete set null,
  name text not null,
  company_name text not null,
  investor_name text not null,
  closing_date_x date,
  status deal_status not null default 'active',
  lead_partner_user_id text,
  created_by_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table deal_task (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  deal_id uuid not null references deal(id) on delete cascade,
  template_task_id uuid references template_task(id) on delete set null,
  source_task_id text not null,
  serial_number text not null,
  phase text not null,
  timeline text not null,
  custom_offset_days integer,
  action text not null,
  parties jsonb not null default '[]'::jsonb,
  comments text not null default '',
  status task_status not null default 'Not Started',
  priority text not null,
  blocker boolean not null default false,
  evidence jsonb not null default '{}'::jsonb,
  risk_category text not null,
  owner_user_id text,
  owner_label text not null default '',
  reviewer_user_id text,
  reviewer_label text not null default '',
  notes text not null default '',
  source_reference text not null,
  document_category text not null,
  document_status document_status not null default 'Not Started',
  filing jsonb,
  statutory_deadline_note text,
  agreed_form_required boolean not null default false,
  mandatory_for_closing boolean not null default false,
  last_updated timestamptz not null default now()
);

create table deal_dependency (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  deal_id uuid not null references deal(id) on delete cascade,
  deal_task_id uuid not null references deal_task(id) on delete cascade,
  prerequisite_deal_task_id uuid not null references deal_task(id) on delete restrict,
  label text not null
);

create table deal_note (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  deal_id uuid not null references deal(id) on delete cascade,
  actor_user_id text not null,
  category text not null,
  text text not null check (char_length(text) <= 280),
  created_at timestamptz not null default now()
);

create table audit_entry (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  deal_id uuid references deal(id) on delete cascade,
  actor_user_id text not null,
  entity_type audit_entity_type not null,
  entity_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index audit_entry_org_deal_created_idx on audit_entry (organization_id, deal_id, created_at desc);
create index deal_org_status_closing_idx on deal (organization_id, status, closing_date_x);
create index deal_task_org_deal_status_idx on deal_task (organization_id, deal_id, status);

create or replace function prevent_audit_entry_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_entry is append-only';
end;
$$;

create trigger audit_entry_no_update
before update on audit_entry
for each row execute function prevent_audit_entry_mutation();

create trigger audit_entry_no_delete
before delete on audit_entry
for each row execute function prevent_audit_entry_mutation();
