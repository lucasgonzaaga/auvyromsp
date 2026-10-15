import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../../supabase/migrations/202610150001_auvyro_msp_v04.sql', import.meta.url), 'utf8');

test('migration habilita RLS em todas as tabelas de negócio', () => {
  for (const table of ['companies', 'profiles', 'contacts', 'equipment', 'contracts', 'contract_equipment', 'tickets', 'ticket_comments', 'ticket_history', 'time_entries']) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
});

test('migration impõe integridade de empresa, competência e auditoria', () => {
  assert.match(migration, /foreign key \(contract_id, company_id\)/i);
  assert.match(migration, /date_trunc\('month', performed_at\)::date = competence/i);
  assert.match(migration, /revoke insert, update, delete on public\.ticket_history/i);
});

test('migration diferencia administradores, técnicos e clientes', () => {
  assert.match(migration, /'admin', 'technician', 'client'/i);
  assert.match(migration, /current_company_id/i);
  assert.match(migration, /tickets_client_insert/i);
  assert.match(migration, /tickets_client_update/i);
  assert.match(migration, /audit_operational_change/i);
  assert.match(migration, /revoke insert, update, delete on public\.ticket_history/i);
});
