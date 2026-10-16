# Auvyro MSP v0.4.3 — Homologação em nuvem

**Ambiente:** exclusivo de staging, sem clientes ou dados reais. **Branches:** `feature/*` → `prod` (homologação); `master` reservada para release. Nenhum passo abaixo autoriza publicar a `master`.

## 1. Pré-requisitos e separação

- Criar um **novo projeto Supabase somente para Auvyro MSP staging**, preferencialmente na região próxima dos testes. Não reaproveitar bancos de outras aplicações.
- Criar um **novo projeto Vercel** dedicado a staging, vinculado à branch de homologação/PR. Nunca vincular a `master` a esse projeto sem decisão específica de release.
- Ativar **Deployment Protection** para previews, conferir na prática que o acesso não autenticado é bloqueado. URLs obscuras e senha do próprio Service Desk não substituem a proteção de acesso ao deploy.
- Não cadastrar clientes reais, documentos reais ou dados confidenciais no estágio inicial.
- As chaves publicáveis do Supabase são incorporadas ao JavaScript; manter **service_role/secret keys, senha de banco, tokens pessoais e chave de bypass de proteção Vercel** fora do frontend, commits, logs e artefatos.
- A `supabase/seed.sql` do projeto cria usuários Auth diretamente no banco e usa uma senha local descartável. **Ela serve apenas para o Supabase local. Não importar ou executar esse seed no remoto.**

## 2. Supabase remoto (operador autorizado)

A partir da pasta `auvyro-msp-servicedesk`, com Supabase CLI autenticado, conferir opções da versão instalada com `supabase db push --help`. Confirmar o ID do **novo** projeto de staging antes de cada alteração:

```sh
supabase login
supabase link --project-ref <ID_EXCLUSIVO_DO_STAGING>
supabase migration list
supabase db push --dry-run
```

Revisar cada migração SQL e a listagem de alterações. Somente após conferir o destino e aprovar o plano de migrações:

```sh
supabase db push
supabase migration list
```

**Nunca** usar `db reset --linked`, `--include-seed` ou operações destrutivas no remoto. Para adicionar dados fictícios, usar o painel/API Auth Admin para criar **novos** usuários de staging com senhas únicas ou convites, e inserir as empresas e perfis correspondentes com um operador autorizado. Não inserir `auth.users` manualmente no remoto.

A ordem é: criar duas empresas fictícias; criar quatro usuários via Auth Admin (admin, técnico, cliente A, cliente B); inserir `public.profiles` com os UUIDs reais desses usuários; associar clientes às empresas e validar os contatos autorizados. Não copiar IDs fixos nem a senha do seed local. Conferir RLS e executar os avisos de segurança e desempenho disponíveis no Supabase.

## 3. Deploy protegido no Vercel

- Criar projeto Vercel separado de staging; conferir **Root Directory**: `auvyro-msp-servicedesk`.
- Framework Preset: **Vite**; Install Command: `npm ci`; Build Command: **`npm run build:hosted`**; Output Directory: `dist`.
- Definir no escopo **Preview**: `VITE_APP_MODE=hosted`, `VITE_SUPABASE_URL=https://<ID_EXCLUSIVO_DO_STAGING>.supabase.co` e `VITE_SUPABASE_ANON_KEY` (ou chave publicável compatível).
- Deixar `service_role` e demais segredos ausentes no projeto Vercel: este frontend não precisa deles.
- A URL em produção/preview deve ser HTTPS. O projeto Vercel de staging deve ter a branch/ambiente adequadamente limitados; uma implantação associada à branch errada pode expor uma versão não homologada.
- Verificar a proteção Vercel usando **janela anônima** sem sessão da plataforma: o app não deve ficar acessível. O acesso autorizado deve alcançar a tela de login do Service Desk.
- Conferir URL/redirects permitidos no Supabase Auth para o domínio real de preview. Não configurar curingas excessivamente amplos.
- Verificar que a prévia usa **exclusivamente o Supabase de staging** antes de iniciar qualquer teste.

> GitHub Actions atual usa Supabase **local** para testes, não credenciais do projeto hospedado. Não adicionar credenciais remotas a eventos `pull_request` de código não revisado.

## 4. Smoke test remoto (não destrutivo)

No terminal do operador, sem publicar tokens no histórico do shell nem colar saída com segredos:

```sh
cd auvyro-msp-servicedesk
# Configure APP_PREVIEW_URL, VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY com os dados DE STAGING
npm run smoke:cloud
```

O smoke verifica se a página responde, se a API Auth está acessível e se uma requisição anônima não consegue ler empresas/chamados. **Não** autentica usuários nem escreve registros. Em preview com Deployment Protection, executar numa sessão/ambiente que tenha acesso autorizado, sem desabilitar a proteção; respostas 401/403 na página significam que o operador deve verificar a proteção manualmente, não que deve torná-la pública.

## 5. Homologação funcional e rastreabilidade

- Entrar como admin, técnico e clientes fictícios A/B; verificar login, logout, autorização e troca de sessão.
- Verificar que cliente A não enxerga nem altera dados da empresa B, inclusive acessando IDs conhecidos diretamente pela API com JWT **de teste**.
- Criar chamado, assumir, comentar, apontar franquia, excedente e cortesia, resolver/arquivar, sair e entrar novamente.
- Executar teste em dois navegadores/dispositivos; registrar evidências no PR **sem expor dados sensíveis**.
- Confirmar que o ambiente de preview sem autenticação Vercel continua bloqueado.

## 6. Backups, restauração e incidentes

- Conferir no projeto Supabase e no plano contratado qual modalidade, frequência e retenção de backups/PITR estão **de fato disponíveis**. Não presumir que um backup automático exista em todo plano.
- Criar backup/exportação coerente com o plano e registrar data, responsável, local seguro e política de retenção.
- Fazer um **ensaio de restauração somente em um projeto descartável distinto**, nunca em staging ativo ou produção. Verificar contagem de registros e integridade dos vínculos.
- Definir responsabilidades, monitoramento de falhas no Auth/API, métricas básicas e procedimento de revogação de acesso.
- Confirmar que desativar um usuário remove o acesso operacional mesmo antes de expirar o JWT, conforme RLS baseada em perfil ativo.

## Critérios para fechar a v0.4.3

[ ] PR para `prod` com CI verde, sem afetar `master`.

[ ] Projeto Supabase dedicado ao staging identificado e migrations inspecionadas/aplicadas.

[ ] Preview protegida; janela anônima bloqueada; build hospedado sem fallback demo.

[ ] Smoke de leitura, isolamento multiempresa e fluxos E2E reais testados no **remoto**.

[ ] Backup + restauração em destino descartável documentados e verificados.

[ ] Decisão sobre promoção à `master` feita somente após aceite explícito, com plano de rollback.
