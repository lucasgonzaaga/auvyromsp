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
- Cadastro independente de empresas com IDs estáveis, documento fictício, contatos autorizados e equipamentos.
- Contratos Office Care vinculados por ID à empresa, com status, vigência, limite fixo de oito computadores e franquia mensal de quatro horas.
- Página de detalhes com prioridade, status, responsável e datas de abertura, resolução e encerramento.
- Ações para assumir, iniciar, resolver, encerrar e reabrir chamados, respeitando transições de estado validadas pelo domínio.
- Linha do tempo de eventos, comentários e apontamentos técnicos sem duplicação visual.
- Chamados e apontamentos vinculados por IDs de empresa, contato e contrato, com bloqueio de vínculos entre empresas diferentes.
- Apontamentos individuais com descrição, duração, modalidade, empresa, contrato, competência mensal e classificação como franquia ou faturável.
- Atendimentos presenciais faturáveis por padrão; exceções não faturáveis exigem justificativa.
- Consolidação histórica de consumo por empresa, contrato, competência, modalidade e classificação faturável.
- Cálculo mensal de consumo incluído, saldo de franquia, excedente e minutos faturáveis.
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
- Não há cálculo de SLA, calendário de horário útil, anexos, envio de e-mail ou integrações externas.
- Os contratos são registros locais fictícios; não há assinatura, reajuste, valores monetários, impostos, emissão de cobrança ou integração contábil.
- A consolidação mensal calcula minutos incluídos, saldo e excedente, mas não transforma esses dados em cobrança financeira.
- O limite de oito computadores é validado no contrato, mas não existe descoberta automática, inventário remoto ou confirmação física dos equipamentos.
- A área de notificações apresenta apenas atividades locais recentes; não existem notificações push ou em tempo real.
- As telas de clientes, equipe e configurações são visões locais básicas, sem cadastro administrativo completo.
- A linha do tempo não é uma trilha de auditoria inviolável, pois todo o armazenamento é local.
- Este projeto é um MVP de demonstração e não deve receber dados reais de clientes nem ser usado como portal operacional de produção.

Projeto da divisão **Auvyro MSP**, pertencente à **Auvyro Tech**.
