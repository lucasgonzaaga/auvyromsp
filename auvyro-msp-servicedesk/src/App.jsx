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
import * as remoteRepository from './repositories/supabaseRepository.js';

export default function App({ currentUserOverride = null, onSignOut = null }) {
  const remoteMode = Boolean(currentUserOverride?.authenticated);
  const [localUser] = useState(() => remoteMode ? null : getCurrentUser());
  const currentUser = currentUserOverride || localUser;
  const [clients, setClients] = useState(() => remoteMode ? [] : loadClients());
  const [contracts, setContracts] = useState(() => remoteMode ? [] : loadContracts(clients));
  const [tickets, setTickets] = useState(() => remoteMode ? [] : loadTickets(clients, contracts));
  const [dataLoading, setDataLoading] = useState(remoteMode);
  const [operationError, setOperationError] = useState('');
  const [view, setView] = useState('dashboard');
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [companyFilter, setCompanyFilter] = useState('');
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => { if (!remoteMode) saveTickets(tickets); }, [remoteMode, tickets]);
  useEffect(() => { if (!remoteMode) saveClients(clients); }, [remoteMode, clients]);
  useEffect(() => { if (!remoteMode) saveContracts(contracts); }, [remoteMode, contracts]);
  useEffect(() => {
    if (!remoteMode) return undefined;
    let active = true;
    remoteRepository.loadOperationalData().then((data) => {
      if (active) { setClients(data.clients); setContracts(data.contracts); setTickets(data.tickets); setOperationError(''); }
    }).catch((error) => { if (active) setOperationError(error.message); }).finally(() => { if (active) setDataLoading(false); });
    return () => { active = false; };
  }, [remoteMode]);
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

  async function refreshRemote() {
    const data = await remoteRepository.loadOperationalData();
    setClients(data.clients); setContracts(data.contracts); setTickets(data.tickets);
    return data;
  }
  async function runOperation(operation) {
    setOperationError('');
    try { return await operation(); } catch (error) { setOperationError(error.message || 'Não foi possível concluir a operação.'); return null; }
  }
  function navigate(nextView) {
    const permitted = currentUser.role === 'client' ? ['dashboard', 'tickets', 'time'] : null;
    const destination = permitted && !permitted.includes(nextView) ? 'dashboard' : nextView;
    setView(destination); setSelectedId(null); if (destination !== 'tickets') { setSearch(''); setFilter('Todos'); setCompanyFilter(''); }
  }
  function openTicket(id) { setSelectedId(id); setView('details'); setNotificationsOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function updateSelected(changes) { if (remoteMode) return runOperation(async () => { const result = await remoteRepository.updateTicket(selected, changes, currentUser); await refreshRemote(); return result; }); setTickets((current) => current.map((ticket) => ticket.id === selectedId ? updateTicketRecord(ticket, changes, currentUser) : ticket)); return true; }
  async function addComment(text) { if (remoteMode) return runOperation(async () => { const result = await remoteRepository.createComment(selected, text, currentUser.id); await refreshRemote(); return result; }); setTickets((current) => current.map((ticket) => ticket.id === selectedId ? addCommentRecord(ticket, text, currentUser) : ticket)); return true; }
  async function addTime(entry) { if (remoteMode) return runOperation(async () => { const result = await remoteRepository.createTimeEntry(selected, entry, currentUser.id); await refreshRemote(); return result; }); setTickets((current) => current.map((ticket) => ticket.id === selectedId ? addTimeRecord(ticket, entry, currentUser, contracts) : ticket)); return true; }
  async function archiveSelected(reason) { if (remoteMode) { const archived = await runOperation(async () => { const result = await remoteRepository.archiveTicket(selected, reason); await refreshRemote(); return result; }); if (!archived) return; } else setTickets((current) => current.map((ticket) => ticket.id === selectedId ? archiveTicketRecord(ticket, reason, currentUser) : ticket)); navigate('tickets'); }
  async function handleCreate(form) { if (remoteMode) { const created = await runOperation(() => remoteRepository.createTicket(form)); if (!created) return false; await refreshRemote(); setSelectedId(created.code); } else { const ticket = createTicket(tickets, form, clients, contracts); setTickets((current) => [ticket, ...current]); setSelectedId(ticket.id); } setNewTicketOpen(false); setView('details'); return true; }
  function openQuickSearch() { setView('tickets'); setSelectedId(null); setNotificationsOpen(false); window.setTimeout(() => searchRef.current?.focus(), 0); }
  function selectClient(companyId) { setCompanyFilter(companyId); setSearch(''); setFilter('Todos'); setView('tickets'); }
  async function createClient(data) { if (remoteMode) { const created = await runOperation(() => remoteRepository.createCompany(data)); if (!created) return null; await refreshRemote(); return created; } const created = createClientRecord(clients, data); setClients((current) => [...current, created]); return created; }
  async function addContact(clientId, data) { if (remoteMode) return runOperation(async () => { const result = await remoteRepository.createContact(clientId, data); await refreshRemote(); return result; }); setClients((current) => current.map((client) => client.id === clientId ? addContactRecord(client, data) : client)); return true; }
  async function addEquipment(clientId, data) { if (remoteMode) return runOperation(async () => { const result = await remoteRepository.createEquipment(clientId, data); await refreshRemote(); return result; }); setClients((current) => current.map((client) => client.id === clientId ? addEquipmentRecord(client, data) : client)); return true; }
  async function createContract(data) { if (remoteMode) { const created = await runOperation(() => remoteRepository.createContract(data)); if (!created) return null; await refreshRemote(); return created; } const created = createContractRecord(contracts, clients, data); setContracts((current) => [...current, created]); return created; }

  const navActive = view === 'details' ? 'tickets' : view;
  if (dataLoading) return <div className="auth-screen"><div className="auth-card"><p>Carregando dados protegidos…</p></div></div>;
  return <div className="shell">
    <Sidebar active={navActive} openTickets={metrics.open} mobileOpen={mobileMenu} role={currentUser.role} remoteMode={remoteMode} onNavigate={navigate} onClose={() => setMobileMenu(false)} />
    <main className="main">
      <Topbar active={view} currentUser={currentUser} onSignOut={onSignOut} notificationCount={recentNotifications.length} notificationsOpen={notificationsOpen} onMenu={() => setMobileMenu(true)} onQuickSearch={openQuickSearch} onNotifications={() => setNotificationsOpen((value) => !value)} />
      {notificationsOpen && <aside className="notification-panel"><div><strong>Atividade recente</strong><button onClick={() => setNotificationsOpen(false)}>Fechar</button></div>{recentNotifications.map((item) => <button key={`${item.ticketId}-${item.id}`} onClick={() => openTicket(item.ticketId)}><span>{item.text}</span><small>{item.ticketId} · {formatDateTime(item.createdAt)}</small></button>)}</aside>}
      <div className="content">
        {operationError && <div className="operation-error" role="alert"><span>{operationError}</span><button onClick={() => setOperationError('')}>Fechar</button></div>}
        {view === 'dashboard' && <Dashboard tickets={activeTickets} metrics={metrics} onCreate={() => setNewTicketOpen(true)} onOpen={openTicket} onSeeAll={() => navigate('tickets')} />}
        {view === 'tickets' && <Tickets tickets={filtered} search={search} filter={filter} onSearch={setSearch} onFilter={setFilter} onCreate={() => setNewTicketOpen(true)} onOpen={openTicket} searchRef={searchRef} />}
        {view === 'clients' && <Clients clients={clients} tickets={activeTickets} onCreateClient={createClient} onAddContact={addContact} onAddEquipment={addEquipment} onSelectTickets={selectClient} />}
        {view === 'contracts' && <Contracts clients={clients} contracts={contracts} tickets={tickets} onCreate={createContract} />}
        {view === 'time' && <TimeEntries tickets={tickets} onOpen={openTicket} />}
        {(view === 'team' || view === 'settings') && <InfoPage type={view} currentUser={currentUser} />}
        {view === 'details' && selected && <TicketDetails ticket={selected} contracts={contracts} currentUser={currentUser} canManage={currentUser.role !== 'client'} onBack={() => navigate('tickets')} onSave={updateSelected} onComment={addComment} onTime={addTime} onArchive={archiveSelected} />}
        <footer><span>Auvyro MSP · Central de serviços v0.4</span><span>{currentUser.authenticated ? 'Sessão Supabase protegida por RLS' : 'Modo demonstração · dados locais'}</span></footer>
      </div>
    </main>
    {newTicketOpen && <TicketForm clients={clients} contracts={contracts} onClose={() => setNewTicketOpen(false)} onCreate={handleCreate} />}
  </div>;
}
