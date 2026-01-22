import React from 'react';

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
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="bg-white shadow-lg rounded-2xl p-6 max-w-md w-full text-center space-y-3">
            <h1 className="text-xl font-bold text-slate-800">Algo deu errado</h1>
            <p className="text-sm text-slate-600">
              Não foi possível carregar o painel agora. Recarregue a página ou tente novamente em instantes.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-slate-100 text-left p-3 rounded-lg overflow-auto max-h-32 text-slate-700">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
