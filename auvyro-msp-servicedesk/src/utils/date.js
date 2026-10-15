export function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value)).replace('.', '');
}

export function formatLongDate(value = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  }).format(value).replace('.', '').toUpperCase();
}

export function isToday(value, now = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

export function formatMinutes(minutes) {
  const total = Number(minutes) || 0;
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
}
