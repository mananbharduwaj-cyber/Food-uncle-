import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { ArrowLeft, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { flowFor, menuQuery, price, settingsQuery, STATUS_LABEL, useRoles } from "@/lib/data";
import { canAccessAdmin, homeForRoles } from "@/lib/role-access";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Dashboard — Food Uncle" }, { name: "description", content: "Manage Food Uncle orders, menu and settings." }, { property: "og:title", content: "Dashboard — Food Uncle" }, { property: "og:description", content: "Restaurant dashboard." }] }),
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (error) throw error;
    const roles = (data ?? []).map((r) => r.role);
    if (!canAccessAdmin(roles)) throw redirect({ to: homeForRoles(roles) });
  },
  component: Admin,
});

function Admin() {
  const { user } = Route.useRouteContext();
  const roles = useRoles(user.id);
  if (roles.isLoading) return <p className="p-6 text-muted-foreground">Loading…</p>;
  const isOwner = roles.data?.includes("owner");
  const isStaff = isOwner || roles.data?.includes("manager");
  if (!isStaff) return <p className="p-6">You don't have access to this page. <Link to="/" className="text-primary">Go home</Link></p>;
  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <div className="flex items-center gap-3">
        <Link to="/profile" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-semibold">Food Uncle dashboard</h1>
      </div>
      <Tabs defaultValue="orders" className="mt-4">
        <TabsList className="flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          {isOwner && <TabsTrigger value="tables">Tables & QR</TabsTrigger>}
          {isOwner && <TabsTrigger value="coupons">Coupons</TabsTrigger>}
          {isOwner && <TabsTrigger value="settings">Settings</TabsTrigger>}
          {isOwner && <TabsTrigger value="users">Users & Roles</TabsTrigger>}
        </TabsList>
        <TabsContent value="orders"><OrdersBoard isOwner={!!isOwner} /></TabsContent>
        <TabsContent value="menu"><MenuAdmin isOwner={!!isOwner} /></TabsContent>
        {isOwner && <TabsContent value="tables"><TablesAdmin /></TabsContent>}
        {isOwner && <TabsContent value="coupons"><CouponsAdmin /></TabsContent>}
        {isOwner && <TabsContent value="settings"><SettingsAdmin /></TabsContent>}
        {isOwner && <TabsContent value="users"><UsersRolesAdmin /></TabsContent>}
      </Tabs>
    </div>
  );
}

