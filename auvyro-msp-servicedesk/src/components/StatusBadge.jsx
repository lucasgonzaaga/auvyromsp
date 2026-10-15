export default function StatusBadge({ value }) {
  const kind = ['Resolvido', 'Encerrado'].includes(value) ? 'done' : value === 'Novo' ? 'new' : value.includes('Aguardando') ? 'waiting' : 'active';
  return <span className={`status status--${kind}`}><i />{value}</span>;
}
