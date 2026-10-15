begin;
select plan(8);

insert into auth.users(id, email) values
  ('00000000-0000-4000-8000-000000000001', 'admin@example.test'),
  ('00000000-0000-4000-8000-000000000002', 'tech@example.test'),
  ('00000000-0000-4000-8000-000000000003', 'client-a@example.test'),
  ('00000000-0000-4000-8000-000000000004', 'client-b@example.test');
insert into public.companies(id, code, name) values
  ('company-a', 'CLI-A', 'Company A'),
  ('company-b', 'CLI-B', 'Company B');
insert into public.profiles(id, company_id, role, display_name) values
  ('00000000-0000-4000-8000-000000000001', null, 'admin', 'Admin'),
  ('00000000-0000-4000-8000-000000000002', null, 'technician', 'Tech'),
  ('00000000-0000-4000-8000-000000000003', 'company-a', 'client', 'Client A'),
  ('00000000-0000-4000-8000-000000000004', 'company-b', 'client', 'Client B');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select results_eq('select code from public.companies order by code', array['CLI-A'], 'client reads only own company');
select lives_ok($$select * from public.contacts$$, 'client can query own contacts');
select throws_ok($$insert into public.companies(code,name) values ('X','X')$$, '42501', null, 'client cannot create company');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select results_eq('select count(*)::integer from public.companies', array[2], 'technician reads all companies');
select throws_ok($$insert into public.companies(code,name) values ('X','X')$$, '42501', null, 'technician cannot create company');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select lives_ok($$insert into public.companies(code,name) values ('CLI-C','Company C')$$, 'admin creates company');
select results_eq('select count(*)::integer from public.companies', array[3], 'admin reads all companies');
select throws_ok($$update public.ticket_history set event_type = 'tampered'$$, '42501', null, 'history is append-only');

select * from finish();
rollback;
