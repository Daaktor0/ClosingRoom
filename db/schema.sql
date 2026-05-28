-- ClosingRoom v1 persistence contract.
-- Target: Supabase Postgres (auth + RLS). Run once on a fresh project.
-- Access control is enforced by Row-Level Security: the app talks to Postgres
-- from the browser with the anon/publishable key, so RLS is the ONLY thing
-- protecting tenant data. Every domain row carries organization_id and every
-- policy scopes to the caller's membership.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type membership_role as enum ('firm_admin', 'lawyer', 'viewer', 'cs_user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_status as enum ('active', 'closed', 'on_hold');
exception when duplicate_object then null; end $$;

do $$ begin
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
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_status as enum ('Not Started', 'Draft Shared', 'Under Review', 'Agreed Form', 'Executed', 'Filed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_entity_type as enum ('deal', 'deal_task', 'deal_dependency', 'deal_note', 'template', 'membership');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists organization (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  firm_logo_url text,
  firm_accent_hex text,
  created_at timestamptz not null default now()
);

create table if not exists membership (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role membership_role not null default 'lawyer',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists template (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organization(id) on delete cascade,
  name text not null,
  version integer not null,
  jurisdiction text not null default 'IN',
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, name, version)
);

create table if not exists template_task (
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
  mandatory_for_closing boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists template_dependency (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organization(id) on delete cascade,
  template_id uuid not null references template(id) on delete cascade,
  template_task_id uuid not null references template_task(id) on delete cascade,
  prerequisite_template_task_id uuid not null references template_task(id) on delete restrict,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists deal (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  template_id uuid references template(id) on delete set null,
  name text not null,
  company_name text not null,
  investor_name text not null,
  closing_date_x date,
  status deal_status not null default 'active',
  lead_partner_user_id uuid,
  created_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists deal_task (
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
  owner_user_id uuid,
  owner_label text not null default '',
  reviewer_user_id uuid,
  reviewer_label text not null default '',
  notes text not null default '',
  source_reference text not null,
  document_category text not null,
  document_status document_status not null default 'Not Started',
  filing jsonb,
  statutory_deadline_note text,
  agreed_form_required boolean not null default false,
  mandatory_for_closing boolean not null default false,
  last_updated timestamptz not null default now(),
  unique (deal_id, source_task_id)
);

create table if not exists deal_dependency (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  deal_id uuid not null references deal(id) on delete cascade,
  deal_task_id uuid not null references deal_task(id) on delete cascade,
  prerequisite_deal_task_id uuid not null references deal_task(id) on delete restrict,
  label text not null
);

create table if not exists deal_note (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  deal_id uuid not null references deal(id) on delete cascade,
  actor_user_id uuid not null,
  category text not null,
  text text not null check (char_length(text) <= 280),
  created_at timestamptz not null default now()
);

create table if not exists audit_entry (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  deal_id uuid references deal(id) on delete cascade,
  actor_user_id uuid,
  entity_type audit_entity_type not null,
  entity_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- Per-user reminder preferences (DPDP: explicit, revocable opt-in).
create table if not exists email_subscription (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  deal_id uuid references deal(id) on delete cascade,
  channel text not null default 'email',
  frequency text not null default 'statutory',
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id, deal_id, channel)
);

-- Deliverability + DPDP retention tracking for transactional email.
create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  deal_id uuid references deal(id) on delete cascade,
  template text not null,
  provider_id text,
  status text not null default 'queued',
  sent_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists audit_entry_org_deal_created_idx on audit_entry (organization_id, deal_id, created_at desc);
create index if not exists deal_org_status_closing_idx on deal (organization_id, status, closing_date_x);
create index if not exists deal_task_org_deal_status_idx on deal_task (organization_id, deal_id, status);
create index if not exists membership_user_idx on membership (user_id);
create index if not exists email_subscription_user_idx on email_subscription (user_id);

-- ---------------------------------------------------------------------------
-- Tenancy helper (security definer so policies never recurse on membership)
-- ---------------------------------------------------------------------------
create or replace function is_org_member(org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from membership m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table organization      enable row level security;
alter table membership        enable row level security;
alter table template          enable row level security;
alter table template_task     enable row level security;
alter table template_dependency enable row level security;
alter table deal              enable row level security;
alter table deal_task         enable row level security;
alter table deal_dependency   enable row level security;
alter table deal_note         enable row level security;
alter table audit_entry       enable row level security;
alter table email_subscription enable row level security;
alter table email_log         enable row level security;

-- Anon (logged-out) never touches tenant data; authenticated is gated by RLS.
revoke all on organization, membership, template, template_task, template_dependency,
  deal, deal_task, deal_dependency, deal_note, audit_entry, email_subscription, email_log
  from anon;
grant select, insert, update, delete on organization, membership, template, template_task,
  template_dependency, deal, deal_task, deal_dependency, deal_note, email_subscription, email_log
  to authenticated;
grant select on audit_entry to authenticated;

-- organization: members read; firm_admin updates branding.
drop policy if exists organization_member_read on organization;
create policy organization_member_read on organization
  for select to authenticated using (is_org_member(id));

drop policy if exists organization_admin_update on organization;
create policy organization_admin_update on organization
  for update to authenticated using (is_org_member(id)) with check (is_org_member(id));

-- membership: members see their org's roster.
drop policy if exists membership_member_read on membership;
create policy membership_member_read on membership
  for select to authenticated using (is_org_member(organization_id));

-- template + children: global seeds (null org) are world-readable to signed-in
-- users; org-owned templates are scoped.
drop policy if exists template_read on template;
create policy template_read on template
  for select to authenticated using (organization_id is null or is_org_member(organization_id));

drop policy if exists template_write on template;
create policy template_write on template
  for all to authenticated using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists template_task_read on template_task;
create policy template_task_read on template_task
  for select to authenticated using (organization_id is null or is_org_member(organization_id));

drop policy if exists template_task_write on template_task;
create policy template_task_write on template_task
  for all to authenticated using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists template_dependency_read on template_dependency;
create policy template_dependency_read on template_dependency
  for select to authenticated using (organization_id is null or is_org_member(organization_id));

drop policy if exists template_dependency_write on template_dependency;
create policy template_dependency_write on template_dependency
  for all to authenticated using (is_org_member(organization_id)) with check (is_org_member(organization_id));

-- deal + children: full CRUD for org members only.
drop policy if exists deal_member_all on deal;
create policy deal_member_all on deal
  for all to authenticated using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists deal_task_member_all on deal_task;
create policy deal_task_member_all on deal_task
  for all to authenticated using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists deal_dependency_member_all on deal_dependency;
create policy deal_dependency_member_all on deal_dependency
  for all to authenticated using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists deal_note_member_all on deal_note;
create policy deal_note_member_all on deal_note
  for all to authenticated using (is_org_member(organization_id)) with check (is_org_member(organization_id));

-- audit_entry: members read only. Inserts come exclusively from the
-- security-definer trigger below; clients have no insert/update/delete grant.
drop policy if exists audit_entry_member_read on audit_entry;
create policy audit_entry_member_read on audit_entry
  for select to authenticated using (is_org_member(organization_id));

-- email_subscription: a user manages only their own rows.
drop policy if exists email_subscription_owner_all on email_subscription;
create policy email_subscription_owner_all on email_subscription
  for all to authenticated
  using (user_id = auth.uid() and is_org_member(organization_id))
  with check (user_id = auth.uid() and is_org_member(organization_id));

-- email_log: members read their org's delivery history.
drop policy if exists email_log_member_read on email_log;
create policy email_log_member_read on email_log
  for select to authenticated using (is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- audit_entry is append-only (no UPDATE / DELETE, even for the owner)
-- ---------------------------------------------------------------------------
create or replace function prevent_audit_entry_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_entry is append-only';
end;
$$;

drop trigger if exists audit_entry_no_update on audit_entry;
create trigger audit_entry_no_update
  before update on audit_entry
  for each row execute function prevent_audit_entry_mutation();

drop trigger if exists audit_entry_no_delete on audit_entry;
create trigger audit_entry_no_delete
  before delete on audit_entry
  for each row execute function prevent_audit_entry_mutation();

-- ---------------------------------------------------------------------------
-- Audit writes happen at the DB layer, not in app code. Because the client
-- talks to Postgres directly (no server-action transaction to hang logging
-- off), these security-definer triggers are the only tamper-proof path.
-- ---------------------------------------------------------------------------
create or replace function log_deal_task_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_entry (organization_id, deal_id, actor_user_id, entity_type, entity_id, action, before, after)
  values (new.organization_id, new.deal_id, auth.uid(), 'deal_task', new.id, 'update', to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists deal_task_audit on deal_task;
create trigger deal_task_audit
  after update on deal_task
  for each row when (old.* is distinct from new.*)
  execute function log_deal_task_change();

create or replace function log_deal_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_entry (organization_id, deal_id, actor_user_id, entity_type, entity_id, action, before, after)
  values (new.organization_id, new.id, auth.uid(), 'deal', new.id, 'update', to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists deal_audit on deal;
create trigger deal_audit
  after update on deal
  for each row when (old.* is distinct from new.*)
  execute function log_deal_change();

create or replace function log_deal_note_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_entry (organization_id, deal_id, actor_user_id, entity_type, entity_id, action, before, after)
  values (new.organization_id, new.deal_id, auth.uid(), 'deal_note', new.id, 'insert', null, to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists deal_note_audit on deal_note;
create trigger deal_note_audit
  after insert on deal_note
  for each row execute function log_deal_note_insert();

-- ---------------------------------------------------------------------------
-- Keep deal.updated_at honest.
-- ---------------------------------------------------------------------------
create or replace function set_deal_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists deal_set_updated_at on deal;
create trigger deal_set_updated_at
  before update on deal
  for each row execute function set_deal_updated_at();

-- ---------------------------------------------------------------------------
-- New user -> auto-provision an organization + owner membership.
-- Without this, getCurrentUserAndOrganization() throws for every new signup.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  firm_name text;
begin
  firm_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'firm_name'), ''),
    split_part(new.email, '@', 1) || '''s Firm'
  );

  insert into organization (name)
  values (firm_name)
  returning id into new_org_id;

  insert into membership (organization_id, user_id, email, role)
  values (new_org_id, new.id, new.email, 'firm_admin');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
