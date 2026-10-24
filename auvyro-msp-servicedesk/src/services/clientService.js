const STORAGE_KEY = 'auvyro-msp-clients-v1';

const seedClients = [
  { id: 'CLI-0001', name: 'Vértice Contabilidade', document: '12.345.678/0001-01', status: 'Ativo', contacts: [{ id: '10000000-0000-4000-8000-000000000001', code: 'CON-0001', name: 'Ana Silva', email: 'ana@vertice.exemplo', phone: '(11) 90000-0001', authorized: true }, { id: '10000000-0000-4000-8000-000000000002', code: 'CON-0002', name: 'Rafael Lima', email: 'rafael@vertice.exemplo', phone: '(11) 90000-0002', authorized: true }], equipment: [{ id: '20000000-0000-4000-8000-000000000001', code: 'EQP-0001', name: 'RECEPCAO-01', type: 'Desktop', serial: 'VRT-001' }, { id: '20000000-0000-4000-8000-000000000002', code: 'EQP-0002', name: 'FINANCEIRO-01', type: 'Notebook', serial: 'VRT-002' }] },
  { id: 'CLI-0002', name: 'Norte Sul Logística', document: '23.456.789/0001-02', status: 'Ativo', contacts: [{ id: '10000000-0000-4000-8000-000000000003', code: 'CON-0003', name: 'João Costa', email: 'joao@nortesul.exemplo', phone: '(11) 90000-0003', authorized: true }], equipment: [{ id: '20000000-0000-4000-8000-000000000003', code: 'EQP-0003', name: 'FINANCEIRO-02', type: 'Desktop', serial: 'NSL-001' }] },
  { id: 'CLI-0003', name: 'Clínica Horizonte', document: '34.567.890/0001-03', status: 'Ativo', contacts: [{ id: '10000000-0000-4000-8000-000000000004', code: 'CON-0004', name: 'Mariana Souza', email: 'mariana@horizonte.exemplo', phone: '(11) 90000-0004', authorized: true }], equipment: [{ id: '20000000-0000-4000-8000-000000000004', code: 'EQP-0004', name: 'RECEPCAO-02', type: 'Desktop', serial: 'CLH-001' }] },
  { id: 'CLI-0004', name: 'Orbe Engenharia', document: '45.678.901/0001-04', status: 'Ativo', contacts: [{ id: '10000000-0000-4000-8000-000000000005', code: 'CON-0005', name: 'Carla Menezes', email: 'carla@orbe.exemplo', phone: '(11) 90000-0005', authorized: true }], equipment: [{ id: '20000000-0000-4000-8000-000000000005', code: 'EQP-0005', name: 'ENGENHARIA-01', type: 'Notebook', serial: 'ORB-001' }] },
];

const nextCompanyCode = (items) => `CLI-${String(Math.max(0, ...items.map((item) => Number(item.id?.split('-').pop())).filter(Number.isFinite)) + 1).padStart(4, '0')}`;
const newId = () => globalThis.crypto.randomUUID();
const displayCode = (prefix, id) => `${prefix}-${id.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
const legacyId = (clientId, type, oldId) => `legacy:${clientId}:${type}:${oldId}`;

export function normalizeClients(clients) {
  const seen = new Set();
  return clients.map((client) => ({
    ...client,
    contacts: (client.contacts || []).map((contact) => {
      const code = contact.code || contact.id;
      let id = contact.code ? contact.id : legacyId(client.id, 'contact', contact.id);
      if (seen.has(id)) id = legacyId(client.id, 'contact', `${contact.id}:${seen.size}`);
      seen.add(id);
      return { ...contact, id, code };
    }),
    equipment: (client.equipment || []).map((equipment) => {
      const code = equipment.code || equipment.id;
      let id = equipment.code ? equipment.id : legacyId(client.id, 'equipment', equipment.id);
      if (seen.has(id)) id = legacyId(client.id, 'equipment', `${equipment.id}:${seen.size}`);
      seen.add(id);
      return { ...equipment, id, code };
    }),
  }));
}

export function loadClients() {
  try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY)); return normalizeClients(Array.isArray(data) ? data : seedClients); } catch { return normalizeClients(seedClients); }
}
export function saveClients(clients) { localStorage.setItem(STORAGE_KEY, JSON.stringify(clients)); }
export function createClientRecord(clients, data) {
  if (!data.name?.trim()) throw new TypeError('A empresa precisa de um nome.');
  return { id: nextCompanyCode(clients), name: data.name.trim(), document: data.document?.trim() || '', status: 'Ativo', contacts: [], equipment: [] };
}
export function addContactRecord(client, data) {
  if (!data.name?.trim() || !data.email?.trim()) throw new TypeError('Nome e e-mail do contato são obrigatórios.');
  const id = newId();
  return { ...client, contacts: [...client.contacts, { id, code: displayCode('CON', id), name: data.name.trim(), email: data.email.trim(), phone: data.phone?.trim() || '', authorized: data.authorized !== false }] };
}
export function addEquipmentRecord(client, data) {
  if (!data.name?.trim()) throw new TypeError('O equipamento precisa de um nome.');
  const id = newId();
  return { ...client, equipment: [...client.equipment, { id, code: displayCode('EQP', id), name: data.name.trim(), type: data.type || 'Desktop', serial: data.serial?.trim() || '' }] };
}
export function findClient(clients, id) { return clients.find((client) => client.id === id) || null; }
