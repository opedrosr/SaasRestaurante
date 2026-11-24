import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function Cats({ rest, say }: any) {
  const [list, setList] = useState<any[]>([]); const [name, setName] = useState('');
  const load = async () => setList((await supabase.from('categories').select('*').eq('restaurant_id', rest.id).order('sort_order')).data || []);
  useEffect(() => { load(); }, []);
  const run = async (q: any, ok: string) => { const { error } = await q; say(error ? 'Erro: ' + error.message : ok); load(); };
  const move = async (i: number, d: number) => { const a = list[i], b = list[i + d]; if (!b) return;
    await supabase.from('categories').update({ sort_order: b.sort_order }).eq('id', a.id); await supabase.from('categories').update({ sort_order: a.sort_order }).eq('id', b.id); load(); };
  return <div><h1 className="text-2xl font-semibold mb-4">Categorias</h1>
    <div className="flex gap-2 mb-4"><input className="field" placeholder="Nova categoria" value={name} onChange={e => setName(e.target.value)} />
      <button className="bg-neutral-900 text-white px-4 text-sm" onClick={() => { if (name.trim()) run(supabase.from('categories').insert({ restaurant_id: rest.id, name: name.trim(), sort_order: list.length }), 'Categoria criada.'); setName(''); }}>Criar</button></div>
    {list.map((c, i) => <div key={c.id} className="bg-white border p-2 mb-1 flex items-center gap-2">
      <input className="field flex-1" defaultValue={c.name} onBlur={e => e.target.value !== c.name && run(supabase.from('categories').update({ name: e.target.value }).eq('id', c.id), 'Salvo.')} />
      <button onClick={() => move(i, -1)} aria-label="Subir">↑</button><button onClick={() => move(i, 1)} aria-label="Descer">↓</button>
      <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={c.is_active} onChange={e => run(supabase.from('categories').update({ is_active: e.target.checked }).eq('id', c.id), 'Atualizado.')} />Ativa</label>
      <button className="text-red-600 text-sm" onClick={() => confirm('Excluir categoria?') && run(supabase.from('categories').delete().eq('id', c.id), 'Excluída.')}>Excluir</button></div>)}</div>;
}
