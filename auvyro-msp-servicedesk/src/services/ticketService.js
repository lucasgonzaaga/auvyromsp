import { normalizeTimeEntry } from '../utils/timeEntries.js';
import { assertContractCompany } from './contractService.js';

const STORAGE_KEY = 'auvyro-msp-tickets-v3';
const LEGACY_KEYS = ['auvyro-msp-demo-tickets-v2', 'auvyro-msp-demo-tickets-v1'];

const seed = [
  { id: 'AUV-0248', company: 'Vértice Contabilidade', requester: 'Ana Silva', title: 'Estação da recepção sem acesso à internet', description: 'Computador da recepção sem conexão desde o início do expediente.', priority: 'P1', status: 'Em atendimento', assignee: 'Alex Santos', createdAt: '2026-10-15T08:42:00-03:00', resolvedAt: null, timeEntries: [{ id: 'time-248', description: 'Diagnóstico remoto de conectividade', minutes: 38, type: 'Remoto', author: 'Alex Santos', createdAt: '2026-10-15T09:02:00-03:00' }], comments: [], timeline: [{ id: 'event-248-1', type: 'created', text: 'Chamado aberto por Ana Silva', createdAt: '2026-10-15T08:42:00-03:00' }, { id: 'event-248-2', type: 'status', text: 'Alex Santos iniciou o atendimento', createdAt: '2026-10-15T08:54:00-03:00' }] },
  { id: 'AUV-0247', company: 'Norte Sul Logística', requester: 'João Costa', title: 'Configuração de impressora no financeiro', description: 'Nova estação precisa acessar a impressora do setor financeiro.', priority: 'P3', status: 'Novo', assignee: '', createdAt: '2026-10-15T08:16:00-03:00', resolvedAt: null, timeEntries: [], comments: [], timeline: [{ id: 'event-247-1', type: 'created', text: 'Chamado aberto por João Costa', createdAt: '2026-10-15T08:16:00-03:00' }] },
  { id: 'AUV-0246', company: 'Clínica Horizonte', requester: 'Mariana Souza', title: 'Usuário bloqueado no Microsoft 365', description: 'Usuário não consegue acessar o e-mail após troca de senha.', priority: 'P2', status: 'Aguardando cliente', assignee: 'Alex Santos', createdAt: '2026-10-14T16:21:00-03:00', resolvedAt: null, timeEntries: [{ id: 'time-246', description: 'Validação de acesso e políticas', minutes: 22, type: 'Remoto', author: 'Alex Santos', createdAt: '2026-10-14T16:40:00-03:00' }], comments: [{ id: 'comment-246', author: 'Alex Santos', text: 'Solicitei ao usuário um teste em janela anônima.', createdAt: '2026-10-14T16:52:00-03:00' }], timeline: [{ id: 'event-246-1', type: 'created', text: 'Chamado aberto por Mariana Souza', createdAt: '2026-10-14T16:21:00-03:00' }, { id: 'event-246-2', type: 'status', text: 'Status alterado para Aguardando cliente', createdAt: '2026-10-14T16:52:00-03:00' }] },
  { id: 'AUV-0245', company: 'Vértice Contabilidade', requester: 'Rafael Lima', title: 'Atualização do sistema contábil', description: 'Atualização concluída nas estações do escritório.', priority: 'P4', status: 'Resolvido', assignee: 'Alex Santos', createdAt: '2026-10-15T07:35:00-03:00', resolvedAt: '2026-10-15T09:11:00-03:00', timeEntries: [{ id: 'time-245', description: 'Atualização e validação em cinco estações', minutes: 75, type: 'Presencial', author: 'Alex Santos', createdAt: '2026-10-15T08:00:00-03:00' }], comments: [], timeline: [{ id: 'event-245-1', type: 'created', text: 'Chamado aberto por Rafael Lima', createdAt: '2026-10-15T07:35:00-03:00' }, { id: 'event-245-2', type: 'resolved', text: 'Chamado resolvido por Alex Santos', createdAt: '2026-10-15T09:11:00-03:00' }] },
  { id: 'AUV-0244', company: 'Orbe Engenharia', requester: 'Carla Menezes', title: 'VPN desconecta durante acesso remoto', description: 'Conexão cai após alguns minutos de uso.', priority: 'P2', status: 'Em triagem', assignee: '', createdAt: '2026-10-14T10:35:00-03:00', resolvedAt: null, timeEntries: [], comments: [], timeline: [{ id: 'event-244-1', type: 'created', text: 'Chamado aberto por Carla Menezes', createdAt: '2026-10-14T10:35:00-03:00' }] },
];

