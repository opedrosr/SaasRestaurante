export interface Day { closed?: boolean; open?: string; close?: string }
export interface Hours { tz?: string; week?: Day[]; text?: string }
export const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const toMin = (t?: string) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null; };
const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function nowIn(tz = 'America/Sao_Paulo', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), min: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
}

/** Aberto/fechado agora, no fuso do restaurante. Aceita horário que vira a meia-noite (ex.: 18:00–02:00). */
export function openStatus(hours: Hours | null | undefined, now = new Date()): { open: boolean; label: string } | null {
  const week = hours?.week; if (!week || week.length !== 7) return null;
  const { day, min } = nowIn(hours?.tz, now);
  const span = (d?: Day) => { if (!d || d.closed) return null; const o = toMin(d.open), c = toMin(d.close); return o == null || c == null ? null : { o, c }; };
  const t = span(week[day]), p = span(week[(day + 6) % 7]);
  if (p && p.c <= p.o && min < p.c) return { open: true, label: `Aberto agora · fecha às ${fmt(p.c)}` };
  if (t) {
    if (min >= t.o && (t.c <= t.o || min < t.c)) return { open: true, label: `Aberto agora · fecha às ${fmt(t.c)}` };
    if (min < t.o) return { open: false, label: `Fechado · abre hoje às ${fmt(t.o)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const s = span(week[(day + i) % 7]);
    if (s) return { open: false, label: `Fechado · abre ${i === 1 ? 'amanhã' : DAY_NAMES[(day + i) % 7].toLowerCase()} às ${fmt(s.o)}` };
  }
  return { open: false, label: 'Fechado' };
}
