import test from 'node:test';
import assert from 'node:assert/strict';
import { smokeStaging } from '../scripts/smoke-staging.mjs';

const cfg = { appUrl: 'https://staging.example.com', supabaseUrl: 'https://staging.supabase.co', publishableKey: 'sb_publishable_example' };
const ok = (body, status = 200) => ({ status, ok: status >= 200 && status < 300, text: async () => body, json: async () => JSON.parse(body) });
const homepage = '<html><body><div id="root"></div></body></html>';
const fakeFetch = async (url) => {
  if (url === cfg.appUrl) return ok(homepage);
  if (url.includes('/auth/v1/health')) return ok('{}');
  return ok('[]');
};

test('smoke staging aceita Auth saudável e RLS anônimo sem linhas', async () => {
  const result = await smokeStaging({ ...cfg, fetchImpl: fakeFetch });
  assert.equal(result.anonRls, 'blocked');
});

test('bloqueia HTTP e URLs com credenciais, query ou path', async () => {
  for (const appUrl of ['http://staging.example.com', 'https://user:pass@staging.example.com', 'https://staging.example.com/admin', 'https://staging.example.com/?key=abc']) {
    await assert.rejects(() => smokeStaging({ ...cfg, appUrl, fetchImpl: fakeFetch }), /HTTPS|URL/);
  }
});

test('rejeita secret keys e service_role', async () => {
  for (const publishableKey of ['sb_secret_abc', 'service_role.example']) {
    await assert.rejects(() => smokeStaging({ ...cfg, publishableKey, fetchImpl: fakeFetch }), /chave pública/);
  }
});

test('detecta dados anônimos acessíveis por RLS', async () => {
  await assert.rejects(() => smokeStaging({ ...cfg, fetchImpl: async (url) =>
    url.includes('/rest/v1/companies') ? ok('[{"id":"leak"}]') : fakeFetch(url)
  }), /expôs dados/);
});

test('detecta indisponibilidade do frontend, mesmo se o Supabase responder', async () => {
  await assert.rejects(() => smokeStaging({ ...cfg, fetchImpl: async (url) =>
    url === cfg.appUrl ? ok('', 503) : fakeFetch(url)
  }), /Frontend indisponível/);
});

test('detecta indisponibilidade do Auth', async () => {
  await assert.rejects(() => smokeStaging({ ...cfg, fetchImpl: async (url) =>
    url.includes('/auth/v1/health') ? ok('{}', 503) : fakeFetch(url)
  }), /Auth staging indisponível/);
});

test('aceita negação HTTP 403 na consulta anônima', async () => {
  const result = await smokeStaging({ ...cfg, fetchImpl: async (url) =>
    url.includes('/rest/v1/') ? ok('{}', 403) : fakeFetch(url)
  });
  assert.equal(result.anonRls, 'blocked');
});

test('envia bypass somente à página preview e nunca à API Supabase', async () => {
  const calls = [];
  await smokeStaging({ ...cfg, bypassSecret: 'secret-preview', fetchImpl: async (url, options) => {
    calls.push({ url, headers: options.headers });
    return fakeFetch(url);
  } });
  assert.equal(calls[0].headers['x-vercel-protection-bypass'], 'secret-preview');
  for (const call of calls.slice(1)) assert.equal(call.headers['x-vercel-protection-bypass'], undefined);
});
