import test from 'node:test';
import assert from 'node:assert/strict';
import { smokeCloud, requireHttpsOrigin } from './smoke-cloud.mjs';

const opts = { frontendUrl: 'https://staging.example.test', supabaseUrl: 'https://api.example.test', publishableKey: 'sb_publishable_test' };
function response(value, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => String(value), json: async () => value };
}
function makeFetch(overrides = {}) {
  return async (url) => {
    const pathname = new URL(url).pathname;
    if (pathname in overrides) return overrides[pathname];
    if (pathname === '/') return response('<html><body><div id="root"></div></body></html>');
    if (pathname === '/auth/v1/health') return response({ version: 'test' });
    return response([]);
  };
}
test('valida URL pública HTTPS sem credenciais e sem parâmetros', () => {
  assert.equal(requireHttpsOrigin('https://staging.example.test/', 'url'), 'https://staging.example.test');
  for (const url of ['http://staging.example.test', 'https://user:pass@staging.example.test', 'https://staging.example.test/admin', 'https://staging.example.test/?token=x', 'https://127.0.0.1']) {
    assert.throws(() => requireHttpsOrigin(url, 'url'));
  }
});
test('smoke remoto somente leitura aceita frontend, auth e isolamento anônimo', async () => {
  const seen = [];
  const base = makeFetch();
  const result = await smokeCloud({ ...opts, fetcher: async (url, options) => { seen.push({ url, method: options.method }); return base(url); } });
  assert.deepEqual(result, { frontend: 'ok', auth: 'ok', anonymousRls: 'ok' });
  assert.equal(seen.length, 4);
  assert.ok(seen.every((r) => !r.method || r.method === 'GET'));
});
test('falha se aplicação estiver indisponível ou não houver React', async () => {
  await assert.rejects(smokeCloud({ ...opts, fetcher: makeFetch({ '/': response('', 503) }) }), /HTTP 503/);
  await assert.rejects(smokeCloud({ ...opts, fetcher: makeFetch({ '/': response('<html>login externo</html>') }) }), /HTML esperado/);
});
test('falha com indisponibilidade do Auth e com vazamento RLS', async () => {
  await assert.rejects(smokeCloud({ ...opts, fetcher: makeFetch({ '/auth/v1/health': response({ error: 'offline' }, 503) }) }), /HTTP 503/);
  await assert.rejects(smokeCloud({ ...opts, fetcher: makeFetch({ '/rest/v1/companies': response([{ id: 'leak' }]) }) }), /isolamento/);
  await assert.rejects(smokeCloud({ ...opts, fetcher: makeFetch({ '/rest/v1/tickets': response([{ id: 'leak' }]) }) }), /isolamento/);
});
test('rejeita service_role/secret e transmite bypass somente ao frontend', async () => {
  for (const key of ['sb_secret_abc', 'sb_service_role_abc']) await assert.rejects(smokeCloud({ ...opts, publishableKey: key, fetcher: makeFetch() }), /chave pública/);
  const requests = [];
  await smokeCloud({ ...opts, previewBypassSecret: 'private-example', fetcher: async (url, options) => {
    requests.push({ url, headers: options.headers }); return makeFetch()(url);
  } });
  assert.equal(requests[0].headers['x-vercel-protection-bypass'], 'private-example');
  assert.ok(requests.slice(1).every((r) => !('x-vercel-protection-bypass' in r.headers)));
});
