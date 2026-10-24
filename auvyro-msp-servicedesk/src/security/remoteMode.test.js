import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
const authGate = readFileSync(new URL('../components/AuthGate.jsx', import.meta.url), 'utf8');
const hostedValidator = readFileSync(new URL('../../scripts/validate-hosted-env.mjs', import.meta.url), 'utf8');

test('modo autenticado não inicializa nem persiste os dados demonstrativos locais', () => {
  assert.match(app, /remoteMode \? \[\] : loadClients\(\)/);
  assert.match(app, /remoteMode \? \[\] : loadContracts\(clients\)/);
  assert.match(app, /remoteMode \? \[\] : loadTickets\(clients, contracts\)/);
  assert.match(app, /if \(!remoteMode\) saveClients\(clients\)/);
  assert.match(app, /if \(!remoteMode\) saveContracts\(contracts\)/);
  assert.match(app, /if \(!remoteMode\) saveTickets\(tickets\)/);
});

test('modo hospedado falha fechado sem configuração Supabase', () => {
  assert.match(authGate, /hostedConfigurationError/);
  assert.match(hostedValidator, /VITE_APP_MODE !== 'hosted'/);
  assert.match(hostedValidator, /VITE_SUPABASE_URL/);
  assert.match(hostedValidator, /VITE_SUPABASE_ANON_KEY/);
});
