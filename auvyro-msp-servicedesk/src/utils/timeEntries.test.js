import test from 'node:test';
import assert from 'node:assert/strict';
import { groupTimeConsumption, normalizeTimeEntry } from './timeEntries.js';

test('normaliza empresa, contrato, competência e faturabilidade do apontamento', () => {
  const entry = normalizeTimeEntry({ createdAt: '2026-10-15T10:00:00-03:00', minutes: 30, type: 'Remoto' }, { company: 'Empresa A', contractId: 'OFFICE-10' });
  assert.equal(entry.company, 'Empresa A');
  assert.equal(entry.contractId, 'OFFICE-10');
  assert.equal(entry.competence, '2026-10');
  assert.equal(entry.billable, false);
});

test('agrupa consumo por empresa, contrato, competência, modalidade e faturabilidade', () => {
  const groups = groupTimeConsumption([
    { company: 'Empresa A', contractId: 'OFFICE-10', competence: '2026-10', type: 'Remoto', billable: false, minutes: 30 },
    { company: 'Empresa A', contractId: 'OFFICE-10', competence: '2026-10', type: 'Remoto', billable: false, minutes: 45 },
    { company: 'Empresa A', contractId: 'OFFICE-10', competence: '2026-10', type: 'Presencial', billable: true, minutes: 60 },
    { company: 'Empresa B', contractId: null, competence: '2026-10', type: 'Remoto', billable: false, minutes: 20 },
  ]);
  assert.equal(groups.length, 3);
  const franchise = groups.find((group) => group.company === 'Empresa A' && group.type === 'Remoto');
  assert.equal(franchise.minutes, 75);
  assert.equal(franchise.entries, 2);
  assert.equal(franchise.billable, false);
});
