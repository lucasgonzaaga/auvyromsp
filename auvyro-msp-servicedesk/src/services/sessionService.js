const SESSION_KEY = 'auvyro-msp-session-user';
const localUser = Object.freeze({ id: 'local-user', name: 'Usuário local', initials: 'UL', authenticated: false, authorizationEnforced: false, source: 'local-demo' });

export function getCurrentUser() {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return localUser;
    const user = JSON.parse(stored);
    if (!user?.id || !user?.name) return localUser;
    return {
      id: user.id,
      name: user.name,
      initials: user.initials || user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      authenticated: false,
      authorizationEnforced: false,
      source: 'local-demo',
    };
  } catch { return localUser; }
}
