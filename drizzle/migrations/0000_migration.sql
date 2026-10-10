create type public.app_role as enum ('customer','owner','manager','delivery_partner');
create type public.order_type as enum ('delivery','dine_in','takeaway');
create type public.order_status as enum ('placed','accepted','preparing','ready','out_for_delivery','served','delivered','completed','cancelled','rejected');
create type public.payment_method as enum ('cod','pay_at_counter','online');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null, unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create or replace function public.is_staff(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role in ('owner','manager')) $$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "own profile write" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'owner'));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  insert into public.user_roles(user_id, role) values (new.id, 'customer');
  if not exists (select 1 from public.user_roles where role='owner') then
    insert into public.user_roles(user_id, role) values (new.id, 'owner');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.restaurant_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Food Uncle',
  tagline text default 'Crafted with care, served with love',
  announcement text,
  is_open boolean not null default true,
  delivery_enabled boolean not null default true,
  prep_time_minutes int not null default 25,
  lat double precision not null default 28.6139,
  lng double precision not null default 77.2090,
  address text default 'New Delhi',
  phone text,
  delivery_radius_km numeric not null default 3,
  allow_outside_radius boolean not null default false,
  min_order_value numeric not null default 149,
  free_delivery_above numeric not null default 499,
  flat_delivery_fee numeric not null default 30,
  distance_fee_slabs jsonb not null default '[{"upto_km":2,"fee":20},{"upto_km":3,"fee":35}]',
  tax_percent numeric not null default 5,
  online_payments_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
grant select on public.restaurant_settings to anon, authenticated;
grant update on public.restaurant_settings to authenticated;
grant all on public.restaurant_settings to service_role;
alter table public.restaurant_settings enable row level security;
create policy "public read settings" on public.restaurant_settings for select using (true);
create policy "owner update settings" on public.restaurant_settings for update to authenticated using (public.has_role(auth.uid(),'owner'));
insert into public.restaurant_settings(id, announcement) values (1, 'Free delivery on orders above ₹499');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null, sort_order int not null default 0, is_active boolean not null default true
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "public read categories" on public.categories for select using (is_active or public.is_staff(auth.uid()));
create policy "owner manage categories" on public.categories for all to authenticated using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null, description text, price numeric not null, discount_price numeric,
  image_url text, is_veg boolean not null default true, is_bestseller boolean not null default false,
  is_recommended boolean not null default false, is_spicy boolean not null default false,
  is_available boolean not null default true, prep_time_minutes int default 15,
  addons jsonb not null default '[]', keywords text,
  created_at timestamptz not null default now()
);
grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;
grant all on public.menu_items to service_role;
alter table public.menu_items enable row level security;
create policy "public read items" on public.menu_items for select using (true);
create policy "owner manage items" on public.menu_items for all to authenticated using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));
create policy "manager toggle availability" on public.menu_items for update to authenticated using (public.has_role(auth.uid(),'manager'));

create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  table_number text not null unique, is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.dining_tables to anon, authenticated;
grant insert, update, delete on public.dining_tables to authenticated;
grant all on public.dining_tables to service_role;
alter table public.dining_tables enable row level security;
create policy "public read tables" on public.dining_tables for select using (true);
create policy "owner manage tables" on public.dining_tables for all to authenticated using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, name text not null, phone text not null, house text not null,
  street text not null, landmark text, city text not null, pincode text not null,
  lat double precision, lng double precision, created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.addresses to authenticated;
grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "own addresses" on public.addresses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff read addresses" on public.addresses for select to authenticated using (public.is_staff(auth.uid()));

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, description text,
  discount_type text not null default 'percent' check (discount_type in ('percent','flat')),
  value numeric not null, min_order numeric not null default 0, max_discount numeric,
  is_active boolean not null default true, expires_at timestamptz
);
grant select on public.coupons to anon, authenticated;
grant insert, update, delete on public.coupons to authenticated;
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;
create policy "public read active coupons" on public.coupons for select using (is_active or public.has_role(auth.uid(),'owner'));
create policy "owner manage coupons" on public.coupons for all to authenticated using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number serial,
  user_id uuid not null,
  order_type order_type not null, status order_status not null default 'placed',
  payment_method payment_method not null, payment_status text not null default 'pending',
  table_id uuid references public.dining_tables(id), address jsonb, distance_km numeric,
  subtotal numeric not null, delivery_fee numeric not null default 0, tax numeric not null default 0,
  discount numeric not null default 0, total numeric not null, coupon_code text,
  instructions text, customer_name text, customer_phone text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "staff update orders" on public.orders for update to authenticated using (public.is_staff(auth.uid()));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid, name text not null, unit_price numeric not null, quantity int not null,
  addons jsonb not null default '[]', line_total numeric not null, notes text
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "order items read" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff(auth.uid()))));


alter publication supabase_realtime add table public.orders;

