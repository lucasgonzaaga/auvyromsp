// Smoke test somente leitura do ambiente staging; nunca use service_role.
import { pathToFileURL } from 'node:url';

function validHttpsOrigin(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label}: URL inválida`); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || url.origin !== url.href.replace(/\/$/, '')) {
    throw new Error(`${label}: informe somente a origem HTTPS (ex.: https://staging.exemplo.com)`);
  }
  return url.origin;
}

export async function smokeStaging({ appUrl, supabaseUrl, publishableKey, fetchImpl = fetch, bypassSecret = '' }) {
  const appOrigin = validHttpsOrigin(appUrl, 'STAGING_APP_URL');
  const apiOrigin = validHttpsOrigin(supabaseUrl, 'STAGING_SUPABASE_URL');
  if (!publishableKey || publishableKey.startsWith('sb_secret_') || /service.role/i.test(publishableKey)) {
    throw new Error('Use somente a chave pública/publishable do projeto staging.');
  }
  const previewHeaders = bypassSecret
    ? { 'x-vercel-protection-bypass': bypassSecret }
    : {};
  const app = await fetchImpl(appOrigin, { headers: previewHeaders, redirect: 'manual', signal: AbortSignal.timeout(15000) });
  if (!app.ok) throw new Error(`Frontend indisponível (HTTP ${app.status}). Em preview protegida, configure bypass de teste sem desativar a proteção.`);
  const html = await app.text();
  if (!/<html[\s>]/i.test(html) || !/id=["']root["']/.test(html)) {
    throw new Error('Frontend respondeu, mas não parece conter a aplicação React.');
  }
  const health = await fetchImpl(`${apiOrigin}/auth/v1/health`, { headers: { apikey: publishableKey }, signal: AbortSignal.timeout(15000) });
  if (!health.ok) throw new Error(`Supabase Auth staging indisponível (HTTP ${health.status}).`);
  const checks = ['companies', 'tickets'];
  for (const table of checks) {
    const response = await fetchImpl(`${apiOrigin}/rest/v1/${table}?select=id&limit=1`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    // Um 401/403 é permitido se a API negou o acesso anônimo. 200 exige lista vazia.
    if (response.status === 401 || response.status === 403) continue;
    if (!response.ok) throw new Error(`RLS ${table}: resposta inesperada HTTP ${response.status}.`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length !== 0) throw new Error(`RLS ${table}: a chave pública expôs dados anônimos.`);
  }
  return { app: appOrigin, auth: 'healthy', anonRls: 'blocked', testedTables: checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await smokeStaging({
      appUrl: process.env.STAGING_APP_URL,
      supabaseUrl: process.env.STAGING_SUPABASE_URL,
      publishableKey: process.env.STAGING_SUPABASE_PUBLISHABLE_KEY,
      bypassSecret: process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    });
    console.log('Smoke staging aprovado: frontend, Supabase Auth e RLS anônimo.');
  } catch (error) {
    console.error(`Smoke staging falhou: ${error.message}`);
    process.exitCode = 1;
  }
}
