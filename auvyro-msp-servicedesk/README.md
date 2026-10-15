# Auvyro MSP — Service Desk

MVP administrativo local desenvolvido com React e Vite para demonstrar o fluxo de atendimento da Auvyro MSP.

## Requisitos

- Node.js LTS com npm
- Navegador moderno

## Executar localmente

```powershell
npm install
npm run dev
```

O Vite exibirá o endereço local, normalmente `http://127.0.0.1:5173`.

## Verificação

```powershell
npm test
npm run build
```

## Funcionalidades existentes

- Dashboard com fila aberta, chamados críticos, aguardando, resolvidos no dia e tempo técnico histórico.
- Criação, busca e filtro de chamados.
- Página de detalhes com prioridade, status, responsável e datas de abertura, resolução e encerramento.
- Ações para assumir, iniciar, resolver, encerrar e reabrir chamados, respeitando transições de estado validadas pelo domínio.
- Linha do tempo de eventos, comentários e apontamentos técnicos sem duplicação visual.
- Apontamentos individuais com descrição, duração, modalidade, empresa, referência de contrato, competência mensal e classificação como franquia ou faturável.
- Consolidação histórica de consumo por empresa, contrato, competência, modalidade e classificação faturável.
- Listagens locais de clientes, equipe, configurações e apontamentos.
- Arquivamento de chamados com justificativa, preservando seu histórico e os totais de tempo.
- Persistência no `localStorage`, incluindo migração dos registros das versões locais anteriores.
- Interface responsiva.

## Regras do ciclo de vida

- Ao resolver um chamado, o sistema registra `resolvedAt`.
- Ao encerrar um chamado, registra `closedAt` sem apagar `resolvedAt`.
- Um chamado só pode ser encerrado depois de resolvido; transições inválidas são bloqueadas no serviço e omitidas na interface.
- Ao reabrir um chamado resolvido ou encerrado, as datas do ciclo atual são limpas; as transições continuam registradas na linha do tempo.
- Arquivar remove o chamado das filas operacionais, mas não exclui o registro nem seus apontamentos dos totais históricos.

## Limitações

- Não há autenticação, autorização, banco de dados ou isolamento por empresa. As operações recebem a identidade da sessão, mas usam um usuário local não autenticado enquanto essa integração não existir.
- Os dados ficam somente no navegador atual, podem ser apagados e não são compartilhados entre dispositivos.
- Não há cálculo de SLA, calendário de horário útil, cadastro ou validação de contratos, anexos, envio de e-mail ou integrações externas. A referência contratual dos apontamentos é atualmente um campo local livre.
- A consolidação mensal calcula consumo registrado, mas ainda não aplica limites de franquia, valores, impostos ou regras de faturamento.
- A área de notificações apresenta apenas atividades locais recentes; não existem notificações push ou em tempo real.
- As telas de clientes, equipe e configurações são visões locais básicas, sem cadastro administrativo completo.
- A linha do tempo não é uma trilha de auditoria inviolável, pois todo o armazenamento é local.
- Este projeto é um MVP de demonstração e não deve receber dados reais de clientes nem ser usado como portal operacional de produção.

Projeto da divisão **Auvyro MSP**, pertencente à **Auvyro Tech**.
