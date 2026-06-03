-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users (mirrors auth.users)
-- `email` is nullable: anonymous sign-ins (Supabase Anonymous Auth) create an
-- auth.users row with a null email, and the handle_new_user() trigger mirrors
-- that here. A null email is replaced when the user later upgrades (linkIdentity
-- / updateUser). NULLs are distinct under the unique index, so many anonymous
-- users coexist fine.
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique,
  name text not null default '',
  avatar_url text,
  created_at timestamptz default now()
);

-- Idempotent: relax the NOT NULL on pre-existing deployments where the table
-- was created before anonymous sign-ins were supported.
alter table public.users alter column email drop not null;

-- Trips
create table if not exists public.trips (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  location_name text not null,
  lat double precision not null,
  lng double precision not null,
  start_date date not null,
  end_date date not null,
  description text,
  invite_code text not null unique,
  creator_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- Trip members
create table if not exists public.trip_members (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('creator', 'member')),
  joined_at timestamptz default now(),
  unique(trip_id, user_id)
);

-- Packing items
create table if not exists public.packing_items (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  category text not null,
  name text not null,
  quantity integer not null default 1,
  is_custom boolean not null default false,
  weather_highlight text not null default 'grey' check (weather_highlight in ('red', 'yellow', 'grey')),
  highlight_reason text,
  created_at timestamptz default now()
);

-- Item claims
create table if not exists public.item_claims (
  id uuid default uuid_generate_v4() primary key,
  item_id uuid references public.packing_items(id) on delete cascade not null,
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  quantity_claimed integer not null default 1,
  confirmed boolean not null default false,
  created_at timestamptz default now(),
  unique(item_id, user_id)
);

-- Messages
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  pinned boolean not null default false,
  created_at timestamptz default now()
);

-- Notifications
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  trip_id uuid references public.trips(id) on delete cascade not null,
  type text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz default now()
);

-- Weather cache
create table if not exists public.weather_cache (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null unique,
  fetched_at timestamptz default now(),
  forecast_json jsonb not null
);

-- Push subscriptions
create table if not exists public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  subscription jsonb not null,
  created_at timestamptz default now()
);

-- =================== RLS POLICIES ===================

alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.packing_items enable row level security;
alter table public.item_claims enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.weather_cache enable row level security;
alter table public.push_subscriptions enable row level security;

-- Membership check used by the policies below. SECURITY DEFINER so its read of
-- trip_members bypasses RLS. This is essential: a policy ON trip_members that
-- queries trip_members directly recurses forever ("infinite recursion detected
-- in policy for relation trip_members"). Routing every membership test through
-- this function breaks that cycle and keeps the other tables' policies cheap.
create or replace function public.is_trip_member(p_trip_id uuid, p_user_id uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id
  );
$$;
revoke all on function public.is_trip_member(uuid, uuid) from public;
grant execute on function public.is_trip_member(uuid, uuid) to anon, authenticated;

-- Users: anyone authenticated can read; only own row write
drop policy if exists "Users can read all profiles" on public.users;
create policy "Users can read all profiles" on public.users for select using (auth.uid() is not null);
drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);
-- Profile UPDATE is funnelled through update_my_profile() so users can't
-- rewrite the mirrored `email` field or change the primary key. The policy
-- itself is removed; only the security-definer function below can write.
drop policy if exists "Users can update own profile" on public.users;

