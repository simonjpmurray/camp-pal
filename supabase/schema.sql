-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users (mirrors auth.users)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null unique,
  name text not null default '',
  avatar_url text,
  created_at timestamptz default now()
);

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

-- Users: anyone authenticated can read; only own row write
create policy "Users can read all profiles" on public.users for select using (auth.uid() is not null);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Trips: members can see their trips
create policy "Trip members can view trips" on public.trips for select
  using (exists (select 1 from public.trip_members tm where tm.trip_id = id and tm.user_id = auth.uid()));
create policy "Authenticated users can create trips" on public.trips for insert
  with check (auth.uid() = creator_id);
create policy "Creators can update their trips" on public.trips for update
  using (auth.uid() = creator_id);
create policy "Creators can delete their trips" on public.trips for delete
  using (auth.uid() = creator_id);

-- Trip members
create policy "Members can view trip membership" on public.trip_members for select
  using (exists (select 1 from public.trip_members tm2 where tm2.trip_id = trip_id and tm2.user_id = auth.uid()));
create policy "Users can join trips" on public.trip_members for insert
  with check (auth.uid() = user_id);
create policy "Creators can remove members" on public.trip_members for delete
  using (
    user_id = auth.uid() or
    exists (select 1 from public.trips t where t.id = trip_id and t.creator_id = auth.uid())
  );

-- Packing items: trip members can CRUD
create policy "Trip members can view packing items" on public.packing_items for select
  using (exists (select 1 from public.trip_members tm where tm.trip_id = trip_id and tm.user_id = auth.uid()));
create policy "Trip members can add packing items" on public.packing_items for insert
  with check (exists (select 1 from public.trip_members tm where tm.trip_id = trip_id and tm.user_id = auth.uid()));
create policy "Trip members can update packing items" on public.packing_items for update
  using (exists (select 1 from public.trip_members tm where tm.trip_id = trip_id and tm.user_id = auth.uid()));
create policy "Creators can delete packing items" on public.packing_items for delete
  using (exists (select 1 from public.trips t where t.id = trip_id and t.creator_id = auth.uid()));

-- Item claims
create policy "Trip members can view claims" on public.item_claims for select
  using (exists (select 1 from public.trip_members tm where tm.trip_id = trip_id and tm.user_id = auth.uid()));
create policy "Users can manage own claims" on public.item_claims for insert
  with check (auth.uid() = user_id);
create policy "Users can update own claims" on public.item_claims for update
  using (auth.uid() = user_id);
create policy "Users can delete own claims" on public.item_claims for delete
  using (auth.uid() = user_id);

-- Messages
create policy "Trip members can view messages" on public.messages for select
  using (exists (select 1 from public.trip_members tm where tm.trip_id = trip_id and tm.user_id = auth.uid()));
create policy "Trip members can send messages" on public.messages for insert
  with check (auth.uid() = user_id and exists (select 1 from public.trip_members tm where tm.trip_id = trip_id and tm.user_id = auth.uid()));
create policy "Creators can pin messages" on public.messages for update
  using (exists (select 1 from public.trips t where t.id = trip_id and t.creator_id = auth.uid()));

-- Notifications
create policy "Users can view own notifications" on public.notifications for select
  using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update
  using (auth.uid() = user_id);

-- Weather cache
create policy "Trip members can view weather" on public.weather_cache for select
  using (exists (select 1 from public.trip_members tm where tm.trip_id = trip_id and tm.user_id = auth.uid()));

-- Push subscriptions
create policy "Users manage own subscriptions" on public.push_subscriptions for all
  using (auth.uid() = user_id);

-- =================== FUNCTIONS ===================

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
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

-- Allow unauthenticated trip lookup by invite code (for join flow)
create policy "Anyone can look up trip by invite code" on public.trips for select
  using (true);

-- Realtime: enable for chat and claims
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.item_claims;
alter publication supabase_realtime add table public.trip_members;
