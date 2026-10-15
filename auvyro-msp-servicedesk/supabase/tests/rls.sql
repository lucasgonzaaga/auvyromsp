begin;
select plan(51);

-- Papel anon: nenhuma tabela privada pode vazar linhas.
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*) from public.companies), 0::bigint, 'anon cannot read companies');
select is((select count(*) from public.profiles), 0::bigint, 'anon cannot read profiles');
select is((select count(*) from public.contacts), 0::bigint, 'anon cannot read contacts');
select is((select count(*) from public.equipment), 0::bigint, 'anon cannot read equipment');
select is((select count(*) from public.contracts), 0::bigint, 'anon cannot read contracts');
select is((select count(*) from public.contract_equipment), 0::bigint, 'anon cannot read contract equipment');
select is((select count(*) from public.tickets), 0::bigint, 'anon cannot read tickets');
select is((select count(*) from public.ticket_comments), 0::bigint, 'anon cannot read comments');
select is((select count(*) from public.time_entries), 0::bigint, 'anon cannot read time entries');
select is((select count(*) from public.ticket_history), 0::bigint, 'anon cannot read history');

-- Cliente A: isolamento por empresa, escrita de chamado limitada e IDs forjados bloqueados.
set local role authenticated;
select set_config('request.jwt.claim.sub', '01000000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.companies), 1::bigint, 'client reads only own company');
select is((select count(*) from public.tickets), 1::bigint, 'client reads only own tickets');
select is((select count(*) from public.contacts where id = 'contact-b'), 0::bigint, 'client cannot read contact B by forged id');
select throws_ok($$insert into public.companies(name) values ('Forbidden')$$, '42501', null, 'client cannot insert company');
select throws_ok($$insert into public.contacts(company_id,name,email) values ('company-a','Forbidden','x@example.test')$$, '42501', null, 'client cannot insert contact');
select throws_ok($$insert into public.equipment(company_id,name,type) values ('company-a','Forbidden','Desktop')$$, '42501', null, 'client cannot insert equipment');
select throws_ok($$insert into public.contracts(company_id,starts_at,ends_at) values ('company-a','2026-01-01','2026-12-31')$$, '42501', null, 'client cannot insert contract');
select throws_ok($$insert into public.contract_equipment(contract_id,company_id,equipment_id) values ('contract-a','company-a','equipment-a')$$, '42501', null, 'client cannot insert contract equipment');
select throws_ok($$insert into public.time_entries(ticket_id,company_id,author_id,description,minutes,mode,performed_at,competence) values ('ticket-a','company-a','01000000-0000-4000-8000-000000000003','Forbidden',10,'remote','2026-10-15','2026-10-01')$$, '42501', null, 'client cannot insert time entry');
select throws_ok($$insert into public.ticket_history(ticket_id,event_type) values ('ticket-a','forged')$$, '42501', null, 'client cannot forge audit');
select lives_ok($$insert into public.tickets(id,company_id,requester_id,contract_id,title,description,priority) values ('ticket-client-a','company-a','contact-a','contract-a','Help','Valid client ticket','P3')$$, 'client creates own valid ticket');
select throws_ok($$insert into public.tickets(id,company_id,requester_id,title,description,priority) values ('ticket-forged-requester','company-a','contact-b','X','X','P3')$$, 'P0001', null, 'client cannot forge requester from company B');
select throws_ok($$insert into public.tickets(id,company_id,requester_id,contract_id,title,description,priority) values ('ticket-forged-contract','company-a','contact-a','contract-b','X','X','P3')$$, 'P0001', null, 'client cannot forge contract from company B');
select throws_ok($$insert into public.tickets(id,company_id,title,description,priority,status) values ('ticket-forged-status','company-a','X','X','P3','resolved')$$, 'P0001', null, 'client cannot forge lifecycle on insert');
select lives_ok($$update public.tickets set title = 'Edited by client' where id = 'ticket-client-a'$$, 'client edits content while ticket is new');
select throws_ok($$update public.tickets set status = 'triage' where id = 'ticket-client-a'$$, 'P0001', null, 'client cannot alter lifecycle');
select lives_ok($$insert into public.ticket_comments(ticket_id,author_id,body) values ('ticket-a','01000000-0000-4000-8000-000000000003','Client comment')$$, 'client comments own ticket');
select throws_ok($$insert into public.ticket_comments(ticket_id,author_id,body) values ('ticket-b','01000000-0000-4000-8000-000000000003','Cross company')$$, '42501', null, 'client cannot comment ticket B');
select results_eq($$delete from public.tickets where id = 'ticket-a' returning id$$, $$select null::text where false$$, 'client cannot delete ticket');

-- Técnico: opera chamados, comentários e horas, sem alterar cadastros administrativos.
select set_config('request.jwt.claim.sub', '01000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.companies), 2::bigint, 'technician reads all companies');
select throws_ok($$insert into public.companies(name) values ('Forbidden')$$, '42501', null, 'technician cannot insert company');
select throws_ok($$insert into public.contacts(company_id,name,email) values ('company-a','Forbidden','x@example.test')$$, '42501', null, 'technician cannot insert contact');
select throws_ok($$insert into public.equipment(company_id,name,type) values ('company-a','Forbidden','Desktop')$$, '42501', null, 'technician cannot insert equipment');
select throws_ok($$insert into public.contracts(company_id,starts_at,ends_at) values ('company-a','2026-01-01','2026-12-31')$$, '42501', null, 'technician cannot insert contract');
select throws_ok($$insert into public.contract_equipment(contract_id,company_id,equipment_id) values ('contract-a','company-a','equipment-a')$$, '42501', null, 'technician cannot insert contract equipment');
select is((with changed as (update public.profiles set display_name = 'Forbidden' where id = '01000000-0000-4000-8000-000000000003' returning *) select count(*) from changed), 0::bigint, 'technician cannot update profiles');
select lives_ok($$update public.tickets set status = 'triage', assignee_id = '01000000-0000-4000-8000-000000000002' where id = 'ticket-a'$$, 'technician advances and assumes ticket');
select lives_ok($$insert into public.ticket_comments(ticket_id,author_id,body) values ('ticket-a','01000000-0000-4000-8000-000000000002','Technician comment')$$, 'technician comments ticket');
select lives_ok($$insert into public.time_entries(id,ticket_id,company_id,contract_id,author_id,description,minutes,mode,performed_at,competence) values ('time-tech','ticket-a','company-a','contract-a','01000000-0000-4000-8000-000000000002','Remote support',30,'remote','2026-10-15','2026-10-01')$$, 'technician records valid time');
select results_eq($$delete from public.tickets where id = 'ticket-a' returning id$$, $$select null::text where false$$, 'technician cannot delete ticket');
select results_eq($$delete from public.time_entries where id = 'time-tech' returning id$$, $$select null::text where false$$, 'technician cannot delete time entry');

-- Administrador: gerencia cadastros; auditoria continua protegida.
select set_config('request.jwt.claim.sub', '01000000-0000-4000-8000-000000000001', true);
select lives_ok($$insert into public.companies(id,name) values ('company-admin','Admin test')$$, 'admin inserts company');
select lives_ok($$insert into public.contacts(id,company_id,name,email) values ('contact-admin','company-admin','Admin contact','admin@example.test')$$, 'admin inserts contact');
select lives_ok($$insert into public.equipment(id,company_id,name,type) values ('equipment-admin','company-admin','Admin PC','Desktop')$$, 'admin inserts equipment');
select lives_ok($$insert into public.contracts(id,company_id,starts_at,ends_at) values ('contract-admin','company-admin','2026-01-01','2026-12-31')$$, 'admin inserts contract');
select lives_ok($$insert into public.contract_equipment(contract_id,company_id,equipment_id) values ('contract-admin','company-admin','equipment-admin')$$, 'admin links equipment');
select lives_ok($$update public.profiles set display_name = 'Client B reviewed' where id = '01000000-0000-4000-8000-000000000004'$$, 'admin updates profile');
select is((select count(*) from public.companies), 3::bigint, 'admin reads all companies');
select throws_ok($$insert into public.ticket_history(ticket_id,event_type) values ('ticket-a','forged')$$, '42501', null, 'admin cannot forge audit history');

-- Usuário inativo: perfil existe, mas dados operacionais ficam invisíveis.
set local role postgres;
update public.profiles set active = false where id = '01000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '01000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.companies), 0::bigint, 'inactive user cannot read companies');
select is((select count(*) from public.tickets), 0::bigint, 'inactive user cannot read tickets');

select * from finish();
rollback;
