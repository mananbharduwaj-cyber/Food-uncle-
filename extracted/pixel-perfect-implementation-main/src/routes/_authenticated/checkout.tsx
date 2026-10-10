import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { price, settingsQuery } from "@/lib/data";
import { computeTotals, distanceKm, isDeliverable, type PricingSettings } from "@/lib/pricing";
import { placeOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Food Uncle" }, { name: "description", content: "Complete your Food Uncle order." }, { property: "og:title", content: "Checkout — Food Uncle" }, { property: "og:description", content: "Complete your order." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: Checkout,
});

type OrderType = "delivery" | "dine_in" | "takeaway";

function Checkout() {
  const { user } = Route.useRouteContext();
  const { data: s } = useSuspenseQuery(settingsQuery);
  const { lines, subtotal, table, clear } = useCart();
  const qc = useQueryClient();
  const nav = useNavigate();
  const place = useServerFn(placeOrder);
  const [type, setType] = useState<OrderType>(table ? "dine_in" : s.delivery_enabled ? "delivery" : "takeaway");
  const [addressId, setAddressId] = useState<string>();
  const pay: "cod" = "cod";
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<any>(null);
  const [instructions, setInstructions] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const addresses = useQuery({
    queryKey: ["addresses", user.id],
    queryFn: async () => (await supabase.from("addresses").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const addr = addresses.data?.find((a) => a.id === addressId) ?? null;
  const km = addr?.lat != null && addr?.lng != null ? distanceKm(s.lat, s.lng, addr.lat, addr.lng) : null;
  const ps = s as unknown as PricingSettings;
  const outside = type === "delivery" && km != null && !isDeliverable(ps, km);
  const totals = useMemo(() => computeTotals({ settings: ps, subtotal, orderType: type, km, coupon }), [ps, subtotal, type, km, coupon]);
  const belowMin = type === "delivery" && subtotal < Number(s.min_order_value);

  if (!lines.length) return <AppShell title="Checkout"><p className="px-5 pt-4 text-muted-foreground">Your cart is empty. <Link to="/menu" className="text-primary">Browse menu</Link></p></AppShell>;

  const applyCoupon = async () => {
    const { data } = await supabase.from("coupons").select("*").ilike("code", couponInput.trim()).maybeSingle();
    if (!data) { toast.error("Invalid coupon code"); return; }
    const t = computeTotals({ settings: ps, subtotal, orderType: type, km, coupon: data });
    if (t.couponError) { toast.error(t.couponError); return; }
    setCoupon(data);
    toast.success(`Saved ${price(t.discount)}`);
  };

  const submit = async () => {
    if (type === "delivery" && !addr) { toast.error("Please select a delivery address"); return; }
    if (type !== "delivery" && !phone) { toast.error("Please add your phone number"); return; }
    setBusy(true);
    try {
      const r = await place({
        data: {
          orderType: type,
          paymentMethod: pay,
          items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, addons: l.addons, notes: l.notes })),
          addressId: type === "delivery" ? addressId : undefined,
          tableId: type === "dine_in" ? table?.id : undefined,
          couponCode: coupon?.code,
          instructions: instructions || undefined,
          customerName: type !== "delivery" ? name || undefined : undefined,
          customerPhone: type !== "delivery" ? phone : undefined,
        },
      });
      clear();
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order placed!");
      nav({ to: "/orders/$id", params: { id: r.orderId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place order");
    } finally {
      setBusy(false);
    }
  };

  const types: { k: OrderType; label: string; show: boolean }[] = [
    { k: "delivery", label: "Delivery", show: s.delivery_enabled },
    { k: "takeaway", label: "Takeaway", show: true },
    { k: "dine_in", label: table ? `Table ${table.number}` : "Dine-in", show: !!table },
  ];
  const card = "mx-5 mt-4 rounded-2xl bg-card p-4 shadow-soft";
  return (
    <AppShell title="Checkout" hideCartBar>
      {!s.is_open && <p className="mx-5 mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">The restaurant is closed right now. Orders can’t be placed.</p>}
      <div className={card}>
        <h2 className="font-sans text-sm font-semibold text-muted-foreground">How would you like it?</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {types.filter((t) => t.show).map((t) => (
            <button key={t.k} onClick={() => setType(t.k)} className={`rounded-xl border py-2.5 text-sm font-semibold ${type === t.k ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{t.label}</button>
          ))}
        </div>
      </div>

      {type === "delivery" ? (
        <div className={card}>
          <h2 className="font-sans text-sm font-semibold text-muted-foreground">Deliver to</h2>
          {addresses.isLoading && <p className="mt-2 text-sm">Loading addresses…</p>}
          <div className="mt-2 space-y-2">
            {addresses.data?.map((a) => (
              <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${addressId === a.id ? "border-primary" : "border-border"}`}>
                <input type="radio" className="accent-primary" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                <span><b>{a.name}</b> · {a.phone}<br />{a.house}, {a.street}, {a.city} {a.pincode}</span>
              </label>
            ))}
          </div>
          {outside && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">Sorry, delivery is currently unavailable at this location.</p>}
          {showAdd ? <AddressForm userId={user.id} onDone={(id) => { setShowAdd(false); addresses.refetch(); setAddressId(id); }} /> : (
            <button onClick={() => setShowAdd(true)} className="mt-3 text-sm font-semibold text-primary">+ Add new address</button>
          )}
        </div>
      ) : (
        <div className={card}>
          <h2 className="font-sans text-sm font-semibold text-muted-foreground">Your details</h2>
          <div className="mt-2 grid gap-2">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
      )}

      <div className={card}>
        <h2 className="font-sans text-sm font-semibold text-muted-foreground">Payment</h2>
        <div className="mt-2 space-y-2 text-sm">
          <label className="flex items-center gap-3 rounded-xl border border-primary bg-primary/5 p-3">
            <input type="radio" className="accent-primary" checked readOnly />
            {type === "delivery" ? "Cash on delivery" : "Cash"}
          </label>
          <p className="text-xs text-muted-foreground">Online payment will be available after the owner connects a Razorpay account.</p>
        </div>
      </div>

      <div className={card}>
        <div className="flex gap-2">
          <Input placeholder="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} />
          {coupon ? <Button variant="outline" onClick={() => { setCoupon(null); setCouponInput(""); }}>Remove</Button> : <Button variant="outline" onClick={applyCoupon} disabled={!couponInput}>Apply</Button>}
        </div>
        <Textarea className="mt-3" placeholder="Instructions for the kitchen (optional)" maxLength={500} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </div>

      <div className={`${card} space-y-1.5 text-sm`}>
        <Row k="Item total" v={price(totals.subtotal)} />
        {totals.discount > 0 && <Row k={`Coupon ${coupon?.code}`} v={`−${price(totals.discount)}`} />}
        {type === "delivery" && <Row k={`Delivery fee${km != null ? ` (${km.toFixed(1)} km)` : ""}`} v={totals.deliveryFee === 0 ? "Free" : price(totals.deliveryFee)} />}
        <Row k={`Taxes (${s.tax_percent}%)`} v={price(totals.tax)} />
        <div className="border-t border-border pt-2"><Row k={<b>To pay</b>} v={<b>{price(totals.total)}</b>} /></div>
        {belowMin && <p className="text-xs text-destructive">Minimum order for delivery is {price(s.min_order_value)}.</p>}
        {type === "delivery" && totals.deliveryFee > 0 && <p className="text-xs text-muted-foreground">Free delivery above {price(s.free_delivery_above)}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card p-4">
        <Button className="mx-auto flex h-12 w-full max-w-2xl text-base" disabled={busy || !s.is_open || outside || belowMin} onClick={submit}>
          {busy ? "Placing order…" : `Place order · ${price(totals.total)}`}
        </Button>
      </div>
    </AppShell>
  );
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span>{v}</span></div>;
}

export function AddressForm({ userId, onDone }: { userId: string; onDone: (id: string) => void }) {
  const [f, setF] = useState({ name: "", phone: "", house: "", street: "", landmark: "", city: "", pincode: "" });
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const locate = () => {
    if (!navigator.geolocation) { toast.error("Location isn't available on this device"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success("Location captured"); },
      () => toast.error("Couldn't get your location. Please allow location access."),
    );
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loc) { toast.error("Please tap ‘Use my location’ so we can check delivery distance"); return; }
    setBusy(true);
    const { data, error } = await supabase.from("addresses").insert({ ...f, user_id: userId, lat: loc.lat, lng: loc.lng }).select("id").single();
    setBusy(false);
    if (error) { toast.error("Couldn't save address"); return; }
    onDone(data.id);
  };
  return (
    <form onSubmit={save} className="mt-3 grid grid-cols-2 gap-2">
      <Input className="col-span-1" placeholder="Name" required maxLength={80} value={f.name} onChange={set("name")} />
      <Input className="col-span-1" placeholder="Phone" required inputMode="tel" maxLength={15} value={f.phone} onChange={set("phone")} />
      <Input className="col-span-2" placeholder="House / Flat" required value={f.house} onChange={set("house")} />
      <Input className="col-span-2" placeholder="Street" required value={f.street} onChange={set("street")} />
      <Input className="col-span-2" placeholder="Landmark (optional)" value={f.landmark} onChange={set("landmark")} />
      <Input placeholder="City" required value={f.city} onChange={set("city")} />
      <Input placeholder="Pincode" required inputMode="numeric" maxLength={6} value={f.pincode} onChange={set("pincode")} />
      <Button type="button" variant="outline" className="col-span-2" onClick={locate}>
        <MapPin className="mr-1 h-4 w-4" /> {loc ? "Location set ✓" : "Use my location"}
      </Button>
      <Button className="col-span-2" disabled={busy}>{busy ? "Saving…" : "Save address"}</Button>
    </form>
  );
}
