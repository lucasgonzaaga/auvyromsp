# Homologação em nuvem — Auvyro MSP v0.4.3

**Ambiente exclusivamente fictício.** Não utilize clientes reais, banco existente de outro projeto, nem a branch `master` para homologação. A CI local da v0.4.2 é pré-requisito, não comprovação de segurança do projeto remoto.

## 1. Criar Supabase dedicado (ação administrativa)

- Criar projeto **auvyro-msp-staging** em uma organização escolhida pelo responsável. Preferir a região `sa-east-1` se a latência brasileira for relevante e o plano permitir.
- Separar staging de futura produção por **projeto e credenciais diferentes**. Não copiar dados de terceiros.
- Configurar Auth com cadastro público desativado, confirmações e políticas adequadas; conceder contas só a pessoas autorizadas.
- Anotar o **Project Ref** e a URL de API. A chave **publishable** (`sb_publishable_...`) é exposta no bundle React, por isso RLS deve proteger toda informação; chaves secret, `service_role`, token pessoal, senha do Postgres e URI de conexão jamais devem ir para `VITE_*`.

## 2. Aplicar as migrations com revisão

Dentro de `auvyro-msp-servicedesk`, com Supabase CLI autenticado:

```sh
supabase login
supabase link --project-ref SEU_PROJECT_REF_STAGING
supabase migration list
supabase db push --dry-run
```

**Verificar o Project Ref e a lista de SQL antes de efetuar qualquer modificação remota.** Apenas depois de confirmar que é um projeto descartável de homologação:

```sh
supabase db push
supabase migration list
```

Não rodar `supabase db reset --linked` nem passar `--include-seed`. **O arquivo `supabase/seed.sql` é estritamente local**: insere identidades diretamente no esquema `auth`; não deve ser aplicado no Supabase hospedado. A CLI só deve aplicar as migrations revisadas. Registrar eventuais avisos de segurança/performance no Supabase Advisors.

## 3. Criar contas fictícias no Auth hospedado

Pelo Dashboard do **projeto staging**: criar manualmente as quatro contas `admin`, `technician`, `client A`, `client B` com e-mails de teste sob domínio controlado e senhas exclusivas de staging (não reutilizar a senha `AuvyroLocal!2026`). Os perfis em `public.profiles` devem usar os UUIDs efetivos do Auth e papel conforme a matriz de `docs/HOMOLOGACAO_SUPABASE.md`. Criar duas empresas fictícias, seus contatos, equipamentos, contratos Office Care, e vincular `company_id` apenas aos respectivos perfis de cliente. Fazer inserções administrativas apenas após revisão e por usuário/operador autorizado.

## 4. Hospedar um preview protegido

Usar uma conta Vercel própria para homologação, projeto isolado e Git `lucasgonzaaga/auvyromsp`.

| Configuração | Valor |
|---|---|
| Framework | Vite |
| Root Directory | `auvyro-msp-servicedesk` |
| Build Command | `npm run build:hosted` |
| Output Directory | `dist` |
| Target | Preview, a partir de `feature/cloud-staging-v043` ou branch validada derivada de `prod` |
| `VITE_APP_MODE` | `hosted` |
| `VITE_SUPABASE_URL` | URL **exclusiva** do projeto staging |
| `VITE_SUPABASE_ANON_KEY` | Chave **publishable/pública** do projeto staging |

**Não colocar a `master` como production branch de um novo projeto com deploy automático descontrolado:** configurar e verificar as opções de Git/deploy primeiro. Ativar *Deployment Protection* (Vercel Authentication ou política equivalente) para previews e testar o endereço em navegador sem login. A tela do Service Desk não é substituta da proteção de acesso à preview. O URL do frontend deve ser HTTPS; adicionar a origem às configurações Auth de staging conforme necessário (Site URL / Redirect URLs e CORS quando aplicável). Se a proteção interceptar o smoke, usar bypass de automação com segredo privado, nunca desativá-la só para o teste.

## 5. Smoke test remoto (somente leitura)

Após o preview ficar pronto e protegido, executar de um terminal confiável:

```sh
# Variáveis definidas no ambiente de execução, sem valores no repositório
STAGING_APP_URL=https://preview-protegida.exemplo.vercel.app
STAGING_SUPABASE_URL=https://PROJETO_STAGING.supabase.co
STAGING_SUPABASE_PUBLISHABLE_KEY=sb_publishable_CHAVE_PUBLICA
npm run smoke:staging
```

O script checa HTTPS, resposta HTML do frontend, saúde do Supabase Auth e garante que a **chave pública anônima não consegue ler linhas** de `companies` e `tickets`. Para preview com Vercel Authentication pode ser necessário definir localmente `VERCEL_AUTOMATION_BYPASS_SECRET`, com acesso restrito e nunca versionado. O script não escreve no banco nem imprime chaves. Testar `npm run test:staging` (mocks) sem rede.

**Limitações:** este smoke não substitui inspeção de todas as políticas RLS, validação de tenant ou navegação protegida; não verifica sozinho se a preview está protegida de usuários externos. Usar o roteiro E2E abaixo.

## 6. Critérios de aceite antes de clientes reais

1. Acessar preview de um navegador anônimo: acesso bloqueado pela proteção da hospedagem; após autenticar no ambiente de preview, o Service Desk deve apresentar o login Supabase.
2. Testar os quatro perfis com contas reais de staging e empresas fictícias distintas; confirmar que Cliente A não lê/edita Cliente B e vice-versa. Fazer tentativas diretas na API com os mesmos tokens, sem bypass.
3. Criar ticket, comentário, apontamentos, resolver e arquivar, sair e entrar novamente; registrar evidências sem expor dados pessoais, tokens ou senhas.
4. Acompanhar erros no navegador, logs da hospedagem e logs Supabase; verificar Advisors e eventuais permissões de Data API.
5. **Backup e recuperação:** definir frequência, retenção e RPO/RTO compatíveis com o plano contratado. Gerar backup/exportação segundo os recursos efetivamente disponíveis e comprovar **restauração em um segundo projeto descartável isolado**. Nunca sobrescrever banco existente ou executar restauração destrutiva sem confirmação. Registrar tempo de recuperação e resultados.
6. Configurar controle de acesso, monitoramento, resposta a incidentes e revisão de RLS antes da primeira utilização com dados reais.

**Status inicial:** não foi criado projeto Supabase ou Vercel Auvyro MSP durante a preparação do PR; projeto remoto, URL protegida, conectividade e restauração exigem execução/validação separadas.
