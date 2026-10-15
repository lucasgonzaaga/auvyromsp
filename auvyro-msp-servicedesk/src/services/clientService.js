const STORAGE_KEY = 'auvyro-msp-clients-v1';

const seedClients = [
  { id: 'CLI-0001', name: 'Vértice Contabilidade', document: '12.345.678/0001-01', status: 'Ativo', contacts: [{ id: 'CON-0001', name: 'Ana Silva', email: 'ana@vertice.exemplo', phone: '(11) 90000-0001', authorized: true }, { id: 'CON-0002', name: 'Rafael Lima', email: 'rafael@vertice.exemplo', phone: '(11) 90000-0002', authorized: true }], equipment: [{ id: 'EQP-0001', name: 'RECEPCAO-01', type: 'Desktop', serial: 'VRT-001' }, { id: 'EQP-0002', name: 'FINANCEIRO-01', type: 'Notebook', serial: 'VRT-002' }] },
  { id: 'CLI-0002', name: 'Norte Sul Logística', document: '23.456.789/0001-02', status: 'Ativo', contacts: [{ id: 'CON-0003', name: 'João Costa', email: 'joao@nortesul.exemplo', phone: '(11) 90000-0003', authorized: true }], equipment: [{ id: 'EQP-0003', name: 'FINANCEIRO-02', type: 'Desktop', serial: 'NSL-001' }] },
  { id: 'CLI-0003', name: 'Clínica Horizonte', document: '34.567.890/0001-03', status: 'Ativo', contacts: [{ id: 'CON-0004', name: 'Mariana Souza', email: 'mariana@horizonte.exemplo', phone: '(11) 90000-0004', authorized: true }], equipment: [{ id: 'EQP-0004', name: 'RECEPCAO-02', type: 'Desktop', serial: 'CLH-001' }] },
  { id: 'CLI-0004', name: 'Orbe Engenharia', document: '45.678.901/0001-04', status: 'Ativo', contacts: [{ id: 'CON-0005', name: 'Carla Menezes', email: 'carla@orbe.exemplo', phone: '(11) 90000-0005', authorized: true }], equipment: [{ id: 'EQP-0005', name: 'ENGENHARIA-01', type: 'Notebook', serial: 'ORB-001' }] },
];

const nextId = (items, prefix) => `${prefix}-${String(Math.max(0, ...items.map((item) => Number(item.id?.split('-').pop())).filter(Number.isFinite)) + 1).padStart(4, '0')}`;

export function loadClients() {
  try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(data) ? data : seedClients; } catch { return seedClients; }
}
export function saveClients(clients) { localStorage.setItem(STORAGE_KEY, JSON.stringify(clients)); }
export function createClientRecord(clients, data) {
  if (!data.name?.trim()) throw new TypeError('A empresa precisa de um nome.');
  return { id: nextId(clients, 'CLI'), name: data.name.trim(), document: data.document?.trim() || '', status: 'Ativo', contacts: [], equipment: [] };
}
export function addContactRecord(client, data) {
  if (!data.name?.trim() || !data.email?.trim()) throw new TypeError('Nome e e-mail do contato são obrigatórios.');
  return { ...client, contacts: [...client.contacts, { id: nextId(client.contacts, 'CON'), name: data.name.trim(), email: data.email.trim(), phone: data.phone?.trim() || '', authorized: data.authorized !== false }] };
}
export function addEquipmentRecord(client, data) {
  if (!data.name?.trim()) throw new TypeError('O equipamento precisa de um nome.');
  return { ...client, equipment: [...client.equipment, { id: nextId(client.equipment, 'EQP'), name: data.name.trim(), type: data.type || 'Desktop', serial: data.serial?.trim() || '' }] };
}
export function findClient(clients, id) { return clients.find((client) => client.id === id) || null; }
