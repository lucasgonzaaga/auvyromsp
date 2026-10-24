import { Clock3 } from 'lucide-react';
import { formatDateTime, formatMinutes } from '../utils/date.js';
import { groupTimeConsumption, normalizeTimeEntry } from '../utils/timeEntries.js';

export default function TimeEntries({ tickets, onOpen }) {
  const entries = tickets.flatMap((ticket) => (ticket.timeEntries || []).map((entry) => ({ ...normalizeTimeEntry(entry, ticket), ticketId: ticket.id, title: ticket.title }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = entries.reduce((sum, entry) => sum + Number(entry.minutes), 0);
  const consumption = groupTimeConsumption(entries);
  return <>
    <section className="page-heading compact"><div><p className="overline">PRODUTIVIDADE</p><h1>Apontamentos</h1><p className="subtitle">Consumo histórico por empresa, contrato, competência e classificação.</p></div><div className="page-total"><small>TOTAL REGISTRADO</small><strong>{formatMinutes(total)}</strong></div></section>
    {consumption.length > 0 && <section className="consumption-list"><div className="consumption-head"><span>EMPRESA / CONTRATO</span><span>COMPETÊNCIA</span><span>MODALIDADE</span><span>CLASSIFICAÇÃO</span><span>CONSUMO</span></div>{consumption.map((group) => <div className="consumption-row" key={`${group.company}-${group.contractId}-${group.competence}-${group.type}-${group.classification}`}><span><strong>{group.company}</strong><small>{group.contractId || 'Sem contrato'}</small></span><span>{group.competence || 'Sem competência'}</span><span>{group.type}</span><span className={group.billable ? 'billable' : group.consumesFranchise ? 'franchise' : ''}>{group.classification}</span><b>{formatMinutes(group.minutes)}</b></div>)}</section>}
    <section className="entry-list"><div className="entry-head"><span>ATIVIDADE</span><span>TIPO</span><span>DATA</span><span>DURAÇÃO</span></div>{entries.map((entry) => <button className="entry-row" key={entry.id} onClick={() => onOpen(entry.ticketId)}><span><strong>{entry.description}</strong><small>{entry.ticketId} · {entry.company} · {entry.contractId || 'Sem contrato'} · {entry.competence}</small></span><span>{entry.type}</span><span>{formatDateTime(entry.performedAt || entry.createdAt)}</span><b>{formatMinutes(entry.minutes)}</b></button>)}{!entries.length && <div className="empty"><Clock3 /><strong>Nenhum apontamento registrado.</strong></div>}</section>
  </>;
}
