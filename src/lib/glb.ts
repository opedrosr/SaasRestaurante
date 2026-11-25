/** Leitura, validação e "gravação" de escala em arquivos GLB (glTF 2.0 binário), sem dependências. */
const MAGIC = 0x46546c67, T_JSON = 0x4e4f534a;
interface Chunk { type: number; data: Uint8Array }

export function parseGlb(buf: ArrayBuffer): { json: any; chunks: Chunk[] } {
  if (buf.byteLength < 20) throw new Error('Arquivo muito pequeno para ser um GLB.');
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error('O arquivo não é um GLB válido.');
  if (dv.getUint32(4, true) !== 2) throw new Error('Versão não suportada: use glTF 2.0.');
  if (dv.getUint32(8, true) !== buf.byteLength) throw new Error('GLB corrompido: o tamanho não confere.');
  const chunks: Chunk[] = [];
  for (let off = 12; off + 8 <= buf.byteLength;) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), end = off + 8 + len;
    if (end > buf.byteLength) throw new Error('GLB corrompido: bloco incompleto.');
    chunks.push({ type, data: new Uint8Array(buf, off + 8, len) }); off = end;
  }
  if (!chunks.length || chunks[0].type !== T_JSON) throw new Error('GLB sem bloco de cena (JSON).');
  let json: any;
  try { json = JSON.parse(new TextDecoder().decode(chunks[0].data)); } catch { throw new Error('GLB corrompido: cena ilegível.'); }
  if (json?.asset?.version !== '2.0') throw new Error('Versão não suportada: use glTF 2.0.');
  return { json, chunks };
}

export const validateGlb = (buf: ArrayBuffer) => { parseGlb(buf); };

/** Envolve a cena em um nó raiz com a escala calibrada, para o tamanho real valer em qualquer visualizador de AR. */
export function bakeScale(buf: ArrayBuffer, factor: number): ArrayBuffer {
  if (!(factor > 0) || !Number.isFinite(factor)) throw new Error('Fator de escala inválido.');
  const { json, chunks } = parseGlb(buf);
  const scene = json.scenes?.[json.scene ?? 0];
  if (!scene?.nodes?.length) throw new Error('GLB sem cena para escalar.');
  json.nodes = json.nodes || [];
  const root = json.nodes.push({ name: 'RealScaleRoot', children: [...scene.nodes], scale: [factor, factor, factor] }) - 1;
  scene.nodes = [root];

  let jb = new TextEncoder().encode(JSON.stringify(json));
  if (jb.length % 4) { const p = new Uint8Array(jb.length + (4 - jb.length % 4)).fill(0x20); p.set(jb); jb = p; }
  const rest = chunks.slice(1);
  const total = 12 + 8 + jb.length + rest.reduce((s, c) => s + 8 + c.data.length, 0);
  const out = new ArrayBuffer(total), dv = new DataView(out), u8 = new Uint8Array(out);
  dv.setUint32(0, MAGIC, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  let o = 12;
  for (const [type, data] of [[T_JSON, jb] as const, ...rest.map(c => [c.type, c.data] as const)]) {
    dv.setUint32(o, data.length, true); dv.setUint32(o + 4, type, true); u8.set(data, o + 8); o += 8 + data.length;
  }
  return out;
}
