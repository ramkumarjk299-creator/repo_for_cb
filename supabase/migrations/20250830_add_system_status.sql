-- Create a system_status table to store shopkeeper online/offline status
create table if not exists public.system_status (
  id uuid primary key default gen_random_uuid(),
  on_off integer not null default 0, -- 0 = offline, 1 = online
  updated_at timestamp with time zone default now()
);

-- Insert initial row if not exists
insert into public.system_status (on_off) 
select 0 where not exists (select 1 from public.system_status);
