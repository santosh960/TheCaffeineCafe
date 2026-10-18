alter table public.business_settings
  alter column opening_hours set default '11:00 AM – 11:30 PM';

insert into public.business_settings (id, opening_hours)
values (1, '11:00 AM – 11:30 PM')
on conflict (id) do update
set opening_hours = excluded.opening_hours,
    updated_at = now();
