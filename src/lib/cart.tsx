import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartLine = {
  key: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  addons: string[];
  notes?: string | undefined;
  isVeg: boolean;
};
type TableCtx = { id: string; number: string } | null;

type Ctx = {
  lines: CartLine[];
  add: (l: Omit<CartLine, "key">) => void;
  setQty: (key: string, q: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  table: TableCtx;
  setTable: (t: TableCtx) => void;
};
const CartContext = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [table, setTableState] = useState<TableCtx>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setLines(JSON.parse(localStorage.getItem("fu_cart") ?? "[]"));
      setTableState(JSON.parse(sessionStorage.getItem("fu_table") ?? "null"));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem("fu_cart", JSON.stringify(lines));
  }, [lines, ready]);

  const setTable = (t: TableCtx) => {
    setTableState(t);
    sessionStorage.setItem("fu_table", JSON.stringify(t));
  };
  const add: Ctx["add"] = (l) => {
    const key = `${l.menuItemId}|${[...l.addons].sort().join(",")}|${l.notes ?? ""}`;
    setLines((prev) => {
      const ex = prev.find((p) => p.key === key);
      if (ex) return prev.map((p) => (p.key === key ? { ...p, quantity: p.quantity + l.quantity } : p));
      return [...prev, { ...l, key }];
    });
  };
  const setQty = (key: string, q: number) =>
    setLines((prev) => (q <= 0 ? prev.filter((p) => p.key !== key) : prev.map((p) => (p.key === key ? { ...p, quantity: q } : p))));

  return (
    <CartContext.Provider
      value={{
        lines,
        add,
        setQty,
        clear: () => setLines([]),
        count: lines.reduce((s, l) => s + l.quantity, 0),
        subtotal: lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
        table,
        setTable,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart outside provider");
  return c;
}
