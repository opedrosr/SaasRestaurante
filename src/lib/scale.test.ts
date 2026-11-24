import { describe, it, expect } from 'vitest';
import { calibrate } from './scale';
describe('calibrate', () => {
  it('mantém fator 1 quando o modelo já está em escala real', () => {
    const c = calibrate({ width: 0.13, depth: 0.13, height: 0.10 }, { width: 13, depth: 13, height: 10 });
    expect(c.factor).toBeCloseTo(1); expect(c.warnings).toHaveLength(0);
  });
  it('detecta modelo em milímetros', () => {
    const c = calibrate({ width: 130, depth: 130, height: 100 }, { width: 13, depth: 13, height: 10 });
    expect(c.factor).toBeCloseTo(0.001); expect(c.warnings.some(w => w.includes('unidade'))).toBe(true);
  });
  it('avisa quando a altura não bate', () => {
    const c = calibrate({ width: 0.13, depth: 0.13, height: 0.2 }, { width: 13, depth: 13, height: 10 });
    expect(c.warnings.some(w => w.includes('altura'))).toBe(true);
  });
  it('rejeita modelo sem volume', () => {
    expect(calibrate({ width: 0, depth: 0, height: 0 }, { width: 13, depth: 13, height: 10 }).warnings).toHaveLength(1);
  });
});
