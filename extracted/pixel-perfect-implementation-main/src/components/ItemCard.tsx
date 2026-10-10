import { Link } from "@tanstack/react-router";
import { Flame, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { itemImage, price, type Category, type MenuItem } from "@/lib/data";
import { VegMark } from "./AppShell";

export function ItemRow({ item, categories }: { item: MenuItem; categories: Category[] }) {
  const { add } = useCart();
  const unit = Number(item.discount_price ?? item.price);
  return (
    <div className={`flex gap-4 py-4 ${item.is_available ? "" : "opacity-50"}`}>
      <Link to="/item/$id" params={{ id: item.id }} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <VegMark veg={item.is_veg} />
          {item.is_bestseller && <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">Bestseller</span>}
          {item.is_spicy && <Flame className="h-3.5 w-3.5 text-destructive" />}
        </div>
        <h3 className="mt-1 font-sans text-base font-semibold">{item.name}</h3>
        <div className="mt-0.5 flex items-baseline gap-2 text-sm">
          <span className="font-semibold">{price(unit)}</span>
          {item.discount_price && <span className="text-muted-foreground line-through">{price(item.price)}</span>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
      </Link>
      <div className="relative shrink-0">
        <img src={itemImage(item, categories)} alt={item.name} loading="lazy" width={112} height={112} className="h-28 w-28 rounded-2xl object-cover" />
        <button
          disabled={!item.is_available}
          onClick={() => {
            add({ menuItemId: item.id, name: item.name, unitPrice: unit, quantity: 1, addons: [], isVeg: item.is_veg });
            toast.success(`${item.name} added`);
          }}
          className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-card px-4 py-1.5 text-sm font-bold text-primary shadow-soft disabled:cursor-not-allowed"
        >
          {item.is_available ? (
            <>
              ADD <Plus className="h-3.5 w-3.5" />
            </>
          ) : (
            "Sold out"
          )}
        </button>
      </div>
    </div>
  );
}

export function ItemTile({ item, categories }: { item: MenuItem; categories: Category[] }) {
  return (
    <Link to="/item/$id" params={{ id: item.id }} className="w-40 shrink-0">
      <img src={itemImage(item, categories)} alt={item.name} loading="lazy" width={160} height={160} className="h-40 w-40 rounded-2xl object-cover" />
      <div className="mt-2 flex items-center gap-1.5">
        <VegMark veg={item.is_veg} />
        <span className="truncate text-sm font-semibold">{item.name}</span>
      </div>
      <span className="text-sm text-muted-foreground">{price(item.discount_price ?? item.price)}</span>
    </Link>
  );
}
