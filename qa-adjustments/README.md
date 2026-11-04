# Regressão dos ajustes por perfil

Suíte Playwright executada contra a aplicação e API reais. Não intercepta respostas para simular sucesso e não altera regras globais de SLA.

Configure credenciais de **contas de teste autorizadas**, sem gravá-las no código:

- `E2E_STUDENT_EMAIL`, `E2E_STUDENT_PASSWORD`
- `E2E_ASA_EMAIL`, `E2E_ASA_PASSWORD`
- `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`
- `E2E_BASE_URL` opcional (padrão: deploy Cloudflare).
- `E2E_RUN_ID` opcional para separar os relatórios.

Somente consultas e navegação:

```sh
npx playwright test --config qa-adjustments/playwright.config.ts --grep @read
```

Fluxos com gravação exigem `E2E_ALLOW_TEST_WRITES=1`. Eles criam **um novo chamado marcado QA**, respondem/resolvem somente esse chamado, marcam somente notificações correspondentes como lidas e criam uma conversa de teste com um arquivo TXT controlado. Esses registros permanecem disponíveis no sistema para conferência; nenhum dado preexistente é excluído. Não habilite em uma conta de pessoa real sem autorização.

```sh
E2E_ALLOW_TEST_WRITES=1 npx playwright test --config qa-adjustments/playwright.config.ts
```

| ID | Perfil | Validação |
|---|---|---|
| ADJ-001 | Aluno e ASA | Upload real, download byte a byte, resposta, notificações com leitura persistida, resolução e histórico após reload |
| ADJ-002 | Aluno | Anexo no chat, resposta Gemini baseada no arquivo, persistência e download após reload |
| ADJ-003 | ASA | Perfil acadêmico comparado à API e histórico de chamados |
| ADJ-004 | Admin | Descrição real do agendamento nos detalhes após reload |
| ADJ-005 | Todos | Permissões no backend e frontend; remoção de Automação/Regras |
| ADJ-006 | ASA | Monitor de SLA e navegação/consulta das notificações |
| ADJ-007 | Aluno | Agendamento sem anexo e com JPEG grande, persistência, download e cancelamento do registro QA |
| ADJ-008 | Aluno e ASA | Marcar todas como lidas com persistência após reload |

ADJ-004 requer um agendamento com descrição da conta de aluno de teste. Se não existir, falha com `PRECONDITION` e deve ser contabilizado como bloqueado, nunca aprovado. Credenciais ausentes e autorização de gravação desabilitada seguem a mesma regra. Não há skips ou retries automáticos que ocultem falhas.

Evidências ficam em `work/qa-adjustments/<run>/`: resultados JSON, relatório HTML, logs HTTP/console sem tokens e screenshots com campos pessoais mascarados. Estados de autenticação permanecem somente em memória; traces e vídeos ficam desativados para não registrar senhas/tokens.

As alterações de SLA (criação/edição, primeira resposta, vencimento e reabertura) são cobertas adicionalmente pelos testes de backend com banco isolado. A execução em produção consulta o monitor sem alterar as regras reais.

ADJ-008 grava o estado de leitura da conta de teste. Execute somente com contas autorizadas para essa operação; requer notificações não lidas (ADJ-007 gera eventos de QA).