function OrdersBoard({ isOwner }: { isOwner: boolean }) {
  const [filter, setFilter] = useState<"active" | "done">("active");
  const q = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(name,quantity,addons,notes), dining_tables(table_number)").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  useEffect(() => {
    const ch = supabase.channel("admin-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
      if (p.eventType === "INSERT") toast("New order received 🔔");
      if (p.eventType === "UPDATE" && (p.new as any)?.delivery_payment_received) toast.success("Delivery completed — payment received");
      q.refetch();
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  const deliveryUsers = useQuery({
    queryKey: ["delivery-users"],
    enabled: isOwner,
    queryFn: async () => { const { data, error } = await supabase.rpc("admin_list_users"); if (error) throw error; return (data ?? []).filter((u:any) => (u.roles ?? []).includes("delivery_partner")); },
  });
  const assignDelivery = async (id: string, userId: string) => {
    const { error } = await supabase.from("orders").update({ delivery_partner_id: userId || null, status: userId ? "out_for_delivery" : "ready", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Couldn't assign delivery"); else { toast.success(userId ? "Delivery assigned" : "Delivery unassigned"); q.refetch(); }
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as never, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Couldn't update order"); else q.refetch();
  };
  const done = ["delivered", "completed", "cancelled", "rejected"];
  const list = (q.data ?? []).filter((o) => (filter === "done") === done.includes(o.status));
  return (
    <div>
      <div className="flex gap-2">
        {(["active", "done"] as const).map((f) => <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f === "active" ? "Active" : "Completed"}</Button>)}
      </div>
      {q.isLoading ? <p className="mt-4 text-muted-foreground">Loading…</p> : !list.length ? <p className="mt-6 text-muted-foreground">No orders here.</p> : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {list.map((o) => {
            const flow = flowFor(o.order_type);
            const next = flow[flow.indexOf(o.status) + 1];
            return (
              <div key={o.id} className="rounded-2xl bg-card p-4 shadow-soft">
                <div className="flex justify-between">
                  <p className="font-semibold">#{o.order_number} · {o.order_type === "dine_in" ? `Table ${o.dining_tables?.table_number}` : o.order_type}</p>
                  <span className="text-xs font-semibold text-primary">{STATUS_LABEL[o.status]}</span>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleTimeString()} · {o.customer_name ?? ""} {o.customer_phone ?? ""}</p>
                <ul className="mt-2 text-sm">
                  {o.order_items.map((it, i) => <li key={i}>{it.quantity} × {it.name}{it.notes ? <i className="text-muted-foreground"> — {it.notes}</i> : null}</li>)}
                </ul>
                {o.instructions && <p className="mt-1 text-xs italic">“{o.instructions}”</p>}
                {o.order_type === "delivery" && o.address && <p className="mt-1 text-xs text-muted-foreground">{(o.address as any).house}, {(o.address as any).street}, {(o.address as any).city}</p>}
                {isOwner && o.order_type === "delivery" && !done.includes(o.status) && <select className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={o.delivery_partner_id ?? ""} onChange={e => assignDelivery(o.id, e.target.value)}><option value="">{o.delivery_partner_id ? "Unassign delivery partner" : "Assign delivery partner"}</option>{deliveryUsers.data?.map((u:any)=><option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}</select>}
                <p className="mt-2 text-sm font-semibold">{price(o.total)} · {o.payment_method.replace(/_/g, " ")}</p>
                {!done.includes(o.status) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {next && <Button size="sm" onClick={() => setStatus(o.id, next)}>Mark {(STATUS_LABEL[next] ?? next).toLowerCase()}</Button>}
                    {o.status === "placed" && <Button size="sm" variant="outline" onClick={() => setStatus(o.id, "rejected")}>Reject</Button>}
                    {o.status !== "placed" && <Button size="sm" variant="ghost" onClick={() => setStatus(o.id, "cancelled")}>Cancel</Button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MenuAdmin({ isOwner }: { isOwner: boolean }) {
  const qc = useQueryClient();
  const q = useQuery(menuQuery);
  const [f, setF] = useState({ name: "", description: "", price: "", category_id: "", is_veg: true, image_url: "" });
  const [cat, setCat] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["menu"] });
  const toggle = async (id: string, v: boolean) => { await supabase.from("menu_items").update({ is_available: v }).eq("id", id); refresh(); };
  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("menu_items").insert({ ...f, price: Number(f.price), category_id: f.category_id || null, image_url: f.image_url || null });
    if (error) { toast.error("Couldn't add dish"); return; }
    toast.success("Dish added");
    setF({ name: "", description: "", price: "", category_id: "", is_veg: true, image_url: "" });
    refresh();
  };
  const addCat = async () => {
    if (!cat) return;
    const { error } = await supabase.from("categories").insert({ name: cat, sort_order: (q.data?.categories.length ?? 0) + 1 });
    if (error) { toast.error("Couldn't add category"); return; }
    setCat(""); refresh();
  };
  if (!q.data) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-6">
      {isOwner && (
        <div className="grid gap-4 md:grid-cols-2">
          <form onSubmit={addItem} className="space-y-2 rounded-2xl bg-card p-4 shadow-soft">
            <h3 className="font-semibold">Add dish</h3>
            <Input placeholder="Name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <Input placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            <Input placeholder="Price (₹)" required type="number" min={1} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
            <Input placeholder="Image URL (optional)" value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} />
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
              <option value="">Category…</option>
              {q.data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_veg} onCheckedChange={(v) => setF({ ...f, is_veg: v })} /> Vegetarian</label>
            <Button>Add dish</Button>
          </form>
          <div className="space-y-2 rounded-2xl bg-card p-4 shadow-soft">
            <h3 className="font-semibold">Categories</h3>
            <div className="flex gap-2"><Input placeholder="New category" value={cat} onChange={(e) => setCat(e.target.value)} /><Button type="button" onClick={addCat}>Add</Button></div>
            <div className="flex flex-wrap gap-2">
              {q.data.categories.map((c) => (
                <span key={c.id} className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">
                  {c.name}
                  <Switch checked={c.is_active} onCheckedChange={async (v) => { await supabase.from("categories").update({ is_active: v }).eq("id", c.id); refresh(); }} />
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="divide-y divide-border rounded-2xl bg-card px-4 shadow-soft">
        {q.data.items.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-semibold">{i.name}</p>
              <p className="text-xs text-muted-foreground">{price(i.discount_price ?? i.price)}</p>
            </div>
            <div className="flex items-center gap-3">
              {isOwner && <Label className="flex items-center gap-1 text-xs">Bestseller<Switch checked={i.is_bestseller} onCheckedChange={async (v) => { await supabase.from("menu_items").update({ is_bestseller: v }).eq("id", i.id); refresh(); }} /></Label>}
              <Label className="flex items-center gap-1 text-xs">In stock<Switch checked={i.is_available} onCheckedChange={(v) => toggle(i.id, v)} /></Label>
              {isOwner && <button className="text-xs text-destructive" onClick={async () => { if (confirm(`Delete ${i.name}?`)) { await supabase.from("menu_items").delete().eq("id", i.id); refresh(); } }}>Delete</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TablesAdmin() {
  const q = useQuery({ queryKey: ["tables"], queryFn: async () => (await supabase.from("dining_tables").select("*").order("created_at")).data ?? [] });
  const [num, setNum] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const add = async () => {
    if (!num) return;
    const { error } = await supabase.from("dining_tables").insert({ table_number: num });
    if (error) { toast.error("Table number already exists"); return; }
    setNum(""); q.refetch();
  };
  return (
    <div>
      <div className="flex max-w-sm gap-2"><Input placeholder="Table number" value={num} onChange={(e) => setNum(e.target.value)} /><Button onClick={add}>Add table</Button></div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {q.data?.map((t) => (
          <div key={t.id} className="rounded-2xl bg-card p-4 text-center shadow-soft">
            <QRCodeSVG value={`${origin}/t/${t.id}`} size={120} className="mx-auto" />
            <p className="mt-2 font-semibold">Table {t.table_number}</p>
            <label className="mt-1 flex items-center justify-center gap-2 text-xs">Active <Switch checked={t.is_active} onCheckedChange={async (v) => { await supabase.from("dining_tables").update({ is_active: v }).eq("id", t.id); q.refetch(); }} /></label>
            <a href={`/t/${t.id}`} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-primary">Open link</a>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Print these codes and place them on each table. Use your browser's print to save them.</p>
    </div>
  );
}

function CouponsAdmin() {
  const q = useQuery({ queryKey: ["coupons-admin"], queryFn: async () => (await supabase.from("coupons").select("*").order("code")).data ?? [] });
  const [f, setF] = useState({ code: "", description: "", discount_type: "percent", value: "", min_order: "0", max_discount: "" });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("coupons").insert({ ...f, code: f.code.toUpperCase(), value: Number(f.value), min_order: Number(f.min_order), max_discount: f.max_discount ? Number(f.max_discount) : null });
    if (error) { toast.error("Couldn't add coupon"); return; }
    setF({ code: "", description: "", discount_type: "percent", value: "", min_order: "0", max_discount: "" }); q.refetch();
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={add} className="space-y-2 rounded-2xl bg-card p-4 shadow-soft">
        <h3 className="font-semibold">New coupon</h3>
        <Input placeholder="CODE" required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        <Input placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={f.discount_type} onChange={(e) => setF({ ...f, discount_type: e.target.value })}>
          <option value="percent">Percent off</option><option value="flat">Flat ₹ off</option>
        </select>
        <Input placeholder="Value" type="number" required value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
        <Input placeholder="Minimum order ₹" type="number" value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} />
        <Input placeholder="Max discount ₹ (optional)" type="number" value={f.max_discount} onChange={(e) => setF({ ...f, max_discount: e.target.value })} />
        <Button>Add coupon</Button>
      </form>
      <div className="space-y-2">
        {q.data?.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-2xl bg-card p-4 text-sm shadow-soft">
            <div><p className="font-semibold">{c.code}</p><p className="text-xs text-muted-foreground">{c.description}</p></div>
            <Switch checked={c.is_active} onCheckedChange={async (v) => { await supabase.from("coupons").update({ is_active: v }).eq("id", c.id); q.refetch(); }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersRolesAdmin() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [saving, setSaving] = useState<string | null>(null);
  const assign = async (userId: string, role: "customer" | "owner" | "manager" | "delivery_partner") => {
    setSaving(userId);
    const { error } = await supabase.rpc("admin_set_user_role", { _user_id: userId, _role: role });
    setSaving(null);
    if (error) { toast.error(error.message || "Couldn't update role"); return; }
    toast.success("Role updated successfully");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["roles"] });
  };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">User & Role Management</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">New sign-ups start as customers. As the owner, assign a user as Delivery Boy, Manager, or Owner. Passwords are never shown here.</p>
      </div>
      {q.isLoading ? <p className="text-muted-foreground">Loading users…</p> : q.error ? <p className="text-sm text-destructive">Couldn’t load users. Check the latest Supabase migration is applied.</p> : (
        <div className="space-y-3">
          {(q.data ?? []).map((u) => {
            const current = u.roles?.[0] ?? "customer";
            return (
              <div key={u.user_id} className="rounded-2xl bg-card p-4 shadow-soft">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{u.full_name || "Unnamed user"}</p>
                    <p className="text-sm text-muted-foreground truncate">{u.email || "No email"}</p>
                    {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">Current role: <span className="font-medium text-foreground">{current === "delivery_partner" ? "Delivery Boy" : current[0].toUpperCase() + current.slice(1)}</span></p>
                  </div>
                  <select
                    aria-label={`Assign role for ${u.email || u.user_id}`}
                    disabled={saving === u.user_id}
                    value={current}
                    onChange={(e) => assign(u.user_id, e.target.value as "customer" | "owner" | "manager" | "delivery_partner")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm md:w-52"
                  >
                    <option value="customer">Customer</option>
                    <option value="delivery_partner">Delivery Boy</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
              </div>
            );
          })}
          {!q.data?.length && <p className="text-sm text-muted-foreground">No registered users yet.</p>}
        </div>
      )}
    </div>
  );
}

function SettingsAdmin() {
  const qc = useQueryClient();
  const q = useQuery(settingsQuery);
  const [s, setS] = useState<any>(null);
  useEffect(() => { if (q.data && !s) setS({ ...q.data, distance_fee_slabs: JSON.stringify(q.data.distance_fee_slabs) }); }, [q.data]);
  if (!s) return <p className="text-muted-foreground">Loading…</p>;
  const save = async () => {
    let slabs;
    try { slabs = JSON.parse(s.distance_fee_slabs); } catch { { toast.error("Distance fees must be valid, e.g. [{\"upto_km\":2,\"fee\":20}]"); return; } }
    const { id, updated_at, ...rest } = s;
    const num = ["prep_time_minutes", "lat", "lng", "delivery_radius_km", "min_order_value", "free_delivery_above", "flat_delivery_fee", "tax_percent"];
    for (const k of num) rest[k] = Number(rest[k]);
    const { error } = await supabase.from("restaurant_settings").update({ ...rest, distance_fee_slabs: slabs, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) { toast.error("Couldn't save settings"); return; }
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["settings"] });
  };
  const field = (k: string, label: string, type = "text") => (
    <label className="block text-sm"><span className="text-muted-foreground">{label}</span>
      <Input type={type} step="any" value={s[k] ?? ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></label>
  );
  const toggle = (k: string, label: string) => (
    <label className="flex items-center justify-between text-sm">{label}<Switch checked={!!s[k]} onCheckedChange={(v) => setS({ ...s, [k]: v })} /></label>
  );
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setS({ ...s, lat: p.coords.latitude, lng: p.coords.longitude }), () => toast.error("Couldn't get location"));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
        <h3 className="font-semibold">Restaurant</h3>
        {toggle("is_open", "Open for orders")}
        {toggle("delivery_enabled", "Delivery available")}
        {field("name", "Name")}{field("tagline", "Tagline")}{field("announcement", "Announcement banner")}
        {field("address", "Address")}{field("phone", "Phone")}{field("prep_time_minutes", "Prep time (min)", "number")}
        <div className="grid grid-cols-2 gap-2">{field("lat", "Latitude", "number")}{field("lng", "Longitude", "number")}</div>
        <Button variant="outline" size="sm" onClick={locate}>Use my current location as restaurant location</Button>
      </div>
      <div className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
        <h3 className="font-semibold">Delivery & pricing</h3>
        {field("delivery_radius_km", "Delivery radius (km)", "number")}
        {toggle("allow_outside_radius", "Allow orders outside radius")}
        {field("min_order_value", "Minimum order (₹)", "number")}
        {field("free_delivery_above", "Free delivery above (₹)", "number")}
        {field("flat_delivery_fee", "Flat delivery fee (₹) — beyond slabs", "number")}
        {field("distance_fee_slabs", "Distance fees, e.g. [{\"upto_km\":2,\"fee\":20}]")}
        {field("tax_percent", "Tax (%)", "number")}
        <div className="rounded-xl border border-border bg-background/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold">Online payments</h4>
              <p className="mt-1 text-xs text-muted-foreground">COD is active now. Connect Razorpay later when the restaurant is ready to accept online payments.</p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">COD active</span>
          </div>
          <a
            href="https://dashboard.razorpay.com/signup"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            Connect Razorpay account
          </a>
          <p className="mt-2 text-[11px] text-muted-foreground">
            This opens Razorpay's official merchant setup. Do not enter Razorpay passwords or OTPs into Food Uncle. Online payments remain off until the payment integration is configured.
          </p>
        </div>
      </div>
      <Button className="md:col-span-2" onClick={save}>Save settings</Button>
    </div>
  );
}