insert into public.categories(name, sort_order) values ('Starters',1),('Main Course',2),('Breads',3),('Rice',4),('Chinese',5),('Beverages',6),('Desserts',7);
insert into public.menu_items(category_id,name,description,price,discount_price,is_veg,is_bestseller,is_recommended,is_spicy,keywords,addons)
select c.id, v.n, v.d, v.p, v.dp, v.veg, v.bs, v.rec, v.sp, v.kw, v.ad::jsonb from (values
 ('Starters','Paneer Tikka','Cottage cheese cubes marinated in smoked yoghurt and charred in the tandoor.',289,249,true,true,true,true,'tandoor grill','[{"name":"Extra mint chutney","price":20}]'),
 ('Starters','Chicken Seekh Kebab','Minced chicken skewers with fresh herbs and Uncle''s spice blend.',329,null,false,true,false,true,'kebab tandoor','[{"name":"Extra onion salad","price":15}]'),
 ('Main Course','Butter Chicken','Tandoori chicken simmered in a velvety tomato-butter gravy.',379,339,false,true,true,false,'murgh makhani curry','[{"name":"Extra gravy","price":60}]'),
 ('Main Course','Dal Makhani','Black lentils slow-cooked overnight with cream and butter.',259,null,true,true,true,false,'lentil curry','[]'),
 ('Main Course','Kadhai Paneer','Paneer tossed with peppers, onions and freshly ground kadhai masala.',299,null,true,false,false,true,'curry','[]'),
 ('Breads','Butter Naan','Soft leavened bread from the tandoor, brushed with butter.',59,null,true,true,false,false,'roti','[{"name":"Garlic","price":15}]'),
 ('Breads','Laccha Paratha','Flaky layered whole-wheat flatbread.',69,null,true,false,false,false,'roti','[]'),
 ('Rice','Chicken Dum Biryani','Fragrant basmati and tender chicken sealed and slow-cooked.',349,319,false,true,true,true,'biryani rice','[{"name":"Extra raita","price":40}]'),
 ('Rice','Jeera Rice','Basmati rice tempered with cumin and ghee.',169,null,true,false,false,false,'rice','[]'),
 ('Chinese','Veg Hakka Noodles','Wok-tossed noodles with crunchy vegetables.',219,null,true,false,true,false,'noodles chowmein','[]'),
 ('Chinese','Chilli Chicken','Crispy chicken tossed in a fiery soy-chilli glaze.',299,null,false,true,false,true,'indo chinese','[]'),
 ('Beverages','Sweet Lassi','Chilled churned yoghurt, lightly sweetened.',99,null,true,false,true,false,'drink','[]'),
 ('Beverages','Masala Chai','Spiced Indian tea brewed with milk.',49,null,true,false,false,false,'tea drink','[]'),
 ('Desserts','Gulab Jamun','Warm milk dumplings soaked in rose-cardamom syrup.',109,null,true,true,false,false,'sweet','[]'),
 ('Desserts','Rasmalai','Soft cottage cheese discs in saffron milk.',139,null,true,false,true,false,'sweet','[]')
) as v(cat,n,d,p,dp,veg,bs,rec,sp,kw,ad) join public.categories c on c.name=v.cat;
insert into public.dining_tables(table_number) values ('1'),('2'),('3'),('4'),('5'),('6');
insert into public.coupons(code,description,discount_type,value,min_order,max_discount) values ('UNCLE20','20% off up to ₹100','percent',20,299,100),('FLAT50','₹50 off on ₹399+','flat',50,399,null);

-- Owner-only role management. The UI never receives auth passwords; role changes happen through
-- security-definer functions that validate the caller is an owner.
create or replace function public.admin_list_users()
returns table(user_id uuid, email text, full_name text, phone text, roles public.app_role[])
language sql stable security definer set search_path = public
as $$
  select p.id, u.email, p.full_name, p.phone,
         coalesce(array_agg(ur.role) filter (where ur.role is not null), '{}'::public.app_role[])
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.user_roles ur on ur.user_id = p.id
  where public.has_role(auth.uid(), 'owner')
  group by p.id, u.email, p.full_name, p.phone
  order by lower(coalesce(p.full_name, u.email, p.id::text));
$$;
grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_set_user_role(_user_id uuid, _role public.app_role)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  owner_count integer;
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only an owner can assign roles';
  end if;
  if not exists (select 1 from auth.users where id = _user_id) then
    raise exception 'User not found';
  end if;
  if _role = 'customer' and public.has_role(_user_id, 'owner') then
    select count(*) into owner_count from public.user_roles where role = 'owner';
    if owner_count <= 1 then
      raise exception 'The restaurant must always have at least one owner';
    end if;
  end if;
  delete from public.user_roles where user_id = _user_id;
  insert into public.user_roles(user_id, role) values (_user_id, _role);
  return true;
end;
$$;
grant execute on function public.admin_set_user_role(uuid, public.app_role) to authenticated;
