import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');

test('modo autenticado não inicializa nem persiste os dados demonstrativos locais', () => {
  assert.match(app, /remoteMode \? \[\] : loadClients\(\)/);
  assert.match(app, /remoteMode \? \[\] : loadContracts\(clients\)/);
  assert.match(app, /remoteMode \? \[\] : loadTickets\(clients, contracts\)/);
  assert.match(app, /if \(!remoteMode\) saveClients\(clients\)/);
  assert.match(app, /if \(!remoteMode\) saveContracts\(contracts\)/);
  assert.match(app, /if \(!remoteMode\) saveTickets\(tickets\)/);
});
