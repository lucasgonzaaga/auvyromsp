# Auvyro MSP — Service Desk v0.1

MVP administrativo desenvolvido com React + Vite. **Somente demonstração local.**

## Requisitos
- Windows com Node.js LTS (npm incluso)
- VS Code

## Executar
1. Extraia o ZIP.
2. Abra a pasta `auvyro-msp-servicedesk` no VS Code.
3. Abra o terminal integrado (`Ctrl + J`).
4. Execute:

```powershell
npm install
npm run dev
```

5. Abra o endereço mostrado pelo Vite, normalmente `http://127.0.0.1:5173`.

## Funcionalidades
- Dashboard com indicadores
- Chamados de demonstração
- Criação de novos chamados
- Pesquisa e filtro por status
- Atualização de prioridade, status e tempo técnico
- Persistência no `localStorage` do navegador
- Interface responsiva nas cores da Auvyro MSP

## Limitações importantes
- Não há login, autorização, banco de dados ou isolamento por empresa.
- O armazenamento local pode ser apagado e não é compartilhado entre dispositivos.
- Não há SLA automático, controle contratual, trilha de auditoria nem notificações.
- **Não use dados de clientes reais nem publique este MVP como portal operacional.**

## Próxima versão
- Supabase Auth e banco PostgreSQL
- RLS (isolamento por empresa), papéis de cliente e administrador
- Histórico de alterações e apontamento de horas por evento
- SLA em horas úteis e notificações
- Testes de permissões e políticas de retenção

Projeto da divisão **Auvyro MSP**, pertencente à **Auvyro Tech**.
