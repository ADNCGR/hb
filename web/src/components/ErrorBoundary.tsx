import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-svh place-items-center p-6">
        <div className="w-full max-w-[460px]">
          <p className="kicker">Erreur inattendue</p>
          <h1 className="mt-2 text-[28px]">La page n’a pas pu s’afficher</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{this.state.error.message}</p>
          <button className="mt-6 inline-flex h-[46px] items-center rounded-full bg-ink px-[22px] font-heading text-[14.5px] font-medium text-white" onClick={() => location.reload()}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }
}
