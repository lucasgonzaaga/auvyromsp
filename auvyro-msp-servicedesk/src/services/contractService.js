const STORAGE_KEY = 'auvyro-msp-contracts-v1';
export const OFFICE_CARE_COMPUTER_LIMIT = 8;
export const OFFICE_CARE_MONTHLY_MINUTES = 240;

const seedContracts = [
  { id: 'CTR-0001', companyId: 'CLI-0001', name: 'Office Care', status: 'Ativo', startsAt: '2026-01-01', endsAt: '2026-12-31', computerLimit: 8, monthlyMinutes: 240, equipmentIds: ['20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002'] },
  { id: 'CTR-0002', companyId: 'CLI-0002', name: 'Office Care', status: 'Ativo', startsAt: '2026-03-01', endsAt: '2027-02-28', computerLimit: 8, monthlyMinutes: 240, equipmentIds: ['20000000-0000-4000-8000-000000000003'] },
  { id: 'CTR-0003', companyId: 'CLI-0003', name: 'Office Care', status: 'Ativo', startsAt: '2026-02-01', endsAt: '2027-01-31', computerLimit: 8, monthlyMinutes: 240, equipmentIds: ['20000000-0000-4000-8000-000000000004'] },
  { id: 'CTR-0004', companyId: 'CLI-0004', name: 'Office Care', status: 'Ativo', startsAt: '2026-04-01', endsAt: '2027-03-31', computerLimit: 8, monthlyMinutes: 240, equipmentIds: ['20000000-0000-4000-8000-000000000005'] },
];

const nextId = (contracts) => `CTR-${String(Math.max(0, ...contracts.map((item) => Number(item.id?.split('-').pop())).filter(Number.isFinite)) + 1).padStart(4, '0')}`;
export function loadContracts(clients = []) {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return (Array.isArray(data) ? data : seedContracts).map((contract) => {
      const client = clients.find((item) => item.id === contract.companyId);
      const equipmentIds = (contract.equipmentIds || []).map((id) => client?.equipment.find((equipment) => equipment.id === id || equipment.code === id)?.id).filter(Boolean);
      return { ...contract, equipmentIds };
    });
  } catch { return seedContracts; }
}
export function saveContracts(contracts) { localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts)); }
export function assertContractCompany(contractId, companyId, contracts, serviceDate = new Date()) {
  if (!contractId) return null;
  const contract = contracts.find((item) => item.id === contractId);
  if (!contract) throw new RangeError('Contrato não encontrado.');
  if (contract.companyId !== companyId) throw new RangeError('O contrato não pertence à empresa selecionada.');
  if (contract.status !== 'Ativo') throw new RangeError(`O contrato está ${contract.status.toLowerCase()} e não aceita novos atendimentos.`);
  const date = serviceDate instanceof Date ? serviceDate : new Date(serviceDate);
  if (Number.isNaN(date.getTime())) throw new RangeError('A data do atendimento é inválida.');
  const day = date.toISOString().slice(0, 10);
  if (day < contract.startsAt) throw new RangeError('O contrato ainda não está vigente na data do atendimento.');
  if (day > contract.endsAt) throw new RangeError('O contrato está vencido na data do atendimento.');
  return contract;
}
export function createContractRecord(contracts, clients, data) {
  const client = clients.find((item) => item.id === data.companyId);
  if (!client) throw new RangeError('Empresa não encontrada.');
  const equipmentIds = [...new Set(data.equipmentIds || [])];
  if (equipmentIds.length > OFFICE_CARE_COMPUTER_LIMIT) throw new RangeError('O Office Care permite no máximo 8 computadores.');
  if (equipmentIds.some((id) => !client.equipment.some((equipment) => equipment.id === id))) throw new RangeError('Há equipamentos de outra empresa no contrato.');
  if (!data.startsAt || !data.endsAt || data.endsAt < data.startsAt) throw new RangeError('A vigência do contrato é inválida.');
  return { id: nextId(contracts), companyId: client.id, name: 'Office Care', status: data.status || 'Ativo', startsAt: data.startsAt, endsAt: data.endsAt, computerLimit: OFFICE_CARE_COMPUTER_LIMIT, monthlyMinutes: OFFICE_CARE_MONTHLY_MINUTES, equipmentIds };
}
export function getMonthlyConsumption(contract, tickets, competence) {
  const entries = tickets.flatMap((ticket) => ticket.timeEntries || []).filter((entry) => entry.contractId === contract.id && entry.competence === competence);
  const franchiseMinutes = entries.filter((entry) => entry.consumesFranchise === true).reduce((sum, entry) => sum + (Number(entry.minutes) || 0), 0);
  const explicitBillableMinutes = entries.filter((entry) => entry.billable).reduce((sum, entry) => sum + (Number(entry.minutes) || 0), 0);
  const exceededMinutes = Math.max(0, franchiseMinutes - contract.monthlyMinutes);
  return { franchiseMinutes, includedMinutes: Math.min(franchiseMinutes, contract.monthlyMinutes), balanceMinutes: Math.max(0, contract.monthlyMinutes - franchiseMinutes), exceededMinutes, explicitBillableMinutes, totalBillableMinutes: explicitBillableMinutes + exceededMinutes };
}
