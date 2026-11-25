import { useState } from 'react';
import { useCart } from '../lib/cart';
import { brl } from '../lib/supabase';
import { buildWhatsAppUrl, lineTotal } from '../lib/whatsapp';

export default function CartDrawer({ restaurant }: { restaurant: any }) {
  const { lines, setQty, clear, open, setOpen } = useCart(); const [notes, setNotes] = useState('');
  const total = lines.reduce((s, l) => s + lineTotal(l), 0); const count = lines.reduce((s, l) => s + l.qty, 0);
  const step = 'grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/10 font-semibold';
  return (<>
    {count > 0 && !open && <button className="btn rise fixed inset-x-4 bottom-4 z-30 !justify-between !px-6 !py-4 md:left-auto md:w-80" onClick={() => setOpen(true)}><span>Ver pedido · {count}</span><span>{brl(total)}</span></button>}
    {open && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <aside className="rise absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto rounded-l-[32px] border-l border-white/15 bg-[#14100d]/95 p-6 text-white" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-3xl font-extrabold tracking-tight">Seu pedido</h2><button className="btn-ghost" onClick={() => setOpen(false)}>Fechar</button></div>
        {lines.length === 0 && <p className="text-white/55">Seu pedido está vazio.</p>}
        {lines.map((l, i) => <div key={i} className="border-b border-white/10 py-3">
          <div className="flex justify-between"><b>{l.name}</b><span className="text-brand">{brl(lineTotal(l))}</span></div>
          {l.addons.map(a => <p key={a.name} className="text-sm text-white/55">+ {a.qty}× {a.name}</p>)}
          {l.notes && <p className="text-sm text-white/55">Obs: {l.notes}</p>}
          <div className="mt-2 flex items-center gap-3"><button className={step} onClick={() => setQty(i, l.qty - 1)}>−</button><b>{l.qty}</b><button className={step} onClick={() => setQty(i, l.qty + 1)}>+</button></div>
        </div>)}
        {lines.length > 0 && <div className="mt-5 space-y-3">
          <textarea className="field-glass" placeholder="Observações gerais do pedido" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex items-end justify-between"><span className="font-bold">Total</span><span className="text-2xl font-extrabold text-brand">{brl(total)}</span></div>
          {restaurant.whatsapp
            ? <a className="btn w-full !py-4" href={buildWhatsAppUrl(restaurant.whatsapp, restaurant.name, lines, notes)} target="_blank" rel="noreferrer">Finalizar pelo WhatsApp</a>
            : <p className="text-sm text-brand">WhatsApp do restaurante não configurado.</p>}
          <button className="btn-ghost w-full" onClick={clear}>Limpar pedido</button>
        </div>}
      </aside></div>}
  </>);
}