create or replace function public.update_my_profile(new_name text, new_avatar_url text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if new_name is null or length(trim(new_name)) = 0 then
    raise exception 'name is required';
  end if;
  if length(new_name) > 80 then
    raise exception 'name too long';
  end if;
  update public.users
    set name = trim(new_name),
        avatar_url = coalesce(new_avatar_url, avatar_url)
    where id = uid;
end;
$$;
revoke all on function public.update_my_profile(text, text) from public;
grant execute on function public.update_my_profile(text, text) to authenticated;

-- Trips: members can see their trips
drop policy if exists "Trip members can view trips" on public.trips;
-- creator_id clause lets the creator read their trip via INSERT ... RETURNING
-- before the trip_members row exists (see createTrip in app/trips/new/actions.ts).
create policy "Trip members can view trips" on public.trips for select
  using (auth.uid() = creator_id or public.is_trip_member(id, auth.uid()));
drop policy if exists "Authenticated users can create trips" on public.trips;
create policy "Authenticated users can create trips" on public.trips for insert
  with check (auth.uid() = creator_id);
drop policy if exists "Creators can update their trips" on public.trips;
create policy "Creators can update their trips" on public.trips for update
  using (auth.uid() = creator_id);
drop policy if exists "Creators can delete their trips" on public.trips;
create policy "Creators can delete their trips" on public.trips for delete
  using (auth.uid() = creator_id);

-- Trip members
drop policy if exists "Members can view trip membership" on public.trip_members;
create policy "Members can view trip membership" on public.trip_members for select
  using (public.is_trip_member(trip_id, auth.uid()));
drop policy if exists "Users can join trips" on public.trip_members;
create policy "Users can join trips" on public.trip_members for insert
  with check (auth.uid() = user_id);
drop policy if exists "Creators can remove members" on public.trip_members;
create policy "Creators can remove members" on public.trip_members for delete
  using (
    user_id = auth.uid() or
    exists (select 1 from public.trips t where t.id = trip_id and t.creator_id = auth.uid())
  );

-- Packing items: trip members can CRUD
drop policy if exists "Trip members can view packing items" on public.packing_items;
create policy "Trip members can view packing items" on public.packing_items for select
  using (public.is_trip_member(trip_id, auth.uid()));
drop policy if exists "Trip members can add packing items" on public.packing_items;
create policy "Trip members can add packing items" on public.packing_items for insert
  with check (public.is_trip_member(trip_id, auth.uid()));
drop policy if exists "Trip members can update packing items" on public.packing_items;
create policy "Trip members can update packing items" on public.packing_items for update
  using (public.is_trip_member(trip_id, auth.uid()));
drop policy if exists "Creators can delete packing items" on public.packing_items;
create policy "Creators can delete packing items" on public.packing_items for delete
  using (exists (select 1 from public.trips t where t.id = trip_id and t.creator_id = auth.uid()));

-- Item claims
drop policy if exists "Trip members can view claims" on public.item_claims;
create policy "Trip members can view claims" on public.item_claims for select
  using (public.is_trip_member(trip_id, auth.uid()));
drop policy if exists "Users can manage own claims" on public.item_claims;
create policy "Users can manage own claims" on public.item_claims for insert
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own claims" on public.item_claims;
create policy "Users can update own claims" on public.item_claims for update
  using (auth.uid() = user_id);
drop policy if exists "Users can delete own claims" on public.item_claims;
create policy "Users can delete own claims" on public.item_claims for delete
  using (auth.uid() = user_id);

-- Messages
drop policy if exists "Trip members can view messages" on public.messages;
create policy "Trip members can view messages" on public.messages for select
  using (public.is_trip_member(trip_id, auth.uid()));
drop policy if exists "Trip members can send messages" on public.messages;
create policy "Trip members can send messages" on public.messages for insert
  with check (auth.uid() = user_id and public.is_trip_member(trip_id, auth.uid()));
drop policy if exists "Creators can pin messages" on public.messages;
create policy "Creators can pin messages" on public.messages for update
  using (exists (select 1 from public.trips t where t.id = trip_id and t.creator_id = auth.uid()));

-- Notifications
drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications" on public.notifications for select
  using (auth.uid() = user_id);
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications for update
  using (auth.uid() = user_id);

-- Weather cache
drop policy if exists "Trip members can view weather" on public.weather_cache;
create policy "Trip members can view weather" on public.weather_cache for select
  using (public.is_trip_member(trip_id, auth.uid()));

-- Push subscriptions
drop policy if exists "Users manage own subscriptions" on public.push_subscriptions;
create policy "Users manage own subscriptions" on public.push_subscriptions for all
  using (auth.uid() = user_id);

-- =================== FUNCTIONS ===================

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Anonymous users arrive with a null email and no metadata, so every fallback
  -- below can be null/empty — coalesce to '' to satisfy the NOT NULL on `name`.
  -- The DisplayNamePrompt then asks anonymous users what to call them.
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      ''
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.users.name),
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);
  return new;
end;
$$;

-- Trigger for new user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Mirror auth.users.email changes into public.users.email so member lists
-- stay in sync when a user updates their email in Supabase Auth.
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.users set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute procedure public.handle_user_email_change();

-- Invite-link preview: a security-definer function so unauthenticated
-- visitors can see a narrow projection of a trip by its invite code,
-- without a permissive SELECT policy on `trips` that would leak every row.
create or replace function public.get_trip_by_invite(code text)
returns table (
  id uuid,
  name text,
  location_name text,
  start_date date,
  end_date date,
  member_count bigint
)
language sql security definer set search_path = public as $$
  select t.id, t.name, t.location_name, t.start_date, t.end_date,
    (select count(*) from public.trip_members tm where tm.trip_id = t.id)
  from public.trips t
  where t.invite_code = code
  limit 1;
$$;

revoke all on function public.get_trip_by_invite(text) from public;
grant execute on function public.get_trip_by_invite(text) to anon, authenticated;

-- Drop the previous permissive policy if it exists (it allowed SELECT on
-- every trip row to every caller, intended only as an invite-code lookup).
drop policy if exists "Anyone can look up trip by invite code" on public.trips;

-- Realtime: enable for chat and claims (idempotent — skip if already added)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'item_claims') then
    alter publication supabase_realtime add table public.item_claims;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_members') then
    alter publication supabase_realtime add table public.trip_members;
  end if;
end $$;

-- =================== MIGRATION: Item categories ===================
-- Adds item_type and scaled_multiplier to packing_items.
-- Run these on existing databases.

alter table public.packing_items
  add column if not exists item_type text not null default 'group'
    check (item_type in ('group', 'personal', 'scaled'));

alter table public.packing_items
  add column if not exists scaled_multiplier text
    check (scaled_multiplier is null or scaled_multiplier in ('per_person', 'per_night', 'per_person_per_night'));
