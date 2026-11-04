# Relatório — autenticação, autorização e navegação por perfil

Data: 04/11/2026

Escopo: correção de isolamento entre Aluno, ASA e Administrador. Esta rodada não alterou banco de dados, políticas RLS ou dados de produção.

## Diagnóstico

Na inspeção do frontend foram confirmados três caminhos que podiam misturar ou confundir perfis:

1. O login usava `res.user.role || 'aluno'`. Uma resposta sem papel válido podia encaminhar uma sessão para o ambiente de aluno.
2. O Zustand persistia `currentUser` e `activeRole` no `localStorage`; esses valores do navegador eram consultados antes de confirmar a identidade da sessão em `/api/auth/me`.
3. A rota `/asa` autorizava `admin` junto com `asa`, permitindo que o Admin entrasse no layout e na navegação do ASA.

Também havia um risco de sessão entre abas: uma alteração de token em outra aba não invalidava a identidade em memória. No backend, a autenticação aceitava tokens em query string, inclusive em links de download, expondo credenciais em URLs, histórico e logs.

As rotas `/aluno` e `/admin` já tinham grupos de proteção separados. A causa encontrada não foi um link de menu comprovadamente apontando para o perfil errado; menus atuais usam prefixos próprios. Os testes em produção com contas reais ainda são necessários para confirmar se algum link específico apresenta o sintoma relatado.

## Alterações

- `Frontend/src/pages/auth/LoginPage.tsx`: rejeita resposta sem token ou papel conhecido; remove o fallback para Aluno.
- `Frontend/src/components/auth/ProtectedRoute.tsx`: não confia em identidade persistida; consulta `/auth/me`, valida papel e encaminha acesso cruzado para o início do perfil confirmado pelo servidor.
- `Frontend/src/store/app-store.ts`: deixa de persistir usuário e perfil; migra estado antigo preservando tema e preferência da barra lateral.
- `Frontend/src/App.tsx`: restringe `/asa` ao perfil ASA e observa logout/troca de token na mesma aba e entre abas.
- `Frontend/src/lib/auth-session.ts` e `Frontend/src/lib/api.ts`: centralizam a sessão e limpam o estado após 401. Downloads autenticados agora enviam o token no cabeçalho.
- `Frontend/src/pages/asa/AsaBaseConhecimento.tsx` e `Frontend/src/pages/asa/AsaAgendamentos.tsx`: substituem links com token na URL por downloads autenticados.
- `Frontend/src/components/common/ErrorBoundary.tsx`: limpa a sessão pelo mesmo mecanismo centralizado.
- `Backend/src/middleware/auth.ts`: aceita apenas cabeçalho Bearer bem formado; ignora tokens de query string.
- `Backend/tests/auth-authorization.test.ts`, `Backend/tests/real-data-security.test.ts` e `e2e/roles.spec.ts`: cobrem autorização, acesso direto, menus próprios e troca de perfil. A suíte E2E não pula silenciosamente quando faltam credenciais; informa erro de configuração.

## Verificação executada

- `npm run build` do frontend: aprovado.
- `npm run build` do backend: aprovado.
- `npm test` do backend: **83 testes aprovados, 0 reprovados, 0 ignorados**. A suíte usa banco isolado e inclui casos para token via URL, papel forjado em cabeçalho e acesso de aluno às rotas administrativas sem persistir alterações.
- Playwright, contra o preview local do frontend: **1 teste aprovado** — acesso direto sem sessão a `/aluno`, `/asa`, `/admin` e `/admin/usuarios` redireciona ao login.
- `git diff --check`: aprovado.

## Pendências de validação

- Os fluxos autenticados E2E de Aluno, ASA e Admin não foram executados: as variáveis `E2E_*_EMAIL` e `E2E_*_PASSWORD` não estão configuradas neste ambiente. A suíte agora falha explicitamente em vez de marcar os casos como skip.
- Ainda falta validar no deploy os redirects de cada perfil, navegação de todas as páginas, logout/login com outro perfil e respostas HTTP de autorização usando as contas de teste.
- A autenticação continua usando token de acesso no `localStorage`, pois a arquitetura atual não usa cookie HttpOnly. A persistência da identidade foi removida, mas uma migração futura para cookie de sessão é uma defesa adicional contra roubo de token por XSS.
- A renovação de sessão Supabase não foi modificada nesta correção; expiração e refresh devem ser auditados separadamente.

Esta rodada validou o código localmente. O isolamento integral ainda depende do deploy e da execução dos cenários autenticados acima; os resultados locais não são apresentados como prova de comportamento em produção.
