import { useEffect, useState, lazy, Suspense } from 'react';
import { supabase, pub } from '../../lib/supabase';
import { L, MAX_MODEL, MAX_IMG } from './ui';
import { validateGlb, bakeScale } from '../../lib/glb';
const Viewer = lazy(() => import('../../components/ProductModelViewer'));

export function Form({ rest, cats, init, say, done }: any) {
  const [f, setF] = useState<any>(init); const [img, setImg] = useState<File[]>([]); const [glb, setGlb] = useState<File | null>(null); const [usdz, setUsdz] = useState<File | null>(null);
  const [glbUrl, setGlbUrl] = useState(''); const [loaded, setLoaded] = useState<boolean | null>(null); const [calib, setCalib] = useState<any>(null); const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const n = (v: any) => Number(String(v).replace(',', '.'));
  const hasDims = n(f.fw) > 0 && n(f.fd) > 0 && n(f.fh) > 0;
  const [photos, setPhotos] = useState<any[]>([]);
  const loadPhotos = async () => { if (!f.id) return; const { data } = await supabase.from('product_photos').select('*').eq('product_id', f.id).order('sort_order'); setPhotos(data || []); };
  useEffect(() => { loadPhotos(); }, []);
  const makePrimary = async (id: string) => {
    await supabase.from('product_photos').update({ is_primary: false }).eq('product_id', f.id);
    await supabase.from('product_photos').update({ is_primary: true }).eq('id', id); loadPhotos(); };
  const removePhoto = async (ph: any) => {
    if (!confirm('Excluir esta foto?')) return;
    await supabase.storage.from('photos').remove([ph.storage_path]);
    await supabase.from('product_photos').delete().eq('id', ph.id);
    if (ph.is_primary) { const next = photos.find(x => x.id !== ph.id); if (next) await supabase.from('product_photos').update({ is_primary: true }).eq('id', next.id); }
    loadPhotos(); };

  const pickGlb = async (file?: File) => { if (!file) return; setLoaded(null); setCalib(null);
    if (!/\.glb$/i.test(file.name)) return say('Envie um arquivo GLB. Se o seu modelo é GLTF com arquivos separados, converta para GLB.');
    if (file.size > MAX_MODEL) return say('Modelo acima de 15 MB. Otimize o arquivo (veja o README).');
    try { validateGlb(await file.arrayBuffer()); } catch (e: any) { setGlb(null); return say(e.message); }
    setGlb(file); setGlbUrl(URL.createObjectURL(file)); say(''); };

  const save = async () => {
    if (!f.name.trim() || !(n(f.price) >= 0) || f.price === '') return say('Informe nome e preço.');
    if (glb && !hasDims) return say('Informe as dimensões do alimento para calibrar o modelo.');
    if (glb && loaded === false) return say('O modelo não carregou. Verifique se o arquivo é um GLB/GLTF válido.');
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

      if (glb) { const ts = Date.now(); const gp = `${rest.id}/${p.id}/${ts}.glb`;
        const original = await glb.arrayBuffer(); const factor = calib?.factor ?? 1;
        const finalBuf = Math.abs(factor - 1) > 0.001 ? bakeScale(original, factor) : original; // escala real gravada no arquivo
        const u1 = await supabase.storage.from('models').upload(gp, new Blob([finalBuf], { type: 'model/gltf-binary' }), { contentType: 'model/gltf-binary' }); if (u1.error) throw u1.error;
        let up2: string | null = null; if (usdz) { up2 = `${rest.id}/${p.id}/${ts}.usdz`; const u2 = await supabase.storage.from('models').upload(up2, usdz); if (u2.error) throw u2.error; }
        await supabase.from('product_models').update({ is_active: false }).eq('product_id', p.id);
        const ins = await supabase.from('product_models').insert({ product_id: p.id, restaurant_id: rest.id, glb_path: gp, usdz_path: up2, file_size_bytes: finalBuf.byteLength, scale_factor: factor, measured_width_m: calib?.measuredM.width ?? null, measured_depth_m: calib?.measuredM.depth ?? null, measured_height_m: calib?.measuredM.height ?? null, status: 'valid' });
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
    {photos.length > 0 && <div className="flex flex-wrap gap-3">{photos.map(ph => <div key={ph.id} className="w-28 text-xs">
      <img src={pub('photos', ph.storage_path)} className="h-24 w-28 object-cover border" alt="" />
      {ph.is_primary ? <b className="block mt-1">Principal</b> : <button className="block mt-1 underline" onClick={() => makePrimary(ph.id)}>Tornar principal</button>}
      <button className="text-red-600 underline" onClick={() => removePhoto(ph)}>Excluir</button></div>)}</div>}
    {img.length > 0 && <div className="flex gap-2">{img.map(i => <img key={i.name} src={URL.createObjectURL(i)} className="h-16 w-16 object-cover" alt="" />)}</div>}
    <fieldset className="border p-3 space-y-2"><legend className="text-sm font-medium">Modelo 3D</legend>
      {f.model && !glb && <p className="text-xs text-neutral-600">Modelo atual: válido. Envie outro arquivo para substituir (os dados do produto são mantidos).</p>}
      <L t="GLB (máx. 15 MB). A escala real é gravada no arquivo ao salvar."><input type="file" accept=".glb" onChange={e => pickGlb(e.target.files?.[0])} /></L>
      <L t="USDZ para iPhone (opcional, precisa estar em escala real)"><input type="file" accept=".usdz" onChange={e => setUsdz(e.target.files?.[0] || null)} /></L>
      {glb && hasDims && <Suspense fallback={<p>Carregando pré-visualização…</p>}>
        <Viewer showAR={false} glbUrl={glbUrl} physicalCm={{ width: n(f.fw), depth: n(f.fd), height: n(f.fh) }} onCalibrated={c => { setCalib(c); setLoaded(true); }} onError={() => setLoaded(false)} /></Suspense>}
      {glb && !hasDims && <p className="text-sm text-amber-700">Preencha as dimensões do alimento para pré-visualizar com escala real.</p>}
      {calib && <p className="text-xs">Fator de escala calibrado: {calib.factor.toFixed(4)}× — modelo carregou corretamente.</p>}
    </fieldset>
    <div className="flex gap-2"><button disabled={busy} className="bg-neutral-900 text-white px-5 py-2 text-sm disabled:opacity-50" onClick={save}>{busy ? 'Salvando…' : 'Salvar'}</button><button className="px-4 py-2 text-sm border" onClick={done}>Cancelar</button></div></div>;
}
