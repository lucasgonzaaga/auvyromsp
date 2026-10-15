# Auvyro MSP — Service Desk v0.4.2

MVP administrativo local desenvolvido com React e Vite para demonstrar o fluxo de atendimento da Auvyro MSP.

A infraestrutura Supabase fornece autenticação, persistência operacional, auditoria e isolamento por empresa. Sem variáveis de ambiente, a aplicação opera somente como demonstração local.

## Requisitos

- Node.js LTS com npm
- Navegador moderno
- Supabase CLI e Docker apenas para executar migrations e testes RLS localmente

## Executar localmente

```powershell
npm install
npm run dev
```

O Vite exibirá o endereço local, normalmente `http://127.0.0.1:5173`.

## Supabase

1. Copie `.env.example` para `.env.local`, defina `VITE_APP_MODE=hosted` e informe `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
2. Execute `supabase start` e `supabase db reset` para aplicar as migrations localmente.
3. Crie usuários no Supabase Auth e seus respectivos registros em `public.profiles`, usando os papéis `admin`, `technician` ou `client`. Perfis de cliente exigem `company_id`.
4. Execute `npm run test:db` para validar as políticas RLS com pgTAP.

O roteiro completo, contas fictícias e matriz de permissões estão em [`docs/HOMOLOGACAO_SUPABASE.md`](docs/HOMOLOGACAO_SUPABASE.md).

Nunca coloque a `service_role` em arquivos `.env` do Vite ou no navegador. A chave anônima é segura para o cliente somente porque todas as tabelas possuem RLS.

## Verificação

```powershell
npm test
npm run build
npm run test:db
```

Builds destinados a ambiente hospedado devem usar `npm run build:hosted`. Esse comando falha se `VITE_APP_MODE=hosted`, a URL ou a chave anônima estiverem ausentes. `npm run build` continua disponível para a demonstração local.

## Funcionalidades existentes

- Dashboard com fila aberta, chamados críticos, aguardando, resolvidos no dia e tempo técnico histórico.
- Criação, busca e filtro de chamados.
- Cadastro independente de empresas com IDs estáveis, documento fictício, contatos autorizados e equipamentos. Contatos e equipamentos usam IDs internos globais; códigos `CON-*` e `EQP-*` são apenas de apresentação.
- Contratos Office Care vinculados por ID à empresa, com status, vigência, limite fixo de oito computadores e franquia mensal de quatro horas.
- Página de detalhes com prioridade, status, responsável e datas de abertura, resolução e encerramento.
- Ações para assumir, iniciar, resolver, encerrar e reabrir chamados, respeitando transições de estado validadas pelo domínio.
- Linha do tempo de eventos, comentários e apontamentos técnicos sem duplicação visual.
- Chamados e apontamentos vinculados por IDs de empresa, contato e contrato, com bloqueio de vínculos entre empresas diferentes.
- A escolha “Sem contrato” é preservada; o sistema nunca associa um Office Care automaticamente.
- Apontamentos individuais com descrição, duração, modalidade, empresa, contrato, competência mensal e classificação como franquia ou faturável.
- A competência do apontamento deve corresponder ao mês da data do atendimento; divergências são bloqueadas antes do registro.
- Atendimentos presenciais faturáveis por padrão; exceções não faturáveis exigem justificativa.
- Apenas suporte remoto não faturável, vinculado a contrato ativo e vigente, consome a franquia. Cortesias presenciais justificadas não consomem horas.
- Consolidação histórica de consumo por empresa, contrato, competência, modalidade e classificação faturável.
- Cálculo mensal de consumo incluído, saldo de franquia, excedente e minutos faturáveis.
- Listagens locais de clientes, equipe, configurações e apontamentos.
- Arquivamento de chamados com justificativa, preservando seu histórico e os totais de tempo.
- Persistência no `localStorage`, incluindo migração dos registros das versões locais anteriores.
- Interface responsiva.
- Login por e-mail e senha com Supabase Auth quando o ambiente está configurado, incluindo perfis de administrador, técnico e cliente.
- Migration SQL versionada para empresas, perfis, contatos, equipamentos, contratos, chamados, comentários, histórico imutável e apontamentos.
- Políticas RLS: equipe acessa a carteira; clientes enxergam somente sua empresa; alterações administrativas ficam restritas a administradores.
- Integridade no PostgreSQL para vínculos entre empresas, limite de equipamentos, vigência contratual, competência e regras de faturamento.
- Repositórios Supabase para empresas, contatos, equipamentos, contratos, chamados, comentários e apontamentos.
- No modo autenticado, todas as consultas e alterações operacionais usam PostgreSQL; dados demonstrativos do `localStorage` não são lidos nem gravados.
- Auditoria automática no banco para criação e alteração de chamados, comentários e apontamentos. Usuários autenticados não podem forjar, editar ou excluir o histórico.
- Paginação dos repositórios Supabase, códigos legíveis gerados atomicamente e falha fechada em ambiente hospedado.

## Regras do ciclo de vida

- Ao resolver um chamado, o sistema registra `resolvedAt`.
- Ao encerrar um chamado, registra `closedAt` sem apagar `resolvedAt`.
- Um chamado só pode ser encerrado depois de resolvido; transições inválidas são bloqueadas no serviço e omitidas na interface.
- Ao reabrir um chamado resolvido ou encerrado, as datas do ciclo atual são limpas; as transições continuam registradas na linha do tempo.
- Arquivar remove o chamado das filas operacionais, mas não exclui o registro nem seus apontamentos dos totais históricos.

## Limitações

- Sem configuração Supabase, não há autenticação nem autorização: a identidade do `localStorage` serve apenas para apresentação e autoria demonstrativa.
- O modo de demonstração e o modo Supabase são isolados. Não existe importação automática dos dados fictícios do navegador para o banco.
- No modo demo, os dados ficam somente no navegador atual, podem ser apagados e não são compartilhados entre dispositivos.
- Não há cálculo de SLA, calendário de horário útil, anexos, envio de e-mail ou integrações externas.
- Os contratos são registros locais fictícios; não há assinatura, reajuste, valores monetários, impostos, emissão de cobrança ou integração contábil.
- A consolidação mensal calcula minutos incluídos, saldo e excedente, mas não transforma esses dados em cobrança financeira.
- O limite de oito computadores é validado no contrato, mas não existe descoberta automática, inventário remoto ou confirmação física dos equipamentos.
- Contratos suspensos, futuros ou vencidos não aceitam novos chamados ou apontamentos na respectiva data de atendimento.
- A área de notificações apresenta apenas atividades locais recentes; não existem notificações push ou em tempo real.
- As telas de clientes, equipe e configurações são visões locais básicas, sem cadastro administrativo completo.
- No modo demo, a linha do tempo não é uma trilha de auditoria inviolável; no modo Supabase, a auditoria é inserida por triggers e protegida contra escrita direta.
- Antes de receber dados reais, ainda é necessário executar os testes pgTAP em uma instância Supabase local, definir backup/recuperação e validar o fluxo completo em ambiente de homologação.

Projeto da divisão **Auvyro MSP**, pertencente à **Auvyro Tech**.
