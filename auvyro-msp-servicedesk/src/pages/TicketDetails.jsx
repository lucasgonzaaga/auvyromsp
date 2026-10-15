import { ArrowLeft, CheckCircle2, Clock3, MessageSquareText, Play, RotateCcw, UserCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDateTime, formatMinutes } from '../utils/date.js';
import { getTicketMinutes } from '../utils/ticketMetrics.js';
import { buildTicketActivity, canTransitionStatus, getAllowedStatuses } from '../services/ticketService.js';
import { getCompetence } from '../utils/timeEntries.js';

const priorities = ['P1', 'P2', 'P3', 'P4'];
const emptyTime = (contractId = '') => {
  const now = new Date();
  const performedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { description: '', minutes: 30, type: 'Remoto', contractId, performedAt, competence: getCompetence(performedAt), billable: false, billingExceptionReason: '' };
};

export default function TicketDetails({ ticket, contracts, currentUser, onBack, onSave, onComment, onTime, onArchive }) {
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [comment, setComment] = useState('');
  const [time, setTime] = useState(() => emptyTime(ticket.contractId || ''));
  const [archiveReason, setArchiveReason] = useState('');
  const [tab, setTab] = useState('timeline');
  useEffect(() => { setStatus(ticket.status); setPriority(ticket.priority); }, [ticket.id, ticket.status, ticket.priority]);
  const dirty = status !== ticket.status || priority !== ticket.priority;
  const activity = useMemo(() => buildTicketActivity(ticket), [ticket]);
  const allowedStatuses = getAllowedStatuses(ticket.status);
  const today = new Date().toISOString().slice(0, 10);
  const availableContracts = contracts.filter((contract) => contract.companyId === ticket.companyId && contract.status === 'Ativo' && contract.startsAt <= today && contract.endsAt >= today);

  function submitComment(event) { event.preventDefault(); if (!comment.trim()) return; onComment(comment.trim()); setComment(''); }
  function submitTime(event) { event.preventDefault(); if (!time.description.trim() || Number(time.minutes) <= 0) return; onTime({ ...time, description: time.description.trim(), contractId: time.contractId || null }); setTime(emptyTime(ticket.contractId || '')); setTab('time'); }
  function archive() { if (!archiveReason.trim()) return; onArchive(archiveReason.trim()); }

  return <div className="ticket-details">
    <button className="back-button" onClick={onBack}><ArrowLeft size={16} />Voltar para chamados</button>
    <section className="detail-heading"><div><div className="detail-id"><span>{ticket.id}</span><StatusBadge value={ticket.status} /></div><h1>{ticket.title}</h1><p>{ticket.company} · solicitado por {ticket.requester}</p></div><div className="detail-actions">
      {!ticket.assignee && <button className="secondary action-button" onClick={() => onSave({ assignee: currentUser.name })}><UserCheck size={16} />Assumir</button>}
      {canTransitionStatus(ticket.status, 'Em atendimento') && ticket.status !== 'Em atendimento' && <button className="secondary action-button" onClick={() => onSave({ status: 'Em atendimento', assignee: ticket.assignee || currentUser.name })}><Play size={15} />Iniciar</button>}
      {canTransitionStatus(ticket.status, 'Resolvido') && ticket.status !== 'Resolvido' && <button className="primary" onClick={() => onSave({ status: 'Resolvido' })}><CheckCircle2 size={16} />Resolver</button>}
      {canTransitionStatus(ticket.status, 'Encerrado') && ticket.status !== 'Encerrado' && <button className="primary" onClick={() => onSave({ status: 'Encerrado' })}><CheckCircle2 size={16} />Encerrar</button>}
      {['Resolvido', 'Encerrado'].includes(ticket.status) && <button className="secondary action-button" onClick={() => onSave({ status: 'Em atendimento' })}><RotateCcw size={15} />Reabrir</button>}
    </div></section>

    <div className="detail-layout"><main className="detail-main">
      <section className="detail-section"><h2>Descrição</h2><p className="ticket-description">{ticket.description}</p></section>
      <section className="detail-section activity-section"><div className="tab-list"><button className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}>Linha do tempo</button><button className={tab === 'time' ? 'active' : ''} onClick={() => setTab('time')}>Apontamentos <span>{ticket.timeEntries.length}</span></button></div>
        {tab === 'timeline' && <><form className="comment-form" onSubmit={submitComment}><MessageSquareText size={17} /><textarea rows="2" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Escreva uma atualização para o histórico..." /><button className="secondary" type="submit">Comentar</button></form><div className="timeline">{activity.map((item) => <article className={`timeline-item timeline-item--${item.kind}`} key={`${item.kind}-${item.id}`}><i /><div><p>{item.text}</p><small>{item.author || 'Sistema'} · {formatDateTime(item.createdAt)}</small></div></article>)}</div></>}
        {tab === 'time' && <><form className="time-form time-form--franchise" onSubmit={submitTime}><label className="time-activity">Atividade<input required value={time.description} onChange={(event) => setTime({ ...time, description: event.target.value })} placeholder="O que foi realizado?" /></label><label>Duração (min)<input required type="number" min="1" step="5" value={time.minutes} onChange={(event) => setTime({ ...time, minutes: event.target.value })} /></label><label>Modalidade<select value={time.type} onChange={(event) => setTime({ ...time, type: event.target.value, billable: event.target.value === 'Presencial', billingExceptionReason: '' })}><option>Remoto</option><option>Presencial</option></select></label><label>Contrato<select value={time.contractId} onChange={(event) => setTime({ ...time, contractId: event.target.value })}><option value="">Sem contrato</option>{availableContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.id}</option>)}</select></label><label>Data do atendimento<input required type="date" value={time.performedAt} onChange={(event) => setTime({ ...time, performedAt: event.target.value, competence: getCompetence(event.target.value) })} /></label><label>Competência<input required type="month" value={time.competence} onChange={(event) => setTime({ ...time, competence: event.target.value })} /></label><label className="billable-check"><input type="checkbox" checked={time.billable} onChange={(event) => setTime({ ...time, billable: event.target.checked, billingExceptionReason: event.target.checked ? '' : time.billingExceptionReason })} />Faturável fora da franquia</label>{time.type === 'Presencial' && !time.billable && <label className="billing-exception">Justificativa da exceção<input required value={time.billingExceptionReason} onChange={(event) => setTime({ ...time, billingExceptionReason: event.target.value })} placeholder="Por que o presencial não será faturado?" /></label>}<button className="primary" type="submit"><Clock3 size={15} />Registrar</button></form><div className="time-history">{[...ticket.timeEntries].reverse().map((entry) => <article key={entry.id}><div><strong>{entry.description}</strong><small>{entry.author} · {formatDateTime(entry.createdAt)} · {entry.type} · {entry.contractId || 'Sem contrato'} · {entry.competence || 'Sem competência'} · {entry.billable ? 'Faturável' : 'Franquia'}{entry.billingExceptionReason ? ` · Exceção: ${entry.billingExceptionReason}` : ''}</small></div><b>{formatMinutes(entry.minutes)}</b></article>)}</div></>}
      </section>
    </main>

    <aside className="detail-sidebar"><section className="property-panel"><h2>Informações</h2><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>{allowedStatuses.map((item) => <option key={item}>{item}</option>)}</select></label><label>Prioridade<select value={priority} onChange={(event) => setPriority(event.target.value)}>{priorities.map((item) => <option key={item}>{item}</option>)}</select></label><div className="property"><small>RESPONSÁVEL</small><strong>{ticket.assignee || 'Não atribuído'}</strong></div><div className="property"><small>ABERTURA</small><strong>{formatDateTime(ticket.createdAt)}</strong></div><div className="property"><small>RESOLUÇÃO</small><strong>{formatDateTime(ticket.resolvedAt)}</strong></div><div className="property"><small>ENCERRAMENTO</small><strong>{formatDateTime(ticket.closedAt)}</strong></div><div className="property"><small>TEMPO REGISTRADO</small><strong>{formatMinutes(getTicketMinutes(ticket))}</strong></div><button className="save-button" disabled={!dirty} onClick={() => onSave({ status, priority })}>{dirty ? 'Salvar alterações' : 'Sem alterações pendentes'}</button></section>
      <section className="archive-panel"><h3>Arquivar chamado</h3><p>O registro será preservado e removido das filas ativas.</p><textarea rows="2" value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} placeholder="Informe o motivo" /><button disabled={!archiveReason.trim()} onClick={archive}>Arquivar com justificativa</button></section>
    </aside></div>
  </div>;
}
