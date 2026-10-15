import test from 'node:test';
import assert from 'node:assert/strict';
import { addCommentRecord, addTimeRecord, buildTicketActivity, canTransitionStatus, getAllowedStatuses, normalizeTicket, updateTicketRecord } from './ticketService.js';

function ticket(overrides = {}) {
  return normalizeTicket({
    id: 'AUV-0001', company: 'Cliente', requester: 'Pessoa', title: 'Teste',
    description: 'Descrição', priority: 'P3', status: 'Em atendimento',
    createdAt: '2026-10-15T08:00:00-03:00', timeline: [], comments: [], timeEntries: [],
    ...overrides,
  });
}

test('mantém resolução e encerramento em campos separados durante o ciclo de vida', () => {
  const resolvedAt = '2026-10-15T10:00:00.000Z';
  const closedAt = '2026-10-15T11:00:00.000Z';
  const resolved = updateTicketRecord(ticket(), { status: 'Resolvido' }, 'Técnico', resolvedAt);
  assert.equal(resolved.resolvedAt, resolvedAt);
  assert.equal(resolved.closedAt, null);

  const closed = updateTicketRecord(resolved, { status: 'Encerrado' }, 'Técnico', closedAt);
  assert.equal(closed.resolvedAt, resolvedAt);
  assert.equal(closed.closedAt, closedAt);
});

test('rejeita encerramento sem resolução e expõe apenas transições permitidas', () => {
  const fresh = ticket({ status: 'Novo' });
  assert.equal(canTransitionStatus('Novo', 'Encerrado'), false);
  assert.deepEqual(getAllowedStatuses('Novo'), ['Novo', 'Em triagem']);
  assert.throws(() => updateTicketRecord(fresh, { status: 'Encerrado' }, { id: 'tech-1', name: 'Técnico' }), /Transição inválida/);
});

test('operações exigem a identidade da sessão', () => {
  assert.throws(() => updateTicketRecord(ticket(), { priority: 'P2' }), /usuário da sessão/);
  assert.throws(() => addCommentRecord(ticket(), 'Teste'), /usuário da sessão/);
});

test('reabertura limpa as datas do ciclo atual', () => {
  const closed = ticket({ status: 'Encerrado', resolvedAt: '2026-10-15T10:00:00.000Z', closedAt: '2026-10-15T11:00:00.000Z' });
  const reopened = updateTicketRecord(closed, { status: 'Em atendimento' }, 'Técnico', '2026-10-15T12:00:00.000Z');
  assert.equal(reopened.resolvedAt, null);
  assert.equal(reopened.closedAt, null);
});

test('alterações sem transição de status preservam as datas', () => {
  const closed = ticket({ status: 'Encerrado', resolvedAt: '2026-10-15T10:00:00.000Z', closedAt: '2026-10-15T11:00:00.000Z' });
  const updated = updateTicketRecord(closed, { priority: 'P2' }, 'Técnico', '2026-10-15T12:00:00.000Z');
  assert.equal(updated.resolvedAt, closed.resolvedAt);
  assert.equal(updated.closedAt, closed.closedAt);
});

test('linha do tempo exibe comentários e apontamentos uma única vez', () => {
  const activity = buildTicketActivity(ticket({
    timeline: [
      { id: 'created-1', type: 'created', text: 'Chamado aberto', createdAt: '2026-10-15T08:00:00.000Z' },
      { id: 'comment-event', type: 'comment', text: 'Comentário adicionado', createdAt: '2026-10-15T09:00:00.000Z' },
      { id: 'time-event', type: 'time', text: 'Tempo registrado', createdAt: '2026-10-15T09:30:00.000Z' },
    ],
    comments: [{ id: 'comment-1', author: 'Técnico', text: 'Retorno enviado', createdAt: '2026-10-15T09:00:00.000Z' }],
    timeEntries: [{ id: 'time-1', author: 'Técnico', description: 'Diagnóstico', minutes: 30, type: 'Remoto', createdAt: '2026-10-15T09:30:00.000Z' }],
  }));
  assert.deepEqual(activity.map((item) => item.kind).sort(), ['comment', 'event', 'time']);
  assert.equal(activity.filter((item) => item.text === 'Retorno enviado').length, 1);
  assert.equal(activity.filter((item) => item.text === 'Diagnóstico').length, 1);
});

