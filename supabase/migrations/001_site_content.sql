-- Site content table for editable page copy
create table if not exists site_content (
  id uuid primary key default gen_random_uuid(),
  page_slug text unique not null,
  content jsonb not null default '{}',
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- Enable RLS
alter table site_content enable row level security;

-- Anyone can read (public site needs content)
create policy "Public read access"
  on site_content for select
  using (true);

-- Only admin can insert
create policy "Admin insert"
  on site_content for insert
  to authenticated
  with check (
    (select auth.uid()) = (select id from auth.users where email = 'hello@butlersinc.com' limit 1)
  );

-- Only admin can update
create policy "Admin update"
  on site_content for update
  to authenticated
  using (
    (select auth.uid()) = (select id from auth.users where email = 'hello@butlersinc.com' limit 1)
  )
  with check (
    (select auth.uid()) = (select id from auth.users where email = 'hello@butlersinc.com' limit 1)
  );

-- Only admin can delete
create policy "Admin delete"
  on site_content for delete
  to authenticated
  using (
    (select auth.uid()) = (select id from auth.users where email = 'hello@butlersinc.com' limit 1)
  );

-- Index for fast slug lookups
create index idx_site_content_slug on site_content(page_slug);
