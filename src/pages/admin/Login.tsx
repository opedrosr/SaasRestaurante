import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function Login({ className }: { className: string }) {
  const [e, setE] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('');
  return <div className={className + ' grid place-items-center'}><div className="bg-white p-6 w-80 space-y-3 border">
    <h1 className="text-xl font-semibold">Entrar no painel</h1>
    <input className="field" placeholder="E-mail" value={e} onChange={x => setE(x.target.value)} />
    <input className="field" type="password" placeholder="Senha" value={p} onChange={x => setP(x.target.value)} />
    {err && <p className="text-sm text-red-600">{err}</p>}
    <button className="w-full bg-neutral-900 text-white py-2 text-sm" onClick={async () => { const { error } = await supabase.auth.signInWithPassword({ email: e, password: p }); if (error) setErr('E-mail ou senha inválidos.'); }}>Entrar</button>
  </div></div>;
}
