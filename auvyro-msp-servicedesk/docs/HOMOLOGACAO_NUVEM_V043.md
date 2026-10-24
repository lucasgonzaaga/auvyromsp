# Auvyro MSP v0.4.3 — Homologação em nuvem

**Estado: preparação somente; NÃO houve deploy, migração remota nem importação de dados reais.** Preservar a branch `master`. Homologação acontece por PR para `prod`.

## Supabase staging exclusivo
1. Criar projeto Supabase separado chamado `auvyro-msp-staging` na organização escolhida pelo responsável. Não usar projetos já existentes de outros aplicativos. Confirmar projeto e custos antes da criação.
2. Em `auvyro-msp-servicedesk` com Supabase CLI autenticada e projeto correto, consultar a ajuda da versão e planejar:
```bash
supabase login
supabase link --project-ref <PROJECT_REF_DO_STAGING>
supabase migration list
supabase db push --dry-run
```
3. Revisar as migrations e destino; somente com aprovação de operador autorizado executar `supabase db push` **sem** `--include-seed`. Não executar `db reset --linked`.
4. `supabase/seed.sql` cria dados/identidades Auth diretamente no banco para desenvolvimento local. **Nunca aplicar o seed ao banco remoto nem reutilizar a senha local.**
5. Criar duas empresas **fictícias** e quatro usuários de staging pelo Supabase Auth Admin (admin, técnico, clientes A e B); vincular os UUIDs verdadeiros a `public.profiles` e `company_id`. Manter cadastro público restrito. Validar políticas RLS, avisos de segurança e isolamento tenant.

## Vercel Preview protegida
- Criar projeto Vercel exclusivo para este app (não vincular contas de outros projetos). Importar `lucasgonzaaga/auvyromsp` com root `auvyro-msp-servicedesk`, preset **Vite**, instalação `npm ci`, comando **`npm run build:hosted`**, saída `dist`.
- Limitar o ambiente a **Preview**, numa branch de homologação; revisar branch production antes de habilitar deploy automático. **Não publicar a `master`**.
- Configurar variáveis Preview `VITE_APP_MODE=hosted`, `VITE_SUPABASE_URL=https://<STAGING>.supabase.co`, `VITE_SUPABASE_ANON_KEY=<CHAVE_PUBLICAVEL_STAGING>`. O nome `ANON_KEY` é legado; a chave deve ser pública/publishable. Toda variável `VITE_*` é acessível pelo navegador: **nunca colocar service_role, sb_secret_, senhas ou tokens**.
- Habilitar **Deployment Protection** para preview (por exemplo, Vercel Authentication conforme plano) e testar em aba anônima: acesso sem autorização tem de ser negado. O login do próprio app não substitui proteção da implantação.
- Restringir URL de redirecionamento Supabase Auth ao domínio real da preview. Validar origem do Supabase no JavaScript implantado e usar somente staging.

## Smoke remoto somente leitura
O script requer uma sessão autorizada na preview; se protegida, configurar `VERCEL_AUTOMATION_BYPASS_SECRET` **apenas** no ambiente de execução, fora do Git. Nunca desativar a proteção apenas para testar.
```bash
# Definir como variáveis de ambiente locais, sem colocar valores no repositório
STAGING_APP_URL=https://<PREVIEW_PROTEGIDA>
STAGING_SUPABASE_URL=https://<STAGING>.supabase.co
STAGING_SUPABASE_PUBLISHABLE_KEY=<PUBLICAVEL>
npm run smoke:staging
```
Esse comando faz exclusivamente GET da aplicação, saúde Auth e consultas `anon` em `companies` e `tickets`; espera 401/403 ou nenhuma linha. Teste com mocks: `npm run test:staging`. **Não valida acesso autenticado nem substitui a inspeção de todas as RLS**.

## Evidências obrigatórias para aceite
- [ ] CI PR para `prod` verde; sem mudança na `master`.
- [ ] Supabase remoto exclusivo configurado, migrations revisadas e aplicadas.
- [ ] Preview com autenticação da Vercel efetivamente bloqueada para janela anônima.
- [ ] Smoke remoto executado com sucesso.
- [ ] Login, logout, empresas isoladas e operações E2E com contas reais de staging; tentativas de consulta cruzada devem ser recusadas na API, não só ocultas na UI.
- [ ] Monitoramento, erro de aplicação e auditoria verificados.
- [ ] Backup/exportação apropriados ao plano contratado, **ensaio de restauração comprovado em segundo projeto descartável**, com retenção, tempo de recuperação e responsáveis registrados. Nunca sobrescrever banco ativo.
- [ ] Decisão explícita posterior para release `prod → master`; nada aqui autoriza deploy de produção.
