import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './lib/cart';
import { supabase } from './lib/supabase';
import Menu from './pages/Menu';
import Admin from './pages/Admin';

const DEFAULT_SLUG = (import.meta.env.VITE_DEFAULT_SLUG as string) || 'stack-burger';
const ROOT = (import.meta.env.VITE_ROOT_DOMAIN as string) || '';
const MAIN = String(import.meta.env.VITE_MAIN_HOSTS || 'localhost').split(',').map(s => s.trim());

/** Na raiz: domínio principal → cardápio padrão; subdomínio ou domínio próprio → cardápio do cliente. */
function Home() {
  const [slug, setSlug] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const host = location.hostname;
    if (MAIN.includes(host) || host.endsWith('.vercel.app')) { setSlug(null); return; }
    if (ROOT && host.endsWith('.' + ROOT)) { setSlug(host.slice(0, -(ROOT.length + 1)).split('.')[0]); return; }
    supabase.from('restaurants').select('slug').eq('custom_domain', host).maybeSingle().then(({ data }) => setSlug(data?.slug ?? null), () => setSlug(null));
  }, []);
  if (slug === undefined) return <p className="p-8">Carregando…</p>;
  return slug ? <Menu slug={slug} /> : <Navigate to={`/restaurante/${DEFAULT_SLUG}`} replace />;
}

export default function App() {
  return (
    <CartProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/restaurante/:slug" element={<Menu />} />
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    </CartProvider>
  );
}