const nowIso = () => new Date().toISOString();
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const STATUS_TRANSITIONS = Object.freeze({
  Novo: ['Em triagem'],
  'Em triagem': ['Em atendimento', 'Aguardando cliente', 'Aguardando terceiro'],
  'Em atendimento': ['Aguardando cliente', 'Aguardando terceiro', 'Resolvido'],
  'Aguardando cliente': ['Em atendimento'],
  'Aguardando terceiro': ['Em atendimento'],
  Resolvido: ['Encerrado', 'Em atendimento'],
  Encerrado: ['Em atendimento'],
});

export function canTransitionStatus(from, to) {
  return from === to || (STATUS_TRANSITIONS[from] || []).includes(to);
}

export function getAllowedStatuses(status) {
  return [status, ...(STATUS_TRANSITIONS[status] || [])];
}

function actorName(actor) {
  const name = typeof actor === 'string' ? actor : actor?.name;
  if (!name) throw new TypeError('A operação exige um usuário da sessão.');
  return name;
}

export function normalizeTicket(ticket, clients = [], contracts = []) {
  const legacyMinutes = Number(ticket.minutes) || 0;
  const client = clients.find((item) => item.id === ticket.companyId) || clients.find((item) => item.name === ticket.company);
  const contact = client?.contacts.find((item) => item.id === ticket.requesterId) || client?.contacts.find((item) => item.name === ticket.requester);
  const companyId = client?.id || ticket.companyId || null;
  const contract = contracts.find((item) => item.id === ticket.contractId && item.companyId === companyId) || contracts.find((item) => item.companyId === companyId && item.status === 'Ativo');
  const contractId = contracts.length ? contract?.id || null : ticket.contractId || null;
  return {
    ...ticket,
    companyId,
    company: client?.name || ticket.company || '',
    requesterId: contact?.id || ticket.requesterId || null,
    requester: contact?.name || ticket.requester || '',
    contractId,
    assignee: ticket.assignee || '',
    resolvedAt: ticket.resolvedAt || null,
    closedAt: ticket.closedAt || null,
    archivedAt: ticket.archivedAt || null,
    archivedReason: ticket.archivedReason || '',
    comments: Array.isArray(ticket.comments) ? ticket.comments : [],
    timeline: Array.isArray(ticket.timeline) && ticket.timeline.length ? ticket.timeline : [{ id: uid('event'), type: 'created', text: `Chamado aberto por ${ticket.requester}`, createdAt: ticket.createdAt }],
    timeEntries: (Array.isArray(ticket.timeEntries) ? ticket.timeEntries : legacyMinutes ? [{ id: uid('time'), description: 'Tempo importado da versão anterior', minutes: legacyMinutes, type: 'Remoto', author: 'Equipe Auvyro', createdAt: ticket.createdAt }] : []).map((entry) => normalizeTimeEntry(entry, { ...ticket, companyId, company: client?.name || ticket.company || '', contractId })),
  };
}

export function loadTickets(clients = [], contracts = []) {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacyKey = LEGACY_KEYS.find((key) => localStorage.getItem(key));
      if (legacyKey) raw = localStorage.getItem(legacyKey);
    }
    const parsed = raw ? JSON.parse(raw) : seed;
    return Array.isArray(parsed) ? parsed.map((ticket) => normalizeTicket(ticket, clients, contracts)) : seed.map((ticket) => normalizeTicket(ticket, clients, contracts));
  } catch { return seed.map((ticket) => normalizeTicket(ticket, clients, contracts)); }
}

