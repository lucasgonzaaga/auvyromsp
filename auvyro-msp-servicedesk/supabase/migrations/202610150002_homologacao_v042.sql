-- Hardening da v0.4.2: códigos concorrentes, privilégios mínimos e escrita imutável.
create sequence public.company_code_seq;
create sequence public.contact_code_seq;
create sequence public.equipment_code_seq;
create sequence public.contract_code_seq;
create sequence public.ticket_code_seq;

alter table public.companies alter column code set default 'CLI-' || lpad(nextval('public.company_code_seq')::text, 6, '0');
alter table public.contacts alter column code set default 'CON-' || lpad(nextval('public.contact_code_seq')::text, 6, '0');
alter table public.equipment alter column code set default 'EQP-' || lpad(nextval('public.equipment_code_seq')::text, 6, '0');
alter table public.contracts alter column code set default 'CTR-' || lpad(nextval('public.contract_code_seq')::text, 6, '0');
alter table public.tickets alter column code set default 'AUV-' || lpad(nextval('public.ticket_code_seq')::text, 6, '0');

drop function public.create_office_care_contract(text, text, date, date, public.contract_status, text[]);
create function public.create_office_care_contract(p_company_id text, p_starts_at date, p_ends_at date, p_status public.contract_status, p_equipment_ids text[])
returns public.contracts language plpgsql security invoker set search_path = public as $$
declare created public.contracts; equipment_id text;
begin
  if coalesce(array_length(p_equipment_ids, 1), 0) > 8 then raise exception 'Office Care accepts at most 8 computers'; end if;
  insert into public.contracts(company_id, starts_at, ends_at, status) values (p_company_id, p_starts_at, p_ends_at, p_status) returning * into created;
  foreach equipment_id in array coalesce(p_equipment_ids, array[]::text[]) loop
    insert into public.contract_equipment(contract_id, company_id, equipment_id) values (created.id, p_company_id, equipment_id);
  end loop;
  return created;
end $$;

create function public.validate_ticket_relations() returns trigger language plpgsql set search_path = public as $$
begin
  if new.requester_id is not null and not exists (
    select 1 from public.contacts where id = new.requester_id and company_id = new.company_id and authorized
  ) then raise exception 'Requester must be an authorized contact from ticket company'; end if;
  if new.contract_id is not null and not exists (
    select 1 from public.contracts where id = new.contract_id and company_id = new.company_id and status = 'active' and current_date between starts_at and ends_at
  ) then raise exception 'Contract must be active for ticket company'; end if;
  return new;
end $$;
create trigger validate_ticket_relations before insert or update of company_id, requester_id, contract_id on public.tickets for each row execute function public.validate_ticket_relations();

drop policy tickets_staff_write on public.tickets;
create policy tickets_staff_insert on public.tickets for insert with check (public.is_staff());
create policy tickets_staff_update on public.tickets for update using (public.is_staff()) with check (public.is_staff());
drop policy time_entries_staff_write on public.time_entries;
create policy time_entries_staff_insert on public.time_entries for insert with check (public.is_staff() and author_id = auth.uid());

revoke all on function public.audit_operational_change() from public, anon, authenticated;
revoke all on function public.enforce_ticket_rules() from public, anon, authenticated;
revoke all on function public.validate_ticket_relations() from public, anon, authenticated;
revoke all on function public.validate_time_entry_contract() from public, anon, authenticated;
revoke all on function public.validate_contract_equipment_limit() from public, anon, authenticated;
revoke all on function public.create_office_care_contract(text, date, date, public.contract_status, text[]) from public, anon;
grant execute on function public.create_office_care_contract(text, date, date, public.contract_status, text[]) to authenticated;

revoke all on sequence public.company_code_seq, public.contact_code_seq, public.equipment_code_seq, public.contract_code_seq, public.ticket_code_seq from anon;
grant usage, select on sequence public.company_code_seq, public.contact_code_seq, public.equipment_code_seq, public.contract_code_seq, public.ticket_code_seq to authenticated;
