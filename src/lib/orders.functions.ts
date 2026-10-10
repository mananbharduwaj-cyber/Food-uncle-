import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeTotals, distanceKm, isDeliverable, type PricingSettings } from "./pricing";

const schema = z.object({
  orderType: z.enum(["delivery", "dine_in", "takeaway"]),
  paymentMethod: z.enum(["cod", "pay_at_counter", "online"]),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
        addons: z.array(z.string().max(100)).max(10),
        notes: z.string().max(300).optional(),
      }),
    )
    .min(1)
    .max(50),
  addressId: z.string().uuid().optional(),
  tableId: z.string().uuid().optional(),
  couponCode: z.string().max(40).optional(),
  instructions: z.string().max(500).optional(),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(20).optional(),
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: settings } = await sb.from("restaurant_settings").select("*").eq("id", 1).single();
    if (!settings) throw new Error("Restaurant settings unavailable");
    if (!settings.is_open) throw new Error("Sorry, the restaurant is closed right now.");
    if (data.paymentMethod === "online" && !settings.online_payments_enabled)
      throw new Error("Online payment is not available yet. Please choose cash.");

    const ids = data.items.map((i) => i.menuItemId);
    const { data: menu } = await sb.from("menu_items").select("*").in("id", ids);
    const lines = data.items.map((i) => {
      const m = menu?.find((x) => x.id === i.menuItemId);
      if (!m || !m.is_available) throw new Error(`${m?.name ?? "An item"} is no longer available`);
      const addonList = (m.addons as { name: string; price: number }[]).filter((a) => i.addons.includes(a.name));
      const unit = Number(m.discount_price ?? m.price) + addonList.reduce((s, a) => s + Number(a.price), 0);
      return { menu_item_id: m.id, name: m.name, unit_price: unit, quantity: i.quantity, addons: addonList, line_total: unit * i.quantity, notes: i.notes ?? null };
    });
    const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
    if (data.orderType === "delivery" && subtotal < Number(settings.min_order_value))
      throw new Error(`Minimum order for delivery is ₹${settings.min_order_value}`);

    let address: Record<string, unknown> | null = null;
    let km: number | null = null;
    if (data.orderType === "delivery") {
      if (!settings.delivery_enabled) throw new Error("Delivery is currently unavailable.");
      if (!data.addressId) throw new Error("Please select a delivery address");
      const { data: addr } = await sb.from("addresses").select("*").eq("id", data.addressId).eq("user_id", context.userId).single();
      if (!addr) throw new Error("Address not found");
      if (addr.lat == null || addr.lng == null) throw new Error("Please set the location on your address");
      km = distanceKm(settings.lat, settings.lng, addr.lat, addr.lng);
      if (!isDeliverable(settings as unknown as PricingSettings, km))
        throw new Error("Sorry, delivery is currently unavailable at this location.");
      address = addr;
    }
    if (data.orderType === "dine_in") {
      if (!data.tableId) throw new Error("Table not identified. Please scan the table QR again.");
      const { data: t } = await sb.from("dining_tables").select("id,is_active").eq("id", data.tableId).single();
      if (!t?.is_active) throw new Error("This table is not accepting orders");
    }

    let coupon = null;
    if (data.couponCode) {
      const { data: c } = await sb.from("coupons").select("*").ilike("code", data.couponCode).maybeSingle();
      if (!c) throw new Error("Invalid coupon code");
      coupon = c;
    }
    const totals = computeTotals({ settings: settings as unknown as PricingSettings, subtotal, orderType: data.orderType, km, coupon });
    if (totals.couponError) throw new Error(totals.couponError);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId,
        order_type: data.orderType,
        payment_method: data.paymentMethod,
        table_id: data.tableId ?? null,
        address: address as never,
        distance_km: km,
        subtotal,
        delivery_fee: totals.deliveryFee,
        tax: totals.tax,
        discount: totals.discount,
        total: totals.total,
        coupon_code: coupon?.code ?? null,
        instructions: data.instructions ?? null,
        customer_name: data.customerName ?? (address?.["name"] as string) ?? null,
        customer_phone: data.customerPhone ?? (address?.["phone"] as string) ?? null,
      })
      .select("id")
      .single();
    if (error || !order) {
      console.error(error);
      throw new Error("Could not place order. Please try again.");
    }
    const { error: e2 } = await supabaseAdmin.from("order_items").insert(lines.map((l) => ({ ...l, order_id: order.id, addons: l.addons as never })));
    if (e2) {
      console.error(e2);
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error("Could not place order. Please try again.");
    }
    return { orderId: order.id };
  });
