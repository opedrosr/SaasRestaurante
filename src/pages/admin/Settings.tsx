import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { supabase, pub } from '../../lib/supabase';
import { L } from './ui';

export function Conf({ rest, setRest, say }: any) {
  const [f, setF] = useState<any>({ name: rest.name, tagline: rest.tagline || '', address: rest.address || '', whatsapp: rest.whatsapp || '', instagram: rest.instagram || '', hours: rest.opening_hours?.text || '', logo_url: rest.logo_url || '', hero_url: rest.hero_url || '' });
  const [qr, setQr] = useState(''); const link = `${location.origin}/restaurante/${rest.slug}`;
  useEffect(() => { QRCode.toDataURL(link, { width: 640, margin: 2 }).then(setQr); }, [link]);
  const save = async () => { const { data, error } = await supabase.from('restaurants').update({ name: f.name, tagline: f.tagline, address: f.address, whatsapp: f.whatsapp, instagram: f.instagram, logo_url: f.logo_url || null, hero_url: f.hero_url || null, opening_hours: { text: f.hours } }).eq('id', rest.id).select().single();
    say(error ? 'Erro: ' + error.message : 'Configurações salvas.'); if (data) setRest(data); };
  const upBrand = async (file: File | undefined, key: 'logo_url' | 'hero_url') => {
    if (!file) return; if (file.size > 5 * 1024 * 1024) return say('Imagem acima de 5 MB.');
    const path = `${rest.id}/brand/${key}-${Date.now()}-${file.name.replace(/[^\w.]/g, '_')}`;
    const { error } = await supabase.storage.from('photos').upload(path, file);
    if (error) return say('Erro no upload: ' + error.message);
    setF((p: any) => ({ ...p, [key]: pub('photos', path) })); say('Imagem enviada. Clique em Salvar para aplicar.'); };
  const I = (k: string, t: string) => <L t={t}><input className="field" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></L>;
  return <div className="space-y-3"><h1 className="text-2xl font-semibold">Configurações</h1>
    {I('name', 'Nome')}{I('tagline', 'Frase de posicionamento')}{I('address', 'Endereço')}{I('hours', 'Horários (texto)')}{I('whatsapp', 'WhatsApp (com DDI, ex.: 5531999999999)')}{I('instagram', 'Instagram')}<L t="Logotipo"><input type="file" accept="image/*" onChange={e => upBrand(e.target.files?.[0], 'logo_url')} /></L>{f.logo_url && <img src={f.logo_url} alt="" className="h-12" />}
    <L t="Foto de destaque do cardápio"><input type="file" accept="image/*" onChange={e => upBrand(e.target.files?.[0], 'hero_url')} /></L>{f.hero_url && <img src={f.hero_url} alt="" className="h-24 object-cover" />}
    <button className="bg-neutral-900 text-white px-5 py-2 text-sm" onClick={save}>Salvar</button>
    <h2 className="font-semibold pt-4">QR Code do cardápio</h2><p className="text-sm text-neutral-600 break-all">{link}</p>
    {qr && <><img src={qr} className="w-48 border" alt="QR Code" /><a className="inline-block border px-4 py-2 text-sm" href={qr} download={`qrcode-${rest.slug}.png`}>Baixar PNG</a></>}</div>;
}
