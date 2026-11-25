/** Gera as variáveis de cor da marca (usadas pelo Tailwind via --brand*). */
export function brandVars(hex?: string): Record<string, string> | undefined {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return undefined;
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const mix = (t: number, k: number) => [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v + (t - v) * k)))).join(' ');
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return { '--brand': `${r} ${g} ${b}`, '--brand-light': mix(255, 0.2), '--brand-dark': mix(0, 0.22), '--on-brand': lum > 0.55 ? '7 24 95' : '255 255 255' };
}
