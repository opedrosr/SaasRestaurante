import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CartLine } from './whatsapp';
interface Ctx { lines: CartLine[]; add: (l: CartLine) => void; setQty: (i: number, q: number) => void; clear: () => void; open: boolean; setOpen: (b: boolean) => void }
const C = createContext<Ctx>(null as any);
export const useCart = () => useContext(C);
const storageKey = () => 'cart2:' + (location.pathname.split('/')[2] || 'default');
const readCart = (): CartLine[] => { try { return JSON.parse(localStorage.getItem(storageKey()) || '[]'); } catch { return []; } };

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readCart);
  useEffect(() => { if (location.pathname.startsWith('/restaurante')) try { localStorage.setItem(storageKey(), JSON.stringify(lines)); } catch {} }, [lines]); const [open, setOpen] = useState(false);
  const add = (l: CartLine) => setLines(p => [...p, l]);
  const setQty = (i: number, q: number) => setLines(p => q <= 0 ? p.filter((_, k) => k !== i) : p.map((l, k) => k === i ? { ...l, qty: q } : l));
  return <C.Provider value={{ lines, add, setQty, clear: () => setLines([]), open, setOpen }}>{children}</C.Provider>;
}
