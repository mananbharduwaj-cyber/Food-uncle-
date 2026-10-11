-- Food Uncle order workflow and legacy-column compatibility follow-up.
-- Keeps existing data and allows customer orders after the compatibility trigger maps pending -> placed.
DROP POLICY IF EXISTS "Customers create own orders" ON public.orders;
CREATE POLICY "Customers create own orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND user_id = auth.uid()
    AND status IN ('placed','pending')
    AND payment_status = 'pending'
    AND delivery_boy_id IS NULL
    AND delivery_partner_id IS NULL
  );

DROP POLICY IF EXISTS "Customers add own order items" ON public.order_items;
CREATE POLICY "Customers add own order items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
        AND o.status IN ('placed','pending')
    )
  );

DROP POLICY IF EXISTS "Delivery partners update assigned orders" ON public.orders;
CREATE POLICY "Delivery partners update assigned orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    delivery_partner_id = auth.uid()
    OR delivery_boy_id = auth.uid()
  )
  WITH CHECK (
    delivery_partner_id = auth.uid()
    OR delivery_boy_id = auth.uid()
  );

DROP POLICY IF EXISTS "Delivery partners update assigned order items" ON public.order_items;
CREATE POLICY "Delivery partners update assigned order items" ON public.order_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.delivery_partner_id = auth.uid() OR o.delivery_boy_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.delivery_partner_id = auth.uid() OR o.delivery_boy_id = auth.uid())
    )
  );

-- Preserve legacy menu category text while linking items to normalized categories.
UPDATE public.menu_items mi
SET category_id = c.id
FROM public.categories c
WHERE mi.category_id IS NULL
  AND mi.category IS NOT NULL
  AND lower(trim(mi.category)) = lower(trim(c.name));
