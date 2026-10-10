import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { flowFor, price, STATUS_LABEL } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({ meta: [{ title: "Track order — Food Uncle" }, { name: "description", content: "Live status of your Food Uncle order." }, { property: "og:title", content: "Track order — Food Uncle" }, { property: "og:description", content: "Live order tracking." }] }),
  component: Track,
});

function Track() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*), dining_tables(table_number)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    const ch = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => q.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  if (q.isLoading) return <AppShell title="Your order"><p className="px-5 pt-4 text-muted-foreground">Loading…</p></AppShell>;
  if (!q.data) return <AppShell title="Order not found"><p className="px-5">We couldn't find this order.</p></AppShell>;
  const o = q.data;
  const flow = flowFor(o.order_type);
  const idx = flow.indexOf(o.status);
  const ended = o.status === "cancelled" || o.status === "rejected";
  return (
    <AppShell title={`Order #${o.order_number}`}>
      <p className="px-5 text-sm text-muted-foreground">
        {o.order_type === "dine_in" ? `Table ${o.dining_tables?.table_number}` : o.order_type === "delivery" ? "Delivery" : "Takeaway"} · {new Date(o.created_at).toLocaleString()}
      </p>
      <div className="mx-5 mt-4 rounded-2xl bg-card p-5 shadow-soft">
        {ended ? <p className="font-semibold text-destructive">{STATUS_LABEL[o.status]}</p> : (
          <ol className="space-y-4">
            {flow.map((st, i) => (
              <li key={st} className="flex items-center gap-3">
                <span className={`grid h-7 w-7 place-items-center rounded-full border-2 ${i <= idx ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                  {i <= idx && <Check className="h-4 w-4" />}
                </span>
                <span className={i === idx ? "font-semibold" : i < idx ? "" : "text-muted-foreground"}>{STATUS_LABEL[st]}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="mx-5 mt-4 space-y-2 rounded-2xl bg-card p-5 text-sm shadow-soft">
        {o.order_items.map((it) => (
          <div key={it.id} className="flex justify-between"><span>{it.quantity} × {it.name}</span><span>{price(it.line_total)}</span></div>
        ))}
        <div className="space-y-1 border-t border-border pt-2 text-muted-foreground">
          {Number(o.discount) > 0 && <div className="flex justify-between"><span>Discount</span><span>−{price(o.discount)}</span></div>}
          {o.order_type === "delivery" && <div className="flex justify-between"><span>Delivery</span><span>{price(o.delivery_fee)}</span></div>}
          <div className="flex justify-between"><span>Taxes</span><span>{price(o.tax)}</span></div>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span>{price(o.total)}</span></div>
        <p className="text-xs text-muted-foreground">Payment: {o.payment_method.replace(/_/g, " ")} · {o.payment_status}</p>
      </div>
    </AppShell>
  );
}
