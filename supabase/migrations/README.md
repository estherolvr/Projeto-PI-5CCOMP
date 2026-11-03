# Supabase migrations

Add reviewed, timestamped SQL migration files here (for example,
`20261103120000_add_student_access.sql`). On pushes to `main`, GitHub Actions
applies these files with `supabase db push` before deploying the Cloudflare
Worker. Do not put credentials or production data in migrations.

The pipeline does not infer database changes from Prisma schemas and does not
run `prisma db push` against production. Add migrations only after reviewing
their compatibility with the currently deployed application.
