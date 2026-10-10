import { Link } from "@tanstack/react-router";
import { Home, UtensilsCrossed, Search, Receipt, User, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import { useCart } from "@/lib/cart";
import { price } from "@/lib/data";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/search", label: "Search", icon: Search },
  { to: "/orders", label: "Orders", icon: Receipt },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children, title, hideCartBar }: { children: ReactNode; title?: string; hideCartBar?: boolean }) {
  const { count, subtotal, table } = useCart();
  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-background pb-36">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/90 px-5 py-3 backdrop-blur">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight text-primary">
          Food Uncle
        </Link>
        <div className="flex items-center gap-3">
          {table && <span className="rounded-full bg-accent/30 px-3 py-1 text-xs font-semibold">Table {table.number}</span>}
          <Link to="/cart" className="relative rounded-full p-2 hover:bg-muted" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </header>
      {title && <h1 className="px-5 pt-5 text-2xl font-semibold">{title}</h1>}
      {children}
      {count > 0 && !hideCartBar && (
        <Link
          to="/cart"
          className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-xl items-center justify-between rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-soft"
        >
          <span className="text-sm font-medium">
            {count} item{count > 1 ? "s" : ""} · {price(subtotal)}
          </span>
          <span className="text-sm font-semibold">View cart →</span>
        </Link>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl justify-around py-2">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: t.to === "/" }}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] text-muted-foreground"
              activeProps={{ className: "text-primary font-semibold" }}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function VegMark({ veg }: { veg: boolean }) {
  return (
    <span
      title={veg ? "Veg" : "Non-veg"}
      className={`inline-grid h-3.5 w-3.5 place-items-center rounded-[3px] border ${veg ? "border-success" : "border-destructive"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${veg ? "bg-success" : "bg-destructive"}`} />
    </span>
  );
}
