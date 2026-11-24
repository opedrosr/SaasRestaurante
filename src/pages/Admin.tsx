import { useEffect, useState, lazy, Suspense } from 'react';
import QRCode from 'qrcode';
import { supabase, configured, brl } from '../lib/supabase';
const Viewer = lazy(() => import('../components/ProductModelViewer'));

type Tab = 'dash' | 'cats' | 'prods' | 'conf';
const MAX_MODEL = 15 * 1024 * 1024, MAX_IMG = 5 * 1024 * 1024;
const L = ({ t, children }: any) => <label className="block text-xs text-neutral-600 mb-1">{t}{children}</label>;

export default function Admin() {
  const [user, setUser] = useState<any>(null); const [rest, setRest] = useState<any>(null); const [tab, setTab] = useState<Tab>('dash'); const [msg, setMsg] = useState('');
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: s } = supabase.auth.onAuthStateChange((_e, ses) => setUser(ses?.user ?? null)); return () => s.subscription.unsubscribe(); }, []);
  useEffect(() => { if (!user) return setRest(null);
    supabase.from('restaurant_members').select('restaurants(*)').eq('user_id', user.id).limit(1).maybeSingle()
      .then(({ data }) => setRest((data as any)?.restaurants ?? null)); }, [user]);

  const base = 'min-h-screen bg-neutral-100 text-neutral-900 font-body';
  if (!configured) return <div className={base + ' p-8'}>Backend não configurado. Preencha o .env.</div>;
  if (!user) return <Login className={base} />;
  if (!rest) return <div className={base + ' p-8'}>Seu usuário não está vinculado a nenhum restaurante. Veja o README (vincular usuário).</div>;
  return (
    <div className={base + ' md:flex'}>
      <aside className="md:w-56 bg-neutral-900 text-neutral-200 p-4 md:min-h-screen flex md:block gap-2 overflow-x-auto">
        <p className="hidden md:block font-semibold mb-6">{rest.name}</p>
        {([['dash', 'Painel'], ['cats', 'Categorias'], ['prods', 'Produtos'], ['conf', 'Configurações e QR']] as [Tab, string][]).map(([k, n]) =>
          <button key={k} onClick={() => setTab(k)} className={`block w-full text-left px-3 py-2 text-sm whitespace-nowrap ${tab === k ? 'bg-white text-neutral-900' : 'hover:bg-neutral-800'}`}>{n}</button>)}
        <button className="block px-3 py-2 text-sm text-neutral-400 md:mt-8" onClick={() => supabase.auth.signOut()}>Sair</button>
      </aside>
      <main className="flex-1 p-5 md:p-8 max-w-4xl">
        {msg && <p className="mb-4 text-sm bg-white border px-3 py-2" role="status">{msg}</p>}
        {tab === 'dash' && <Dash rest={rest} />}
        {tab === 'cats' && <Cats rest={rest} say={setMsg} />}
        {tab === 'prods' && <Prods rest={rest} say={setMsg} />}
        {tab === 'conf' && <Conf rest={rest} setRest={setRest} say={setMsg} />}
      </main>
    </div>);
}

function Login({ className }: { className: string }) {
  const [e, setE] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('');
  return <div className={className + ' grid place-items-center'}><div className="bg-white p-6 w-80 space-y-3 border">
    <h1 className="text-xl font-semibold">Entrar no painel</h1>
    <input className="field" placeholder="E-mail" value={e} onChange={x => setE(x.target.value)} />
    <input className="field" type="password" placeholder="Senha" value={p} onChange={x => setP(x.target.value)} />
    {err && <p className="text-sm text-red-600">{err}</p>}
    <button className="w-full bg-neutral-900 text-white py-2 text-sm" onClick={async () => { const { error } = await supabase.auth.signInWithPassword({ email: e, password: p }); if (error) setErr('E-mail ou senha inválidos.'); }}>Entrar</button>
  </div></div>;
}

function Dash({ rest }: { rest: any }) {
  const [s, setS] = useState<any>(null);
  useEffect(() => { (async () => {
    const [p, c, ev] = await Promise.all([supabase.from('products').select('is_published,is_available').eq('restaurant_id', rest.id),
      supabase.from('categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', rest.id),
      supabase.from('analytics_events').select('event').eq('restaurant_id', rest.id)]);
    const pr = p.data || [], e = ev.data || [], n = (k: string) => e.filter((x: any) => x.event === k).length;
    setS({ total: pr.length, cats: c.count ?? 0, pub: pr.filter(x => x.is_published).length, off: pr.filter(x => !x.is_available).length, mv: n('menu_view'), m3: n('model_view'), ar: n('ar_click') });
  })(); }, [rest.id]);
  if (!s) return <p>Carregando…</p>;
  const K = ({ k, v }: any) => <div className="bg-white border p-4"><p className="text-3xl font-semibold">{v}</p><p className="text-xs text-neutral-500">{k}</p></div>;
  return <div><h1 className="text-2xl font-semibold mb-4">Painel</h1><div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <K k="Produtos" v={s.total} /><K k="Categorias" v={s.cats} /><K k="Publicados" v={s.pub} /><K k="Indisponíveis" v={s.off} />
    <K k="Acessos ao cardápio" v={s.mv} /><K k="Aberturas do 3D" v={s.m3} /><K k="Cliques em AR" v={s.ar} /></div></div>;
}

