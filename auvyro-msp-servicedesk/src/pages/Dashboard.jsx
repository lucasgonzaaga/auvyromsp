import { Plus } from 'lucide-react';
import TicketTable from '../components/TicketTable.jsx';
import { formatLongDate, formatMinutes } from '../utils/date.js';

export default function Dashboard({ tickets, metrics, onCreate, onOpen, onSeeAll }) {
  return <>
    <section className="page-heading"><div><p className="overline">{formatLongDate()}</p><h1>Bom dia, equipe.</h1><p className="subtitle">Aqui está o pulso da operação neste momento.</p></div><button className="primary" onClick={onCreate}><Plus size={17} />Abrir chamado</button></section>
    <section className="metric-strip" aria-label="Resumo da operação">
      <div><span>Fila aberta</span><strong>{metrics.open}</strong><small>Chamados em andamento</small></div>
      <div><span>Críticos</span><strong>{metrics.urgent}</strong><small className={metrics.urgent ? 'attention' : 'trend'}>{metrics.urgent ? 'Ação necessária' : 'Tudo sob controle'}</small></div>
      <div><span>Aguardando</span><strong>{metrics.waiting}</strong><small>Cliente ou terceiro</small></div>
      <div><span>Resolvidos hoje</span><strong>{metrics.resolvedToday}</strong><small>Com data de resolução</small></div>
      <div><span>Tempo registrado</span><strong className="metric-time">{formatMinutes(metrics.minutes)}</strong><small>Apontamentos individuais</small></div>
    </section>
    <section className="queue-head"><div><div className="section-kicker">FILA DE ATENDIMENTO</div><h2>Chamados recentes <span>{tickets.length}</span></h2></div><button className="text-button" onClick={onSeeAll}>Ver fila completa →</button></section>
    <TicketTable tickets={tickets.slice(0, 5)} onOpen={onOpen} />
  </>;
}
