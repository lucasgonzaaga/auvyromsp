import test from 'node:test';
import assert from 'node:assert/strict';
import { addContactRecord, addEquipmentRecord, createClientRecord } from './clientService.js';

test('gera IDs estáveis e independentes para empresas, contatos e equipamentos', () => {
  const company = createClientRecord([{ id: 'CLI-0007' }], { name: 'Empresa Fictícia' });
  assert.equal(company.id, 'CLI-0008');
  const withContact = addContactRecord(company, { name: 'Contato', email: 'contato@exemplo.test', authorized: true });
  const withEquipment = addEquipmentRecord(withContact, { name: 'PC-01', type: 'Desktop' });
  assert.equal(withContact.contacts[0].id, 'CON-0001');
  assert.equal(withEquipment.equipment[0].id, 'EQP-0001');
});