function Cats({ rest, say }: any) {
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

const empty = { name: '', description: '', price: '', category_id: '', ingredients: '', weight_g: '', is_available: true, is_published: false, is_featured: false,
  fw: '', fd: '', fh: '', pw: '', pd: '', ph: '' };

function Prods({ rest, say }: any) {
  const [prods, setProds] = useState<any[]>([]); const [cats, setCats] = useState<any[]>([]); const [edit, setEdit] = useState<any>(null);
  const load = async () => { setProds((await supabase.from('products').select('*, product_models(*), product_dimensions(*)').eq('restaurant_id', rest.id).order('sort_order')).data || []);
    setCats((await supabase.from('categories').select('*').eq('restaurant_id', rest.id).order('sort_order')).data || []); };
  useEffect(() => { load(); }, []);
  if (edit) return <Form rest={rest} cats={cats} init={edit} say={say} done={() => { setEdit(null); load(); }} />;
  return <div><div className="flex justify-between mb-4"><h1 className="text-2xl font-semibold">Produtos</h1>
    <button className="bg-neutral-900 text-white px-4 py-2 text-sm" onClick={() => setEdit({ ...empty })}>Novo produto</button></div>
    {prods.map(p => { const m = p.product_models?.find((x: any) => x.is_active); const f = p.product_dimensions?.find((d: any) => d.kind === 'food'), k = p.product_dimensions?.find((d: any) => d.kind === 'packaging');
      return <div key={p.id} className="bg-white border p-3 mb-1 flex items-center justify-between gap-3">
        <div><b>{p.name}</b> <span className="text-sm text-neutral-500">{brl(p.price_cents)}</span>
          <p className="text-xs text-neutral-500">{p.is_published ? 'Publicado' : 'Rascunho'} · {p.is_available ? 'Disponível' : 'Indisponível'} · {m?.status === 'valid' ? 'Com 3D' : 'Sem modelo 3D'}</p></div>
        <div className="flex gap-3 text-sm"><button onClick={() => setEdit({ id: p.id, name: p.name, description: p.description || '', price: String(p.price_cents / 100), category_id: p.category_id || '', ingredients: (p.ingredients || []).join(', '),
          weight_g: p.weight_g ?? '', is_available: p.is_available, is_published: p.is_published, is_featured: p.is_featured, fw: f?.width_cm ?? '', fd: f?.depth_cm ?? '', fh: f?.height_cm ?? '', pw: k?.width_cm ?? '', pd: k?.depth_cm ?? '', ph: k?.height_cm ?? '', model: m })}>Editar</button>
          <button className="text-red-600" onClick={async () => { if (confirm('Excluir produto?')) { await supabase.from('products').delete().eq('id', p.id); load(); } }}>Excluir</button></div></div>; })}</div>;
}

function Form({ rest, cats, init, say, done }: any) {
  const [f, setF] = useState<any>(init); const [img, setImg] = useState<File[]>([]); const [glb, setGlb] = useState<File | null>(null); const [usdz, setUsdz] = useState<File | null>(null);
  const [glbUrl, setGlbUrl] = useState(''); const [loaded, setLoaded] = useState<boolean | null>(null); const [calib, setCalib] = useState<any>(null); const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const n = (v: any) => Number(String(v).replace(',', '.'));
  const hasDims = n(f.fw) > 0 && n(f.fd) > 0 && n(f.fh) > 0;

  const pickGlb = (file?: File) => { if (!file) return; setLoaded(null); setCalib(null);
    if (!/\.(glb|gltf)$/i.test(file.name)) return say('Formato inválido: envie GLB ou GLTF.');
    if (file.size > MAX_MODEL) return say('Modelo acima de 15 MB. Otimize o arquivo (Draco/meshopt).');
    setGlb(file); setGlbUrl(URL.createObjectURL(file)); say(''); };

  const save = async () => {
    if (!f.name.trim() || !(n(f.price) >= 0) || f.price === '') return say('Informe nome e preço.');
    if (glb && !hasDims) return say('Informe as dimensões do alimento para calibrar o modelo.');
    if (glb && loaded !== true) return say('O modelo ainda não foi verificado. Aguarde a pré-visualização carregar.');
    if (img.some(i => i.size > MAX_IMG)) return say('Imagem acima de 5 MB.');
    setBusy(true);
    try {
      const row = { restaurant_id: rest.id, name: f.name.trim(), description: f.description, price_cents: Math.round(n(f.price) * 100), category_id: f.category_id || null,
        ingredients: f.ingredients.split(',').map((s: string) => s.trim()).filter(Boolean), weight_g: f.weight_g === '' ? null : Number(f.weight_g),
        is_available: f.is_available, is_published: f.is_published, is_featured: f.is_featured };
      const q = f.id ? supabase.from('products').update(row).eq('id', f.id).select().single() : supabase.from('products').insert(row).select().single();
      const { data: p, error } = await q; if (error) throw error;
      const dim = (kind: string, w: any, d: any, h: any) => n(w) > 0 && n(d) > 0 && n(h) > 0 &&
        supabase.from('product_dimensions').upsert({ product_id: p.id, restaurant_id: rest.id, kind, width_cm: n(w), depth_cm: n(d), height_cm: n(h) });
      for (const x of [dim('food', f.fw, f.fd, f.fh), dim('packaging', f.pw, f.pd, f.ph)]) if (x) { const r: any = await x; if (r.error) throw r.error; }

      // CORREÇÃO: a foto só vira principal se o produto ainda não tiver uma principal.
      if (img.length > 0) {
        const { count } = await supabase.from('product_photos').select('id', { count: 'exact', head: true }).eq('product_id', p.id).eq('is_primary', true);
        let hasPrimary = (count ?? 0) > 0;
        for (const file of img) {
          const path = `${rest.id}/${p.id}/${Date.now()}-${file.name.replace(/[^\w.]/g, '_')}`;
          const up = await supabase.storage.from('photos').upload(path, file); if (up.error) throw up.error;
          const ins = await supabase.from('product_photos').insert({ product_id: p.id, restaurant_id: rest.id, storage_path: path, is_primary: !hasPrimary });
          if (ins.error) throw ins.error;
          hasPrimary = true;
        }
      }

      if (glb) { const ts = Date.now(); const gp = `${rest.id}/${p.id}/${ts}.${glb.name.split('.').pop()!.toLowerCase()}`;
        const u1 = await supabase.storage.from('models').upload(gp, glb); if (u1.error) throw u1.error;
        let up2: string | null = null; if (usdz) { up2 = `${rest.id}/${p.id}/${ts}.usdz`; const u2 = await supabase.storage.from('models').upload(up2, usdz); if (u2.error) throw u2.error; }
        await supabase.from('product_models').update({ is_active: false }).eq('product_id', p.id);
        const ins = await supabase.from('product_models').insert({ product_id: p.id, restaurant_id: rest.id, glb_path: gp, usdz_path: up2, file_size_bytes: glb.size, scale_factor: calib?.factor ?? 1, status: 'valid' });
        if (ins.error) throw ins.error; }
      say('Produto salvo.'); done();
    } catch (e: any) { say('Erro ao salvar: ' + (e.message || e)); } finally { setBusy(false); }
  };

  const I = (k: string, t: string, type = 'text') => <L t={t}><input className="field" type={type} value={f[k]} onChange={e => set(k, e.target.value)} /></L>;
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">{f.id ? 'Editar produto' : 'Novo produto'}</h1>
    <div className="grid md:grid-cols-2 gap-3">{I('name', 'Nome')}{I('price', 'Preço (R$)')}
      <L t="Categoria"><select className="field" value={f.category_id} onChange={e => set('category_id', e.target.value)}><option value="">Sem categoria</option>{cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></L>{I('weight_g', 'Peso aproximado (g)', 'number')}</div>
    <L t="Descrição"><textarea className="field" value={f.description} onChange={e => set('description', e.target.value)} /></L>{I('ingredients', 'Ingredientes (separados por vírgula)')}
    <div className="flex gap-4 text-sm">{[['is_available', 'Disponível'], ['is_published', 'Publicado'], ['is_featured', 'Destaque']].map(([k, t]) => <label key={k}><input type="checkbox" checked={f[k]} onChange={e => set(k, e.target.checked)} /> {t}</label>)}</div>
    <fieldset className="border p-3"><legend className="text-sm font-medium">Dimensões do alimento (cm)</legend><div className="grid grid-cols-3 gap-2">{I('fw', 'Largura')}{I('fd', 'Profundidade')}{I('fh', 'Altura')}</div></fieldset>
    <fieldset className="border p-3"><legend className="text-sm font-medium">Embalagem (cm) — separada do alimento</legend><div className="grid grid-cols-3 gap-2">{I('pw', 'Comprimento')}{I('pd', 'Largura')}{I('ph', 'Altura')}</div></fieldset>
    <L t="Fotografias (a primeira vira a principal se o produto ainda não tiver; máx. 5 MB cada)"><input type="file" accept="image/*" multiple onChange={e => setImg(Array.from(e.target.files || []))} /></L>
    {img.length > 0 && <div className="flex gap-2">{img.map(i => <img key={i.name} src={URL.createObjectURL(i)} className="h-16 w-16 object-cover" alt="" />)}</div>}
    <fieldset className="border p-3 space-y-2"><legend className="text-sm font-medium">Modelo 3D</legend>
      {f.model && !glb && <p className="text-xs text-neutral-600">Modelo atual: válido. Envie outro arquivo para substituir (os dados do produto são mantidos).</p>}
      <L t="GLB ou GLTF (máx. 15 MB)"><input type="file" accept=".glb,.gltf" onChange={e => pickGlb(e.target.files?.[0])} /></L>
      <L t="USDZ para iPhone (opcional, precisa estar em escala real)"><input type="file" accept=".usdz" onChange={e => setUsdz(e.target.files?.[0] || null)} /></L>
      {glb && hasDims && <Suspense fallback={<p>Carregando pré-visualização…</p>}><div onLoadCapture={() => setLoaded(true)} onErrorCapture={() => setLoaded(false)}>
        <Viewer glbUrl={glbUrl} physicalCm={{ width: n(f.fw), depth: n(f.fd), height: n(f.fh) }} onCalibrated={c => { setCalib(c); setLoaded(true); }} /></div></Suspense>}
      {glb && !hasDims && <p className="text-sm text-amber-700">Preencha as dimensões do alimento para pré-visualizar com escala real.</p>}
      {calib && <p className="text-xs">Fator de escala calibrado: {calib.factor.toFixed(4)}× — {loaded ? 'modelo carregou corretamente.' : ''}</p>}
    </fieldset>
    <div className="flex gap-2"><button disabled={busy} className="bg-neutral-900 text-white px-5 py-2 text-sm disabled:opacity-50" onClick={save}>{busy ? 'Salvando…' : 'Salvar'}</button><button className="px-4 py-2 text-sm border" onClick={done}>Cancelar</button></div></div>;
}

function Conf({ rest, setRest, say }: any) {
  const [f, setF] = useState<any>({ name: rest.name, tagline: rest.tagline || '', address: rest.address || '', whatsapp: rest.whatsapp || '', instagram: rest.instagram || '', hours: rest.opening_hours?.text || '', logo_url: rest.logo_url || '', hero_url: rest.hero_url || '' });
  const [qr, setQr] = useState(''); const link = `${location.origin}/restaurante/${rest.slug}`;
  useEffect(() => { QRCode.toDataURL(link, { width: 640, margin: 2 }).then(setQr); }, [link]);
  const save = async () => { const { data, error } = await supabase.from('restaurants').update({ name: f.name, tagline: f.tagline, address: f.address, whatsapp: f.whatsapp, instagram: f.instagram, logo_url: f.logo_url || null, hero_url: f.hero_url || null, opening_hours: { text: f.hours } }).eq('id', rest.id).select().single();
    say(error ? 'Erro: ' + error.message : 'Configurações salvas.'); if (data) setRest(data); };
  const I = (k: string, t: string) => <L t={t}><input className="field" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></L>;
  return <div className="space-y-3"><h1 className="text-2xl font-semibold">Configurações</h1>
    {I('name', 'Nome')}{I('tagline', 'Frase de posicionamento')}{I('address', 'Endereço')}{I('hours', 'Horários (texto)')}{I('whatsapp', 'WhatsApp (com DDI, ex.: 5531999999999)')}{I('instagram', 'Instagram')}{I('logo_url', 'URL do logotipo')}{I('hero_url', 'URL da foto de destaque')}
    <button className="bg-neutral-900 text-white px-5 py-2 text-sm" onClick={save}>Salvar</button>
    <h2 className="font-semibold pt-4">QR Code do cardápio</h2><p className="text-sm text-neutral-600 break-all">{link}</p>
    {qr && <><img src={qr} className="w-48 border" alt="QR Code" /><a className="inline-block border px-4 py-2 text-sm" href={qr} download={`qrcode-${rest.slug}.png`}>Baixar PNG</a></>}</div>;
}