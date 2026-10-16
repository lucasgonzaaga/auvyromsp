#!/usr/bin/env node
// Smoke test remoto somente leitura. Não grava dados nem imprime chaves.
import { pathToFileURL } from 'node:url';

export function validateStagingConfig(env) {
  const rawUrl = env.STAGING_SUPABASE_URL;
  const key = env.STAGING_SUPABASE_PUBLISHABLE_KEY;
  if (!rawUrl || !key) throw new Error('Defina STAGING_SUPABASE_URL e STAGING_SUPABASE_PUBLISHABLE_KEY.');
  let url;
  try { url = new URL(rawUrl); } catch { throw new Error('URL do Supabase inválida.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Supabase remoto exige URL HTTPS sem credenciais ou parâmetros.');
  }
  if (key.startsWith('sb_secret_')) throw new Error('Chave secreta não pode ser usada neste smoke test.');
  const jwtPart = key.split('.')[1];
  if (jwtPart) {
    try {
      const payload = JSON.parse(Buffer.from(jwtPart, 'base64url').toString('utf8'));
      if (payload.role === 'service_role') throw new Error('Não use service_role no smoke test.');
    } catch (err) {
      if (err.message === 'Não use service_role no smoke test.') throw err;
    }
  }
  return { origin: url.origin, key };
}

export async function runSmoke({ env = process.env, fetcher = fetch } = {}) {
  const { origin, key } = validateStagingConfig(env);
  const headers = { apikey: key, accept: 'application/json' };
  const health = await fetcher(origin + '/auth/v1/health', { headers, signal: AbortSignal.timeout(10000) });
  if (!health.ok) throw new Error('Supabase Auth indisponível (HTTP ' + health.status + ').');
  for (const table of ['companies', 'tickets']) {
    const response = await fetcher(origin + '/rest/v1/' + table + '?select=id&limit=1', {
      headers, signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401 || response.status === 403) continue; // sem GRANT para anon: bloqueado
    if (!response.ok) throw new Error('Falha ao conferir RLS em ' + table + ' (HTTP ' + response.status + ').');
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length) throw new Error('Possível vazamento de linhas anônimas em ' + table + '.');
  }
  return 'Auth disponível e acesso anônimo bloqueado em companies e tickets.';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSmoke().then((message) => console.log(message)).catch((error) => {
    console.error('Smoke de homologação falhou:', error.message);
    process.exitCode = 1;
  });
}
