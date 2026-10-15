import { Bell, ChevronRight, Command, Menu } from 'lucide-react';

const labels = { dashboard: 'Visão geral', tickets: 'Chamados', clients: 'Clientes', time: 'Apontamentos', team: 'Equipe', settings: 'Configurações', details: 'Detalhes do chamado' };

export default function Topbar({ active, currentUser, notificationCount, notificationsOpen, onMenu, onQuickSearch, onNotifications }) {
  return <header className="topbar">
    <div className="topbar-left"><button className="mobile-toggle icon-button" aria-label="Abrir menu" onClick={onMenu}><Menu /></button><span>Central de serviços</span><ChevronRight size={15} /><strong>{labels[active] || 'Visão geral'}</strong></div>
    <div className="topbar-actions">
      <button className="command" onClick={onQuickSearch}><Command size={14} />Busca rápida <kbd>⌘ K</kbd></button>
      <div className="notification-wrap"><button className="icon-button" aria-label="Notificações" aria-expanded={notificationsOpen} onClick={onNotifications}><Bell size={19} />{notificationCount > 0 && <i className="notification-dot" />}</button></div>
      <div className="avatar" title={currentUser.name}>{currentUser.initials}</div>
    </div>
  </header>;
}
