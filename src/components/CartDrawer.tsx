import { useState } from 'react';
import { useCart } from '../lib/cart';
import { brl } from '../lib/supabase';
import { buildWhatsAppUrl, lineTotal } from '../lib/whatsapp';

export default function CartDrawer({ restaurant }: { restaurant: any }) {
  const { lines, setQty, clear, open, setOpen } = useCart(); const [notes, setNotes] = useState('');
  const total = lines.reduce((s, l) => s + lineTotal(l), 0); const count = lines.reduce((s, l) => s + l.qty, 0);
  return (<>
    {count > 0 && !open && <button className="btn fixed bottom-4 inset-x-4 md:left-auto md:w-72 z-30 rise" onClick={() => setOpen(true)}>Ver pedido · {count} · {brl(total)}</button>}
    {open && <div className="fixed inset-0 z-50 bg-black/70" onClick={() => setOpen(false)}>
      <aside className="rise absolute right-0 inset-y-0 w-full max-w-md bg-coal p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4"><h2 className="font-display text-3xl uppercase">Seu pedido</h2><button className="btn-ghost" onClick={() => setOpen(false)}>Fechar</button></div>
        {lines.length === 0 && <p className="text-bone/60">Seu pedido está vazio.</p>}
        {lines.map((l, i) => <div key={i} className="py-3 border-b border-bone/10">
          <div className="flex justify-between"><b>{l.name}</b><span>{brl(lineTotal(l))}</span></div>
          {l.addons.map(a => <p key={a.name} className="text-sm text-bone/60">+ {a.qty}× {a.name}</p>)}
          {l.notes && <p className="text-sm text-bone/60">Obs: {l.notes}</p>}
          <div className="flex items-center gap-3 mt-2"><button className="btn-ghost" onClick={() => setQty(i, l.qty - 1)}>−</button>{l.qty}<button className="btn-ghost" onClick={() => setQty(i, l.qty + 1)}>+</button></div>
        </div>)}
        {lines.length > 0 && <div className="mt-5 space-y-3">
          <textarea className="field" placeholder="Observações gerais do pedido" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex justify-between text-xl font-display uppercase"><span>Total</span><span>{brl(total)}</span></div>
          {restaurant.whatsapp ? <a className="btn block text-center" href={buildWhatsAppUrl(restaurant.whatsapp, restaurant.name, lines, notes)} target="_blank" rel="noreferrer">Finalizar pelo WhatsApp</a>
            : <p className="text-sm text-gold">WhatsApp do restaurante não configurado.</p>}
          <button className="btn-ghost w-full" onClick={clear}>Limpar pedido</button>
        </div>}
      </aside></div>}
  </>);
}
