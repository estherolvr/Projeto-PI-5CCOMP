create table if not exists public."HomeBanner" (
  "id" text primary key,
  "title" text not null,
  "description" text,
  "imageUrl" text not null,
  "linkUrl" text not null,
  "sortOrder" integer not null default 0,
  "active" boolean not null default true,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create index if not exists "HomeBanner_active_sortOrder_idx"
  on public."HomeBanner" ("active", "sortOrder");
