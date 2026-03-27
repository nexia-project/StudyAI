import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="font-black text-xl mb-2 text-slate-800">Erro inesperado</h3>
            <p className="text-slate-500 text-sm mb-2 leading-relaxed">
              Algo deu errado no simulado. Tente novamente.
            </p>
            <p className="text-red-400 text-xs font-mono mb-6 bg-red-50 rounded-lg p-2 text-left break-all">
              {this.state.error.message}
            </p>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90"
            >
              <RotateCcw className="w-4 h-4" /> Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
