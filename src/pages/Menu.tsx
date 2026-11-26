import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { openStatus, DAY_NAMES } from '../lib/hours';
import { brandVars } from '../lib/color';
import { supabase, configured, brl } from '../lib/supabase';
import { photoOf, has3d } from '../lib/product';
import { useCart } from '../lib/cart';
import ProductSheet from '../components/ProductSheet';
import CartDrawer from '../components/CartDrawer';

const Chevron = ({ dir }: { dir: 'l' | 'r' }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={dir === 'l' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
);

const BagAdd = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 8h12l1 12H5L6 8z" /><path d="M9 8V7a3 3 0 016 0v1" /><path d="M12 12.5v4M10 14.5h4" />
  </svg>
);

function Card({ p, onOpen, onPrev, onNext }: { p: any; onOpen: (p: any) => void; onPrev: () => void; onNext: () => void }) {
  const stop = (fn: () => void) => (e: React.SyntheticEvent) => { e.stopPropagation(); fn(); };
  const nav = 'grid h-9 w-9 place-items-center rounded-full transition active:scale-90 hover:bg-white/15';
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(p)} onKeyDown={e => { if (e.key === 'Enter') onOpen(p); }}
      className="glass relative aspect-[3/4.6] w-[70%] shrink-0 cursor-pointer snap-center rounded-[36px] text-left transition active:scale-[.985] sm:w-[46%] md:w-[31%]">
      {/* topo: seta, botão central, seta */}
      <div className="absolute inset-x-4 top-4 flex items-center justify-between">
        <button type="button" aria-label="Anterior" className={nav} onClick={stop(onPrev)}><Chevron dir="l" /></button>
        <span className="rounded-full border-2 border-white px-5 py-1.5 font-display text-base font-bold uppercase tracking-wider">
          {p.is_available ? 'Pedir agora' : 'Indisponível'}
        </span>
        <button type="button" aria-label="Próximo" className={nav} onClick={stop(onNext)}><Chevron dir="r" /></button>
      </div>

      {/* prato: vaza das bordas do vidro */}
      <div className="pointer-events-none absolute inset-x-[-10%] top-[17%] h-[46%]">
        <img loading="lazy" src={photoOf(p)} alt={p.name} className="h-full w-full object-contain drop-shadow-[0_22px_22px_rgba(0,10,70,.45)]" />
      </div>

      {/* base: nome, descrição, preço e sacola */}
      <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-3xl font-extrabold uppercase leading-none tracking-tight">{p.name}</h3>
          {p.description && <p className="mt-1 truncate text-sm text-white/75">{p.description}</p>}
          <div className="mt-2 flex items-center gap-2">
            <b className="text-xl">{brl(p.price_cents)}</b>
            {has3d(p) && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-cobalt">3D · AR</span>}
          </div>
        </div>
        <span className={`shrink-0 pb-0.5 ${p.is_available ? 'text-white' : 'text-white/40'}`}><BagAdd /></span>
      </div>
    </div>
  );
}

function Row({ items, onOpen }: { items: any[]; onOpen: (p: any) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.7, behavior: 'smooth' });
  return (
    <div ref={ref} className="-mx-5 flex snap-x snap-mandatory gap-8 overflow-x-auto scroll-smooth px-8 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-8">
      {items.map(p => <Card key={p.id} p={p} onOpen={onOpen} onPrev={() => go(-1)} onNext={() => go(1)} />)}
    </div>
  );
}

/* recorte do hambúrguer real (coloque o arquivo em /public) */
const HERO_BURGER = '/burger-cheddar.png';

