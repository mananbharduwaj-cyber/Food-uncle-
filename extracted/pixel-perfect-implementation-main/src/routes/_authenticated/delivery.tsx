import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, CheckCircle2, LogOut, Package, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { price } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/delivery")({
  head: () => ({ meta: [{ title: "Delivery partner — Food Uncle" }, { name: "description", content: "Food Uncle delivery assignments." }] }),
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (error) throw error;
    if (!(data ?? []).some(r => r.role === "delivery_partner")) throw redirect({ to: "/auth", search: { staff: undefined, delivery: true } });
  },
  component: Delivery,
});

function Delivery() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const q = useQuery({
    queryKey: ["delivery-orders", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(name,quantity,addons,notes)").eq("delivery_partner_id", user.id).in("status", ["ready", "out_for_delivery"]).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const complete = async (id: string) => {
    const { error } = await supabase.from("orders").update({ status: "delivered", payment_status: "paid", delivery_payment_received: true, delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("delivery_partner_id", user.id);
    if (error) toast.error(error.message); else { toast.success("Payment received and delivery completed"); qc.invalidateQueries({ queryKey: ["delivery-orders", user.id] }); }
  };
  const signOut = async () => { await supabase.auth.signOut(); qc.clear(); await navigate({ to: "/auth", search: { staff: undefined, delivery: true } }); };
  return <div className="mx-auto min-h-screen max-w-2xl bg-background">
    <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><span className="font-display text-xl font-semibold text-primary">Food Uncle</span><Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button></header>
    <main className="px-5 py-6">
      <div className="flex items-center gap-3"><Bike className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-semibold">Delivery partner</h1><p className="text-sm text-muted-foreground">{user.user_metadata?.["full_name"] ?? user.email}</p></div></div>
      <section className="mt-8 border-t border-border pt-5"><h2 className="text-xl font-semibold">My deliveries</h2>
        {q.isLoading ? <p className="py-10 text-muted-foreground">Loading deliveries…</p> : !q.data?.length ? <div className="flex flex-col items-center py-16 text-center"><Package className="h-12 w-12 text-muted-foreground" strokeWidth={1.5}/><p className="mt-4 font-semibold">No assigned deliveries</p><p className="mt-2 text-sm text-muted-foreground">New assigned orders will appear here.</p></div> : <div className="mt-4 space-y-4">{q.data.map(o => <article key={o.id} className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">Order #{o.order_number}</p><p className="text-xs text-muted-foreground">{o.customer_name ?? "Customer"} · {o.customer_phone ?? ""}</p></div><span className="text-sm font-semibold text-primary">{price(o.total)}</span></div>
          <p className="mt-2 text-sm">{o.address ? `${(o.address as any).house ?? ""}, ${(o.address as any).street ?? ""}, ${(o.address as any).city ?? ""} ${(o.address as any).pincode ?? ""}` : "Delivery address unavailable"}</p>
          <ul className="mt-2 text-sm">{o.order_items.map((it:any,i:number)=><li key={i}>{it.quantity} × {it.name}</li>)}</ul>
          <div className="mt-4 rounded-xl border border-border p-3"><div className="flex items-center gap-2"><QrCode className="h-5 w-5"/><span className="font-semibold">Demo payment QR</span></div><div className="mt-3 flex justify-center rounded-lg bg-white p-3"><div className="grid h-28 w-28 grid-cols-7 gap-1">{Array.from({length:49},(_,i)=><span key={i} className={(i*17+i*i)%5<2?"bg-black":"bg-white"}/>)}</div></div><p className="mt-2 text-center text-xs text-muted-foreground">Demo only — not a real payment QR.</p></div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3"><input type="checkbox" className="mt-1 h-4 w-4 accent-primary" onChange={e => e.target.checked && complete(o.id)} /><span><span className="block font-semibold">Payment received & delivery successful</span><span className="text-xs text-muted-foreground">Tick only after handing over the order and receiving COD payment.</span></span></label>
        </article>)}</div>}
      </section>
    </main>
  </div>;
}
