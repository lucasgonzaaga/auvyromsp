# Segurança staging — plano de implementação

Status: em revisão. Não aplicar mudanças ao banco remoto nem promover a master antes da validação da suite pgTAP.

1. Transferir o corpo privilegiado das funções de consulta de perfil para um esquema privado não exposto na Data API, preservando as assinaturas públicas como invoker.
2. Restringir a execução das funções privilegiadas ao mínimo e atualizar as políticas RLS para autenticados sem interromper o acesso de clientes e técnicos.
3. Revogar execução pública direta do event trigger `rls_auto_enable` sem apagar o trigger.
4. Testar como usuário anônimo, administrador, técnico, cliente A e cliente B, preservando 51 testes pgTAP já existentes e os testes E2E.
5. Reconciliar primeiro o histórico de migrations remoto antes de usar db push (versões remotas diferentes das versionadas no Git).
6. Rodar Security Advisors e registrar evidências antes de configurar o deploy da Vercel.

Nenhum segredo deve ser versionado. O staging atual permanece em Ohio e a master é intocável.
