const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const missing = required.filter((name) => !process.env[name]);

if (process.env.VITE_APP_MODE !== 'hosted') {
  console.error('Build hospedado exige VITE_APP_MODE=hosted.');
  process.exit(1);
}
if (missing.length) {
  console.error(`Build hospedado bloqueado: faltam ${missing.join(', ')}.`);
  process.exit(1);
}
console.log('Configuração hospedada validada.');
