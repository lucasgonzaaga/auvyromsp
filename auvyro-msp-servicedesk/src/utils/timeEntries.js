export function getCompetence(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])-\d{2}/.test(value)) return value.slice(0, 7);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function normalizeTimeEntry(entry, ticket = {}) {
  const contractId = Object.hasOwn(entry, 'contractId') ? entry.contractId || null : ticket.contractId || null;
  const billable = entry.billable === true;
  return {
    ...entry,
    companyId: entry.companyId || ticket.companyId || null,
    company: entry.company || ticket.company || '',
    contractId,
    competence: entry.competence || getCompetence(entry.createdAt),
    billable,
    consumesFranchise: typeof entry.consumesFranchise === 'boolean' ? entry.consumesFranchise : Boolean(contractId && entry.type === 'Remoto' && !billable),
  };
}

export function getTimeEntryClassification(entry) {
  const normalized = normalizeTimeEntry(entry);
  if (normalized.consumesFranchise) return 'Franquia';
  if (normalized.billable) return 'Faturável';
  return 'Não consome';
}

export function groupTimeConsumption(entries) {
  const groups = new Map();
  entries.forEach((entry) => {
    const normalized = normalizeTimeEntry(entry);
    const classification = getTimeEntryClassification(normalized);
    const key = [normalized.company, normalized.contractId || 'Sem contrato', normalized.competence || 'Sem competência', normalized.type || 'Não informada', classification].join('|');
    const current = groups.get(key) || {
      company: normalized.company,
      contractId: normalized.contractId,
      competence: normalized.competence,
      type: normalized.type,
      billable: normalized.billable,
      consumesFranchise: normalized.consumesFranchise,
      classification,
      minutes: 0,
      entries: 0,
    };
    current.minutes += Number(normalized.minutes) || 0;
    current.entries += 1;
    groups.set(key, current);
  });
  return [...groups.values()].sort((a, b) => `${b.competence}|${a.company}`.localeCompare(`${a.competence}|${b.company}`));
}
