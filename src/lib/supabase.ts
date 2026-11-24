import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL as string; const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const configured = Boolean(url && key);
export const supabase = createClient(url || 'http://localhost', key || 'missing');
export const pub = (bucket: 'photos' | 'models', path: string) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
export const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
