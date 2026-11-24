import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../../lib/supabase';
import { L } from './ui';

export function Conf({ rest, setRest, say }: any) {
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
