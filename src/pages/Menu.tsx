import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, configured, brl, pub } from '../lib/supabase';
import ProductSheet from '../components/ProductSheet';
import CartDrawer from '../components/CartDrawer';
import { placeholderFor } from '../lib/placeholders';

export default function Menu() {
  const { slug } = useParams();
  const [data, setData] = useState<any>(null); const [err, setErr] = useState(''); const [cat, setCat] = useState('all'); const [sel, setSel] = useState<any>(null);

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
  if (!data) return <div className="p-8 space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-28 bg-ash animate-pulse" />)}</div>;
  const { r, cats, prods, addons } = data;
  const has3d = (p: any) => (p.product_models || []).some((m: any) => m.is_active && m.status === 'valid');
  const featured = prods.filter((p: any) => p.is_featured);
  const list = cat === 'all' ? prods : prods.filter((p: any) => p.category_id === cat);
  const Card = ({ p }: { p: any }) => {
    const ph = (p.product_photos || []).find((x: any) => x.is_primary) || (p.product_photos || [])[0];
    return (
      <button onClick={() => setSel(p)} className="flex gap-4 text-left w-full py-4 border-b border-bone/10 hover:bg-ash/50 transition">
        <div className="flex-1"><h3 className="font-display text-xl uppercase">{p.name}</h3>
          <p className="text-sm text-bone/60 line-clamp-2">{p.description}</p>
          <p className="mt-1 text-gold">{brl(p.price_cents)} {has3d(p) && <span className="ml-2 text-xs border border-gold px-1.5 py-0.5">3D · AR</span>}{!p.is_available && <span className="ml-2 text-xs text-bone/50">Indisponível</span>}</p></div>
        <img loading="lazy" src={ph ? pub('photos', ph.storage_path) : placeholderFor(p.name)} alt="" className="w-24 h-24 object-cover" />
      </button>);
  };
  return (
    <main className="max-w-3xl mx-auto pb-28">
      <header className="px-5 pt-10 pb-8" style={{ background: `linear-gradient(#141312cc,#141312), url(${r.hero_url || '/placeholders/hero.svg'}) center/cover` }}>
        {r.logo_url && <img src={r.logo_url} alt="" className="h-14 mb-4" />}
        <h1 className="font-display text-6xl uppercase leading-none">{r.name}</h1>
        <p className="mt-3 text-gold">{r.tagline}</p>
        <p className="mt-4 text-sm text-bone/60">{r.address}{r.opening_hours?.text && ` · ${r.opening_hours.text}`}</p>
      </header>
      <nav className="sticky top-0 z-20 bg-coal/95 backdrop-blur flex gap-2 overflow-x-auto px-5 py-3 border-y border-bone/10">
        <button className={`btn-ghost whitespace-nowrap ${cat === 'all' ? 'border-ember' : ''}`} onClick={() => setCat('all')}>Tudo</button>
        {cats.filter((c: any) => c.is_active).map((c: any) => <button key={c.id} className={`btn-ghost whitespace-nowrap ${cat === c.id ? 'border-ember' : ''}`} onClick={() => setCat(c.id)}>{c.name}</button>)}
      </nav>
      <section className="px-5">
        {cat === 'all' && featured.length > 0 && <><h2 className="font-display text-2xl text-gold uppercase mt-6">Mais pedidos</h2>{featured.map((p: any) => <Card key={'f' + p.id} p={p} />)}<h2 className="font-display text-2xl text-gold uppercase mt-8">Cardápio completo</h2></>}
        {list.map((p: any) => <Card key={p.id} p={p} />)}
        {list.length === 0 && <p className="py-8 text-bone/60">Nenhum produto nesta categoria.</p>}
      </section>
      {sel && <ProductSheet p={sel} addons={addons} onClose={() => setSel(null)} track={e => supabase.rpc('track_event', { p_restaurant: r.id, p_product: sel.id, p_event: e })} />}
      <CartDrawer restaurant={r} />
    </main>
  );
}
