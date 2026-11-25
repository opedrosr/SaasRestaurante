import { describe, it, expect } from 'vitest';
import { openStatus } from './hours';
const all = (d: any) => ({ tz: 'UTC', week: Array.from({ length: 7 }, () => ({ ...d })) });
describe('openStatus', () => {
  const h = all({ open: '18:00', close: '23:00' });
  it('aberto, antes de abrir e depois de fechar', () => {
    expect(openStatus(h, new Date('2026-11-25T20:00:00Z'))?.label).toBe('Aberto agora · fecha às 23:00');
    expect(openStatus(h, new Date('2026-11-25T10:00:00Z'))?.label).toBe('Fechado · abre hoje às 18:00');
    expect(openStatus(h, new Date('2026-11-25T23:30:00Z'))?.label).toBe('Fechado · abre amanhã às 18:00');
  });
  it('horário que vira a meia-noite', () => {
    const n = all({ open: '18:00', close: '02:00' });
    expect(openStatus(n, new Date('2026-11-26T01:00:00Z'))?.open).toBe(true);
    expect(openStatus(n, new Date('2026-11-26T03:00:00Z'))?.open).toBe(false);
  });
  it('dia fechado pula para o próximo dia aberto', () => {
    const w: any = all({ open: '18:00', close: '23:00' }); w.week[0] = { closed: true };
    expect(openStatus(w, new Date('2026-11-28T23:30:00Z'))?.label).toBe('Fechado · abre segunda às 18:00');
  });
  it('sem horário estruturado não mostra nada', () => expect(openStatus({ text: 'x' })).toBeNull());
});
