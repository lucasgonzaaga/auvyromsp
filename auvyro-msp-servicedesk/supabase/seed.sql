-- DADOS EXCLUSIVAMENTE FICTÍCIOS PARA SUPABASE LOCAL.
-- A senha compartilhada abaixo serve apenas para homologação local: AuvyroLocal!2026
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) values
('00000000-0000-0000-0000-000000000000','01000000-0000-4000-8000-000000000001','authenticated','authenticated','admin@auvyro.local',crypt('AuvyroLocal!2026',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"name":"Admin Local"}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','01000000-0000-4000-8000-000000000002','authenticated','authenticated','tecnico@auvyro.local',crypt('AuvyroLocal!2026',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"name":"Técnico Local"}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','01000000-0000-4000-8000-000000000003','authenticated','authenticated','cliente.a@auvyro.local',crypt('AuvyroLocal!2026',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"name":"Cliente A"}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','01000000-0000-4000-8000-000000000004','authenticated','authenticated','cliente.b@auvyro.local',crypt('AuvyroLocal!2026',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"name":"Cliente B"}',now(),now(),'','','','');

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
('01000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000001','{"sub":"01000000-0000-4000-8000-000000000001","email":"admin@auvyro.local"}','email',now(),now(),now()),
('01000000-0000-4000-8000-000000000002','01000000-0000-4000-8000-000000000002','01000000-0000-4000-8000-000000000002','{"sub":"01000000-0000-4000-8000-000000000002","email":"tecnico@auvyro.local"}','email',now(),now(),now()),
('01000000-0000-4000-8000-000000000003','01000000-0000-4000-8000-000000000003','01000000-0000-4000-8000-000000000003','{"sub":"01000000-0000-4000-8000-000000000003","email":"cliente.a@auvyro.local"}','email',now(),now(),now()),
('01000000-0000-4000-8000-000000000004','01000000-0000-4000-8000-000000000004','01000000-0000-4000-8000-000000000004','{"sub":"01000000-0000-4000-8000-000000000004","email":"cliente.b@auvyro.local"}','email',now(),now(),now());

insert into public.companies (id, code, name, document) values
('company-a','CLI-TEST-A','Empresa Fictícia Aurora','00.000.000/0001-01'),
('company-b','CLI-TEST-B','Empresa Fictícia Boreal','00.000.000/0001-02');
insert into public.profiles (id, company_id, role, display_name) values
('01000000-0000-4000-8000-000000000001',null,'admin','Admin Local'),
('01000000-0000-4000-8000-000000000002',null,'technician','Técnico Local'),
('01000000-0000-4000-8000-000000000003','company-a','client','Cliente A'),
('01000000-0000-4000-8000-000000000004','company-b','client','Cliente B');
insert into public.contacts (id, company_id, code, name, email, authorized, user_id) values
('contact-a','company-a','CON-TEST-A','Contato Aurora','contato.a@example.test',true,'01000000-0000-4000-8000-000000000003'),
('contact-b','company-b','CON-TEST-B','Contato Boreal','contato.b@example.test',true,'01000000-0000-4000-8000-000000000004');
insert into public.equipment (id, company_id, code, name, type, serial) values
('equipment-a','company-a','EQP-TEST-A','AURORA-PC-01','Desktop','TEST-A-001'),
('equipment-b','company-b','EQP-TEST-B','BOREAL-PC-01','Notebook','TEST-B-001');
insert into public.contracts (id, company_id, code, status, starts_at, ends_at) values
('contract-a','company-a','CTR-TEST-A','active','2026-01-01','2027-12-31'),
('contract-b','company-b','CTR-TEST-B','active','2026-01-01','2027-12-31');
insert into public.contract_equipment (contract_id, company_id, equipment_id) values
('contract-a','company-a','equipment-a'),('contract-b','company-b','equipment-b');
insert into public.tickets (id, code, company_id, requester_id, contract_id, title, description, priority) values
('ticket-a','AUV-TEST-A','company-a','contact-a','contract-a','Chamado fictício Aurora','Registro exclusivo para homologação local.','P3'),
('ticket-b','AUV-TEST-B','company-b','contact-b','contract-b','Chamado fictício Boreal','Registro exclusivo para homologação local.','P3');
