# Revisão de segurança v0.4.4

Branch: feature/security-v044. Nenhuma alteração em master, merge ou deploy.

## Evidência e alterações

Antes das edições, foram lidas as duas migrations anteriores, config.toml, seed,
políticas, funções/triggers e os 51 testes pgTAP; a suíte original passou no banco
local. O catálogo local confirmou grants TRUNCATE/TRIGGER/REFERENCES para anon e
authenticated e quatro SECURITY DEFINER em public. public.rls_auto_enable() não
existe neste banco, nem em qualquer outro schema local; não foi criada uma função
substituta nem alterado qualquer event trigger da plataforma.

A migration existente 20261027165136_harden_rls_helpers.sql agora:
- Move os helpers e a auditoria para private, preservando OIDs/dependências.
- Mantém somente current_role, current_company_id e auditoria como definers.
- Usa search_path vazio e referências qualificadas; is_staff e wrappers públicos
  são invokers. A consulta privilegiada só retorna o perfil ativo de auth.uid().
- Bloqueia execução anônima dos helpers, execução direta dos triggers e criação
  de objetos por usuários nos schemas public/private.
- Restringe as 22 políticas a authenticated e remove grants perigosos de tabela.
  SELECT anônimo permanece por compatibilidade, com zero linhas por RLS.
- Preserva administração de cadastros, operação dos técnicos, isolamento dos
  clientes e auditoria automática. As políticas de profiles continuam usando o
  lookup definer privado, evitando recursão de RLS.

67 testes novos em supabase/tests/harden_rls_helpers.sql cobrem ACLs, chamadas
anônimas e indevidas, subject ausente/desconhecido/inativo, clientes A/B, elevação
de papel, leitura de perfis sem recursão, TRUNCATE e funcionamento da auditoria.
package.json e package-lock.json tiveram somente a versão elevada para 0.4.4
além das alterações de instalação do CLI Supabase que já existiam na sessão.
Nenhum componente React foi alterado.

## Validação

- npm test: 36/36 passaram.
- npm run test:db: 118/118 passaram (51 originais + 67 novos).
- npm run build: passou, Vite 6.4.4.
- supabase db advisors --local --type security: No issues found.
- Catálogo após aplicação: zero definers em public; três em private, todos com
  search_path vazio. Os três triggers de auditoria referenciam private.
- PostgREST local: PGRST_DB_SCHEMAS=public,graphql_public; private não exposto.
- git diff --check: sem erros.

## Limitações e riscos remanescentes

Somente o banco PostgreSQL local em Docker foi consultado/modificado. Staging e
produção não foram inspecionados, portanto diferenças remotas de catálogo,
default privileges, funções adicionais e schemas expostos precisam ser auditadas
antes de uma futura implantação autorizada. Nunca adicionar private aos schemas
expostos pela Data API.

As três funções definers privadas mantêm postgres como proprietário, para manter
o bypass de RLS necessário ao lookup sem introduzir um papel BYPASSRLS novo.
O corpo e as permissões dessas funções continuam sendo uma fronteira de confiança.
Authenticated tem USAGE no schema privado e EXECUTE apenas nos helpers necessários
às políticas/wrappers; pode consultar somente sua própria identidade ativa. Isso
não concede leitura arbitrária nem execução da auditoria.

As políticas e restrições preexistentes fora deste escopo não foram redesenhadas.
A ausência de findings do advisor não substitui auditoria completa da aplicação.

A migration foi executada via psql diretamente no container local, em transação,
sem reset e sem registrar versão em supabase_migrations. O histórico local ainda
contém apenas as duas versões anteriores. Não reaplicar sobre este estado já
modificado: a migration é incremental e não idempotente. Para futura reprodução
integral usar um banco local descartável limpo, ou reset local após preservar os
dados e obter a autorização necessária. Não foi executado db push, repair ou reset.

O diff security-v044.diff inclui também as alterações de dependências já presentes
antes deste trabalho, identificadas acima; não inclui este relatório.
