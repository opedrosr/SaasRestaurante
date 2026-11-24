import { describe, it, expect } from 'vitest';
import { buildWhatsAppUrl, lineTotal } from './whatsapp';
const line = { name: 'Stack Supreme', qty: 2, unitCents: 2800, addons: [{ name: 'Bacon extra', qty: 2, cents: 600 }] };
describe('whatsapp', () => {
  it('calcula o total da linha com adicionais', () => expect(lineTotal(line)).toBe(8000));
  it('monta a URL com telefone limpo e mensagem', () => {
    const url = buildWhatsAppUrl('+55 (31) 99999-9999', 'Stack Burger', [line], 'sem cebola');
    expect(url.startsWith('https://wa.me/5531999999999?text=')).toBe(true);
    const msg = decodeURIComponent(url.split('text=')[1]);
    expect(msg).toContain('2x Stack Supreme'); expect(msg).toContain('Bacon extra'); expect(msg).toContain('80,00'); expect(msg).toContain('sem cebola');
  });
});
