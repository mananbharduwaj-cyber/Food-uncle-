import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { price, STATUS_LABEL } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({ meta: [{ title: "My orders — Food Uncle" }, { name: "description", content: "Your Food Uncle order history." }, { property: "og:title", content: "My orders — Food Uncle" }, { property: "og:description", content: "Order history." }] }),
  component: Orders,
});

function Orders() {
  const { user } = Route.useRouteContext();
  const q = useQuery({
    queryKey: ["orders", user.id],
    queryFn: async () => (await supabase.from("orders").select("id,order_number,status,total,created_at,order_type").eq("user_id", user.id).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <AppShell title="My orders">
      {q.isLoading ? <p className="px-5 pt-4 text-muted-foreground">Loading…</p> : !q.data?.length ? (
        <p className="px-5 pt-4 text-muted-foreground">No orders yet. <Link to="/menu" className="text-primary">Order something delicious</Link></p>
      ) : (
        <div className="mt-4 space-y-3 px-5">
          {q.data.map((o) => (
            <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-soft">
              <div>
                <p className="font-semibold">Order #{o.order_number}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.order_type.replace("_", "-")}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{price(o.total)}</p>
                <p className="text-xs text-primary">{STATUS_LABEL[o.status]}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
