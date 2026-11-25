import { useEffect, useState } from 'react';
import { supabase, brl } from '../../lib/supabase';
import { orderCode } from '../../lib/orders';
const ST: Record<string, string> = { novo: 'Novo', preparo: 'Em preparo', concluido: 'Concluído', cancelado: 'Cancelado' };

export function Orders({ rest, say }: any) {
  const [list, setList] = useState<any[]>([]);
  const load = async () => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const { data } = await supabase.from('orders').select('*, order_items(*)').eq('restaurant_id', rest.id).gte('created_at', since).order('created_at', { ascending: false }).limit(500);
    setList(data || []); };
  useEffect(() => { load(); }, []);
  const setStatus = async (id: string, status: string) => { const { error } = await supabase.from('orders').update({ status }).eq('id', id); if (error) say('Erro: ' + error.message); load(); };
  const valid = list.filter(o => o.status !== 'cancelado');
  const today = new Date().toDateString(); const td = valid.filter(o => new Date(o.created_at).toDateString() === today);
  const sum = (a: any[]) => a.reduce((s, o) => s + o.total_cents, 0);
  const tally: Record<string, number> = {};
  valid.forEach(o => (o.order_items || []).forEach((i: any) => { tally[i.product_name] = (tally[i.product_name] || 0) + i.qty; }));
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const K = ({ k, v }: any) => <div className="bg-white border p-4"><p className="text-2xl font-semibold">{v}</p><p className="text-xs text-neutral-500">{k}</p></div>;
  return <div><h1 className="text-2xl font-semibold mb-4">Pedidos</h1>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <K k="Pedidos hoje" v={td.length} /><K k="Vendas hoje" v={brl(sum(td))} /><K k="Pedidos (30 dias)" v={valid.length} />
      <K k="Ticket médio (30 dias)" v={valid.length ? brl(Math.round(sum(valid) / valid.length)) : '—'} /></div>
    {top.length > 0 && <div className="bg-white border p-3 mb-4"><p className="text-sm font-medium mb-1">Mais pedidos (30 dias)</p>
      {top.map(([n, q]) => <p key={n} className="text-sm">{q}× {n}</p>)}</div>}
    {list.map(o => <div key={o.id} className="bg-white border p-3 mb-2">
      <div className="flex flex-wrap items-center justify-between gap-2"><b>#{orderCode(o.id)}</b>
        <span className="text-xs text-neutral-500">{new Date(o.created_at).toLocaleString('pt-BR')}</span><b>{brl(o.total_cents)}</b>
        <select className="field !w-auto" value={o.status} onChange={e => setStatus(o.id, e.target.value)}>{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      {(o.order_items || []).map((i: any) => <p key={i.id} className="text-sm mt-1">{i.qty}× {i.product_name} <span className="text-neutral-500">{(i.addons || []).map((a: any) => `+${a.qty}× ${a.name}`).join(' ')}{i.notes ? ` · Obs: ${i.notes}` : ''}</span></p>)}
      {o.notes && <p className="text-xs text-neutral-500 mt-1">Obs. do pedido: {o.notes}</p>}</div>)}
    {list.length === 0 && <p className="text-sm text-neutral-500">Nenhum pedido nos últimos 30 dias.</p>}</div>;
}
