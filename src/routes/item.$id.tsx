import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Flame, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, VegMark } from "@/components/AppShell";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart";
import { itemImage, menuQuery, price, type Addon } from "@/lib/data";

export const Route = createFileRoute("/item/$id")({
  head: () => ({
    meta: [
      { title: "Dish details — Food Uncle" },
      { name: "description", content: "See dish details, add-ons and add to your Food Uncle order." },
      { property: "og:title", content: "Dish details — Food Uncle" },
      { property: "og:description", content: "Customise and order from Food Uncle." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(menuQuery),
  component: ItemPage,
});

function ItemPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(menuQuery);
  const item = data.items.find((i) => i.id === id);
  const { add } = useCart();
  const nav = useNavigate();
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  if (!item)
    return (
      <AppShell title="Dish not found">
        <Link to="/menu" className="px-5 text-primary">Back to menu</Link>
      </AppShell>
    );
  const addons = item.addons as Addon[];
  const unit = Number(item.discount_price ?? item.price) + addons.filter((a) => sel.includes(a.name)).reduce((s, a) => s + a.price, 0);
  const doAdd = () => {
    add({ menuItemId: item.id, name: item.name, unitPrice: unit, quantity: qty, addons: sel, notes: notes || undefined, isVeg: item.is_veg });
    toast.success(`${item.name} added to cart`);
  };
  return (
    <AppShell hideCartBar>
      <div className="relative">
        <img src={itemImage(item, data.categories)} alt={item.name} width={800} height={800} className="aspect-square max-h-96 w-full object-cover" />
        <button onClick={() => history.back()} className="absolute left-4 top-4 rounded-full bg-card p-2 shadow-soft" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>
      <div className="px-5 pt-5">
        <div className="flex items-center gap-2">
          <VegMark veg={item.is_veg} />
          {item.is_bestseller && <span className="text-xs font-semibold uppercase text-primary">Bestseller</span>}
          {item.is_spicy && <span className="flex items-center gap-1 text-xs text-destructive"><Flame className="h-3 w-3" /> Spicy</span>}
        </div>
        <h1 className="mt-2 text-3xl font-semibold">{item.name}</h1>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-xl font-semibold">{price(item.discount_price ?? item.price)}</span>
          {item.discount_price && <span className="text-muted-foreground line-through">{price(item.price)}</span>}
        </div>
        <p className="mt-3 text-muted-foreground">{item.description}</p>
        {addons.length > 0 && (
          <div className="mt-6">
            <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-muted-foreground">Add-ons</h2>
            {addons.map((a) => (
              <label key={a.name} className="mt-2 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                <span className="flex items-center gap-3">
                  <input type="checkbox" className="accent-primary" checked={sel.includes(a.name)} onChange={(e) => setSel(e.target.checked ? [...sel, a.name] : sel.filter((x) => x !== a.name))} />
                  {a.name}
                </span>
                <span className="text-sm">+{price(a.price)}</span>
              </label>
            ))}
          </div>
        )}
        <h2 className="mt-6 font-sans text-sm font-semibold uppercase tracking-wide text-muted-foreground">Special instructions</h2>
        <Textarea className="mt-2" placeholder="e.g. less spicy" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card p-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
            <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
            <span className="w-5 text-center font-semibold">{qty}</span>
            <button onClick={() => setQty(qty + 1)} aria-label="Increase"><Plus className="h-4 w-4" /></button>
          </div>
          <button disabled={!item.is_available} onClick={doAdd} className="flex-1 rounded-xl border border-primary py-3 text-sm font-semibold text-primary disabled:opacity-50">
            Add · {price(unit * qty)}
          </button>
          <button disabled={!item.is_available} onClick={() => { doAdd(); nav({ to: "/cart" }); }} className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {item.is_available ? "Buy now" : "Sold out"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
