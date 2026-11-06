alter table "User"
  add column if not exists "mustChangePassword" boolean not null default false;

alter table "Student"
  add column if not exists "mustChangePassword" boolean not null default false;

comment on column "User"."mustChangePassword" is
  'Blocks application access until the provisional password is replaced.';

comment on column "Student"."mustChangePassword" is
  'Blocks application access until the provisional password is replaced.';
