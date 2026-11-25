import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { supabase, configured } from '../lib/supabase';
import { Login } from './admin/Login';
import { Dash } from './admin/Dashboard';
import { Cats } from './admin/Categories';
import { Prods } from './admin/Products';
import { Conf } from './admin/Settings';

const NAV: [string, string][] = [['/admin', 'Painel'], ['/admin/categorias', 'Categorias'], ['/admin/produtos', 'Produtos'], ['/admin/configuracoes', 'Configurações e QR']];

export default function Admin() {
  const [user, setUser] = useState<any>(null); const [rest, setRest] = useState<any>(null);
  const [ready, setReady] = useState(false); const [msg, setMsg] = useState('');
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setReady(true); }).catch(() => setReady(true));
    const { data: s } = supabase.auth.onAuthStateChange((_e, ses) => setUser(ses?.user ?? null));
    return () => s.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!user) { setRest(null); return; }
    supabase.from('restaurant_members').select('restaurants(*)').eq('user_id', user.id).limit(1).maybeSingle()
      .then(({ data }) => setRest((data as any)?.restaurants ?? null));
  }, [user]);

  const base = 'min-h-screen bg-neutral-100 text-neutral-900 font-body';
  if (!configured) return <div className={base + ' p-8'}>Backend não configurado. Preencha o .env.</div>;
  if (!ready) return <div className={base + ' p-8'}>Carregando…</div>;
  if (!user) return <Login className={base} />;
  if (!rest) return <div className={base + ' p-8'}>Seu usuário não está vinculado a nenhum restaurante. Peça ao responsável para vincular sua conta.</div>;
  return (
    <div className={base + ' md:flex'}>
      <aside className="md:w-56 bg-neutral-900 text-neutral-200 p-4 md:min-h-screen flex md:block gap-2 overflow-x-auto">
        <p className="hidden md:block font-semibold mb-6">{rest.name}</p>
        {NAV.map(([to, n]) => <NavLink key={to} to={to} end={to === '/admin'} onClick={() => setMsg('')}
          className={({ isActive }) => `block w-full text-left px-3 py-2 text-sm whitespace-nowrap ${isActive ? 'bg-white text-neutral-900' : 'hover:bg-neutral-800'}`}>{n}</NavLink>)}
        <button className="block px-3 py-2 text-sm text-neutral-400 md:mt-8" onClick={() => supabase.auth.signOut()}>Sair</button>
      </aside>
      <main className="flex-1 p-5 md:p-8 max-w-4xl">
        {msg && <p className="mb-4 text-sm bg-white border px-3 py-2" role="status">{msg}</p>}
        <Routes>
          <Route index element={<Dash rest={rest} />} />
          <Route path="categorias" element={<Cats rest={rest} say={setMsg} />} />
          <Route path="produtos" element={<Prods rest={rest} say={setMsg} />} />
          <Route path="configuracoes" element={<Conf rest={rest} setRest={setRest} say={setMsg} />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>);
}
