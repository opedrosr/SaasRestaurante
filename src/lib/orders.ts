import { supabase } from './supabase';
import type { CartLine } from './whatsapp';
export const orderCode = (id: string) => id.replace(/-/g, '').slice(0, 6).toUpperCase();

/** Grava o pedido no banco (preços recalculados no servidor). Em caso de falha devolve null: a venda por WhatsApp segue. */
export async function placeOrder(restaurantId: string, lines: CartLine[], notes?: string): Promise<string | null> {
  try {
    const items = lines.map(l => ({ product_id: l.productId, qty: l.qty, notes: l.notes, addons: l.addons.map(a => ({ id: a.id, qty: a.qty })) }));
    const { data, error } = await supabase.rpc('place_order', { p_restaurant: restaurantId, p_items: items, p_notes: notes || null });
    if (error) throw error;
    return (Array.isArray(data) ? data[0] : data)?.order_id ?? null;
  } catch (e) { console.error('place_order', e); return null; }
}