test('novos comentários e apontamentos não criam eventos genéricos duplicados', () => {
  const original = ticket({ timeline: [{ id: 'created-1', type: 'created', text: 'Chamado aberto', createdAt: '2026-10-15T08:00:00.000Z' }] });
  const commented = addCommentRecord(original, 'Retorno enviado', 'Técnico');
  const timed = addTimeRecord(commented, { description: 'Diagnóstico', minutes: 30, type: 'Remoto', competence: '2026-10' }, 'Técnico');
  assert.equal(timed.timeline.length, 1);
  assert.equal(timed.comments.length, 1);
  assert.equal(timed.timeEntries.length, 1);
  assert.equal(buildTicketActivity(timed).length, 3);
});

test('presencial é faturável por padrão e exige justificativa para exceção', () => {
  const base = ticket({ companyId: 'CLI-0001', contractId: 'CTR-0001' });
  const contracts = [{ id: 'CTR-0001', companyId: 'CLI-0001', status: 'Ativo', startsAt: '2026-01-01', endsAt: '2027-12-31' }];
  const billed = addTimeRecord(base, { description: 'Visita', minutes: 60, type: 'Presencial', competence: '2026-10', performedAt: '2026-10-15' }, { name: 'Técnico' }, contracts);
  assert.equal(billed.timeEntries[0].billable, true);
  assert.throws(() => addTimeRecord(base, { description: 'Visita', minutes: 60, type: 'Presencial', billable: false, competence: '2026-10', performedAt: '2026-10-15' }, { name: 'Técnico' }, contracts), /exige justificativa/);
  const exception = addTimeRecord(base, { description: 'Visita', minutes: 60, type: 'Presencial', billable: false, billingExceptionReason: 'Cortesia aprovada', competence: '2026-10', performedAt: '2026-10-15' }, { name: 'Técnico' }, contracts);
  assert.equal(exception.timeEntries[0].billable, false);
  assert.equal(exception.timeEntries[0].billingExceptionReason, 'Cortesia aprovada');
  assert.equal(exception.timeEntries[0].consumesFranchise, false);
});

test('respeita Sem contrato e nunca vincula Office Care automaticamente', () => {
  const clients = [{ id: 'CLI-0001', name: 'Cliente', contacts: [] }];
  const contracts = [{ id: 'CTR-0001', companyId: 'CLI-0001', status: 'Ativo', startsAt: '2026-01-01', endsAt: '2027-12-31' }];
  const normalized = normalizeTicket({ ...ticket(), companyId: 'CLI-0001', company: 'Cliente', contractId: null }, clients, contracts);
  assert.equal(normalized.contractId, null);
  const pointed = addTimeRecord({ ...normalized, timeEntries: [] }, { description: 'Análise', minutes: 30, type: 'Remoto', competence: '2026-10', contractId: null }, { name: 'Técnico' }, contracts);
  assert.equal(pointed.timeEntries[0].contractId, null);
  assert.equal(pointed.timeEntries[0].consumesFranchise, false);
});

test('valida duração, competência e elegibilidade da franquia', () => {
  const base = ticket({ companyId: 'CLI-0001', contractId: 'CTR-0001' });
  const contracts = [{ id: 'CTR-0001', companyId: 'CLI-0001', status: 'Ativo', startsAt: '2026-01-01', endsAt: '2027-12-31' }];
  assert.throws(() => addTimeRecord(base, { description: 'Teste', minutes: 0, type: 'Remoto', competence: '2026-10' }, { name: 'Técnico' }, contracts), /duração/);
  assert.throws(() => addTimeRecord(base, { description: 'Teste', minutes: 30, type: 'Remoto', competence: '2026-13' }, { name: 'Técnico' }, contracts), /competência/);
  const remote = addTimeRecord(base, { description: 'Suporte', minutes: 30, type: 'Remoto', competence: '2026-10', performedAt: '2026-10-15' }, { name: 'Técnico' }, contracts);
  assert.equal(remote.timeEntries[0].consumesFranchise, true);
});
