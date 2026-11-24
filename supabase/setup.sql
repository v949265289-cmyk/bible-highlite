create table if not exists public.site_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 120),
  body text not null check (length(btrim(body)) between 1 and 3000),
  created_at timestamptz not null default now()
);

alter table public.site_updates enable row level security;

grant select on public.site_updates to anon, authenticated;
grant insert, update, delete on public.site_updates to authenticated;

drop policy if exists "Anyone can read site updates" on public.site_updates;
create policy "Anyone can read site updates"
  on public.site_updates for select
  to anon, authenticated
  using (true);

drop policy if exists "Owner can publish site updates" on public.site_updates;
create policy "Owner can publish site updates"
  on public.site_updates for insert
  to authenticated
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'v949265289@gmail.com');

drop policy if exists "Owner can edit site updates" on public.site_updates;
create policy "Owner can edit site updates"
  on public.site_updates for update
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'v949265289@gmail.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'v949265289@gmail.com');

drop policy if exists "Owner can delete site updates" on public.site_updates;
create policy "Owner can delete site updates"
  on public.site_updates for delete
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'v949265289@gmail.com');

create table if not exists public.reading_reminders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  reminder_time text not null check (reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  timezone text not null check (length(btrim(timezone)) between 1 and 64),
  subscription jsonb not null check (
    jsonb_typeof(subscription) = 'object'
    and jsonb_typeof(subscription -> 'keys') = 'object'
    and nullif(subscription ->> 'endpoint', '') is not null
    and nullif(subscription -> 'keys' ->> 'p256dh', '') is not null
    and nullif(subscription -> 'keys' ->> 'auth', '') is not null
  )
);

alter table public.reading_reminders enable row level security;
grant select, insert, update, delete on public.reading_reminders to authenticated;

drop policy if exists "Users can read their own reading reminder" on public.reading_reminders;
create policy "Users can read their own reading reminder"
  on public.reading_reminders for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own reading reminder" on public.reading_reminders;
create policy "Users can create their own reading reminder"
  on public.reading_reminders for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own reading reminder" on public.reading_reminders;
create policy "Users can update their own reading reminder"
  on public.reading_reminders for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own reading reminder" on public.reading_reminders;
create policy "Users can delete their own reading reminder"
  on public.reading_reminders for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.validate_reading_reminder_timezone()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid IANA timezone';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_reading_reminder_timezone on public.reading_reminders;
create trigger validate_reading_reminder_timezone
  before insert or update of timezone on public.reading_reminders
  for each row execute function public.validate_reading_reminder_timezone();

create table if not exists public.reading_reminder_delivery (
  user_id uuid primary key references public.reading_reminders(user_id) on delete cascade,
  last_sent_on date,
  claim_expires_at timestamptz
);

alter table public.reading_reminder_delivery enable row level security;
revoke all on public.reading_reminder_delivery from public, anon, authenticated;

create or replace function public.claim_due_reading_reminders()
returns table (reminder_user_id uuid, push_subscription jsonb)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  reminder record;
  local_date date;
  claimed_user_id uuid;
begin
  for reminder in
    select r.user_id, r.reminder_time, r.timezone, r.subscription
    from public.reading_reminders as r
    where r.enabled
      and (now() at time zone r.timezone)::time >= r.reminder_time::time
    order by r.user_id
    for update of r skip locked
  loop
    local_date := (now() at time zone reminder.timezone)::date;
    insert into public.reading_reminder_delivery as current_delivery (user_id, claim_expires_at)
      values (reminder.user_id, now() + interval '5 minutes')
      on conflict (user_id) do update
        set claim_expires_at = excluded.claim_expires_at
        where current_delivery.last_sent_on is distinct from local_date
          and (current_delivery.claim_expires_at is null or current_delivery.claim_expires_at < now())
      returning user_id into claimed_user_id;

    if found then
      reminder_user_id := reminder.user_id;
      push_subscription := reminder.subscription;
      return next;
    end if;
  end loop;
end;
$$;

create or replace function public.complete_reading_reminder(target_user_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  update public.reading_reminder_delivery as delivery
  set last_sent_on = (now() at time zone reminder.timezone)::date,
      claim_expires_at = null
  from public.reading_reminders as reminder
  where delivery.user_id = target_user_id
    and reminder.user_id = target_user_id
    and reminder.enabled;
$$;

create or replace function public.release_reading_reminder_claim(target_user_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  update public.reading_reminder_delivery
  set claim_expires_at = null
  where user_id = target_user_id;
$$;

revoke all on function public.claim_due_reading_reminders() from public, anon, authenticated;
grant execute on function public.claim_due_reading_reminders() to service_role;
revoke all on function public.complete_reading_reminder(uuid) from public, anon, authenticated;
grant execute on function public.complete_reading_reminder(uuid) to service_role;
revoke all on function public.release_reading_reminder_claim(uuid) from public, anon, authenticated;
grant execute on function public.release_reading_reminder_claim(uuid) to service_role;
