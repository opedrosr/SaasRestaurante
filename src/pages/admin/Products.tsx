import { useEffect, useState } from 'react';
import { supabase, brl } from '../../lib/supabase';
import { Form } from './ProductForm';

const empty = { name: '', description: '', price: '', category_id: '', ingredients: '', weight_g: '', is_available: true, is_published: false, is_featured: false,
  fw: '', fd: '', fh: '', pw: '', pd: '', ph: '' };

export function Prods({ rest, say }: any) {
  const [prods, setProds] = useState<any[]>([]); const [cats, setCats] = useState<any[]>([]); const [edit, setEdit] = useState<any>(null);
  const load = async () => { setProds((await supabase.from('products').select('*, product_models(*), product_dimensions(*)').eq('restaurant_id', rest.id).order('sort_order')).data || []);
    setCats((await supabase.from('categories').select('*').eq('restaurant_id', rest.id).order('sort_order')).data || []); };
  useEffect(() => { load(); }, []);
  const move = async (i: number, d: number) => {
    const arr = [...prods]; const j = i + d; if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    await Promise.all(arr.map((p, idx) => supabase.from('products').update({ sort_order: idx }).eq('id', p.id))); load(); };
  const toggle = async (id: string, k: string, v: boolean) => { const { error } = await supabase.from('products').update({ [k]: v }).eq('id', id); if (error) say('Erro: ' + error.message); load(); };
  if (edit) return <Form rest={rest} cats={cats} init={edit} say={say} done={() => { setEdit(null); load(); }} />;
  return <div><div className="flex justify-between mb-4"><h1 className="text-2xl font-semibold">Produtos</h1>
    <button className="bg-neutral-900 text-white px-4 py-2 text-sm" onClick={() => setEdit({ ...empty })}>Novo produto</button></div>
    {prods.map((p, i) => { const m = p.product_models?.find((x: any) => x.is_active); const f = p.product_dimensions?.find((d: any) => d.kind === 'food'), k = p.product_dimensions?.find((d: any) => d.kind === 'packaging');
      return <div key={p.id} className="bg-white border p-3 mb-1 flex items-center justify-between gap-3">
        <div><b>{p.name}</b> <span className="text-sm text-neutral-500">{brl(p.price_cents)}</span>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-600">
            <label className="flex items-center gap-1"><input type="checkbox" checked={p.is_available} onChange={e => toggle(p.id, 'is_available', e.target.checked)} />Disponível</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={p.is_published} onChange={e => toggle(p.id, 'is_published', e.target.checked)} />Publicado</label>
            <span>{m?.status === 'valid' ? 'Com 3D' : 'Sem modelo 3D'}</span></p></div>
        <div className="flex gap-3 text-sm"><button onClick={() => move(i, -1)} aria-label="Subir">↑</button><button onClick={() => move(i, 1)} aria-label="Descer">↓</button><button onClick={() => setEdit({ id: p.id, name: p.name, description: p.description || '', price: String(p.price_cents / 100), category_id: p.category_id || '', ingredients: (p.ingredients || []).join(', '),
          weight_g: p.weight_g ?? '', is_available: p.is_available, is_published: p.is_published, is_featured: p.is_featured, fw: f?.width_cm ?? '', fd: f?.depth_cm ?? '', fh: f?.height_cm ?? '', pw: k?.width_cm ?? '', pd: k?.depth_cm ?? '', ph: k?.height_cm ?? '', model: m })}>Editar</button>
          <button className="text-red-600" onClick={async () => { if (confirm('Excluir produto?')) { await supabase.from('products').delete().eq('id', p.id); load(); } }}>Excluir</button></div></div>; })}</div>;
}
