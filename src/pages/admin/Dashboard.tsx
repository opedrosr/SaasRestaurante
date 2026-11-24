import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function Dash({ rest }: { rest: any }) {
  const [s, setS] = useState<any>(null); const [err, setErr] = useState('');
  useEffect(() => { (async () => {
    const [p, c, ev] = await Promise.all([supabase.from('products').select('is_published,is_available').eq('restaurant_id', rest.id),
      supabase.from('categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', rest.id),
      supabase.from('analytics_events').select('event').eq('restaurant_id', rest.id)]);
    const pr = p.data || [], e = ev.data || [], n = (k: string) => e.filter((x: any) => x.event === k).length;
    setS({ total: pr.length, cats: c.count ?? 0, pub: pr.filter(x => x.is_published).length, off: pr.filter(x => !x.is_available).length, mv: n('menu_view'), m3: n('model_view'), ar: n('ar_click') });
  })().catch(() => setErr('Não foi possível carregar os números.')); }, [rest.id]);
  if (err) return <p role="alert">{err}</p>;
  if (!s) return <p>Carregando…</p>;
  const K = ({ k, v }: any) => <div className="bg-white border p-4"><p className="text-3xl font-semibold">{v}</p><p className="text-xs text-neutral-500">{k}</p></div>;
  return <div><h1 className="text-2xl font-semibold mb-4">Painel</h1><div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <K k="Produtos" v={s.total} /><K k="Categorias" v={s.cats} /><K k="Publicados" v={s.pub} /><K k="Indisponíveis" v={s.off} />
    <K k="Acessos ao cardápio" v={s.mv} /><K k="Aberturas do 3D" v={s.m3} /><K k="Cliques em AR" v={s.ar} /></div></div>;
}
