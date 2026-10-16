import test from 'node:test';
import assert from 'node:assert/strict';
import { smokeStaging } from '../../scripts/smoke-staging.mjs';
const cfg = { appUrl: 'https://app.example.test', supabaseUrl: 'https://db.example.test', publishableKey: 'sb_publishable_test' };
const resp = (body = '[]', status = 200) => ({ status, ok: status >= 200 && status < 300, text: async () => body, json: async () => JSON.parse(body) });
const good = async url => url === cfg.appUrl ? resp('<html><div id="root"></div></html>') : url.includes('/health') ? resp('{}') : resp('[]');
test('aprova app, Auth e RLS sem dados anônimos', async () => { assert.equal((await smokeStaging({ ...cfg, fetchImpl: good })).rlsAnon, 'sem dados'); });
test('recusa HTTP e service role', async () => {
  await assert.rejects(() => smokeStaging({ ...cfg, appUrl: 'http://app.example.test', fetchImpl: good }), /HTTPS/);
  await assert.rejects(() => smokeStaging({ ...cfg, publishableKey: 'sb_secret_x', fetchImpl: good }), /publicável/);
  const jwt='x.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.x';
  await assert.rejects(() => smokeStaging({ ...cfg, publishableKey: jwt, fetchImpl: good }), /service_role/);
});
test('bloqueia vazamento, Auth indisponível e frontend indisponível', async () => {
  await assert.rejects(() => smokeStaging({ ...cfg, fetchImpl: async url => url.includes('companies') ? resp('[{"id":"vazou"}]') : good(url) }), /Vazamento/);
  await assert.rejects(() => smokeStaging({ ...cfg, fetchImpl: async url => url.includes('/health') ? resp('{}',503) : good(url) }), /Auth indisponível/);
  await assert.rejects(() => smokeStaging({ ...cfg, fetchImpl: async url => url === cfg.appUrl ? resp('',503) : good(url) }), /Frontend/);
});
test('permite HTTP 403 como ausência de grants ao anônimo e mantém bypass só no frontend', async () => {
  const calls=[];
  const result=await smokeStaging({ ...cfg, bypassSecret:'test-bypass', fetchImpl: async (url, opts) => {calls.push({url,headers:opts.headers});return url.includes('/rest/v1/') ? resp('{}',403) : good(url);}});
  assert.equal(result.rlsAnon,'sem dados');
  assert.equal(calls[0].headers['x-vercel-protection-bypass'],'test-bypass');
  assert.ok(calls.slice(1).every(c=>!('x-vercel-protection-bypass' in c.headers)));
});
