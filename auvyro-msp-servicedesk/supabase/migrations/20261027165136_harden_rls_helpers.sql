-- v0.4.4: preserve function OIDs (policy/trigger dependencies) while moving
-- privileged implementations outside the Data API's public/graphql_public schemas.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke create on schema public from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;

alter function public.current_role() set schema private;
alter function private.current_role() set search_path = '';
alter function public.current_company_id() set schema private;
alter function private.current_company_id() set search_path = '';
alter function public.is_staff() set schema private;
-- No elevated privileges are necessary for composition of the profile lookup.
create or replace function private.is_staff() returns boolean
language sql stable security invoker set search_path = ''
as $$ select coalesce(private.current_role() in ('admin','technician'), false) $$;

-- Invoker wrappers retain the names used by enforce_ticket_rules and callers.
-- Only the zero-argument private lookups bypass profiles RLS; they always filter
-- by auth.uid() and active, never accept a caller-selected user/company.
create function public.current_role() returns public.app_role
language sql stable security invoker set search_path = ''
as $$ select private.current_role() $$;
create function public.current_company_id() returns text
language sql stable security invoker set search_path = ''
as $$ select private.current_company_id() $$;
create function public.is_staff() returns boolean
language sql stable security invoker set search_path = ''
as $$ select private.is_staff() $$;

revoke all on function private.current_role(), private.current_company_id(), private.is_staff(),
  public.current_role(), public.current_company_id(), public.is_staff() from public, anon, authenticated;
grant execute on function private.current_role(), private.current_company_id(), private.is_staff(),
  public.current_role(), public.current_company_id(), public.is_staff() to authenticated;

-- Existing audit triggers retain their dependency on this function's OID.
alter function public.audit_operational_change() set schema private;
alter function private.audit_operational_change() set search_path = '';
revoke all on function private.audit_operational_change() from public, anon, authenticated;

-- Trigger execution does not require a runtime EXECUTE grant for the caller.
alter function public.enforce_ticket_rules() set search_path = '';
alter function public.validate_ticket_relations() set search_path = '';
alter function public.validate_time_entry_contract() set search_path = '';
alter function public.validate_contract_equipment_limit() set search_path = '';
alter function public.create_office_care_contract(text, date, date, public.contract_status, text[]) set search_path = '';

-- Policies no longer run authenticated-only helper functions for anon.
-- Keep anon SELECT compatibility: all business tables return zero rows.
do $$
declare p record; t text;
begin
  for p in select tablename, policyname from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = any(array[
      'companies','profiles','contacts','equipment','contracts','contract_equipment',
      'tickets','ticket_comments','ticket_history','time_entries'])
  loop
    execute format('alter policy %I on public.%I to authenticated', p.policyname, p.tablename);
  end loop;
  foreach t in array array['companies','profiles','contacts','equipment','contracts','contract_equipment',
    'tickets','ticket_comments','ticket_history','time_entries']
  loop
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to anon, authenticated', t);
  end loop;
end $$;
grant insert, update, delete on public.companies, public.profiles, public.contacts,
  public.equipment, public.contracts, public.contract_equipment to authenticated;
-- Retain DELETE grants so existing callers receive zero rows from RLS, as before.
grant insert, update, delete on public.tickets, public.time_entries to authenticated;
grant insert on public.ticket_comments to authenticated;
revoke all on sequence public.company_code_seq, public.contact_code_seq, public.equipment_code_seq,
  public.contract_code_seq, public.ticket_code_seq from public, anon;
commit;
