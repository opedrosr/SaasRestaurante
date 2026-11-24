import { Component, type ReactNode } from 'react';
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error('Erro não tratado:', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="min-h-screen grid place-items-center p-8 text-center bg-coal text-bone"><div>
      <h1 className="font-display text-3xl uppercase mb-2">Algo deu errado</h1>
      <p className="mb-4 text-bone/70">Tente recarregar a página. Se continuar, avise o estabelecimento.</p>
      <button className="btn" onClick={() => location.reload()}>Recarregar</button></div></div>;
  }
}
