import { Clock3 } from 'lucide-react';
import { formatDateTime, formatMinutes } from '../utils/date.js';

export default function TimeEntries({ tickets, onOpen }) {
  const entries = tickets.flatMap((ticket) => (ticket.timeEntries || []).map((entry) => ({ ...entry, ticketId: ticket.id, title: ticket.title, company: ticket.company }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = entries.reduce((sum, entry) => sum + Number(entry.minutes), 0);
  return <><section className="page-heading compact"><div><p className="overline">PRODUTIVIDADE</p><h1>Apontamentos</h1><p className="subtitle">Histórico individual de trabalho técnico.</p></div><div className="page-total"><small>TOTAL REGISTRADO</small><strong>{formatMinutes(total)}</strong></div></section><section className="entry-list"><div className="entry-head"><span>ATIVIDADE</span><span>TIPO</span><span>DATA</span><span>DURAÇÃO</span></div>{entries.map((entry) => <button className="entry-row" key={entry.id} onClick={() => onOpen(entry.ticketId)}><span><strong>{entry.description}</strong><small>{entry.ticketId} · {entry.company}</small></span><span>{entry.type}</span><span>{formatDateTime(entry.createdAt)}</span><b>{formatMinutes(entry.minutes)}</b></button>)}{!entries.length && <div className="empty"><Clock3 /><strong>Nenhum apontamento registrado.</strong></div>}</section></>;
}
