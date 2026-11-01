# Diagnóstico isolado Cloudflare/Supabase

Teste executado em Worker separado, sem alterar a aplicação principal ou registros no banco.

- Novo token Cloudflare: ativo; publicação do diagnóstico concluída.
- Abertura TCP com o pooler: concluída.
- Pooler aceitou SSLRequest; socket com TLS abriu.
- Após StartupMessage PostgreSQL, o socket encerrou sem desafio de autenticação.
- Mesmo resultado para o usuário configurado e para postgres do mesmo projeto, sem envio de senha nesses dois testes de protocolo.
- Driver pg 8.16.3: Connection terminated unexpectedly durante início da autenticação.
- Driver postgres.js 3.4.8: timeout; SELECT 1 não foi concluído.

Limites: o teste usou DATABASE_URL configurado no ambiente deste chat. Não prova que o Secret da aplicação principal tem exatamente o mesmo valor. Abertura de TLS seguida de fechamento não comprova qual lado ou política causou o fechamento. Não houve erro explícito de senha nem resultado de consulta SQL. O certificado observado no computador Windows não foi reproduzido pelo teste de socket no Worker.

Próxima verificação: restrições de rede e disponibilidade do pooler no Supabase. Se não houver restrições, aprofundar o transporte TLS/startup e comparar outro endpoint oficial do mesmo projeto, preservando verificação de certificados. Não mudar senha por tentativa nem conceder privilégios extras no banco.

## Comparação Session e Transaction pooler

Comparação executada no mesmo Worker, com a mesma credencial configurada neste ambiente, mudando apenas a porta. Nas portas 5432 e 6543, TCP/SSLRequest/abertura do socket TLS concluíram, mas o StartupMessage foi seguido de encerramento sem desafio de autenticação. Em ambas, pg retornou `Connection terminated unexpectedly` e postgres.js atingiu o timeout. Nenhuma consulta SELECT 1 concluiu. O resultado não favorece trocar a porta em produção e não identifica sozinho a causa final. A aplicação principal não foi alterada. O Worker temporário foi removido após o teste.

## Conexão direta e isolamento do caminho TLS

O endpoint direto foi derivado do identificador de projeto presente na configuração, na porta 5432, com usuário sem sufixo de pooler. Com TLS, reproduziu o encerramento antes do desafio de autenticação nos dois modos de pooler.

Teste complementar sem TLS enviou SOMENTE StartupMessage, sem senha e sem consulta. Os três endpoints (pooler 5432, pooler 6543 e direto 5432) responderam AuthenticationSASL (tipo 10). Portanto, o servidor aceita o protocolo inicial a partir do Worker nesse caminho; a diferença observada está no caminho TLS. Isso não prova a validade da senha, não identifica sozinho o detalhe específico de certificado/SNI/implementação de upgrade e não autoriza usar senha ou consultas em texto claro.

Correção da interpretação anterior: a resolução de socket.opened após startTls não comprovou troca bem-sucedida de dados PostgreSQL sob TLS. É preciso investigar o handshake/upgrade e a confiança de certificados no runtime Cloudflare. Não foi desativado SSL na aplicação principal. Nenhuma credencial foi enviada nos testes de StartupMessage sem TLS. O Worker temporário foi removido após o diagnóstico.

## Tentativa de correção TLS

O transporte alternativo pg usando node:net/node:tls foi compilado separadamente e testado somente no Worker temporário. Não concluiu consulta: o runtime cancelou a requisição por execução sem resposta. A alternativa não foi promovida para produção.

Consultada a documentação oficial Cloudflare para Supabase: recomenda Hyperdrive com endpoint direto. Tentativa de criar configuração temporária com cache desligado, limite de duas conexões e TLS verify-full recebeu HTTP 403 Authentication error. Nenhum ID Hyperdrive foi criado. O token precisa de autorização Account/Hyperdrive/Edit na mesma conta antes de validar essa alternativa. Não foi desativada validação TLS nem alterada a aplicação principal.

## Permissão Hyperdrive atualizada

A criação Hyperdrive passou da autorização e retornou erro 2007: verify-full exige ca_certificate_id. Obtido o CA público Supabase Root 2021 (válido até 26/04/2031) pela URL pública oficial de downloads. Tentativa de upload desse certificado público a /mtls_certificates retornou 403 Authentication error. Documentação da API confirma necessidade de Account: SSL and Certificates Write (Edit no painel). Nenhum certificado nem configuração Hyperdrive foi criado. Não foi reduzido o modo TLS. Próxima ação: adicionar essa permissão ao token existente e repetir upload/Hyperdrive verify-full.

## Conexão Hyperdrive validada

CA público Supabase Root 2021 cadastrado após liberação da permissão. Hyperdrive criado com endpoint direto, TLS verify-full, cache desativado e limite mínimo de cinco conexões. O teste isolado retornou HTTP 200 com pg=connected e prisma=connected; ambos executaram SELECT 1 com sucesso.

A configuração Hyperdrive validada foi preservada para permitir a integração posterior, sem alterações no Worker principal. Identificador consta em wrangler-hyperdrive.json. O CA público é a autoridade de confiança dessa configuração. Nenhuma senha foi impressa nem escrita no repositório. O Worker de diagnóstico foi removido após o teste. A aplicação principal continua com o caminho de conexão anterior; é necessário integrar o binding e o ciclo de vida do Prisma antes de publicar essa correção.

## Integração em produção concluída

Worker alvaro-ai publicado na versão 7d880426-df31-4ba0-ad2e-5af8e03e6f88 com binding Hyperdrive. Prisma isolado por requisição com AsyncLocalStorage e desconexão agendada após resposta. Build e 15 testes passaram. Endpoint público /api/health retornou HTTP 200, status ok e database connected. Nenhuma migração ou seed foi executado.
