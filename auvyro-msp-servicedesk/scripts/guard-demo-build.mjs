import { fileURLToPath } from 'node:url';

const deploymentMarkers = ['CI', 'VERCEL', 'NETLIFY', 'CF_PAGES', 'RENDER', 'RAILWAY_ENVIRONMENT'];

export function isDeploymentEnvironment(environment = process.env) {
  return deploymentMarkers.some((name) => {
    const value = environment[name];
    return value && value !== 'false' && value !== '0';
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (isDeploymentEnvironment()) {
    console.error('Build demonstrativo bloqueado em CI/hospedagem. Use npm run build:hosted.');
    process.exit(1);
  }
}
