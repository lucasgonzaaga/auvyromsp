create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'technician', 'client');
create type public.contract_status as enum ('active', 'suspended', 'expired', 'cancelled');
create type public.ticket_status as enum ('new', 'triage', 'in_progress', 'waiting_client', 'waiting_third_party', 'resolved', 'closed');
create type public.service_mode as enum ('remote', 'onsite');

create table public.companies (
  id text primary key default gen_random_uuid()::text,
  code text not null unique,
  name text not null,
  document text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id text references public.companies(id),
  role public.app_role not null,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint client_requires_company check (role <> 'client' or company_id is not null)
);

create table public.contacts (
  id text primary key default gen_random_uuid()::text, company_id text not null references public.companies(id) on delete cascade,
  code text not null unique, name text not null, email text not null, phone text, authorized boolean not null default true,
  user_id uuid unique references auth.users(id) on delete set null, created_at timestamptz not null default now(),
  unique (id, company_id)
);

create table public.equipment (
  id text primary key default gen_random_uuid()::text, company_id text not null references public.companies(id) on delete cascade,
  code text not null unique, name text not null, type text not null, serial text, created_at timestamptz not null default now(),
  unique (id, company_id)
);

create table public.contracts (
  id text primary key default gen_random_uuid()::text, company_id text not null references public.companies(id), code text not null unique,
  name text not null default 'Office Care', status public.contract_status not null default 'active', starts_at date not null, ends_at date not null,
  computer_limit integer not null default 8 check (computer_limit = 8), monthly_minutes integer not null default 240 check (monthly_minutes = 240),
  created_at timestamptz not null default now(), check (ends_at >= starts_at), unique (id, company_id)
);

create table public.contract_equipment (
  contract_id text not null, company_id text not null, equipment_id text not null,
  primary key (contract_id, equipment_id),
  foreign key (contract_id, company_id) references public.contracts(id, company_id) on delete cascade,
  foreign key (equipment_id, company_id) references public.equipment(id, company_id) on delete cascade
);

create table public.tickets (
  id text primary key default gen_random_uuid()::text, code text not null unique, company_id text not null references public.companies(id),
  requester_id text, contract_id text, title text not null, description text not null, priority text not null check (priority in ('P1','P2','P3','P4')),
  status public.ticket_status not null default 'new', assignee_id uuid references public.profiles(id),
  created_at timestamptz not null default now(), resolved_at timestamptz, closed_at timestamptz, archived_at timestamptz, archived_reason text,
  foreign key (requester_id, company_id) references public.contacts(id, company_id),
  foreign key (contract_id, company_id) references public.contracts(id, company_id),
  unique (id, company_id), check (closed_at is null or resolved_at is not null)
);

create table public.ticket_comments (
  id text primary key default gen_random_uuid()::text, ticket_id text not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id), body text not null check (length(trim(body)) > 0), created_at timestamptz not null default now()
);

create table public.ticket_history (
  id text primary key default gen_random_uuid()::text, ticket_id text not null references public.tickets(id) on delete cascade,
  actor_id uuid references public.profiles(id), event_type text not null, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table public.time_entries (
  id text primary key default gen_random_uuid()::text, ticket_id text not null, company_id text not null, contract_id text,
  author_id uuid not null references public.profiles(id), description text not null, minutes integer not null check (minutes > 0),
  mode public.service_mode not null, performed_at date not null, competence date not null, billable boolean not null default false,
  consumes_franchise boolean not null default false, billing_exception_reason text, created_at timestamptz not null default now(),
  foreign key (ticket_id, company_id) references public.tickets(id, company_id) on delete cascade,
  foreign key (contract_id, company_id) references public.contracts(id, company_id),
  check (date_trunc('month', performed_at)::date = competence),
  check (mode <> 'onsite' or billable or nullif(trim(billing_exception_reason), '') is not null),
  check (not consumes_franchise or (contract_id is not null and mode = 'remote' and not billable))
);

create index tickets_company_idx on public.tickets(company_id);
create index time_entries_company_competence_idx on public.time_entries(company_id, competence);
create index history_ticket_created_idx on public.ticket_history(ticket_id, created_at);

create function public.current_role() returns public.app_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and active $$;
create function public.current_company_id() returns text language sql stable security definer set search_path = public
as $$ select company_id from public.profiles where id = auth.uid() and active $$;
create function public.is_staff() returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_role() in ('admin','technician'), false) $$;

create function public.validate_contract_equipment_limit() returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.contract_equipment where contract_id = new.contract_id) >= 8 then
    raise exception 'Office Care accepts at most 8 computers';
  end if;
  return new;
end $$;
create trigger contract_equipment_limit before insert on public.contract_equipment for each row execute function public.validate_contract_equipment_limit();

create function public.validate_time_entry_contract() returns trigger language plpgsql set search_path = public as $$
declare selected_contract public.contracts;
begin
  if new.contract_id is null then return new; end if;
  select * into selected_contract from public.contracts where id = new.contract_id and company_id = new.company_id;
  if not found then raise exception 'Contract does not belong to ticket company'; end if;
  if selected_contract.status <> 'active' or new.performed_at < selected_contract.starts_at or new.performed_at > selected_contract.ends_at then
    raise exception 'Contract is not active on service date';
  end if;
  return new;
end $$;
create trigger time_entry_contract before insert or update on public.time_entries for each row execute function public.validate_time_entry_contract();

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.equipment enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_equipment enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.ticket_history enable row level security;
alter table public.time_entries enable row level security;

create policy companies_read on public.companies for select using (public.is_staff() or id = public.current_company_id());
create policy companies_admin_write on public.companies for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy profiles_read on public.profiles for select using (public.is_staff() or id = auth.uid());
create policy profiles_admin_write on public.profiles for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

do $$ declare table_name text; begin
  foreach table_name in array array['contacts','equipment','contracts','tickets','time_entries'] loop
    execute format('create policy %I on public.%I for select using (public.is_staff() or company_id = public.current_company_id())', table_name || '_read', table_name);
    execute format('create policy %I on public.%I for all using (public.is_staff()) with check (public.is_staff())', table_name || '_staff_write', table_name);
  end loop;
end $$;

create policy tickets_client_insert on public.tickets for insert with check (company_id = public.current_company_id());

create policy contract_equipment_read on public.contract_equipment for select using (public.is_staff() or company_id = public.current_company_id());
create policy contract_equipment_staff_write on public.contract_equipment for all using (public.is_staff()) with check (public.is_staff());
create policy comments_read on public.ticket_comments for select using (exists (select 1 from public.tickets t where t.id = ticket_id and (public.is_staff() or t.company_id = public.current_company_id())));
create policy comments_insert on public.ticket_comments for insert with check (author_id = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_id and (public.is_staff() or t.company_id = public.current_company_id())));
create policy history_read on public.ticket_history for select using (exists (select 1 from public.tickets t where t.id = ticket_id and (public.is_staff() or t.company_id = public.current_company_id())));
create policy history_staff_insert on public.ticket_history for insert with check (public.is_staff() and (actor_id is null or actor_id = auth.uid()));

revoke update, delete on public.ticket_history from authenticated;
