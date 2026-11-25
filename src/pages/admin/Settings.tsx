import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { supabase, pub } from '../../lib/supabase';
import { L } from './ui';
import { DAY_NAMES } from '../../lib/hours';

const defWeek = () => Array.from({ length: 7 }, () => ({ closed: false, open: '18:00', close: '23:00' }));

export function Conf({ rest, setRest, say }: any) {
  const oh = rest.opening_hours || {};
  const [f, setF] = useState<any>({ name: rest.name, tagline: rest.tagline || '', description: rest.description || '', address: rest.address || '', whatsapp: rest.whatsapp || '', instagram: rest.instagram || '',
    hours: oh.text || '', logo_url: rest.logo_url || '', hero_url: rest.hero_url || '', color: rest.brand_colors?.primary || '#FFD21E' });
  const [week, setWeek] = useState<any[]>(oh.week?.length === 7 ? oh.week : defWeek());
  const [qr, setQr] = useState('');
  const link = rest.custom_domain ? `https://${rest.custom_domain}` : `${location.origin}/restaurante/${rest.slug}`;
  useEffect(() => { QRCode.toDataURL(link, { width: 640, margin: 2 }).then(setQr); }, [link]);
  const setDay = (i: number, patch: any) => setWeek(w => w.map((d, k) => k === i ? { ...d, ...patch } : d));

  const upBrand = async (file: File | undefined, key: 'logo_url' | 'hero_url') => {
    if (!file) return; if (file.size > 5 * 1024 * 1024) return say('Imagem acima de 5 MB.');
    const path = `${rest.id}/brand/${key}-${Date.now()}-${file.name.replace(/[^\w.]/g, '_')}`;
    const { error } = await supabase.storage.from('photos').upload(path, file);
    if (error) return say('Erro no upload: ' + error.message);
    setF((p: any) => ({ ...p, [key]: pub('photos', path) })); say('Imagem enviada. Clique em Salvar para aplicar.'); };

  const save = async () => {
    const { data, error } = await supabase.from('restaurants').update({
      name: f.name, tagline: f.tagline, description: f.description, address: f.address, whatsapp: f.whatsapp, instagram: f.instagram,
      logo_url: f.logo_url || null, hero_url: f.hero_url || null, brand_colors: { ...(rest.brand_colors || {}), primary: f.color },
      opening_hours: { ...oh, text: f.hours, tz: oh.tz || 'America/Sao_Paulo', week } }).eq('id', rest.id).select().single();
    say(error ? 'Erro: ' + error.message : 'Configurações salvas.'); if (data) setRest(data); };
  const I = (k: string, t: string) => <L t={t}><input className="field" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></L>;

  return <div className="space-y-3"><h1 className="text-2xl font-semibold">Configurações</h1>
    {I('name', 'Nome')}{I('tagline', 'Frase de posicionamento')}
    <L t="Descrição (aparece no cardápio)"><textarea className="field" rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></L>
    {I('address', 'Endereço')}{I('whatsapp', 'WhatsApp (com DDI, ex.: 5531999999999)')}{I('instagram', 'Instagram')}
    <L t="Cor da marca"><input type="color" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} /></L>
    <L t="Logotipo"><input type="file" accept="image/*" onChange={e => upBrand(e.target.files?.[0], 'logo_url')} /></L>{f.logo_url && <img src={f.logo_url} alt="" className="h-12" />}
    <L t="Foto de destaque do cardápio"><input type="file" accept="image/*" onChange={e => upBrand(e.target.files?.[0], 'hero_url')} /></L>{f.hero_url && <img src={f.hero_url} alt="" className="h-24 object-cover" />}
    <fieldset className="border p-3"><legend className="text-sm font-medium">Horário de funcionamento (fuso de Brasília)</legend>
      {week.map((d, i) => <div key={i} className="flex flex-wrap items-center gap-2 py-1 text-sm">
        <span className="w-20">{DAY_NAMES[i]}</span>
        <label className="flex items-center gap-1"><input type="checkbox" checked={!d.closed} onChange={e => setDay(i, { closed: !e.target.checked })} />Aberto</label>
        {!d.closed && <><input className="field !w-28" type="time" value={d.open} onChange={e => setDay(i, { open: e.target.value })} /> até <input className="field !w-28" type="time" value={d.close} onChange={e => setDay(i, { close: e.target.value })} /></>}</div>)}
      <p className="text-xs text-neutral-500 mt-1">Se fechar depois da meia-noite, coloque o horário normalmente (ex.: 18:00 até 02:00).</p>
      {I('hours', 'Observação de horário (opcional)')}</fieldset>
    <button className="bg-neutral-900 text-white px-5 py-2 text-sm" onClick={save}>Salvar</button>
    <h2 className="font-semibold pt-4">QR Code do cardápio</h2><p className="text-sm text-neutral-600 break-all">{link}</p>
    {qr && <><img src={qr} className="w-48 border" alt="QR Code" /><a className="inline-block border px-4 py-2 text-sm" href={qr} download={`qrcode-${rest.slug}.png`}>Baixar PNG</a></>}</div>;
}
