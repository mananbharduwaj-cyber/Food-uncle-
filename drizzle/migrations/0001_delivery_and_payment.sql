-- Food Uncle: delivery assignment + COD completion support.
alter table public.orders
  add column if not exists delivery_partner_id uuid references auth.users(id) on delete set null,
  add column if not exists delivery_payment_received boolean not null default false,
  add column if not exists delivered_at timestamptz;

create index if not exists orders_delivery_partner_idx on public.orders(delivery_partner_id);

create policy "delivery partner read assigned orders" on public.orders
  for select to authenticated
  using (delivery_partner_id = auth.uid() and public.has_role(auth.uid(),'delivery_partner'));

create policy "delivery partner complete assigned order" on public.orders
  for update to authenticated
  using (delivery_partner_id = auth.uid() and public.has_role(auth.uid(),'delivery_partner'))
  with check (
    delivery_partner_id = auth.uid()
    and public.has_role(auth.uid(),'delivery_partner')
    and status = 'delivered'
    and payment_status = 'paid'
    and delivery_payment_received = true
  );

-- Online orders are blocked until the owner explicitly enables online payments.
create or replace function public.enforce_payment_mode() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.payment_method = 'online' and not coalesce((select online_payments_enabled from public.restaurant_settings where id=1), false) then
    raise exception 'Online payments are not enabled yet';
  end if;
  if new.payment_method = 'cod' and new.payment_status is null then
    new.payment_status := 'pending';
  end if;
  return new;
end $$;

create trigger orders_payment_mode
before insert or update on public.orders
for each row execute function public.enforce_payment_mode();
