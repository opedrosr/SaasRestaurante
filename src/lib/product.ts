import { pub } from './supabase';
import { placeholderFor } from './placeholders';
export const photoOf = (p: any): string => {
  const ph = (p.product_photos || []).find((x: any) => x.is_primary) || (p.product_photos || [])[0];
  return ph ? pub('photos', ph.storage_path) : placeholderFor(p.name);
};
export const has3d = (p: any): boolean => (p.product_models || []).some((m: any) => m.is_active && m.status === 'valid');
export const photosOf = (p: any): string[] => {
  const list = [...(p.product_photos || [])].sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || (a.sort_order || 0) - (b.sort_order || 0));
  return list.length ? list.map((x: any) => pub('photos', x.storage_path)) : [placeholderFor(p.name)];
};
