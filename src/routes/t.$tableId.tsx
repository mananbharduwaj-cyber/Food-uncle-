import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/t/$tableId")({
  head: () => ({
    meta: [
      { title: "Table ordering — Food Uncle" },
      { name: "description", content: "Order from your table at Food Uncle." },
      { property: "og:title", content: "Table ordering — Food Uncle" },
      { property: "og:description", content: "Scan, order and relax." },
    ],
  }),
  component: TableEntry,
});

function TableEntry() {
  const { tableId } = Route.useParams();
  const { setTable } = useCart();
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("dining_tables").select("id,table_number,is_active").eq("id", tableId).maybeSingle().then(({ data }) => {
      if (!data || !data.is_active) return setErr("This table QR is not valid. Please ask the staff for help.");
      setTable({ id: data.id, number: data.table_number });
      nav({ to: "/menu", replace: true });
    });
  }, [tableId]);
  return <div className="grid min-h-screen place-items-center p-6 text-center text-muted-foreground">{err ?? "Finding your table…"}</div>;
}
