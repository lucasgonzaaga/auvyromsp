import { Plus, Search } from 'lucide-react';
import TicketTable from '../components/TicketTable.jsx';

export default function Tickets({ tickets, search, filter, onSearch, onFilter, onCreate, onOpen, searchRef }) {
  const statuses = ['Novo', 'Em triagem', 'Em atendimento', 'Aguardando cliente', 'Aguardando terceiro', 'Resolvido', 'Encerrado'];
  return <>
    <section className="page-heading compact"><div><p className="overline">OPERAÇÃO</p><h1>Chamados</h1><p className="subtitle">Gerencie a fila e acompanhe cada atendimento.</p></div><button className="primary" onClick={onCreate}><Plus size={17} />Abrir chamado</button></section>
    <section className="queue-head"><div><div className="section-kicker">FILA ATIVA</div><h2>{tickets.length} chamados encontrados</h2></div><div className="tools"><label className="search"><Search size={17} /><input ref={searchRef} aria-label="Pesquisar chamados" placeholder="Buscar por assunto, cliente ou ID" value={search} onChange={(event) => onSearch(event.target.value)} /></label><select aria-label="Filtrar por status" value={filter} onChange={(event) => onFilter(event.target.value)}><option>Todos</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div></section>
    <TicketTable tickets={tickets} onOpen={onOpen} />
  </>;
}
