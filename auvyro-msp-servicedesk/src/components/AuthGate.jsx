import { useEffect, useState } from 'react';
import App from '../App.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

async function loadIdentity(session) {
  if (!session?.user) return null;
  const { data, error } = await supabase.from('profiles').select('id, company_id, role, display_name, active').eq('id', session.user.id).single();
  if (error) throw error;
  if (!data.active) throw new Error('Este usuário está inativo.');
  return {
    id: data.id,
    companyId: data.company_id,
    role: data.role,
    name: data.display_name,
    initials: data.display_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    authenticated: true,
    authorizationEnforced: true,
    source: 'supabase',
  };
}

export default function AuthGate() {
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;
    const applySession = async (session) => {
      try {
        const next = await loadIdentity(session);
        if (active) { setIdentity(next); setError(''); }
      } catch (sessionError) {
        if (active) { setIdentity(null); setError(sessionError.message); }
      } finally { if (active) setLoading(false); }
    };
    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => applySession(session), 0);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  if (!isSupabaseConfigured) return <App />;
  if (loading) return <div className="auth-screen"><div className="auth-card"><p>Validando sessão segura…</p></div></div>;
  if (identity) return <App currentUserOverride={identity} onSignOut={() => supabase.auth.signOut()} />;

  async function signIn(event) {
    event.preventDefault();
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword(credentials);
    if (signInError) { setError('E-mail ou senha inválidos.'); setLoading(false); }
  }

  return <div className="auth-screen"><form className="auth-card" onSubmit={signIn}><p className="overline">AUVYRO MSP</p><h1>Acessar Service Desk</h1><p>Entre com sua conta de administrador, técnico ou cliente.</p><label>E-mail<input required type="email" autoComplete="email" value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} /></label><label>Senha<input required type="password" autoComplete="current-password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary" type="submit">Entrar</button></form></div>;
}
