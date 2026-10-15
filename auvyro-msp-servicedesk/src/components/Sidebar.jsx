import { BriefcaseBusiness, ChevronDown, CircleHelp, Clock3, Headphones, LayoutDashboard, Settings, Ticket, Users } from 'lucide-react';

const items = [
  { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard, group: 'OPERAÇÃO' },
  { id: 'tickets', label: 'Chamados', icon: Ticket },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'contracts', label: 'Contratos', icon: BriefcaseBusiness },
  { id: 'time', label: 'Apontamentos', icon: Clock3 },
  { id: 'team', label: 'Equipe', icon: Headphones, group: 'GESTÃO' },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export default function Sidebar({ active, openTickets, mobileOpen, role, remoteMode, onNavigate, onClose }) {
  const visibleItems = role === 'client' ? items.filter((item) => ['dashboard', 'tickets', 'time'].includes(item.id)) : items;
  return <>
    <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
      <div className="wordmark"><span className="wordmark-mark">A</span><div><strong>AUVYRO</strong><small>MSP OPERATIONS</small></div></div>
      <button className="workspace"><span>AM</span><div><strong>Auvyro MSP</strong><small>Operação principal</small></div><ChevronDown size={15} /></button>
      <nav aria-label="Navegação principal">
        {visibleItems.map(({ id, label, icon: Icon, group }) => <div className="nav-wrap" key={id}>
          {group && <p>{group}</p>}
          <button className={`nav-item ${active === id ? 'nav-item--active' : ''}`} onClick={() => { onNavigate(id); onClose(); }}><Icon size={18} />{label}{id === 'tickets' && <span className="nav-count">{openTickets}</span>}</button>
        </div>)}
      </nav>
      <div className="sidebar-foot"><CircleHelp size={17} /><div><strong>{remoteMode ? 'Ambiente protegido' : 'Ambiente de teste'}</strong><small>{remoteMode ? 'Dados no Supabase com RLS.' : 'Os dados ficam neste navegador.'}</small></div></div>
    </aside>
    {mobileOpen && <button className="scrim" aria-label="Fechar menu" onClick={onClose} />}
  </>;
}
