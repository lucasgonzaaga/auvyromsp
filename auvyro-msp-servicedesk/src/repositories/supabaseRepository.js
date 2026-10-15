import { supabase } from '../lib/supabase.js';

const statusFromDb = { new: 'Novo', triage: 'Em triagem', in_progress: 'Em atendimento', waiting_client: 'Aguardando cliente', waiting_third_party: 'Aguardando terceiro', resolved: 'Resolvido', closed: 'Encerrado' };
const statusToDb = Object.fromEntries(Object.entries(statusFromDb).map(([key, value]) => [value, key]));
const contractFromDb = { active: 'Ativo', suspended: 'Suspenso', expired: 'Vencido', cancelled: 'Encerrado' };
const contractToDb = Object.fromEntries(Object.entries(contractFromDb).map(([key, value]) => [value, key]));
const modeFromDb = { remote: 'Remoto', onsite: 'Presencial' };
const modeToDb = { Remoto: 'remote', Presencial: 'onsite' };
const code = (prefix) => `${prefix}-${globalThis.crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;

function assertClient(client) {
  if (!client) throw new Error('Supabase não configurado.');
  return client;
}

function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}

export async function loadOperationalData(client = supabase) {
  const db = assertClient(client);
  const [companies, contacts, equipment, contracts, contractEquipment, tickets, comments, history, entries, profiles] = await Promise.all([
    db.from('companies').select('*').order('name'), db.from('contacts').select('*').order('name'), db.from('equipment').select('*').order('name'),
    db.from('contracts').select('*').order('created_at'), db.from('contract_equipment').select('*'), db.from('tickets').select('*').order('created_at', { ascending: false }),
    db.from('ticket_comments').select('*').order('created_at'), db.from('ticket_history').select('*').order('created_at'),
    db.from('time_entries').select('*').order('created_at'), db.from('profiles').select('id, display_name'),
  ]).then((results) => results.map(unwrap));
  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  const clients = companies.map((company) => ({
    id: company.id, code: company.code, name: company.name, document: company.document || '', status: company.active ? 'Ativo' : 'Inativo',
    contacts: contacts.filter((item) => item.company_id === company.id).map((item) => ({ id: item.id, code: item.code, name: item.name, email: item.email, phone: item.phone || '', authorized: item.authorized })),
    equipment: equipment.filter((item) => item.company_id === company.id).map((item) => ({ id: item.id, code: item.code, name: item.name, type: item.type, serial: item.serial || '' })),
  }));
  const mappedContracts = contracts.map((contract) => ({
    id: contract.id, code: contract.code, companyId: contract.company_id, name: contract.name, status: contractFromDb[contract.status], startsAt: contract.starts_at,
    endsAt: contract.ends_at, computerLimit: contract.computer_limit, monthlyMinutes: contract.monthly_minutes,
    equipmentIds: contractEquipment.filter((item) => item.contract_id === contract.id).map((item) => item.equipment_id),
  }));
  const mappedTickets = tickets.map((ticket) => {
    const company = clients.find((item) => item.id === ticket.company_id);
    const requester = company?.contacts.find((item) => item.id === ticket.requester_id);
    return {
      id: ticket.code, databaseId: ticket.id, companyId: ticket.company_id, company: company?.name || '', requesterId: ticket.requester_id, requester: requester?.name || '',
      contractId: ticket.contract_id, title: ticket.title, description: ticket.description, priority: ticket.priority, status: statusFromDb[ticket.status],
      assigneeId: ticket.assignee_id, assignee: profileNames.get(ticket.assignee_id) || '', createdAt: ticket.created_at, resolvedAt: ticket.resolved_at,
      closedAt: ticket.closed_at, archivedAt: ticket.archived_at, archivedReason: ticket.archived_reason || '',
      comments: comments.filter((item) => item.ticket_id === ticket.id).map((item) => ({ id: item.id, author: profileNames.get(item.author_id) || 'Usuário', authorId: item.author_id, text: item.body, createdAt: item.created_at })),
      timeline: history.filter((item) => item.ticket_id === ticket.id && !['comment', 'time'].includes(item.event_type)).map((item) => ({ id: item.id, type: item.event_type, text: item.payload?.text || item.event_type, author: profileNames.get(item.actor_id) || 'Sistema', createdAt: item.created_at })),
      timeEntries: entries.filter((item) => item.ticket_id === ticket.id).map((item) => ({ id: item.id, companyId: item.company_id, company: company?.name || '', contractId: item.contract_id,
        description: item.description, minutes: item.minutes, type: modeFromDb[item.mode], performedAt: item.performed_at, competence: item.competence.slice(0, 7), billable: item.billable,
        consumesFranchise: item.consumes_franchise, billingExceptionReason: item.billing_exception_reason || '', authorId: item.author_id, author: profileNames.get(item.author_id) || 'Usuário', createdAt: item.created_at })),
    };
  });
  return { clients, contracts: mappedContracts, tickets: mappedTickets };
}

export async function createCompany(data, client = supabase) {
  return unwrap(await assertClient(client).from('companies').insert({ code: code('CLI'), name: data.name.trim(), document: data.document?.trim() || null }).select().single());
}
export async function createContact(companyId, data, client = supabase) {
  return unwrap(await assertClient(client).from('contacts').insert({ company_id: companyId, code: code('CON'), name: data.name.trim(), email: data.email.trim(), phone: data.phone?.trim() || null, authorized: data.authorized !== false }).select().single());
}
export async function createEquipment(companyId, data, client = supabase) {
  return unwrap(await assertClient(client).from('equipment').insert({ company_id: companyId, code: code('EQP'), name: data.name.trim(), type: data.type || 'Desktop', serial: data.serial?.trim() || null }).select().single());
}
export async function createContract(data, client = supabase) {
  return unwrap(await assertClient(client).rpc('create_office_care_contract', { p_company_id: data.companyId, p_code: code('CTR'), p_starts_at: data.startsAt, p_ends_at: data.endsAt, p_status: contractToDb[data.status] || 'active', p_equipment_ids: data.equipmentIds || [] }));
}
export async function createTicket(data, client = supabase) {
  return unwrap(await assertClient(client).from('tickets').insert({ code: code('AUV'), company_id: data.companyId, requester_id: data.requesterId, contract_id: data.contractId || null, title: data.title.trim(), description: data.description.trim(), priority: data.priority, status: 'new' }).select().single());
}
export async function updateTicket(ticket, changes, currentUser, client = supabase) {
  const update = {};
  if (changes.status !== undefined) update.status = statusToDb[changes.status];
  if (changes.priority !== undefined) update.priority = changes.priority;
  if (changes.title !== undefined) update.title = changes.title;
  if (changes.description !== undefined) update.description = changes.description;
  if (changes.requesterId !== undefined) update.requester_id = changes.requesterId;
  if (changes.contractId !== undefined) update.contract_id = changes.contractId || null;
  if (changes.assignee !== undefined) update.assignee_id = changes.assignee ? currentUser.id : null;
  return unwrap(await assertClient(client).from('tickets').update(update).eq('id', ticket.databaseId).select().single());
}
export async function createComment(ticket, text, userId, client = supabase) {
  return unwrap(await assertClient(client).from('ticket_comments').insert({ ticket_id: ticket.databaseId, author_id: userId, body: text.trim() }).select().single());
}
export async function createTimeEntry(ticket, entry, userId, client = supabase) {
  return unwrap(await assertClient(client).from('time_entries').insert({ ticket_id: ticket.databaseId, company_id: ticket.companyId, contract_id: entry.contractId || null, author_id: userId,
    description: entry.description.trim(), minutes: Number(entry.minutes), mode: modeToDb[entry.type], performed_at: entry.performedAt, competence: `${entry.competence}-01`,
    billable: entry.type === 'Presencial' ? entry.billable !== false : entry.billable === true,
    consumes_franchise: Boolean(entry.contractId && entry.type === 'Remoto' && entry.billable !== true), billing_exception_reason: entry.billingExceptionReason?.trim() || null }).select().single());
}
export async function archiveTicket(ticket, reason, client = supabase) {
  return unwrap(await assertClient(client).from('tickets').update({ archived_at: new Date().toISOString(), archived_reason: reason.trim() }).eq('id', ticket.databaseId).select().single());
}
