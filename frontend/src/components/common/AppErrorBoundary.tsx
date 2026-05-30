import React from 'react';
import { isStaleBuildErrorMessage, recoverFromStaleBuild } from '../../utils/staleBuildRecovery';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Erro capturado no painel admin:', error, errorInfo);
    const message = `${error?.name || ''} ${error?.message || ''}`.trim();
    if (isStaleBuildErrorMessage(message)) {
      void recoverFromStaleBuild();
    }
  }

  private handleRecover = () => {
    void recoverFromStaleBuild({ force: true });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,#ecfeff_0%,#e7f0f6_42%,#e2ebf2_100%)] px-4">
          <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/92 p-6 text-center shadow-[0_24px_70px_-36px_rgba(15,23,42,0.55)] backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-2xl shadow-inner">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-9 w-9 rounded-xl object-cover" />
            </div>
            <h1 className="mt-4 text-xl font-black tracking-tight text-slate-900">Vamos recarregar o app</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Uma atualização pode ter ficado presa no cache deste aparelho. Toque abaixo para atualizar sem precisar reinstalar.
            </p>
            <button
              type="button"
              onClick={this.handleRecover}
              className="mt-5 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-[0_16px_32px_-18px_rgba(15,23,42,0.7)] transition hover:bg-slate-800 active:scale-[0.99]"
            >
              Atualizar app agora
            </button>
            {this.state.error && (
              <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Detalhes técnicos
                </summary>
                <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
