import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOperationalData } from './supabaseRepository.js';

function fakeClient(tables) {
  return { from(name) { const result = Promise.resolve({ data: tables[name] || [], error: null }); const builder = { select() { return builder; }, order() { return result; }, then(resolve, reject) { return result.then(resolve, reject); } }; return builder; } };
}

test('carrega e relaciona dados operacionais exclusivamente pelo cliente Supabase informado', async () => {
  const data = await loadOperationalData(fakeClient({
    companies: [{ id: 'company-a', code: 'CLI-A', name: 'Empresa A', active: true }],
    contacts: [{ id: 'contact-a', company_id: 'company-a', code: 'CON-A', name: 'Contato', email: 'c@example.test', authorized: true }],
    equipment: [{ id: 'equipment-a', company_id: 'company-a', code: 'EQP-A', name: 'PC', type: 'Desktop' }],
    contracts: [{ id: 'contract-a', code: 'CTR-A', company_id: 'company-a', name: 'Office Care', status: 'active', starts_at: '2026-01-01', ends_at: '2026-12-31', computer_limit: 8, monthly_minutes: 240 }],
    contract_equipment: [{ contract_id: 'contract-a', equipment_id: 'equipment-a' }], profiles: [{ id: 'tech-a', display_name: 'Técnica' }],
    tickets: [{ id: 'ticket-a', code: 'AUV-1', company_id: 'company-a', requester_id: 'contact-a', contract_id: 'contract-a', title: 'Teste', description: 'Teste', priority: 'P3', status: 'in_progress', assignee_id: 'tech-a', created_at: '2026-10-15T10:00:00Z' }],
    ticket_comments: [{ id: 'comment-a', ticket_id: 'ticket-a', author_id: 'tech-a', body: 'Comentário', created_at: '2026-10-15T10:10:00Z' }],
    ticket_history: [{ id: 'history-a', ticket_id: 'ticket-a', actor_id: 'tech-a', event_type: 'status', payload: { text: 'Em atendimento' }, created_at: '2026-10-15T10:05:00Z' }],
    time_entries: [{ id: 'time-a', ticket_id: 'ticket-a', company_id: 'company-a', contract_id: 'contract-a', author_id: 'tech-a', description: 'Suporte', minutes: 30, mode: 'remote', performed_at: '2026-10-15', competence: '2026-10-01', billable: false, consumes_franchise: true, created_at: '2026-10-15T10:20:00Z' }],
  }));
  assert.equal(data.clients[0].contacts[0].id, 'contact-a');
  assert.deepEqual(data.contracts[0].equipmentIds, ['equipment-a']);
  assert.equal(data.tickets[0].databaseId, 'ticket-a');
  assert.equal(data.tickets[0].status, 'Em atendimento');
  assert.equal(data.tickets[0].comments[0].author, 'Técnica');
  assert.equal(data.tickets[0].timeEntries[0].competence, '2026-10');
});
