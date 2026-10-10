import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { AppShell, VegMark } from "@/components/AppShell";
import { useCart } from "@/lib/cart";
import { price } from "@/lib/data";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Food Uncle" },
      { name: "description", content: "Review the dishes in your Food Uncle cart." },
      { property: "og:title", content: "Cart — Food Uncle" },
      { property: "og:description", content: "Review your order." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, setQty, subtotal } = useCart();
  if (!lines.length)
    return (
      <AppShell title="Cart">
        <div className="mt-16 flex flex-col items-center px-5 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          <p className="mt-3 font-semibold">Your cart is empty</p>
          <Link to="/menu" className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Browse menu</Link>
        </div>
      </AppShell>
    );
  return (
    <AppShell title="Cart" hideCartBar>
      <div className="mx-5 mt-4 divide-y divide-border rounded-2xl bg-card px-4 shadow-soft">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center gap-3 py-4">
            <VegMark veg={l.isVeg} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{l.name}</p>
              {l.addons.length > 0 && <p className="text-xs text-muted-foreground">+ {l.addons.join(", ")}</p>}
              {l.notes && <p className="text-xs italic text-muted-foreground">“{l.notes}”</p>}
              <p className="text-sm">{price(l.unitPrice * l.quantity)}</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border px-2.5 py-1.5 text-primary">
              <button onClick={() => setQty(l.key, l.quantity - 1)} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
              <span className="w-4 text-center font-semibold">{l.quantity}</span>
              <button onClick={() => setQty(l.key, l.quantity + 1)} aria-label="Increase"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <Link to="/menu" className="mx-5 mt-3 block text-sm font-semibold text-primary">+ Add more items</Link>
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card p-4">
        <Link to="/checkout" className="mx-auto flex max-w-2xl justify-between rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground">
          <span>Subtotal {price(subtotal)}</span><span>Checkout →</span>
        </Link>
      </div>
    </AppShell>
  );
}
