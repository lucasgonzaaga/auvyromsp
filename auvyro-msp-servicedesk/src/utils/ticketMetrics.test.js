import test from 'node:test';
import assert from 'node:assert/strict';
import { getMetrics, getTicketMinutes } from './ticketMetrics.js';

test('apontamentos arquivados permanecem nos totais históricos', () => {
  const tickets = [
    { status: 'Encerrado', priority: 'P3', archivedAt: '2026-10-15T12:00:00.000Z', resolvedAt: '2026-10-15T10:00:00.000Z', timeEntries: [{ minutes: 45 }, { minutes: 15 }] },
    { status: 'Em atendimento', priority: 'P2', archivedAt: null, resolvedAt: null, timeEntries: [{ minutes: 30 }] },
  ];
  const metrics = getMetrics(tickets);
  assert.equal(metrics.minutes, 90);
  assert.equal(metrics.open, 1);
  assert.equal(getTicketMinutes(tickets[0]), 60);
});
