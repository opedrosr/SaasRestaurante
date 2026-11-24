export interface CartLine { name: string; qty: number; unitCents: number; addons: { name: string; qty: number; cents: number }[]; notes?: string }
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const lineTotal = (l: CartLine) => (l.unitCents + l.addons.reduce((s, a) => s + a.cents * a.qty, 0)) * l.qty;

export function buildWhatsAppUrl(phone: string, restaurant: string, lines: CartLine[], notes?: string) {
  const body = lines.map(l =>
    [`• ${l.qty}x ${l.name} — ${brl(lineTotal(l))}`,
     ...l.addons.map(a => `   + ${a.qty}x ${a.name} (${brl(a.cents * a.qty)})`),
     l.notes ? `   Obs: ${l.notes}` : ''].filter(Boolean).join('\n')).join('\n');
  const total = lines.reduce((s, l) => s + lineTotal(l), 0);
  const msg = `Olá, ${restaurant}! Quero fazer um pedido:\n\n${body}\n\n*Total: ${brl(total)}*${notes ? `\nObs: ${notes}` : ''}`;
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
}
