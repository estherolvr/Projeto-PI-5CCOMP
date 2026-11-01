# Validação com dados reais — 01/11/2026

Versão ativa: `d9b41c85-692d-4ae7-9809-cdf32f95b8c1` (100% do tráfego).
Aplicação: https://alvaro-ai.joao-fsantana.workers.dev
Worker privado PDF: `alvaro-ai-pdf`, sem endereço público.

## Implementação

- Removidos os datasets frontend/backend, login de demonstração, senha universal, respostas fictícias offline, documentos acadêmicos falsos e números fixos dos portais. Seed de demonstração desativado.
- Dashboards, filas, documentos, conversas e perfis consultam a API, exibindo estados vazios ou erros com opção de repetir. Caches antigos de demonstração são descartados.
- Sessões são verificadas no servidor. Alunos não modificam a base institucional e não acessam conversas, feedback ou snapshots de outros alunos. Funcionários não enviam mensagens como alunos.
- Upload e download usam o binding nativo R2, com persistência real, exclusão e snapshots. Erros de armazenamento não geram sucesso fictício.
- PDFs comprimidos têm texto extraído pelo serviço privado. PDFs ilegíveis são recusados em vez de indexados como binário.
- Calendários preservam horário de São Paulo e cancelamentos. Telefone do aluno é persistido no banco.
- A conta real de cada perfil foi preservada: Esther (ADM), João (ASA), Higor (aluno).

## Evidências

- Builds frontend e backend concluídos.
- **30/30 testes locais aprovados**, incluindo banco temporário isolado, autorização, propriedade de registros, calendário, R2 concorrente e PDF comprimido.
- **44/44 verificações de navegador aprovadas**: 43 rotas autenticadas e um cenário de API indisponível com erro e opção de tentar novamente. Foi injetado um cache legado exclusivamente no navegador de teste para verificar que ele não reaparece na interface.
- **10/10 verificações finais em produção aprovadas**: banco, sessões, demonstração bloqueada, proteção da base institucional, documentos do aluno e os três portais no navegador.
- API da prévia: **81 verificações**, com 80 aprovações. A falha inicial foi a resposta de upload sem a chave R2 atualizada, embora o arquivo já estivesse salvo. A implementação foi corrigida; os quatro retestes finais passaram (chave persistida, bytes originais no download, exclusão, ausência após exclusão). A falha inicial foi mantida no JSON como evidência.
- Login real dos três perfis aprovado na API Supabase/Worker. Não foram incluídos tokens nem senhas nos relatórios.

Arquivos: `api-results.json`, `browser-results.json`, `production-results.json`, `cleanup-api-results.json` e capturas de tela nesta pasta.

Os testes de navegação verificam renderização, sessão, erros de execução e ausência de cache legado; eles não representam cobertura exaustiva de cada combinação de campo/formulário, dispositivo ou concorrência em produção. Os fluxos de escrita testados incluem chamado aluno→ASA→admin, notas internas, resposta pública, resolução, chat, feedback, base de conhecimento, upload/download, agendamento/cancelamento e calendário.

## Limpeza

Sete documentos temporários foram excluídos pela API autenticada: seis dos testes completos e um do reteste de upload. Arquivos R2 associados foram removidos pela mesma API. Contas reais preservadas. Eventos reais de auditoria foram preservados.

Permanecem **dois chamados fechados, duas conversas, dois feedbacks e dois agendamentos cancelados**, todos identificados como testes. Não devem compor a operação definitiva. O SQL `limpeza-testes.sql` limita a remoção aos IDs documentados, confere a proveniência e preserva User, Student e AuditEvent. A execução desse SQL no Supabase ainda está pendente. Também estão listadas as duas chaves exatas de snapshots R2 para posterior exclusão.

A revisão automática rejeitou a criação de um endpoint público temporário capaz de excluir registros do banco, por criar superfície destrutiva desnecessária. Essa rotina não foi publicada nem executada. Não houve tentativa de contornar a rejeição; foram usadas somente as exclusões já disponíveis na API. O SQL foi preparado como alternativa revisável para execução diretamente no Supabase.

## Pendências de operação

1. **Gemini:** a chamada direta com a chave configurada retornou HTTP 503 no modelo `gemini-3.8-flash`, com mensagem de alta demanda. O modelo alternativo 2.5 respondeu 404, orientando usar 3.8. A disponibilidade não foi comprovada. O chat agora anuncia explicitamente quando usa somente os trechos reais da base.
2. **Limpeza SQL** descrita acima: ainda necessária para não contaminar métricas com testes.
3. **Conteúdo institucional:** a base ficou vazia após remover os documentos de teste. É necessário cadastrar documentos oficiais, regras SLA e configurações institucionais aprovadas. Não foram inventados prazos, políticas, horários acadêmicos nem documentos para preencher as telas.

O projeto não é declarado 100% concluído enquanto essas pendências persistirem.
