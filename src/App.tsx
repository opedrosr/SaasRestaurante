import { Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './lib/cart';
import Menu from './pages/Menu';
import Admin from './pages/Admin';
export default function App() {
  return (
    <CartProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/restaurante/stack-burger" replace />} />
        <Route path="/restaurante/:slug" element={<Menu />} />
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    </CartProvider>
  );
}
