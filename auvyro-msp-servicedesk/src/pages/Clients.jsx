import { Building2, ChevronRight } from 'lucide-react';

export default function Clients({ tickets, onSelect }) {
  const clients = Object.values(tickets.reduce((result, ticket) => {
    if (!result[ticket.company]) result[ticket.company] = { name: ticket.company, tickets: 0, open: 0, people: new Set() };
    result[ticket.company].tickets += 1;
    if (!['Resolvido', 'Encerrado'].includes(ticket.status)) result[ticket.company].open += 1;
    result[ticket.company].people.add(ticket.requester);
    return result;
  }, {}));
  return <><section className="page-heading compact"><div><p className="overline">CARTEIRA</p><h1>Clientes</h1><p className="subtitle">Empresas identificadas a partir dos chamados registrados.</p></div></section><section className="client-grid">{clients.map((client) => <button className="client-card" key={client.name} onClick={() => onSelect(client.name)}><span className="client-icon"><Building2 size={19} /></span><div><strong>{client.name}</strong><small>{client.people.size} solicitante{client.people.size !== 1 ? 's' : ''}</small></div><div className="client-stats"><b>{client.open}</b><small>em aberto</small></div><div className="client-stats"><b>{client.tickets}</b><small>total</small></div><ChevronRight size={17} /></button>)}</section></>;
}
