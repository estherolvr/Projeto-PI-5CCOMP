# Configurar deploy automático

O workflow `.github/workflows/deploy.yml` valida cada push e pull request para
`main`. Quando um commit chega à branch `main`, ele publica o Worker
`alvaro-ai` no Cloudflare. Se houver arquivos SQL em `supabase/migrations/`,
aplica essas migrations no Supabase antes do deploy. Sem migrations, o banco
não é alterado.

## 1. Token do Cloudflare

1. No Cloudflare, abra **My Profile → API Tokens → Create Token → Create Custom Token**.
2. Dê um nome como `GitHub Actions - Projeto PI`.
3. Conceda a permissão de conta **Workers Scripts: Edit** para a conta deste
   projeto. O `account_id` usado pelo repositório está em `wrangler.jsonc`.
4. Restrinja o token à conta necessária e, se a tela permitir, ao recurso do
   Worker `alvaro-ai`. Não use a Global API Key.
5. Copie o token gerado. No GitHub, abra o repositório
   `estherolvr/Projeto-PI-5CCOMP` e vá a **Settings → Secrets and variables →
   Actions → New repository secret**. Cadastre `CLOUDFLARE_API_TOKEN` com o
   token. O valor só é mostrado na criação; guarde-o em um gerenciador seguro.

## 2. Secret do Supabase (quando houver migrations)

O repositório ainda não tem migrations SQL de produção. O workflow só consulta
`SUPABASE_DB_URL` quando há um arquivo `supabase/migrations/*.sql`; portanto,
este secret pode ser cadastrado agora ou quando a primeira migration revisada
for adicionada.

1. No Supabase, abra **Project Settings → Database → Connection string** e
   escolha URI com conexão direta ou session pooler apropriada para migrations.
2. Copie a URI PostgreSQL completa, incluindo usuário, senha, host, porta e nome
   do banco. Se a senha tiver caracteres especiais, use a URI já codificada pelo
   painel. Nunca a coloque no repositório ou em um arquivo `.env` versionado.
3. Cadastre-a no mesmo local de secrets do GitHub, com o nome
   `SUPABASE_DB_URL`.

As migrations devem ser arquivos SQL com prefixo de data/hora em
`supabase/migrations/`. Revise-as antes do merge para `main`. O workflow usa o
Supabase CLI para aplicar somente essas migrations; ele não executa `prisma db
push` nem modifica o schema automaticamente.

## 3. Autorizar o deploy de produção

O job de deploy publica somente pushes para `main`; commits em outras branches
e pull requests executam validação, sem publicar. Em **Settings → Environments**
no GitHub, crie o environment `production`. Opcionalmente, configure aprovação
de deployment e restrinja branches a `main`. Para publicar um commit, faça merge
na branch `main` e acompanhe **Actions → Validate and deploy**.

O Worker mantém suas configurações e secrets já provisionados no Cloudflare.
Verifique que o Worker `alvaro-ai`, o binding Hyperdrive, o bucket R2 e o
serviço de PDF existem na conta antes do primeiro workflow. O workflow não cria
nem altera esses recursos.
