import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { isDeploymentEnvironment } from '../../scripts/guard-demo-build.mjs';

test('bloqueia o build demonstrativo em CI e provedores de hospedagem', () => {
  assert.equal(isDeploymentEnvironment({}), false);
  assert.equal(isDeploymentEnvironment({ CI: 'true' }), true);
  assert.equal(isDeploymentEnvironment({ VERCEL: '1' }), true);
  assert.equal(isDeploymentEnvironment({ NETLIFY: 'true' }), true);
  assert.equal(isDeploymentEnvironment({ CF_PAGES: '1' }), true);
});

test('mantém comandos distintos para build demonstrativo e hospedado', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.match(packageJson.scripts.build, /guard-demo-build/);
  assert.match(packageJson.scripts['build:hosted'], /validate-hosted-env/);
  assert.doesNotMatch(packageJson.scripts['build:hosted'], /guard-demo-build/);
});

test('workflows de entrega executam somente o build hospedado', async () => {
  const workflows = await Promise.all([
    readFile(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8'),
    readFile(new URL('../../../.github/workflows/supabase-homologacao.yml', import.meta.url), 'utf8'),
  ]);
  const buildCommands = workflows.flatMap((workflow) => workflow.match(/npm run build[^\s]*/g) || []);
  assert.ok(buildCommands.length > 0);
  assert.deepEqual([...new Set(buildCommands)], ['npm run build:hosted']);
});
