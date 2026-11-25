import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, configured, brl } from '../lib/supabase';
import { photoOf, has3d } from '../lib/product';
import { useCart } from '../lib/cart';
import ProductSheet from '../components/ProductSheet';
import CartDrawer from '../components/CartDrawer';

const iconFor = (name: string) => {
  const s = name.toLowerCase();
  if (/combo/.test(s)) return '🍱';
  if (/burger|hamb|smash/.test(s)) return '🍔';
  if (/acompanh|batata|fritas/.test(s)) return '🍟';
  if (/bebida|shake|suco|refri/.test(s)) return '🥤';
  if (/sobremesa|doce|brownie/.test(s)) return '🍰';
  if (/pizza/.test(s)) return '🍕';
  return '🍽️';
};

function Card({ p, onOpen }: { p: any; onOpen: (p: any) => void }) {
  return (
    <button onClick={() => onOpen(p)} className="glass snap-start shrink-0 w-[46%] rounded-[24px] p-2.5 text-left transition active:scale-[.98] sm:w-[31%] md:w-[24%]">
      <div className="relative aspect-[5/4] overflow-hidden rounded-[18px] bg-black/30">
        <img loading="lazy" src={photoOf(p)} alt="" className="h-full w-full object-cover" />
        {has3d(p) && <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">3D · AR</span>}
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-tight">{p.name}</h3>
      <div className="mt-1.5 flex items-center justify-between">
        <b className="text-sm">{brl(p.price_cents)}</b>
        <span className={`grid h-7 w-7 place-items-center rounded-lg text-lg font-bold leading-none ${p.is_available ? 'bg-gradient-to-b from-brand-light to-brand-dark' : 'bg-white/20'}`}>{p.is_available ? '+' : '–'}</span>
      </div>
    </button>
  );
}

function Row({ items, onOpen }: { items: any[]; onOpen: (p: any) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  const arrow = 'absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-xl text-white ring-1 ring-white/20 md:grid';
  return (
    <div className="relative">
      <button aria-label="Anterior" onClick={() => go(-1)} className={arrow + ' -left-5'}>‹</button>
      <div ref={ref} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(p => <Card key={p.id} p={p} onOpen={onOpen} />)}
      </div>
      <button aria-label="Próximo" onClick={() => go(1)} className={arrow + ' -right-5'}>›</button>
    </div>
  );
}

export default function Menu() {
  const { slug } = useParams();
  const { lines, setOpen } = useCart();
  const [data, setData] = useState<any>(null); const [err, setErr] = useState('');
  const [cat, setCat] = useState('all'); const [q, setQ] = useState(''); const [sel, setSel] = useState<any>(null); const [more, setMore] = useState(false);

  useEffect(() => {
    if (!configured) { setErr('Backend não configurado. Preencha o .env (veja .env.example).'); return; }
    (async () => {
      const { data: r, error } = await supabase.from('restaurants').select('*').eq('slug', slug).maybeSingle();
      if (error || !r) { setErr('Restaurante não encontrado.'); return; }
      const [c, p, a] = await Promise.all([
        supabase.from('categories').select('*').eq('restaurant_id', r.id).eq('is_active', true).order('sort_order'),
        supabase.from('products').select('*, product_photos(*), product_dimensions(*), product_models(*)').eq('restaurant_id', r.id).eq('is_published', true).order('sort_order'),
        supabase.from('addons').select('*').eq('restaurant_id', r.id)]);
      const failed = c.error || p.error || a.error;
      if (failed) { console.error(failed); setErr('Erro ao carregar o cardápio: ' + failed.message); return; }
      setData({ r, cats: c.data || [], prods: p.data || [], addons: a.data || [] });
      supabase.rpc('track_event', { p_restaurant: r.id, p_product: null, p_event: 'menu_view' });
    })().catch(() => setErr('Não foi possível carregar o cardápio. Verifique sua conexão e tente novamente.'));
  }, [slug]);

  if (err) return <p className="p-8">{err}</p>;
  if (!data) return <div className="space-y-4 p-6">{[1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/10" />)}</div>;
  const { r, cats, prods, addons } = data;
  const featured = prods.find((p: any) => p.is_featured) || prods[0];
  const term = q.trim().toLowerCase();
  const list = prods.filter((p: any) => (cat === 'all' || p.category_id === cat) && (!term || `${p.name} ${p.description || ''}`.toLowerCase().includes(term)));
  const rows: any[][] = []; for (let i = 0; i < list.length; i += 4) rows.push(list.slice(i, i + 4));
  const shown = more || term ? rows : rows.slice(0, 2);
  const [w1, ...restWords] = String(r.name).trim().split(/\s+/); const w2 = restWords.join(' ');
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const food = featured?.product_dimensions?.find((d: any) => d.kind === 'food');
  const fWords = featured ? String(featured.name).trim().split(/\s+/) : []; const fLast = fWords.length > 1 ? fWords.pop() : '';
  const word = 'font-display font-extrabold uppercase leading-[.88] tracking-tight text-[clamp(44px,14vw,120px)]';

  return (
    <main className="pb-28">
      <section className="relative overflow-hidden px-4 pb-8 pt-4">
        {featured && <div aria-hidden className="absolute inset-0" style={{ background: `url(${photoOf(featured)}) center/cover`, filter: 'blur(50px) brightness(.45) saturate(1.4)', transform: 'scale(1.4)' }} />}
        <nav className="glass relative mx-auto flex max-w-5xl items-center justify-between rounded-full px-5 py-3">
          <b className="tracking-tight">{r.name}</b>
          <div className="flex items-center gap-4 text-sm font-medium">
            <a href="#menu">Menu</a><a href="#info">Contato</a>
            <button className="btn !px-4 !py-1.5 !text-sm" onClick={() => setOpen(true)}>Pedido{count > 0 ? ` (${count})` : ''}</button>
          </div>
        </nav>
        {featured && (
          <div className="relative mx-auto mt-8 grid max-w-5xl items-center md:grid-cols-[1fr_auto_1fr]">
            <h1 className={word + ' relative z-10 -mb-5 text-left md:mb-0'}>{w1}</h1>
            <button onClick={() => setSel(featured)} aria-label={featured.name} className="glass mx-auto h-64 w-64 overflow-hidden rounded-[44px] p-1.5 md:h-80 md:w-80">
              <img src={photoOf(featured)} alt="" className="h-full w-full rounded-[38px] object-cover" />
            </button>
            <div className="relative z-10 -mt-5 text-right md:mt-0">
              {w2 && <h1 className={word + ' text-brand'}>{w2}</h1>}
              <p className="mt-1 text-sm text-white/70">{r.tagline || 'Bem-vindo'}</p>
            </div>
          </div>
        )}
      </section>

      <section id="menu" className="glass mx-auto mt-2 max-w-5xl rounded-[36px] p-5 md:p-8">
        <div className="flex items-end justify-between gap-3">
          <div><h2 className="text-4xl font-extrabold tracking-tight">Menu</h2><p className="text-sm text-white/55">escolha o seu</p></div>
          <button className="btn !px-5 !py-3" onClick={() => setOpen(true)}>Meu pedido</button>
        </div>
        <input className="field-glass mt-5" placeholder="Buscar no cardápio" value={q} onChange={e => { setQ(e.target.value); setMore(false); }} />
        <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {[{ id: 'all', name: 'Tudo' }, ...cats].map((c: any) => (
            <button key={c.id} onClick={() => { setCat(c.id); setMore(false); }}
              className={`flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-[11px] font-medium transition ${cat === c.id ? 'border-brand bg-brand/20 shadow-[0_0_20px_rgba(245,130,31,.35)]' : 'border-white/15 bg-white/[.07]'}`}>
              <span className="text-2xl leading-none">{c.id === 'all' ? '✨' : iconFor(c.name)}</span>
              <span className="w-full truncate text-center">{c.name}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 space-y-4">
          {shown.map((row, i) => <Row key={i} items={row} onOpen={setSel} />)}
          {list.length === 0 && <p className="py-8 text-white/60">Nenhum produto encontrado.</p>}
        </div>
        {!more && !term && rows.length > 2 && <button className="btn mx-auto mt-6 flex" onClick={() => setMore(true)}>Mais</button>}
      </section>

      {featured && (
        <section className="glass relative mx-auto mt-6 max-w-5xl overflow-hidden rounded-[32px] p-6 md:p-10">
          <span className="inline-block rounded-full bg-brand/20 px-3 py-1 text-xs font-semibold text-brand">🔥 Destaque da casa</span>
          <h3 className="mt-3 max-w-[62%] text-4xl font-extrabold leading-none tracking-tight md:text-6xl">{fWords.join(' ')} {fLast && <span className="text-brand">{fLast}</span>}</h3>
          <p className="mt-2 max-w-[58%] text-sm text-white/65">{featured.description}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {featured.ingredients?.length > 0 && <span className="rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5"><b>{featured.ingredients.length}</b> ingredientes</span>}
            {featured.weight_g && <span className="rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5"><b>{featured.weight_g} g</b> aprox.</span>}
            {food && <span className="rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5"><b>{food.width_cm} cm</b> de largura</span>}
          </div>
          <div className="mt-6 flex items-center gap-4"><b className="text-3xl text-brand">{brl(featured.price_cents)}</b><button className="btn" onClick={() => setSel(featured)}>Pedir agora</button></div>
          <img src={photoOf(featured)} alt="" className="pointer-events-none absolute -bottom-8 -right-10 h-52 w-52 rounded-full object-cover shadow-2xl md:h-80 md:w-80" />
        </section>
      )}

      <footer id="info" className="mx-auto mt-8 max-w-5xl px-5 text-sm text-white/70">
        <p className="font-bold text-white">{r.name}</p>
        {r.address && <p>{r.address}</p>}
        {r.opening_hours?.text && <p>{r.opening_hours.text}</p>}
        {r.instagram && <a className="underline" target="_blank" rel="noreferrer" href={`https://instagram.com/${String(r.instagram).replace('@', '')}`}>Instagram</a>}
      </footer>

      {sel && <ProductSheet p={sel} addons={addons} onClose={() => setSel(null)} track={e => supabase.rpc('track_event', { p_restaurant: r.id, p_product: sel.id, p_event: e })} />}
      <CartDrawer restaurant={r} />
    </main>
  );
}
