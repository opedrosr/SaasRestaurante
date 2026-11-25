import { useState, lazy, Suspense } from 'react';
import { brl, pub } from '../lib/supabase';
import { useCart } from '../lib/cart';
import { placeholderFor } from '../lib/placeholders';
const Viewer = lazy(() => import('./ProductModelViewer'));

export default function ProductSheet({ p, addons, onClose, track }: { p: any; addons: any[]; onClose: () => void; track: (e: string) => void }) {
  const { add, setOpen } = useCart();
  const [show3d, setShow3d] = useState(false);
  const [qty, setQty] = useState(1); const [sel, setSel] = useState<Record<string, number>>({}); const [notes, setNotes] = useState('');
  const model = (p.product_models || []).find((m: any) => m.is_active && m.status === 'valid' && m.glb_path);
  const food = (p.product_dimensions || []).find((d: any) => d.kind === 'food');
  const pack = (p.product_dimensions || []).find((d: any) => d.kind === 'packaging');
  const photo = (p.product_photos || []).sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary))[0];
  const opts = addons.filter(a => !a.product_id || a.product_id === p.id);
  const unit = p.price_cents + opts.reduce((s, a) => s + a.price_cents * (sel[a.id] || 0), 0);

  const addToCart = () => {
    add({ name: p.name, qty, unitCents: p.price_cents, notes: notes || undefined,
      addons: opts.filter(a => sel[a.id]).map(a => ({ name: a.name, qty: sel[a.id], cents: a.price_cents })) });
    onClose(); setOpen(true);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70" onClick={onClose}>
      <div className="rise absolute inset-x-0 bottom-0 top-8 md:inset-y-6 md:mx-auto md:max-w-5xl bg-coal overflow-y-auto md:grid md:grid-cols-2" onClick={e => e.stopPropagation()}>
        <div className="md:sticky md:top-0 md:h-full bg-ash">
          {show3d && model && food ? (
            <Suspense fallback={<div className="aspect-square animate-pulse" />}>
              <Viewer glbUrl={pub('models', model.glb_path)} usdzUrl={model.usdz_path ? pub('models', model.usdz_path) : null}
                posterUrl={photo ? pub('photos', photo.storage_path) : undefined}
                physicalCm={{ width: Number(food.width_cm), depth: Number(food.depth_cm), height: Number(food.height_cm) }}
                onARClick={() => track('ar_click')} />
            </Suspense>
          ) : <img src={photo ? pub('photos', photo.storage_path) : placeholderFor(p.name)} alt={p.name} className="w-full aspect-square object-cover" />}
          <div className="p-3">
            {model && food
              ? !show3d && <button className="btn w-full" onClick={() => { setShow3d(true); track('model_view'); }}>Explorar em 3D</button>
              : <p className="text-xs text-bone/50">Modelo 3D ainda não disponível para este produto.</p>}
          </div>
        </div>
        <div className="p-6 space-y-5">
          <button onClick={onClose} className="btn-ghost float-right">Fechar</button>
          <h2 className="font-display text-4xl uppercase">{p.name}</h2>
          <p className="text-bone/70">{p.description}</p>
          {p.ingredients?.length > 0 && <p className="text-sm"><span className="text-gold">Ingredientes:</span> {p.ingredients.join(', ')}</p>}
          <dl className="text-sm text-bone/70 grid grid-cols-2 gap-1">
            {p.weight_g && <><dt>Peso aprox.</dt><dd>{p.weight_g} g</dd></>}
            {food && <><dt>Lanche (L×P×A)</dt><dd>{food.width_cm}×{food.depth_cm}×{food.height_cm} cm</dd></>}
            {pack && <><dt>Embalagem</dt><dd>{pack.width_cm}×{pack.depth_cm}×{pack.height_cm} cm</dd></>}
          </dl>
          {opts.length > 0 && <div><h3 className="text-gold text-sm mb-2">Adicionais</h3>
            {opts.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-bone/10">
                <span>{a.name} <span className="text-bone/50 text-sm">+{brl(a.price_cents)}</span></span>
                <span className="flex items-center gap-3">
                  <button className="btn-ghost" onClick={() => setSel(s => ({ ...s, [a.id]: Math.max(0, (s[a.id] || 0) - 1) }))}>−</button>
                  <b className="w-4 text-center">{sel[a.id] || 0}</b>
                  <button className="btn-ghost" onClick={() => setSel(s => ({ ...s, [a.id]: Math.min(a.max_qty, (s[a.id] || 0) + 1) }))}>+</button>
                </span>
              </div>))}</div>}
          <textarea className="field text-neutral-900" placeholder="Observações (ex.: sem cebola)" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex items-center gap-3">
            <button className="btn-ghost" onClick={() => setQty(Math.max(1, qty - 1))}>−</button><b>{qty}</b><button className="btn-ghost" onClick={() => setQty(qty + 1)}>+</button>
            <button className="btn flex-1" disabled={!p.is_available} onClick={addToCart}>{p.is_available ? `Adicionar ${brl(unit * qty)}` : 'Indisponível'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
