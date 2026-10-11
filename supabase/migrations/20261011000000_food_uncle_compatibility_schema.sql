-- Food Uncle compatibility schema migration.
-- Additive and non-destructive: existing rows and tables are retained.
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('customer','owner','manager','delivery_partner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  house text NOT NULL,
  street text NOT NULL,
  city text NOT NULL,
  pincode text NOT NULL,
  landmark text,
  lat double precision,
  lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','flat')),
  value numeric NOT NULL DEFAULT 0 CHECK (value >= 0),
  min_order numeric NOT NULL DEFAULT 0 CHECK (min_order >= 0),
  max_discount numeric,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.dining_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text NOT NULL DEFAULT 'Food Uncle',
  tagline text DEFAULT 'Good food. Good mood.',
  announcement text,
  phone text,
  address text,
  lat double precision NOT NULL DEFAULT 28.7300,
  lng double precision NOT NULL DEFAULT 77.7750,
  is_open boolean NOT NULL DEFAULT true,
  delivery_enabled boolean NOT NULL DEFAULT true,
  delivery_radius_km numeric NOT NULL DEFAULT 3 CHECK (delivery_radius_km >= 0),
  allow_outside_radius boolean NOT NULL DEFAULT false,
  flat_delivery_fee numeric NOT NULL DEFAULT 0 CHECK (flat_delivery_fee >= 0),
  free_delivery_above numeric NOT NULL DEFAULT 0 CHECK (free_delivery_above >= 0),
  distance_fee_slabs jsonb NOT NULL DEFAULT '[]'::jsonb,
  min_order_value numeric NOT NULL DEFAULT 0 CHECK (min_order_value >= 0),
  online_payments_enabled boolean NOT NULL DEFAULT false,
  prep_time_minutes integer NOT NULL DEFAULT 25 CHECK (prep_time_minutes >= 0),
  tax_percent numeric NOT NULL DEFAULT 0 CHECK (tax_percent >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'customer',
  UNIQUE (user_id, role)
);

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS discount_price numeric,
  ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_recommended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_spicy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_veg boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS keywords text,
  ADD COLUMN IF NOT EXISTS prep_time_minutes integer;
DO $$ BEGIN
  ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_number bigint,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS address jsonb,
  ADD COLUMN IF NOT EXISTS table_id uuid REFERENCES public.dining_tables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distance_km numeric,
  ADD COLUMN IF NOT EXISTS delivery_partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_payment_received boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE SEQUENCE IF NOT EXISTS public.orders_order_number_seq;
ALTER SEQUENCE public.orders_order_number_seq OWNED BY public.orders.order_number;
ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT nextval('public.orders_order_number_seq');
UPDATE public.orders SET order_number = nextval('public.orders_order_number_seq') WHERE order_number IS NULL;
UPDATE public.orders SET user_id = customer_id WHERE user_id IS NULL;
UPDATE public.orders SET total = total_amount, subtotal = total_amount WHERE total = 0 AND total_amount > 0;
UPDATE public.orders SET status = 'placed' WHERE status = 'pending';
UPDATE public.orders SET order_type = 'dine_in' WHERE order_type = 'table';

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('placed','pending','accepted','preparing','ready','out_for_delivery','served','delivered','completed','cancelled','rejected'));
ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check
  CHECK (order_type IN ('delivery','table','dine_in','takeaway'));
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cod','pay_at_counter','online'));
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'placed';
ALTER TABLE public.orders ALTER COLUMN order_type SET DEFAULT 'delivery';

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS line_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text;
UPDATE public.order_items SET name = item_name WHERE name IS NULL;
UPDATE public.order_items SET line_total = unit_price * quantity WHERE line_total = 0;

CREATE OR REPLACE FUNCTION public.food_uncle_sync_order_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, auth AS $$
BEGIN
  NEW.user_id := COALESCE(NEW.user_id, NEW.customer_id, auth.uid());
  NEW.customer_id := COALESCE(NEW.customer_id, NEW.user_id, auth.uid());
  NEW.total := COALESCE(NEW.total, NEW.total_amount, 0);
  NEW.total_amount := COALESCE(NEW.total_amount, NEW.total, 0);
  NEW.subtotal := COALESCE(NEW.subtotal, NEW.total, NEW.total_amount, 0);
  NEW.delivery_partner_id := COALESCE(NEW.delivery_partner_id, NEW.delivery_boy_id);
  NEW.delivery_boy_id := COALESCE(NEW.delivery_boy_id, NEW.delivery_partner_id);
  IF NEW.order_type = 'table' THEN NEW.order_type := 'dine_in'; END IF;
  IF NEW.status = 'pending' THEN NEW.status := 'placed'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS food_uncle_sync_order_fields_trigger ON public.orders;
