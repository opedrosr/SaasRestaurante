import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function Login({ className }: { className: string }) {
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in');
  const [e, setE] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [info, setInfo] = useState('');
  const go = async () => {
    setErr(''); setInfo('');
    if (mode === 'in') { const { error } = await supabase.auth.signInWithPassword({ email: e, password: p }); if (error) setErr('E-mail ou senha inválidos.'); }
    if (mode === 'up') {
      if (p.length < 8) return setErr('Use uma senha com pelo menos 8 caracteres.');
      const { error } = await supabase.auth.signUp({ email: e, password: p, options: { emailRedirectTo: location.origin + '/admin' } });
      if (error) setErr(error.message); else setInfo('Conta criada. Confirme o e-mail que enviamos e depois entre.'); }
    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo: location.origin + '/admin' });
      if (error) setErr(error.message); else setInfo('Se o e-mail existir, enviamos um link para redefinir a senha.'); }
  };
  const title = { in: 'Entrar no painel', up: 'Criar conta (convidado)', reset: 'Recuperar senha' }[mode];
  return <div className={className + ' grid place-items-center'}><div className="bg-white p-6 w-80 space-y-3 border">
    <h1 className="text-xl font-semibold">{title}</h1>
    <input className="field" placeholder="E-mail" value={e} onChange={x => setE(x.target.value)} />
    {mode !== 'reset' && <input className="field" type="password" placeholder="Senha" value={p} onChange={x => setP(x.target.value)} />}
    {err && <p className="text-sm text-red-600">{err}</p>}{info && <p className="text-sm text-green-700">{info}</p>}
    <button className="w-full bg-neutral-900 text-white py-2 text-sm" onClick={go}>{mode === 'in' ? 'Entrar' : mode === 'up' ? 'Criar conta' : 'Enviar link'}</button>
    <div className="flex justify-between text-xs text-neutral-600">
      {mode === 'in' ? <><button onClick={() => setMode('reset')}>Esqueci minha senha</button><button onClick={() => setMode('up')}>Fui convidado</button></> : <button onClick={() => setMode('in')}>Voltar</button>}</div>
  </div></div>;
}
