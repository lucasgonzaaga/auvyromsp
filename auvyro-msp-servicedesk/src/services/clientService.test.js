import test from 'node:test';
import assert from 'node:assert/strict';
import { addContactRecord, addEquipmentRecord, createClientRecord } from './clientService.js';

test('gera IDs internos globais e mantém códigos legíveis separados', () => {
  const company = createClientRecord([{ id: 'CLI-0007' }], { name: 'Empresa Fictícia' });
  assert.equal(company.id, 'CLI-0008');
  const other = createClientRecord([company], { name: 'Outra Empresa' });
  const first = addEquipmentRecord(addContactRecord(company, { name: 'Contato', email: 'contato@exemplo.test' }), { name: 'PC-01' });
  const second = addEquipmentRecord(addContactRecord(other, { name: 'Contato 2', email: 'outro@exemplo.test' }), { name: 'PC-02' });
  assert.notEqual(first.contacts[0].id, second.contacts[0].id);
  assert.notEqual(first.equipment[0].id, second.equipment[0].id);
  assert.match(first.contacts[0].id, /^[0-9a-f-]{36}$/);
  assert.match(first.contacts[0].code, /^CON-[0-9A-F]{8}$/);
  assert.match(first.equipment[0].code, /^EQP-[0-9A-F]{8}$/);
});
