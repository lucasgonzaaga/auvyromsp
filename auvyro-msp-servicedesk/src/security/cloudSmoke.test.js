import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStagingConfig, runSmoke } from '../../scripts/cloud-smoke.mjs';

const env = { STAGING_SUPABASE_URL: 'https://staging.example.test', STAGING_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' };
const response = (status, rows = []) => ({ status, ok: status >= 200 && status < 300, json: async () => rows });

test('exige HTTPS, chave publicável e rejeita service_role', () => {
  assert.throws(() => validateStagingConfig({ ...env, STAGING_SUPABASE_URL: 'http://staging.example.test' }), /HTTPS/);
  assert.throws(() => validateStagingConfig({ ...env, STAGING_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_test' }), /secreta/);
  const secretJwt = 'x.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.x';
  assert.throws(() => validateStagingConfig({ ...env, STAGING_SUPABASE_PUBLISHABLE_KEY: secretJwt }), /service_role/);
});

test('aceita recursos privados vazios ou sem acesso a anon', async () => {
  const paths = [];
  const fetcher = async (url) => {
    paths.push(url);
    return response(url.includes('/health') ? 200 : url.includes('companies') ? 403 : 200);
  };
  assert.match(await runSmoke({ env, fetcher }), /bloqueado/);
  assert.equal(paths.length, 3);
});

test('bloqueia se um anônimo conseguir consultar linhas privadas', async () => {
  const fetcher = async (url) => response(200, url.includes('companies') ? [{ id: 'leaked' }] : []);
  await assert.rejects(() => runSmoke({ env, fetcher }), /vazamento/);
});

test('falha se Auth estiver fora do ar ou REST responder inesperadamente', async () => {
  await assert.rejects(() => runSmoke({ env, fetcher: async () => response(503) }), /Auth indisponível/);
  const fetcher = async (url) => response(url.includes('/health') ? 200 : 500);
  await assert.rejects(() => runSmoke({ env, fetcher }), /RLS/);
});
