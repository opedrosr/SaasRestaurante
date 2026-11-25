import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function ResetPassword({ className, done }: { className: string; done: () => void }) {
  const [p, setP] = useState(''); const [msg, setMsg] = useState('');
  const save = async () => {
    if (p.length < 8) return setMsg('Use uma senha com pelo menos 8 caracteres.');
    const { error } = await supabase.auth.updateUser({ password: p });
    if (error) return setMsg(error.message);
    setMsg('Senha alterada.'); setTimeout(done, 800); };
  return <div className={className + ' grid place-items-center'}><div className="bg-white p-6 w-80 space-y-3 border">
    <h1 className="text-xl font-semibold">Nova senha</h1>
    <input className="field" type="password" placeholder="Nova senha (mín. 8 caracteres)" value={p} onChange={e => setP(e.target.value)} />
    {msg && <p className="text-sm text-neutral-700">{msg}</p>}
    <button className="w-full bg-neutral-900 text-white py-2 text-sm" onClick={save}>Salvar senha</button></div></div>;
}
