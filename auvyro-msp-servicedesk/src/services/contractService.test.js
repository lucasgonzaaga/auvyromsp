import test from 'node:test';
import assert from 'node:assert/strict';
import { assertContractCompany, createContractRecord, getMonthlyConsumption } from './contractService.js';

const clients = [{ id: 'CLI-0001', equipment: Array.from({ length: 9 }, (_, index) => ({ id: `EQP-${index + 1}` })) }, { id: 'CLI-0002', equipment: [{ id: 'EQP-B1' }] }];

test('impede contrato com mais de oito computadores ou equipamento de outra empresa', () => {
  assert.throws(() => createContractRecord([], clients, { companyId: 'CLI-0001', startsAt: '2026-01-01', endsAt: '2026-12-31', equipmentIds: clients[0].equipment.map((item) => item.id) }), /no máximo 8/);
  assert.throws(() => createContractRecord([], clients, { companyId: 'CLI-0001', startsAt: '2026-01-01', endsAt: '2026-12-31', equipmentIds: ['EQP-B1'] }), /outra empresa/);
});

test('impede vínculo de contrato com empresa diferente', () => {
  const contracts = [{ id: 'CTR-0001', companyId: 'CLI-0001' }];
  assert.throws(() => assertContractCompany('CTR-0001', 'CLI-0002', contracts), /não pertence/);
});

test('calcula franquia, saldo, excedente e faturável explícito por competência', () => {
  const contract = { id: 'CTR-0001', monthlyMinutes: 240 };
  const tickets = [{ timeEntries: [
    { contractId: 'CTR-0001', competence: '2026-10', minutes: 180, billable: false },
    { contractId: 'CTR-0001', competence: '2026-10', minutes: 90, billable: false },
    { contractId: 'CTR-0001', competence: '2026-10', minutes: 60, billable: true },
    { contractId: 'CTR-0001', competence: '2026-09', minutes: 120, billable: false },
  ] }];
  assert.deepEqual(getMonthlyConsumption(contract, tickets, '2026-10'), { franchiseMinutes: 270, includedMinutes: 240, balanceMinutes: 0, exceededMinutes: 30, explicitBillableMinutes: 60, totalBillableMinutes: 90 });
});
