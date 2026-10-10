// Pure pricing rules shared by the browser (preview) and the server (authoritative).

export type Slab = { upto_km: number; fee: number };
export type PricingSettings = {
  delivery_radius_km: number;
  allow_outside_radius: boolean;
  min_order_value: number;
  free_delivery_above: number;
  flat_delivery_fee: number;
  distance_fee_slabs: Slab[];
  tax_percent: number;
};
export type Coupon = {
  code: string;
  discount_type: string;
  value: number;
  min_order: number;
  max_discount: number | null;
  is_active: boolean;
  expires_at: string | null;
};

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function isDeliverable(s: PricingSettings, km: number) {
  return km <= Number(s.delivery_radius_km) || s.allow_outside_radius;
}

export function deliveryFee(s: PricingSettings, subtotal: number, km: number | null) {
  if (subtotal >= Number(s.free_delivery_above)) return 0;
  if (km != null) {
    const slabs = [...(s.distance_fee_slabs ?? [])].sort((a, b) => a.upto_km - b.upto_km);
    const slab = slabs.find((sl) => km <= sl.upto_km);
    if (slab) return Number(slab.fee);
  }
  return Number(s.flat_delivery_fee);
}

export function couponDiscount(c: Coupon | null, subtotal: number, now = new Date()) {
  if (!c || !c.is_active) return { discount: 0, error: c ? "Coupon is not active" : null };
  if (c.expires_at && new Date(c.expires_at) < now) return { discount: 0, error: "Coupon has expired" };
  if (subtotal < Number(c.min_order))
    return { discount: 0, error: `Add items worth ₹${c.min_order} to use this coupon` };
  let d = c.discount_type === "percent" ? (subtotal * Number(c.value)) / 100 : Number(c.value);
  if (c.max_discount != null) d = Math.min(d, Number(c.max_discount));
  return { discount: Math.round(Math.min(d, subtotal)), error: null };
}

export function computeTotals(opts: {
  settings: PricingSettings;
  subtotal: number;
  orderType: "delivery" | "dine_in" | "takeaway";
  km: number | null;
  coupon: Coupon | null;
}) {
  const { settings, subtotal, orderType, km, coupon } = opts;
  const { discount, error: couponError } = couponDiscount(coupon, subtotal);
  const fee = orderType === "delivery" ? deliveryFee(settings, subtotal, km) : 0;
  const tax = Math.round(((subtotal - discount) * Number(settings.tax_percent)) / 100);
  return { subtotal, discount, couponError, deliveryFee: fee, tax, total: subtotal - discount + fee + tax };
}
