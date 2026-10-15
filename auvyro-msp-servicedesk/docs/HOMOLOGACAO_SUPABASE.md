# Homologação Supabase v0.4.2

Este roteiro usa exclusivamente os dados fictícios de `supabase/seed.sql`. A senha `AuvyroLocal!2026` é deliberadamente local e descartável; nunca deve ser reutilizada em ambiente remoto.

## Reprodução local

Pré-requisitos: Docker em execução, Supabase CLI, Node.js 22 e npm.

```powershell
cd auvyro-msp-servicedesk
npm ci
supabase start
supabase test db
npm test
npm run build
```

Para testar a interface autenticada, obtenha a URL e a chave anônima locais com `supabase status`, crie um `.env.local` ignorado pelo Git e use:

```text
VITE_APP_MODE=hosted
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key retornada localmente>
```

Contas fictícias: `admin@auvyro.local`, `tecnico@auvyro.local`, `cliente.a@auvyro.local` e `cliente.b@auvyro.local`.

## Matriz de permissões

| Recurso | anon | Cliente da empresa | Técnico | Admin |
|---|---|---|---|---|
| Empresas, contatos, equipamentos e contratos | Sem acesso | Leitura da própria empresa | Leitura | CRUD |
| Perfis | Sem acesso | Próprio perfil | Leitura | CRUD |
| Chamados | Sem acesso | Leitura da empresa; criação; edição de conteúdo enquanto Novo | Leitura, criação e alteração | Leitura, criação e alteração |
| Comentários | Sem acesso | Leitura e inserção na própria empresa | Leitura e inserção | Leitura e inserção |
| Apontamentos | Sem acesso | Somente leitura da própria empresa | Leitura e inserção própria | Leitura e inserção própria |
| Histórico | Sem acesso | Leitura da própria empresa | Leitura | Leitura |

Chamados, comentários, apontamentos e histórico não aceitam exclusão pelos papéis autenticados. Chamados devem ser arquivados. O histórico é gravado somente por triggers.

## Fluxo ponta a ponta

1. Entrar como cliente A e confirmar que Empresa Boreal e seus IDs não aparecem.
2. Criar chamado com contato e contrato da Empresa Aurora; tentativas com IDs da Empresa Boreal devem falhar.
3. Sair e entrar como técnico; assumir o chamado e avançar `Novo → Em triagem → Em atendimento`.
4. Adicionar comentário, 240 minutos remotos em franquia, excedente remoto, atendimento presencial faturável e cortesia presencial justificada.
5. Resolver, encerrar e arquivar o chamado; confirmar eventos no histórico.
6. Sair, entrar novamente e confirmar persistência de chamado, comentários, apontamentos e datas.
7. Entrar como cliente B e confirmar que nenhum registro da Empresa Aurora é visível.

Os testes pgTAP automatizam isolamento, papéis, IDs forjados e escritas proibidas. O roteiro visual confirma a integração completa da interface.

## Homologação remota

1. Criar um projeto Supabase exclusivo de homologação.
2. Aplicar migrations com um operador autorizado fora do navegador.
3. Criar usuários fictícios pelo painel/Auth Admin e inserir perfis correspondentes.
4. Configurar somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no provedor de build.
5. Nunca disponibilizar `service_role`, senha do banco ou token pessoal ao Vite.
6. Executar o roteiro ponta a ponta e registrar evidências no PR.

## Riscos remanescentes

- Backup, restauração e retenção precisam ser definidos antes de dados reais.
- A validação visual ponta a ponta depende de Supabase local ou projeto remoto de homologação acessível.
- Não há SLA, anexos, e-mail, inventário remoto nem cobrança financeira.
