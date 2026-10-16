import { pathToFileURL } from 'node:url';

export function requireHttpsOrigin(input, label) {
  let u;
  try { u = new URL(input); } catch { throw new Error(label + ': URL HTTPS inválida'); }
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash || u.pathname !== '/') throw new Error(label + ': informe somente uma origem HTTPS');
  return u.origin;
}
export async function smokeStaging({ appUrl, supabaseUrl, publishableKey, fetchImpl = fetch, bypassSecret = '' }) {
  const app = requireHttpsOrigin(appUrl, 'STAGING_APP_URL');
  const api = requireHttpsOrigin(supabaseUrl, 'STAGING_SUPABASE_URL');
  if (!publishableKey || /^sb_secret_|^sb_service_role_/i.test(publishableKey)) throw new Error('Use apenas uma chave publicável de staging');
  const payload = publishableKey.split('.')[1];
  if (payload) {
    try {
      const role = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role;
      if (role === 'service_role') throw new Error('service_role proibida');
    } catch (e) { if (e.message === 'service_role proibida') throw e; }
  }
  const opts = (headers) => ({ headers, redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const page = await fetchImpl(app, opts(bypassSecret ? { 'x-vercel-protection-bypass': bypassSecret } : {}));
  if (!page.ok) throw new Error('Frontend de staging indisponível: HTTP ' + page.status);
  if (!/id=["']root["']/.test(await page.text())) throw new Error('Frontend não parece ser o Service Desk');
  const auth = await fetchImpl(api + '/auth/v1/health', opts({ apikey: publishableKey }));
  if (!auth.ok) throw new Error('Supabase Auth indisponível: HTTP ' + auth.status);
  for (const table of ['companies', 'tickets']) {
    const response = await fetchImpl(api + '/rest/v1/' + table + '?select=id&limit=1', opts({ apikey: publishableKey, accept: 'application/json' }));
    if (response.status === 401 || response.status === 403) continue;
    if (!response.ok) throw new Error(table + ': HTTP ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data) || data.length !== 0) throw new Error('Vazamento de dados anônimos em ' + table);
  }
  return { frontend: 'ok', auth: 'ok', rlsAnon: 'sem dados' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  smokeStaging({
    appUrl: process.env.STAGING_APP_URL,
    supabaseUrl: process.env.STAGING_SUPABASE_URL,
    publishableKey: process.env.STAGING_SUPABASE_PUBLISHABLE_KEY,
    bypassSecret: process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '',
  }).then(() => console.log('Smoke remoto aprovado.')).catch(e => { console.error('Falha no smoke remoto:', e.message); process.exitCode = 1; });
}
