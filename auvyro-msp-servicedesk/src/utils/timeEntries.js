export function getCompetence(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function normalizeTimeEntry(entry, ticket = {}) {
  return {
    ...entry,
    companyId: entry.companyId || ticket.companyId || null,
    company: entry.company || ticket.company || '',
    contractId: entry.contractId || ticket.contractId || null,
    competence: entry.competence || getCompetence(entry.createdAt),
    billable: entry.billable === true,
  };
}

export function groupTimeConsumption(entries) {
  const groups = new Map();
  entries.forEach((entry) => {
    const normalized = normalizeTimeEntry(entry);
    const key = [normalized.company, normalized.contractId || 'Sem contrato', normalized.competence || 'Sem competência', normalized.type || 'Não informada', normalized.billable ? 'Faturável' : 'Franquia'].join('|');
    const current = groups.get(key) || {
      company: normalized.company,
      contractId: normalized.contractId,
      competence: normalized.competence,
      type: normalized.type,
      billable: normalized.billable,
      minutes: 0,
      entries: 0,
    };
    current.minutes += Number(normalized.minutes) || 0;
    current.entries += 1;
    groups.set(key, current);
  });
  return [...groups.values()].sort((a, b) => `${b.competence}|${a.company}`.localeCompare(`${a.competence}|${b.company}`));
}
