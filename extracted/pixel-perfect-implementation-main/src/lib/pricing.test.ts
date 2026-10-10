import { describe, expect, it } from "vitest";
import { computeTotals, couponDiscount, deliveryFee, isDeliverable, type PricingSettings } from "./pricing";

const s: PricingSettings = {
  delivery_radius_km: 3,
  allow_outside_radius: false,
  min_order_value: 149,
  free_delivery_above: 499,
  flat_delivery_fee: 30,
  distance_fee_slabs: [
    { upto_km: 2, fee: 20 },
    { upto_km: 3, fee: 35 },
  ],
  tax_percent: 5,
};

describe("delivery rules", () => {
  it("blocks delivery beyond the 3 km radius", () => {
    expect(isDeliverable(s, 3.2)).toBe(false);
    expect(isDeliverable(s, 2.9)).toBe(true);
  });
  it("radius is configurable", () => {
    expect(isDeliverable({ ...s, delivery_radius_km: 5 }, 4.5)).toBe(true);
  });
  it("uses distance slabs", () => {
    expect(deliveryFee(s, 300, 1.5)).toBe(20);
    expect(deliveryFee(s, 300, 2.5)).toBe(35);
  });
  it("free delivery above threshold", () => {
    expect(deliveryFee(s, 500, 2.5)).toBe(0);
  });
});

describe("coupons", () => {
  const c = { code: "UNCLE20", discount_type: "percent", value: 20, min_order: 299, max_discount: 100, is_active: true, expires_at: null };
  it("caps percent discount", () => expect(couponDiscount(c, 1000).discount).toBe(100));
  it("enforces min order", () => expect(couponDiscount(c, 200).discount).toBe(0));
  it("dine-in has no delivery fee", () => {
    expect(computeTotals({ settings: s, subtotal: 300, orderType: "dine_in", km: null, coupon: null }).deliveryFee).toBe(0);
  });
});