export function saveTickets(tickets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

export function createTicket(tickets, form, clients, contracts) {
  const client = clients.find((item) => item.id === form.companyId);
  if (!client) throw new RangeError('Empresa não encontrada.');
  const contact = client.contacts.find((item) => item.id === form.requesterId && item.authorized);
  if (!contact) throw new RangeError('O solicitante não é um contato autorizado da empresa.');
  assertContractCompany(form.contractId, client.id, contracts);
  const numericIds = tickets.map((ticket) => Number(ticket.id.replace('AUV-', ''))).filter(Number.isFinite);
  const id = `AUV-${String(Math.max(0, ...numericIds) + 1).padStart(4, '0')}`;
  const createdAt = nowIso();
  return normalizeTicket({ ...form, company: client.name, requester: contact.name, id, status: 'Novo', assignee: '', createdAt, resolvedAt: null, closedAt: null, timeline: [{ id: uid('event'), type: 'created', text: `Chamado aberto por ${contact.name}`, createdAt }] }, clients, contracts);
}

export function updateTicketRecord(ticket, changes, actor, createdAt = nowIso()) {
  const userName = actorName(actor);
  if (changes.status && !canTransitionStatus(ticket.status, changes.status)) {
    throw new RangeError(`Transição inválida: ${ticket.status} → ${changes.status}.`);
  }
  const events = [];
  if (changes.status && changes.status !== ticket.status) events.push({ id: uid('event'), type: 'status', text: `Status alterado de ${ticket.status} para ${changes.status}`, createdAt });
  if (changes.priority && changes.priority !== ticket.priority) events.push({ id: uid('event'), type: 'priority', text: `Prioridade alterada de ${ticket.priority} para ${changes.priority}`, createdAt });
  if (changes.assignee !== undefined && changes.assignee !== ticket.assignee) events.push({ id: uid('event'), type: 'assignee', text: changes.assignee ? `${userName} assumiu o chamado` : 'Responsável removido', createdAt });
  let resolvedAt = ticket.resolvedAt || null;
  let closedAt = ticket.closedAt || null;
  if (changes.status && changes.status !== ticket.status) {
    if (changes.status === 'Resolvido') {
      resolvedAt = createdAt;
      closedAt = null;
    } else if (changes.status === 'Encerrado') {
      closedAt = createdAt;
    } else if (['Resolvido', 'Encerrado'].includes(ticket.status)) {
      resolvedAt = null;
      closedAt = null;
    }
  }
  return { ...ticket, ...changes, resolvedAt, closedAt, timeline: [...ticket.timeline, ...events] };
}

export function addCommentRecord(ticket, text, actor) {
  const author = actorName(actor);
  const createdAt = nowIso();
  return { ...ticket, comments: [...ticket.comments, { id: uid('comment'), author, text, createdAt }] };
}

export function addTimeRecord(ticket, entry, actor, contracts = []) {
  const author = actorName(actor);
  const createdAt = nowIso();
  const contractId = entry.contractId || ticket.contractId || null;
  assertContractCompany(contractId, ticket.companyId, contracts);
  const billable = entry.type === 'Presencial' ? entry.billable !== false : entry.billable === true;
  if (entry.type === 'Presencial' && !billable && !entry.billingExceptionReason?.trim()) throw new RangeError('Atendimento presencial não faturável exige justificativa.');
  const timeEntry = normalizeTimeEntry({ id: uid('time'), ...entry, contractId, billable, billingExceptionReason: entry.billingExceptionReason?.trim() || '', minutes: Number(entry.minutes), author, createdAt }, ticket);
  return { ...ticket, timeEntries: [...ticket.timeEntries, timeEntry] };
}

export function archiveTicketRecord(ticket, reason, actor) {
  const userName = actorName(actor);
  const createdAt = nowIso();
  return { ...ticket, archivedAt: createdAt, archivedReason: reason, timeline: [...ticket.timeline, { id: uid('event'), type: 'archived', text: `${userName} arquivou o chamado: ${reason}`, createdAt }] };
}

export function buildTicketActivity(ticket) {
  const activity = [
    ...(ticket.timeline || []).filter((item) => !['comment', 'time'].includes(item.type)).map((item) => ({ ...item, kind: 'event' })),
    ...(ticket.comments || []).map((item) => ({ ...item, kind: 'comment', text: item.text })),
    ...(ticket.timeEntries || []).map((item) => ({ ...item, kind: 'time', text: item.description })),
  ];
  const seen = new Set();
  return activity
    .filter((item) => {
      const key = `${item.kind}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
