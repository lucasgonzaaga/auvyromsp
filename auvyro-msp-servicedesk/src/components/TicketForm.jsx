import { Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const priorities = ['P1', 'P2', 'P3', 'P4'];

export default function TicketForm({ clients, contracts, onClose, onCreate }) {
  const firstClient = clients.find((client) => client.status === 'Ativo');
  const [form, setForm] = useState({ companyId: firstClient?.id || '', requesterId: firstClient?.contacts.find((contact) => contact.authorized)?.id || '', contractId: contracts.find((contract) => contract.companyId === firstClient?.id && contract.status === 'Ativo')?.id || '', title: '', description: '', priority: 'P3' });
  const client = clients.find((item) => item.id === form.companyId);
  const authorizedContacts = client?.contacts.filter((contact) => contact.authorized) || [];
  const availableContracts = useMemo(() => contracts.filter((contract) => contract.companyId === form.companyId && contract.status === 'Ativo'), [contracts, form.companyId]);
  function selectCompany(companyId) {
    const selected = clients.find((item) => item.id === companyId);
    setForm({ ...form, companyId, requesterId: selected?.contacts.find((contact) => contact.authorized)?.id || '', contractId: contracts.find((contract) => contract.companyId === companyId && contract.status === 'Ativo')?.id || '' });
  }
  function submit(event) { event.preventDefault(); onCreate(form); }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-ticket-title"><div className="dialog-top"><div><p className="overline">NOVO ATENDIMENTO</p><h2 id="new-ticket-title">Abrir chamado</h2></div><button className="icon-button" aria-label="Fechar" onClick={onClose}><X /></button></div><form onSubmit={submit}><div className="form-grid"><label>Empresa<select required value={form.companyId} onChange={(event) => selectCompany(event.target.value)}>{clients.filter((item) => item.status === 'Ativo').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Contato autorizado<select required value={form.requesterId} onChange={(event) => setForm({ ...form, requesterId: event.target.value })}>{authorizedContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label></div><label>Contrato Office Care<select value={form.contractId} onChange={(event) => setForm({ ...form, contractId: event.target.value })}><option value="">Sem contrato</option>{availableContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.id} · {contract.status}</option>)}</select></label><label>Assunto<input required maxLength={140} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Resumo do problema" /></label><label>Descrição<textarea required maxLength={2000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Conte o que aconteceu" /></label><label>Prioridade<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{priorities.map((priority) => <option key={priority} value={priority}>{priority} — {({ P1: 'Crítica', P2: 'Alta', P3: 'Normal', P4: 'Baixa' })[priority]}</option>)}</select></label><div className="dialog-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" type="submit"><Plus size={17} />Criar chamado</button></div></form></div></div>;
}
