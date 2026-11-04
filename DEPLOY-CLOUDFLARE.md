# Cloudflare Workers + Supabase

O Worker `alvaro-ai` atende a interface e `/api/*` na mesma origem:
https://alvaro-ai.joao-fsantana.workers.dev

## Banco em produção

A API usa o binding `HYPERDRIVE` declarado em `wrangler.jsonc`. A conexão Hyperdrive acessa o endpoint PostgreSQL direto do Supabase com TLS `verify-full` e o CA público Supabase Root 2021. Cache de consultas está desativado e o limite de conexões de origem é cinco.

Cada requisição HTTP cria seu próprio cliente Prisma com o adaptador PostgreSQL e a connectionString do binding. AsyncLocalStorage mantém o cliente correto nas rotas durante operações assíncronas; ao terminar/fechar a resposta, o Worker agenda a desconexão com waitUntil. O Hyperdrive mantém o pool de origem.

`DATABASE_URL` continua sendo usado na execução Node local e em ferramentas de diagnóstico. No Worker publicado, a origem efetiva vem do Hyperdrive, portanto mudanças de senha/host do banco precisam ser aplicadas também à configuração Hyperdrive. Não imprimir nem versionar credenciais. Não substituir a string fornecida pelo binding por uma URI de pooler.

A alteração de conexão não cria tabelas, não aplica migrações e não executa seed. A base existente foi preservada.

## Preparação e publicação

1. Instalar dependências com `npm ci` na raiz, no frontend e no backend.
2. Executar `npm run build:cloudflare` na raiz para gerar frontend e cliente Prisma PostgreSQL.
3. Executar `npm run build:backend` e os testes do backend.
4. Validar `npx wrangler deploy --dry-run`.
5. Publicar o extrator privado com `npx wrangler deploy --config wrangler-pdf.jsonc`.
6. Enviar prévia com `npx wrangler versions upload --keep-vars --preview-alias dados-reais`, validar e ativar com `npx wrangler versions deploy <id>@100% --yes`.

O binding Hyperdrive precisa existir na conta de destino; seu ID está em `wrangler.jsonc`. Para outra conta, criar uma configuração equivalente, importar o CA público confiável e atualizar somente o ID.

Secrets já configurados no Worker são preservados pelo deploy. A aplicação usa Supabase Auth, Gemini e R2; manter suas configurações existentes. O token de deploy fica no ambiente de execução, nunca no frontend.

## Autenticação e IA

`APP_AUTH_PROVIDER=supabase` valida credenciais e tokens no Supabase Auth. A pessoa também precisa de cadastro institucional com o mesmo e-mail em User ou Student. Login de demonstração da API fica desativado em produção. O frontend não possui login de demonstração, senhas universais ou dados fictícios como substitutos de falhas de API.

Chat, análise de chamados e relatórios usam `GEMINI_MODEL`, definido como `gemini-3.5-flash-lite` nas variáveis versionadas do Worker e como padrão no backend. Na execução Node local, uma variável de ambiente `GEMINI_MODEL` prevalece sobre o padrão; reinicie o processo ao alterá-la. A geração de texto deste modelo foi validada no endpoint publicado com resposta em aproximadamente 0,5 s. O modelo anterior (`gemini-3.8-flash`) era reconhecido pela API, mas falhava na geração (HTTP 503 e timeouts no fluxo real); isso não indicava uma chave inválida.

O Google informa uma faixa gratuita para a Gemini API, mas os dados enviados no nível gratuito podem ser usados para melhorar produtos; no nível pago, esse uso não ocorre. Como as conversas podem incluir informações acadêmicas de alunos, confirme os termos e controles de dados da conta antes de usar o nível gratuito em produção. Consulte [modelos Gemini](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) e [preços e uso de dados](https://ai.google.dev/gemini-api/docs/pricing).

O armazenamento em produção usa o binding nativo `STORAGE`, com o bucket `alvaro-ai-storage`. Credenciais S3 isoladas não comprovam operação. Upload, download, exclusão e snapshots foram exercitados. PDFs são enviados pelo binding privado `PDF_EXTRACTOR` ao Worker `alvaro-ai-pdf`, sem URL pública; PDFs ilegíveis são recusados, não indexados como bytes.

## Verificação realizada

Versão publicada: `d9b41c85-692d-4ae7-9809-cdf32f95b8c1`.

- Build TypeScript aprovado.
- 30 testes locais aprovados, incluindo isolamento de bancos em requisições concorrentes.
- Teste isolado Hyperdrive: SELECT 1 aprovado com pg e Prisma, mantendo TLS verify-full.
- API principal `/api/health`: HTTP 200, status ok e database connected.

A saúde executa SELECT 1 de verdade. Ela comprova a conexão, mas não substitui testes de permissões em tabelas, login, chat ou arquivos.

## Diagnóstico anterior

As conexões diretas do Worker com o PostgreSQL, usando upgrade TLS via sockets, eram encerradas antes do desafio de autenticação. O caminho seguro validado foi Hyperdrive com o CA Supabase. Os Workers temporários foram removidos; a configuração Hyperdrive e seu certificado foram preservados porque agora atendem à aplicação principal.

## Dados reais e evidências

Os datasets de demonstração e o seed foram desativados. Filas, dashboards, conversas, documentos e perfis consultam a API e mostram estados vazios ou erros. Não existe emissão de documentos acadêmicos fictícios. A criação de perfil institucional não cria automaticamente uma identidade Supabase Auth.

Evidências da validação completa estão em `test-results/real-data-validation/RELATORIO.md`. O SQL de limpeza contém somente IDs documentados dos testes, preserva as contas e a auditoria; sua execução no Supabase permanece pendente.
