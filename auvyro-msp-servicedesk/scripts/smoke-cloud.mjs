// Smoke de homologação REMOTA: apenas requisições de leitura; nunca usa service_role.
const timeoutMs = 15000;

export function requireHttpsOrigin(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label} deve ser uma URL HTTPS válida.`); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    throw new Error(`${label} precisa ser uma origem HTTPS pública (sem caminho, credenciais ou parâmetros).`);
  }
  return url.origin;
}

async function checkedFetch(fetcher, url, options = {}) {
  const response = await fetcher(url, { ...options, signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
  if (!response.ok) throw new Error(`HTTP ${response.status} em ${new URL(url).pathname}. Verifique a configuração e a proteção do staging.`);
  return response;
}

export async function smokeCloud({ frontendUrl, supabaseUrl, publishableKey, previewBypassSecret = '', fetcher = fetch }) {
  const frontend = requireHttpsOrigin(frontendUrl, 'STAGING_FRONTEND_URL');
  const backend = requireHttpsOrigin(supabaseUrl, 'STAGING_SUPABASE_URL');
  if (!publishableKey || !publishableKey.trim() || /^sb_secret_|^sb_service_role_/i.test(publishableKey.trim())) {
    throw new Error('STAGING_SUPABASE_PUBLISHABLE_KEY precisa ser uma chave pública, nunca service_role/secret.');
  }
  const headers = previewBypassSecret ? { 'x-vercel-protection-bypass': previewBypassSecret } : {};
  const page = await checkedFetch(fetcher, frontend + '/', { headers });
  const html = await page.text();
  if (!/<html[\s>]/i.test(html) || !/<div\s+id=["']root["']/i.test(html)) {
    throw new Error('A URL de staging não retornou o HTML esperado da aplicação React.');
  }
  const publicHeaders = { apikey: publishableKey };
  const auth = await checkedFetch(fetcher, backend + '/auth/v1/health', { headers: publicHeaders });
  const health = await auth.json();
  if (health && typeof health === 'object' && health.error) throw new Error('Supabase Auth retornou erro.');
  for (const table of ['companies', 'tickets']) {
    const response = await checkedFetch(fetcher, backend + `/rest/v1/${table}?select=id&limit=1`, { headers: publicHeaders });
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length !== 0) throw new Error(`Falha de isolamento: papel anônimo conseguiu ler ${table}.`);
  }
  return { frontend: 'ok', auth: 'ok', anonymousRls: 'ok' };
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  try {
    const result = await smokeCloud({
      frontendUrl: process.env.STAGING_FRONTEND_URL,
      supabaseUrl: process.env.STAGING_SUPABASE_URL,
      publishableKey: process.env.STAGING_SUPABASE_PUBLISHABLE_KEY,
      previewBypassSecret: process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    });
    console.log('Smoke de staging aprovado:', JSON.stringify(result));
  } catch (error) {
    console.error('Smoke de staging reprovado:', error.message);
    process.exitCode = 1;
  }
}
