import { describe, it, expect } from 'vitest';
import { bakeScale, parseGlb, validateGlb } from './glb';

function makeGlb(json: object, bin = new Uint8Array([1, 2, 3, 4])): ArrayBuffer {
  let jb = new TextEncoder().encode(JSON.stringify(json));
  if (jb.length % 4) { const p = new Uint8Array(jb.length + 4 - (jb.length % 4)).fill(0x20); p.set(jb); jb = p; }
  const total = 12 + 8 + jb.length + 8 + bin.length, out = new ArrayBuffer(total), dv = new DataView(out), u8 = new Uint8Array(out);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, jb.length, true); dv.setUint32(16, 0x4e4f534a, true); u8.set(jb, 20);
  const o = 20 + jb.length; dv.setUint32(o, bin.length, true); dv.setUint32(o + 4, 0x004e4942, true); u8.set(bin, o + 8);
  return out;
}
const base = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0, 1] }], nodes: [{ name: 'a' }, { name: 'b' }] };

describe('glb', () => {
  it('valida um GLB correto e rejeita lixo', () => {
    expect(() => validateGlb(makeGlb(base))).not.toThrow();
    expect(() => validateGlb(new ArrayBuffer(64))).toThrow();
    expect(() => validateGlb(makeGlb(base).slice(0, 40))).toThrow();
  });
  it('grava a escala em um nó raiz e preserva o resto', () => {
    const out = bakeScale(makeGlb(base), 0.5);
    const { json, chunks } = parseGlb(out);
    expect(json.scenes[0].nodes).toEqual([2]);
    expect(json.nodes[2].scale).toEqual([0.5, 0.5, 0.5]);
    expect(json.nodes[2].children).toEqual([0, 1]);
    expect(chunks).toHaveLength(2);
    expect(Array.from(chunks[1].data)).toEqual([1, 2, 3, 4]);
    expect(new DataView(out).getUint32(8, true)).toBe(out.byteLength);
  });
  it('rejeita fator inválido', () => {
    expect(() => bakeScale(makeGlb(base), 0)).toThrow();
    expect(() => bakeScale(makeGlb(base), NaN)).toThrow();
  });
});
