import { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import TicketForm from './components/TicketForm.jsx';
import Topbar from './components/Topbar.jsx';
import Clients from './pages/Clients.jsx';
import Dashboard from './pages/Dashboard.jsx';
import InfoPage from './pages/InfoPage.jsx';
import TicketDetails from './pages/TicketDetails.jsx';
import Tickets from './pages/Tickets.jsx';
import TimeEntries from './pages/TimeEntries.jsx';
import Contracts from './pages/Contracts.jsx';
import {
  addCommentRecord, addTimeRecord, archiveTicketRecord, createTicket,
  loadTickets, saveTickets, updateTicketRecord,
} from './services/ticketService.js';
import { getMetrics } from './utils/ticketMetrics.js';
import { formatDateTime } from './utils/date.js';
import { getCurrentUser } from './services/sessionService.js';
import { addContactRecord, addEquipmentRecord, createClientRecord, loadClients, saveClients } from './services/clientService.js';
import { createContractRecord, loadContracts, saveContracts } from './services/contractService.js';

export default function App() {
  const [currentUser] = useState(getCurrentUser);
  const [clients, setClients] = useState(loadClients);
  const [contracts, setContracts] = useState(() => loadContracts(clients));
  const [tickets, setTickets] = useState(() => loadTickets(clients, contracts));
  const [view, setView] = useState('dashboard');
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [companyFilter, setCompanyFilter] = useState('');
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => { saveTickets(tickets); }, [tickets]);
  useEffect(() => { saveClients(clients); }, [clients]);
  useEffect(() => { saveContracts(contracts); }, [contracts]);
  useEffect(() => {
    function shortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openQuickSearch(); }
      if (event.key === 'Escape') setNotificationsOpen(false);
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  });

  const activeTickets = useMemo(() => tickets.filter((ticket) => !ticket.archivedAt), [tickets]);
  const metrics = useMemo(() => getMetrics(tickets), [tickets]);
  const selected = tickets.find((ticket) => ticket.id === selectedId);
  const filtered = activeTickets.filter((ticket) => (filter === 'Todos' || ticket.status === filter)
    && (!companyFilter || ticket.companyId === companyFilter)
    && [ticket.id, ticket.title, ticket.company, ticket.requester].some((value) => value.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recentNotifications = activeTickets.flatMap((ticket) => ticket.timeline.slice(-1).map((event) => ({ ...event, ticketId: ticket.id }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);

  function navigate(nextView) { setView(nextView); setSelectedId(null); if (nextView !== 'tickets') { setSearch(''); setFilter('Todos'); setCompanyFilter(''); } }
  function openTicket(id) { setSelectedId(id); setView('details'); setNotificationsOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function updateSelected(changes) { setTickets((current) => current.map((ticket) => ticket.id === selectedId ? updateTicketRecord(ticket, changes, currentUser) : ticket)); }
  function addComment(text) { setTickets((current) => current.map((ticket) => ticket.id === selectedId ? addCommentRecord(ticket, text, currentUser) : ticket)); }
  function addTime(entry) { setTickets((current) => current.map((ticket) => ticket.id === selectedId ? addTimeRecord(ticket, entry, currentUser, contracts) : ticket)); }
  function archiveSelected(reason) { setTickets((current) => current.map((ticket) => ticket.id === selectedId ? archiveTicketRecord(ticket, reason, currentUser) : ticket)); navigate('tickets'); }
  function handleCreate(form) { const ticket = createTicket(tickets, form, clients, contracts); setTickets((current) => [ticket, ...current]); setNewTicketOpen(false); setSelectedId(ticket.id); setView('details'); }
  function openQuickSearch() { setView('tickets'); setSelectedId(null); setNotificationsOpen(false); window.setTimeout(() => searchRef.current?.focus(), 0); }
  function selectClient(companyId) { setCompanyFilter(companyId); setSearch(''); setFilter('Todos'); setView('tickets'); }
  function createClient(data) { const created = createClientRecord(clients, data); setClients((current) => [...current, created]); return created; }
  function addContact(clientId, data) { setClients((current) => current.map((client) => client.id === clientId ? addContactRecord(client, data) : client)); }
  function addEquipment(clientId, data) { setClients((current) => current.map((client) => client.id === clientId ? addEquipmentRecord(client, data) : client)); }
  function createContract(data) { const created = createContractRecord(contracts, clients, data); setContracts((current) => [...current, created]); return created; }

  const navActive = view === 'details' ? 'tickets' : view;
  return <div className="shell">
    <Sidebar active={navActive} openTickets={metrics.open} mobileOpen={mobileMenu} onNavigate={navigate} onClose={() => setMobileMenu(false)} />
    <main className="main">
      <Topbar active={view} currentUser={currentUser} notificationCount={recentNotifications.length} notificationsOpen={notificationsOpen} onMenu={() => setMobileMenu(true)} onQuickSearch={openQuickSearch} onNotifications={() => setNotificationsOpen((value) => !value)} />
      {notificationsOpen && <aside className="notification-panel"><div><strong>Atividade recente</strong><button onClick={() => setNotificationsOpen(false)}>Fechar</button></div>{recentNotifications.map((item) => <button key={`${item.ticketId}-${item.id}`} onClick={() => openTicket(item.ticketId)}><span>{item.text}</span><small>{item.ticketId} · {formatDateTime(item.createdAt)}</small></button>)}</aside>}
      <div className="content">
        {view === 'dashboard' && <Dashboard tickets={activeTickets} metrics={metrics} onCreate={() => setNewTicketOpen(true)} onOpen={openTicket} onSeeAll={() => navigate('tickets')} />}
        {view === 'tickets' && <Tickets tickets={filtered} search={search} filter={filter} onSearch={setSearch} onFilter={setFilter} onCreate={() => setNewTicketOpen(true)} onOpen={openTicket} searchRef={searchRef} />}
        {view === 'clients' && <Clients clients={clients} tickets={activeTickets} onCreateClient={createClient} onAddContact={addContact} onAddEquipment={addEquipment} onSelectTickets={selectClient} />}
        {view === 'contracts' && <Contracts clients={clients} contracts={contracts} tickets={tickets} onCreate={createContract} />}
        {view === 'time' && <TimeEntries tickets={tickets} onOpen={openTicket} />}
        {(view === 'team' || view === 'settings') && <InfoPage type={view} currentUser={currentUser} />}
        {view === 'details' && selected && <TicketDetails ticket={selected} contracts={contracts} currentUser={currentUser} onBack={() => navigate('tickets')} onSave={updateSelected} onComment={addComment} onTime={addTime} onArchive={archiveSelected} />}
        <footer><span>Auvyro MSP · Central de serviços v0.2</span><span>Dados locais · última atualização agora</span></footer>
      </div>
    </main>
    {newTicketOpen && <TicketForm clients={clients} contracts={contracts} onClose={() => setNewTicketOpen(false)} onCreate={handleCreate} />}
  </div>;
}
