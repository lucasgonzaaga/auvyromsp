import test from 'node:test';
import assert from 'node:assert/strict';
import { getCurrentUser } from './sessionService.js';

test('identidade armazenada localmente permanece demonstrativa e não autenticada', () => {
  const previousLocalStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => JSON.stringify({ id: 'tech-1', name: 'Técnica Local' }) };

  try {
    const user = getCurrentUser();
    assert.equal(user.name, 'Técnica Local');
    assert.equal(user.authenticated, false);
    assert.equal(user.authorizationEnforced, false);
    assert.equal(user.source, 'local-demo');
  } finally {
    if (previousLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousLocalStorage;
  }
});
