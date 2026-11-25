import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function Team({ rest, say }: any) {
  const [members, setMembers] = useState<any[]>([]); const [invites, setInvites] = useState<any[]>([]);
  const [email, setEmail] = useState(''); const [role, setRole] = useState('editor');
  const load = async () => {
    setMembers((await supabase.rpc('team_members', { p_restaurant: rest.id })).data || []);
    setInvites((await supabase.from('restaurant_invites').select('*').eq('restaurant_id', rest.id)).data || []); };
  useEffect(() => { load(); }, []);
  const run = async (q: any, ok: string) => { const { error } = await q; say(error ? 'Erro: ' + error.message : ok); load(); };
  return <div><h1 className="text-2xl font-semibold mb-2">Equipe</h1>
    <p className="text-sm text-neutral-600 mb-4">Convide pelo e-mail. A pessoa abre /admin, escolhe “Criar conta”, usa o mesmo e-mail, confirma o e-mail recebido e entra. Só donos convidam e removem.</p>
    <div className="bg-white border p-3 mb-4 flex flex-wrap gap-2">
      <input className="field flex-1 min-w-[200px]" placeholder="E-mail do convidado" value={email} onChange={e => setEmail(e.target.value)} />
      <select className="field !w-auto" value={role} onChange={e => setRole(e.target.value)}><option value="editor">Editor</option><option value="owner">Dono</option></select>
      <button className="bg-neutral-900 text-white px-4 py-2 text-sm" onClick={async () => { if (!/.+@.+\..+/.test(email)) return say('E-mail inválido.'); await run(supabase.from('restaurant_invites').insert({ restaurant_id: rest.id, email: email.trim().toLowerCase(), role }), 'Convite criado.'); setEmail(''); }}>Convidar</button></div>
    <h2 className="font-medium mb-1">Membros</h2>
    {members.map(m => <div key={m.user_id} className="bg-white border p-2 mb-1 flex justify-between items-center text-sm"><span>{m.email} · {m.role === 'owner' ? 'Dono' : 'Editor'}</span>
      <button className="text-red-600" onClick={() => confirm('Remover este membro?') && run(supabase.rpc('remove_member', { p_restaurant: rest.id, p_user: m.user_id }), 'Membro removido.')}>Remover</button></div>)}
    <h2 className="font-medium mt-4 mb-1">Convites pendentes</h2>
    {invites.map(i => <div key={i.id} className="bg-white border p-2 mb-1 flex justify-between items-center text-sm"><span>{i.email} · {i.role === 'owner' ? 'Dono' : 'Editor'}</span>
      <button className="text-red-600" onClick={() => run(supabase.from('restaurant_invites').delete().eq('id', i.id), 'Convite cancelado.')}>Cancelar</button></div>)}
    {invites.length === 0 && <p className="text-sm text-neutral-500">Nenhum convite pendente.</p>}</div>;
}
