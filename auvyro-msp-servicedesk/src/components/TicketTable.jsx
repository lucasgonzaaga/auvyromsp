import { ChevronRight, MessageSquareText } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import { formatDateTime } from '../utils/date.js';

export default function TicketTable({ tickets, onOpen }) {
  return <section className="ticket-list">
    <div className="list-header"><span>CHAMADO</span><span>CLIENTE</span><span>ABERTURA</span><span>STATUS</span><span>PRIORIDADE</span><span /></div>
    {tickets.map((ticket) => <button className="ticket-row" key={ticket.id} onClick={() => onOpen(ticket.id)}>
      <span className="ticket-main"><strong>{ticket.title}</strong><small>{ticket.id} · {ticket.requester}</small></span>
      <span className="company">{ticket.company}</span><span className="date">{formatDateTime(ticket.createdAt)}</span><span><StatusBadge value={ticket.status} /></span>
      <span><b className={`priority priority--${ticket.priority.toLowerCase()}`}>{ticket.priority}</b></span><ChevronRight size={18} />
    </button>)}
    {tickets.length === 0 && <div className="empty"><MessageSquareText size={26} /><strong>Nenhum chamado por aqui.</strong><span>Tente ajustar sua busca ou o filtro selecionado.</span></div>}
  </section>;
}
