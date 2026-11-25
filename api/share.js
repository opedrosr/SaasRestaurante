// Devolve HTML com Open Graph para robôs (WhatsApp, Facebook, etc.). Navegadores usam o app normalmente.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = c => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function handler(req, res) {
  const base = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const q = k => String((req.query && req.query[k]) ?? '');
  const slug = q('slug'), pid = q('p');
  const H = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async path => { const r = await fetch(`${base}/rest/v1/${path}`, { headers: H }); return r.ok ? r.json() : []; };
  try {
    const cols = 'id,slug,name,tagline,description,logo_url,hero_url';
    const rest = /^[a-z0-9-]+$/.test(slug)
      ? (await get(`restaurants?slug=eq.${slug}&select=${cols}`))[0]
      : (await get(`restaurants?custom_domain=eq.${encodeURIComponent(host)}&select=${cols}`))[0];
    if (!rest) { res.status(404).send('Não encontrado'); return; }
    let title = rest.name, desc = rest.description || rest.tagline || 'Veja nosso cardápio', image = rest.hero_url || rest.logo_url || '';
    const validPid = /^[0-9a-f-]{36}$/i.test(pid);
    if (validPid) {
      const prod = (await get(`products?id=eq.${pid}&restaurant_id=eq.${rest.id}&is_published=eq.true&select=name,description,price_cents,product_photos(storage_path,is_primary)`))[0];
      if (prod) {
        title = `${prod.name} · ${rest.name}`; desc = `${brl(prod.price_cents)}${prod.description ? ' · ' + prod.description : ''}`;
        const ph = (prod.product_photos || []).find(x => x.is_primary) || (prod.product_photos || [])[0];
        if (ph) image = `${base}/storage/v1/object/public/photos/${ph.storage_path}`;
      }
    }
    const path = /^[a-z0-9-]+$/.test(slug) ? `/restaurante/${slug}` : '/';
    const url = `https://${host}${path}${validPid ? `?p=${pid}` : ''}`;
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title>
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}<meta property="og:url" content="${esc(url)}"><meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${esc(url)}"></head><body><a href="${esc(url)}">${esc(title)}</a></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).send(html);
  } catch { res.status(500).send('Erro'); }
}
