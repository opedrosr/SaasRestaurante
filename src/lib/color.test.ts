import { describe, it, expect } from 'vitest';
import { brandVars } from './color';
describe('brandVars', () => {
  it('converte hex em canais RGB', () => expect(brandVars('#F5821F')?.['--brand']).toBe('245 130 31'));
  it('ignora valor inválido', () => expect(brandVars('laranja')).toBeUndefined());
});
