begin;
select no_plan();

select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef), 0::bigint, 'no exposed SECURITY DEFINER functions');
select ok(not has_schema_privilege('anon','private','USAGE'), 'anon cannot use private schema');
select ok(not has_schema_privilege('authenticated','private','CREATE'), 'users cannot replace private functions');
select ok(not has_schema_privilege('authenticated','public','CREATE'), 'users cannot inject public objects');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.prosecdef and not coalesce(p.proconfig @> array['search_path=""'],false)),
  0::bigint, 'every private definer has empty search_path');
select is((select count(*) from pg_policies where schemaname='public' and roles <> array['authenticated']::name[]),
  0::bigint, 'business policies restricted to authenticated');
select ok(not has_function_privilege('authenticated','private.audit_operational_change()','EXECUTE'), 'audit cannot be called by users');
select ok(not has_function_privilege('anon','private.audit_operational_change()','EXECUTE'), 'audit cannot be called by anon');
select ok(not has_function_privilege('authenticated','public.enforce_ticket_rules()','EXECUTE'), 'ticket trigger is not callable');
select ok(not has_function_privilege('authenticated','public.validate_ticket_relations()','EXECUTE'), 'relation trigger is not callable');
select ok(not has_function_privilege('authenticated','public.validate_time_entry_contract()','EXECUTE'), 'time trigger is not callable');
select ok(not has_function_privilege('authenticated','public.validate_contract_equipment_limit()','EXECUTE'), 'equipment trigger is not callable');
select ok(not has_function_privilege('anon','public.create_office_care_contract(text,date,date,public.contract_status,text[])','EXECUTE'), 'anon cannot call contract RPC');
select ok(not has_table_privilege(r,t,'TRUNCATE') and not has_table_privilege(r,t,'TRIGGER'), r || ' cannot truncate or attach triggers: ' || t)
from unnest(array['anon','authenticated']) r cross join unnest(array[
 'public.companies','public.profiles','public.contacts','public.equipment','public.contracts',
 'public.contract_equipment','public.tickets','public.ticket_comments','public.ticket_history','public.time_entries']) t;

set local role anon;
select set_config('request.jwt.claim.sub','01000000-0000-4000-8000-000000000001',true);
select throws_ok('select public.current_role()', '42501', null, 'anon cannot invoke role lookup even with forged sub');
select throws_ok('select public.current_company_id()', '42501', null, 'anon cannot invoke company lookup');
select throws_ok('select public.is_staff()', '42501', null, 'anon cannot invoke staff lookup');
select throws_ok('select private.current_role()', '42501', null, 'anon cannot invoke private lookup');
select is((select count(*) from public.companies),0::bigint,'anon with forged admin sub sees no companies');
select throws_ok('truncate public.ticket_history', '42501', null, 'anon cannot erase audit with TRUNCATE');

set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
select is(public.current_role(),null::public.app_role,'missing subject has no role');
select is(public.current_company_id(),null::text,'missing subject has no company');
select is(public.is_staff(),false,'missing subject is not staff');
select set_config('request.jwt.claim.sub','01000000-0000-4000-8000-000000000099',true);
select is(public.current_role(),null::public.app_role,'unknown subject has no role');
select is((select count(*) from public.tickets),0::bigint,'unknown subject has no tickets');

select set_config('request.jwt.claim.sub','01000000-0000-4000-8000-000000000003',true);
select is(public.current_role(),'client'::public.app_role,'client role resolves without profiles recursion');
select is(private.current_company_id(),'company-a','private lookup returns only own company');
select is(public.is_staff(),false,'client is not staff');
select is((select count(*) from public.profiles),1::bigint,'client sees only own profile');
select results_eq($$update public.profiles set role='admin' where id=auth.uid() returning id$$,
  $$select null::uuid where false$$,'client cannot elevate own role');
select is((select count(*) from public.ticket_history where ticket_id='ticket-b'),0::bigint,'client cannot read other company audit');
select set_config('request.jwt.claim.sub','01000000-0000-4000-8000-000000000004',true);
select is(public.current_company_id(),'company-b','second client resolves company B');
select is((select count(*) from public.tickets where company_id='company-a'),0::bigint,'second client cannot read company A');

select set_config('request.jwt.claim.sub','01000000-0000-4000-8000-000000000002',true);
select is(public.current_role(),'technician'::public.app_role,'technician role preserved');
select is(public.is_staff(),true,'technician is staff');
select is((select count(*) from public.profiles),4::bigint,'technician reads profiles without recursion');
select throws_ok('truncate public.ticket_history','42501',null,'technician cannot erase audit');
select set_config('request.jwt.claim.sub','01000000-0000-4000-8000-000000000001',true);
select is(public.current_role(),'admin'::public.app_role,'admin role preserved');
select is(public.is_staff(),true,'admin is staff');
select is((select count(*) from public.profiles),4::bigint,'admin reads profiles without recursion');
select throws_ok('select private.audit_operational_change()','42501',null,'admin cannot directly execute privileged audit');
select throws_ok('truncate public.companies cascade','42501',null,'admin app role cannot bypass RLS with TRUNCATE');
select lives_ok($$insert into public.ticket_comments(id,ticket_id,author_id,body) values ('hardening-comment','ticket-a',auth.uid(),'Audit trigger still works')$$,'private audit trigger executes without caller EXECUTE');
select is((select count(*) from public.ticket_history where payload->>'comment_id'='hardening-comment'),1::bigint,'private trigger records audit');

set local role postgres;
update public.profiles set active=false where id='01000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-4000-8000-000000000003',true);
select is(public.current_role(),null::public.app_role,'inactive client has no role');
select is(public.current_company_id(),null::text,'inactive client has no company');
select is(public.is_staff(),false,'inactive client is not staff');
select is((select count(*) from public.tickets),0::bigint,'inactive client sees no tickets');
select * from finish();
rollback;
