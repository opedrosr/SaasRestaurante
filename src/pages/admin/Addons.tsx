import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function Addons({ rest, say }: any) {
  const [list, setList] = useState<any[]>([]); const [prods, setProds] = useState<any[]>([]);
  const [f, setF] = useState({ name: '', price: '', max: '3', product_id: '' });
  const n = (v: string) => Number(String(v).replace(',', '.'));
  const load = async () => {
    setList((await supabase.from('addons').select('*').eq('restaurant_id', rest.id).order('name')).data || []);
    setProds((await supabase.from('products').select('id,name').eq('restaurant_id', rest.id).order('name')).data || []); };
  useEffect(() => { load(); }, []);
  const run = async (q: any, ok: string) => { const { error } = await q; say(error ? 'Erro: ' + error.message : ok); load(); };
  const create = async () => {
    if (!f.name.trim() || f.price === '' || !(n(f.price) >= 0)) return say('Informe nome e preço.');
    await run(supabase.from('addons').insert({ restaurant_id: rest.id, product_id: f.product_id || null, name: f.name.trim(), price_cents: Math.round(n(f.price) * 100), max_qty: Math.max(1, Number(f.max) || 1) }), 'Adicional criado.');
    setF({ name: '', price: '', max: '3', product_id: '' }); };
  const upd = (id: string, patch: any) => run(supabase.from('addons').update(patch).eq('id', id), 'Salvo.');
  return <div><h1 className="text-2xl font-semibold mb-4">Adicionais</h1>
    <div className="bg-white border p-3 mb-4 grid md:grid-cols-5 gap-2 items-end">
      <input className="field md:col-span-2" placeholder="Nome (ex.: Bacon extra)" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <input className="field" placeholder="Preço (R$)" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} />
      <input className="field" type="number" min={1} placeholder="Máx." value={f.max} onChange={e => setF({ ...f, max: e.target.value })} />
      <select className="field" value={f.product_id} onChange={e => setF({ ...f, product_id: e.target.value })}><option value="">Todos os produtos</option>{prods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <button className="bg-neutral-900 text-white px-4 py-2 text-sm md:col-span-5" onClick={create}>Criar adicional</button></div>
    {list.map(a => <div key={a.id} className="bg-white border p-2 mb-1 grid md:grid-cols-[1fr_90px_70px_170px_auto_auto] gap-2 items-center">
      <input className="field" defaultValue={a.name} onBlur={e => e.target.value.trim() && e.target.value !== a.name && upd(a.id, { name: e.target.value.trim() })} />
      <input className="field" defaultValue={(a.price_cents / 100).toFixed(2).replace('.', ',')} onBlur={e => n(e.target.value) >= 0 && Math.round(n(e.target.value) * 100) !== a.price_cents && upd(a.id, { price_cents: Math.round(n(e.target.value) * 100) })} />
      <input className="field" type="number" min={1} defaultValue={a.max_qty} onBlur={e => Number(e.target.value) >= 1 && Number(e.target.value) !== a.max_qty && upd(a.id, { max_qty: Number(e.target.value) })} />
      <select className="field" value={a.product_id || ''} onChange={e => upd(a.id, { product_id: e.target.value || null })}><option value="">Todos os produtos</option>{prods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={a.is_available} onChange={e => upd(a.id, { is_available: e.target.checked })} />Disponível</label>
      <button className="text-red-600 text-sm" onClick={() => confirm('Excluir adicional?') && run(supabase.from('addons').delete().eq('id', a.id), 'Excluído.')}>Excluir</button></div>)}
    {list.length === 0 && <p className="text-sm text-neutral-500">Nenhum adicional cadastrado.</p>}</div>;
}
