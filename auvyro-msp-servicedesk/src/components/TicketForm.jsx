import { Plus, X } from 'lucide-react';
import { useState } from 'react';

const priorities = ['P1', 'P2', 'P3', 'P4'];
const emptyForm = { company: '', requester: '', title: '', description: '', priority: 'P3' };

export default function TicketForm({ onClose, onCreate }) {
  const [form, setForm] = useState(emptyForm);
  function submit(event) { event.preventDefault(); onCreate(form); }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-ticket-title"><div className="dialog-top"><div><p className="overline">NOVO ATENDIMENTO</p><h2 id="new-ticket-title">Abrir chamado</h2></div><button className="icon-button" aria-label="Fechar" onClick={onClose}><X /></button></div><form onSubmit={submit}><div className="form-grid"><label>Empresa<input required maxLength={100} value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Nome da empresa" /></label><label>Solicitante<input required maxLength={100} value={form.requester} onChange={(event) => setForm({ ...form, requester: event.target.value })} placeholder="Nome do solicitante" /></label></div><label>Assunto<input required maxLength={140} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Resumo do problema" /></label><label>Descrição<textarea required maxLength={2000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Conte o que aconteceu" /></label><label>Prioridade<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{priorities.map((priority) => <option key={priority} value={priority}>{priority} — {({ P1: 'Crítica', P2: 'Alta', P3: 'Normal', P4: 'Baixa' })[priority]}</option>)}</select></label><div className="dialog-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" type="submit"><Plus size={17} />Criar chamado</button></div></form></div></div>;
}