CREATE TRIGGER food_uncle_sync_order_fields_trigger
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.food_uncle_sync_order_fields();

CREATE OR REPLACE FUNCTION public.food_uncle_sync_order_item_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.name := COALESCE(NEW.name, NEW.item_name);
  NEW.item_name := COALESCE(NEW.item_name, NEW.name);
  NEW.line_total := COALESCE(NEW.line_total, NEW.unit_price * NEW.quantity);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS food_uncle_sync_order_item_fields_trigger ON public.order_items;
CREATE TRIGGER food_uncle_sync_order_item_fields_trigger
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.food_uncle_sync_order_item_fields();

CREATE OR REPLACE FUNCTION public.has_app_role(allowed_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = ANY(allowed_roles)
  );
$$;
REVOKE ALL ON FUNCTION public.has_app_role(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_app_role(text[]) TO authenticated;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active categories" ON public.categories;
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT TO anon, authenticated USING (is_active OR public.has_app_role(ARRAY['owner','manager']));
DROP POLICY IF EXISTS "Staff manage categories" ON public.categories;
CREATE POLICY "Staff manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_app_role(ARRAY['owner','manager'])) WITH CHECK (public.has_app_role(ARRAY['owner','manager']));

DROP POLICY IF EXISTS "Users manage own addresses" ON public.addresses;
CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Public read active coupons" ON public.coupons;
CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT TO anon, authenticated USING (is_active AND (expires_at IS NULL OR expires_at > now()));
DROP POLICY IF EXISTS "Staff manage coupons" ON public.coupons;
CREATE POLICY "Staff manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.has_app_role(ARRAY['owner','manager'])) WITH CHECK (public.has_app_role(ARRAY['owner','manager']));

DROP POLICY IF EXISTS "Public read active dining tables" ON public.dining_tables;
CREATE POLICY "Public read active dining tables" ON public.dining_tables FOR SELECT TO anon, authenticated USING (is_active OR public.has_app_role(ARRAY['owner','manager']));
DROP POLICY IF EXISTS "Staff manage dining tables" ON public.dining_tables;
CREATE POLICY "Staff manage dining tables" ON public.dining_tables FOR ALL TO authenticated USING (public.has_app_role(ARRAY['owner','manager'])) WITH CHECK (public.has_app_role(ARRAY['owner','manager']));

DROP POLICY IF EXISTS "Public read restaurant settings" ON public.restaurant_settings;
CREATE POLICY "Public read restaurant settings" ON public.restaurant_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Staff update restaurant settings" ON public.restaurant_settings;
CREATE POLICY "Staff update restaurant settings" ON public.restaurant_settings FOR UPDATE TO authenticated USING (public.has_app_role(ARRAY['owner','manager'])) WITH CHECK (public.has_app_role(ARRAY['owner','manager']));
DROP POLICY IF EXISTS "Staff insert restaurant settings" ON public.restaurant_settings;
CREATE POLICY "Staff insert restaurant settings" ON public.restaurant_settings FOR INSERT TO authenticated WITH CHECK (public.has_app_role(ARRAY['owner','manager']));

DROP POLICY IF EXISTS "Users read own roles or staff" ON public.user_roles;
CREATE POLICY "Users read own roles or staff" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_app_role(ARRAY['owner']));
DROP POLICY IF EXISTS "Owners manage roles" ON public.user_roles;
CREATE POLICY "Owners manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_app_role(ARRAY['owner'])) WITH CHECK (public.has_app_role(ARRAY['owner']));

GRANT SELECT ON public.categories, public.coupons, public.dining_tables, public.restaurant_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories, public.coupons, public.dining_tables, public.restaurant_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses, public.user_roles TO authenticated;

INSERT INTO public.categories (name, sort_order) VALUES
  ('Starters', 1), ('Main Course', 2), ('Rice & Biryani', 3), ('Desserts', 4), ('Beverages', 5)
ON CONFLICT (name) DO NOTHING;
INSERT INTO public.restaurant_settings (id, name, tagline, delivery_enabled, delivery_radius_km, online_payments_enabled)
VALUES (1, 'Food Uncle', 'Good food. Good mood.', true, 3, false)
ON CONFLICT (id) DO NOTHING;
