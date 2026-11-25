import { describe, it, expect } from 'vitest';
import { arMessage, closestRef, fmtCm } from './arGuide';
describe('arGuide', () => {
  it('escolhe a referência mais próxima', () => { expect(closestRef(13).cm).toBe(12); expect(closestRef(25).cm).toBe(26); });
  it('formata centímetros em pt-BR', () => expect(fmtCm(12.5)).toBe('12,5'));
  it('mostra mensagem conforme o estado', () => {
    expect(arMessage('session-started', 'not-tracking', 13)).toContain('mova o celular');
    expect(arMessage('session-started', 'tracking', 13)).toContain('Toque na mesa');
    expect(arMessage('object-placed', 'tracking', 13)).toContain('13 cm');
    expect(arMessage('idle', 'tracking', 13)).toBeNull();
  });
});
