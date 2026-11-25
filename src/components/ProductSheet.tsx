import { useState, lazy, Suspense } from 'react';
import { brl, pub } from '../lib/supabase';
import { useCart } from '../lib/cart';
import { photosOf } from '../lib/product';
const Viewer = lazy(() => import('./ProductModelViewer'));

const Switch = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
  <button role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-gradient-to-b from-brand-light to-brand-dark' : 'bg-white/20'}`}>
    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`} />
  </button>
);

export default function ProductSheet({ p, addons, onClose, track }: { p: any; addons: any[]; onClose: () => void; track: (e: string) => void }) {
  const { add, setOpen } = useCart();
  const [show3d, setShow3d] = useState(false); const [idx, setIdx] = useState(0); const [copied, setCopied] = useState(false);
  const [qty, setQty] = useState(1); const [sel, setSel] = useState<Record<string, number>>({}); const [notes, setNotes] = useState('');
  const model = (p.product_models || []).find((m: any) => m.is_active && m.status === 'valid' && m.glb_path);
  const food = (p.product_dimensions || []).find((d: any) => d.kind === 'food');
  const pack = (p.product_dimensions || []).find((d: any) => d.kind === 'packaging');
  const pics = photosOf(p); const img = pics[idx] || pics[0];
  const opts = addons.filter(a => !a.product_id || a.product_id === p.id);
  const unit = p.price_cents + opts.reduce((s, a) => s + a.price_cents * (sel[a.id] || 0), 0);
  const can3d = Boolean(model && food);
  const round = 'grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-lg';
  const mini = 'grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-white/10';

  const addToCart = () => {
    add({ productId: p.id, name: p.name, qty, unitCents: p.price_cents, notes: notes || undefined,
      addons: opts.filter(a => sel[a.id]).map(a => ({ id: a.id, name: a.name, qty: sel[a.id], cents: a.price_cents })) });
    onClose(); setOpen(true);
  };

  const share = async () => {
    const u = new URL(location.href); u.searchParams.set('p', p.id);
    try {
      if (navigator.share) await navigator.share({ title: p.name, url: u.toString() });
      else { await navigator.clipboard.writeText(u.toString()); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* cancelado */ } };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto text-white" onClick={onClose}>
      <div className="fixed inset-0" style={{ background: 'linear-gradient(160deg,#0B35D6,#07185F)' }} aria-hidden />
      <div className="relative grid min-h-full place-items-center px-3 py-6">
        <div className="rise relative w-full max-w-[430px] overflow-hidden rounded-[40px] border border-white/15 bg-navy/95 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="relative">
            {show3d && can3d ? (
              <div className="px-3 pt-16">
                <Suspense fallback={<div className="aspect-square animate-pulse rounded-3xl bg-white/10" />}>
                  <Viewer glbUrl={pub('models', model.glb_path)} usdzUrl={model.usdz_path ? pub('models', model.usdz_path) : null} posterUrl={img}
                    physicalCm={{ width: Number(food.width_cm), depth: Number(food.depth_cm), height: Number(food.height_cm) }} onARClick={() => track('ar_click')} />
                </Suspense>
              </div>
            ) : (
              <div className="relative aspect-[4/3] w-full">
                <img src={img} alt={p.name} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy to-transparent" />
                {pics.length > 1 && <>
                  <button aria-label="Foto anterior" onClick={() => setIdx((idx - 1 + pics.length) % pics.length)} className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-xl">‹</button>
                  <button aria-label="Próxima foto" onClick={() => setIdx((idx + 1) % pics.length)} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-xl">›</button>
                  <div className="absolute inset-x-0 bottom-9 flex justify-center gap-1.5">{pics.map((_, i) => <span key={i} className={`h-1.5 rounded-full ${i === idx ? 'w-5 bg-brand' : 'w-1.5 bg-white/50'}`} />)}</div></>}
              </div>
            )}
            <button onClick={onClose} aria-label="Voltar" className={round + ' absolute left-4 top-4 bg-black/45 text-2xl'}>‹</button>
            {can3d && <button className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/45 px-3.5 py-2 text-xs font-semibold" onClick={() => { setShow3d(s => !s); if (!show3d) track('model_view'); }}>{show3d ? 'Ver foto' : 'Ver em 3D · AR'}</button>}
          </div>

          <div className="relative -mt-8 px-4 pb-4">
            <div className="rounded-[26px] border border-white/10 bg-white/[.07] p-4">
              <span className="inline-block rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold text-navy">{p.is_available ? (can3d ? '3D · AR' : 'Disponível') : 'Indisponível'}</span>
              <div className="mt-2 flex items-start justify-between gap-3">
                <h2 className="font-display text-4xl font-extrabold uppercase leading-[.9] tracking-tight">{p.name}</h2>
                <b className="shrink-0 font-display text-3xl text-brand">{brl(p.price_cents)}</b>
              </div>
              <p className="mt-2 text-sm text-white/65">{p.description}</p>
              {p.ingredients?.length > 0 && <p className="mt-2 text-xs text-white/55"><b className="text-white/80">Ingredientes:</b> {p.ingredients.join(', ')}</p>}
              <p className="mt-1 text-xs text-white/55">
                {[p.weight_g && `${p.weight_g} g`, food && `${food.width_cm}×${food.depth_cm}×${food.height_cm} cm`, pack && `embalagem ${pack.width_cm}×${pack.depth_cm}×${pack.height_cm} cm`].filter(Boolean).join(' · ')}
              </p>

              {opts.length > 0 && <div className="mt-4">
                <h3 className="font-semibold">Personalize</h3>
                {opts.map(a => {
                  const n = sel[a.id] || 0;
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-3 border-b border-white/10 py-2.5 text-sm">
                      <span>{a.name} <span className="text-white/50">+{brl(a.price_cents)}</span></span>
                      <span className="flex items-center gap-3">
                        {n > 0 && a.max_qty > 1 && <span className="flex items-center gap-2">
                          <button className={mini} onClick={() => setSel(s => ({ ...s, [a.id]: Math.max(1, n - 1) }))}>−</button>
                          <b className="w-3 text-center">{n}</b>
                          <button className={mini} onClick={() => setSel(s => ({ ...s, [a.id]: Math.min(a.max_qty, n + 1) }))}>+</button>
                        </span>}
                        <Switch on={n > 0} label={a.name} onClick={() => setSel(s => ({ ...s, [a.id]: n > 0 ? 0 : 1 }))} />
                      </span>
                    </div>);
                })}</div>}

              <textarea className="field-glass mt-4" rows={2} placeholder="Observações (ex.: sem cebola)" value={notes} onChange={e => setNotes(e.target.value)} />
              <button type="button" className="btn-ghost mt-3" onClick={share}>{copied ? 'Link copiado!' : 'Compartilhar'}</button>
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-full border border-white/10 bg-white/[.07] p-2">
              <button className={round} onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Menos">−</button>
              <b className="w-4 text-center">{qty}</b>
              <button className={round} onClick={() => setQty(qty + 1)} aria-label="Mais">+</button>
              <button className="btn flex-1 !justify-between !px-5" disabled={!p.is_available} onClick={addToCart}>
                <span>{p.is_available ? 'Adicionar ao pedido' : 'Indisponível'}</span><span>{brl(unit * qty)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
