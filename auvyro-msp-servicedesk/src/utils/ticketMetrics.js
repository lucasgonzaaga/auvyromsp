import { isToday } from './date.js';

const closedStatuses = ['Resolvido', 'Encerrado'];

export function getTicketMinutes(ticket) {
  return (ticket.timeEntries || []).reduce((total, entry) => total + (Number(entry.minutes) || 0), 0);
}

export function getMetrics(tickets) {
  const active = tickets.filter((ticket) => !ticket.archivedAt);
  return {
    open: active.filter((ticket) => !closedStatuses.includes(ticket.status)).length,
    urgent: active.filter((ticket) => ticket.priority === 'P1' && !closedStatuses.includes(ticket.status)).length,
    waiting: active.filter((ticket) => ticket.status.includes('Aguardando')).length,
    resolvedToday: active.filter((ticket) => isToday(ticket.resolvedAt)).length,
    minutes: tickets.reduce((total, ticket) => total + getTicketMinutes(ticket), 0),
  };
}
