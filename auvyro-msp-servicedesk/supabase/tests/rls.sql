begin;
select plan(16);

insert into auth.users(id, email) values
  ('00000000-0000-4000-8000-000000000001', 'admin@example.test'),
  ('00000000-0000-4000-8000-000000000002', 'tech@example.test'),
  ('00000000-0000-4000-8000-000000000003', 'client-a@example.test'),
  ('00000000-0000-4000-8000-000000000004', 'client-b@example.test');
insert into public.companies(id, code, name) values ('company-a', 'CLI-A', 'Company A'), ('company-b', 'CLI-B', 'Company B');
insert into public.profiles(id, company_id, role, display_name) values
  ('00000000-0000-4000-8000-000000000001', null, 'admin', 'Admin'),
  ('00000000-0000-4000-8000-000000000002', null, 'technician', 'Tech'),
  ('00000000-0000-4000-8000-000000000003', 'company-a', 'client', 'Client A'),
  ('00000000-0000-4000-8000-000000000004', 'company-b', 'client', 'Client B');
insert into public.contacts(id, company_id, code, name, email) values
  ('contact-a', 'company-a', 'CON-A', 'Contact A', 'a@example.test'), ('contact-b', 'company-b', 'CON-B', 'Contact B', 'b@example.test');
insert into public.tickets(id, code, company_id, requester_id, title, description, priority) values
  ('ticket-a', 'AUV-A', 'company-a', 'contact-a', 'Ticket A', 'A', 'P3'), ('ticket-b', 'AUV-B', 'company-b', 'contact-b', 'Ticket B', 'B', 'P3');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select results_eq('select code from public.companies order by code', array['CLI-A'], 'client reads only own company');
select results_eq('select code from public.tickets order by code', array['AUV-A'], 'client cannot read tickets from another company');
select results_eq('select code from public.contacts order by code', array['CON-A'], 'client cannot read contacts from another company');
select throws_ok($$insert into public.companies(code,name) values ('X','X')$$, '42501', null, 'client cannot create company');
select throws_ok($$insert into public.contacts(company_id,code,name,email) values ('company-a','X','X','x@example.test')$$, '42501', null, 'client cannot create contact');
select throws_ok($$insert into public.tickets(code,company_id,title,description,priority,status) values ('BAD','company-a','X','X','P3','resolved')$$, 'P0001', null, 'client cannot forge lifecycle on ticket creation');
select lives_ok($$insert into public.tickets(code,company_id,requester_id,title,description,priority) values ('AUV-CLIENT','company-a','contact-a','Help','Help','P3')$$, 'client can create a valid ticket for own company');
select throws_ok($$insert into public.time_entries(ticket_id,company_id,author_id,description,minutes,mode,performed_at,competence) values ('ticket-a','company-a','00000000-0000-4000-8000-000000000003','X',10,'remote','2026-10-15','2026-10-01')$$, '42501', null, 'client cannot create time entry');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select results_eq('select count(*)::integer from public.companies', array[2], 'technician reads all companies');
select throws_ok($$insert into public.companies(code,name) values ('TECH','X')$$, '42501', null, 'technician cannot create company');
select throws_ok($$insert into public.contacts(company_id,code,name,email) values ('company-a','TECH','X','x@example.test')$$, '42501', null, 'technician cannot change master data');
select lives_ok($$update public.tickets set status = 'triage' where id = 'ticket-a'$$, 'technician can advance ticket');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select lives_ok($$insert into public.companies(code,name) values ('CLI-C','Company C')$$, 'admin creates company');
select lives_ok($$insert into public.contacts(company_id,code,name,email) values ('company-a','CON-ADMIN','Admin contact','admin@example.test')$$, 'admin manages contacts');
select results_eq('select count(*)::integer from public.companies', array[3], 'admin reads all companies');
select throws_ok($$insert into public.ticket_history(ticket_id,event_type) values ('ticket-a','forged')$$, '42501', null, 'authenticated users cannot forge audit history');

select * from finish();
rollback;