export default function Menu({ slug: slugProp }: { slug?: string }) {
  const params = useParams(); const slug = slugProp ?? params.slug;
  const [, setSp] = useSearchParams();
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
      const pid = new URLSearchParams(location.search).get('p'); const hit = (p.data || []).find((x: any) => x.id === pid); if (hit) setSel(hit);
      supabase.rpc('track_event', { p_restaurant: r.id, p_product: null, p_event: 'menu_view' });
    })().catch(() => setErr('Não foi possível carregar o cardápio. Verifique sua conexão e tente novamente.'));
  }, [slug]);

  const openProduct = (p: any | null) => {
    setSel(p); const n = new URLSearchParams(location.search); if (p) n.set('p', p.id); else n.delete('p'); setSp(n, { replace: true }); };
  if (err) return <p className="p-8">{err}</p>;
  if (!data) return <div className="space-y-4 p-6">{[1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/10" />)}</div>;
  const { r, cats, prods, addons } = data;
  const status = openStatus(r.opening_hours);
  const primary = r.brand_colors?.primary; const brandPrimary = primary && String(primary).toLowerCase() !== '#f5821f' ? primary : undefined;
  const featured = prods.find((p: any) => p.is_featured) || prods[0];
  const term = q.trim().toLowerCase();
  const list = prods.filter((p: any) => (cat === 'all' || p.category_id === cat) && (!term || `${p.name} ${p.description || ''}`.toLowerCase().includes(term)));
  const rows: any[][] = []; for (let i = 0; i < list.length; i += 6) rows.push(list.slice(i, i + 6));
  const shown = more || term ? rows : rows.slice(0, 1);
  const [w1, ...restWords] = String(r.name).trim().split(/\s+/); const w2 = restWords.join(' ');
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const food = featured?.product_dimensions?.find((d: any) => d.kind === 'food');
  const fWords = featured ? String(featured.name).trim().split(/\s+/) : []; const fLast = fWords.length > 1 ? fWords.pop() : '';

  return (
    <main className="pb-28" style={brandVars(brandPrimary)}>
      <section className="relative overflow-hidden px-4 pb-8 pt-4">
        <nav className="glass relative mx-auto flex max-w-5xl items-center justify-between rounded-full px-5 py-3">
          <span className="flex items-center gap-2">{r.logo_url && <img src={r.logo_url} alt="" className="h-7 w-7 rounded-full object-cover" />}<b className="tracking-tight">{r.name}</b></span>
          <div className="flex items-center gap-4 text-sm font-medium">
            <a href="#menu">Menu</a><a href="#info">Contato</a>
            <button className="btn !px-4 !py-1.5 !text-sm" onClick={() => setOpen(true)}>Pedido{count > 0 ? ` (${count})` : ''}</button>
          </div>
        </nav>
        {featured && (
          <div className="mx-auto mt-10" style={{ ['--w' as any]: 'min(34vw, 22rem)' }}>
            <div className="relative mx-auto" style={{ width: 'calc(var(--w) * 2.85)', maxWidth: '100%', height: 'calc(var(--w) * 0.86)' }}>
              <button onClick={() => openProduct(featured)} aria-label={featured.name} className="absolute z-10" style={{ left: 'calc(var(--w) * .95)', top: 0, width: 'var(--w)' }}>
                <img src={HERO_BURGER} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = photoOf(featured); }} alt={featured.name} className="block w-full drop-shadow-[0_22px_22px_rgba(0,10,70,.5)]" />
              </button>
              <h1 className="pointer-events-none absolute z-20 whitespace-nowrap font-display font-extrabold uppercase leading-[.8] tracking-tight text-white" style={{ left: 0, top: 'calc(var(--w) * .03)', fontSize: 'calc(var(--w) * .29)' }}>{w1}</h1>
              {w2 && <h1 className="pointer-events-none absolute z-20 whitespace-nowrap font-display font-extrabold uppercase leading-[.8] tracking-tight text-white" style={{ left: 'calc(var(--w) * 1.54)', top: 'calc(var(--w) * .52)', fontSize: 'calc(var(--w) * .29)' }}>{w2}</h1>}
            </div>
            <div className="mt-6 text-center">
              <p className="font-script text-2xl text-white">{r.tagline || 'Bem-vindo'}</p>
              {r.description && <p className="mx-auto mt-2 max-w-md text-xs text-white/55">{r.description}</p>}
              {status && <p className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${status.open ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{status.label}</p>}
            </div>
          </div>
        )}
      </section>

      <div className="checker mt-4" aria-hidden />

      <section id="menu" className="glass mx-auto mt-2 max-w-5xl rounded-[36px] p-5 md:p-8">
        <div className="flex items-end justify-between gap-3">
          <div><h2 className="font-display text-5xl font-extrabold uppercase tracking-tight">Menu</h2><p className="font-script text-xl text-brand">escolha o seu</p></div>
          <button className="btn !px-5 !py-3" onClick={() => setOpen(true)}>Meu pedido</button>
        </div>
        <input className="field-glass mt-5" placeholder="Buscar no cardápio" value={q} onChange={e => { setQ(e.target.value); setMore(false); }} />
        <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {[{ id: 'all', name: 'Tudo' }, ...cats].map((c: any) => (
            <button key={c.id} onClick={() => { setCat(c.id); setMore(false); }}
              className={`shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-95 ${cat === c.id ? 'glass-chip-on' : 'glass-chip'}`}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="mt-5 space-y-4">
          {shown.map((row, i) => <Row key={i} items={row} onOpen={openProduct} />)}
          {list.length === 0 && <p className="py-8 text-white/60">Nenhum produto encontrado.</p>}
        </div>
        {!more && !term && rows.length > 1 && <button className="btn mx-auto mt-6 flex" onClick={() => setMore(true)}>Mais</button>}
      </section>

      {featured && (
        <section className="relative mx-auto mt-6 max-w-5xl overflow-hidden rounded-[32px] bg-paper p-6 pt-12 text-navy md:p-10 md:pt-14">
          <div className="checker absolute inset-x-0 top-0" aria-hidden />
          <span className="inline-block rounded-full bg-cobalt/10 px-3 py-1 text-xs font-bold text-cobalt">Destaque da casa</span>
          <h3 className="mt-3 max-w-[62%] font-display text-5xl font-extrabold uppercase leading-[.9] tracking-tight md:text-7xl">{fWords.join(' ')} {fLast && <span className="text-cobalt">{fLast}</span>}</h3>
          <p className="mt-2 max-w-[58%] text-sm text-navy/70">{featured.description}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {featured.ingredients?.length > 0 && <span className="rounded-full border border-navy/15 bg-navy/5 px-3 py-1.5"><b>{featured.ingredients.length}</b> ingredientes</span>}
            {featured.weight_g && <span className="rounded-full border border-navy/15 bg-navy/5 px-3 py-1.5"><b>{featured.weight_g} g</b> aprox.</span>}
            {food && <span className="rounded-full border border-navy/15 bg-navy/5 px-3 py-1.5"><b>{food.width_cm} cm</b> de largura</span>}
          </div>
          <div className="mt-6 flex items-center gap-4"><b className="font-display text-4xl text-cobalt">{brl(featured.price_cents)}</b><button className="btn" onClick={() => openProduct(featured)}>Pedir agora</button></div>
          <img src={photoOf(featured)} alt="" className="pointer-events-none absolute -bottom-8 -right-10 h-52 w-52 rounded-full object-cover shadow-2xl md:h-80 md:w-80" />
        </section>
      )}

      <footer id="info" className="mx-auto mt-8 max-w-5xl px-5 text-sm text-white/70">
        <p className="font-bold text-white">{r.name}</p>
        {r.address && <p>{r.address}</p>}
        {r.opening_hours?.text && <p>{r.opening_hours.text}</p>}
        {r.opening_hours?.week?.length === 7 && <ul className="mt-1 text-xs">{r.opening_hours.week.map((d: any, i: number) => <li key={i}>{DAY_NAMES[i]}: {d.closed || !d.open ? 'Fechado' : `${d.open} às ${d.close}`}</li>)}</ul>}
        {r.instagram && <a className="underline" target="_blank" rel="noreferrer" href={`https://instagram.com/${String(r.instagram).replace('@', '')}`}>Instagram</a>}
      </footer>

      {sel && <ProductSheet p={sel} addons={addons} onClose={() => openProduct(null)} track={e => supabase.rpc('track_event', { p_restaurant: r.id, p_product: sel.id, p_event: e })} />}
      <CartDrawer restaurant={r} />
    </main>
  );
}