import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="font-black text-xl mb-2 text-gray-900">Algo deu errado</h3>
            <p className="text-gray-500 text-sm mb-2 leading-relaxed">
              {this.props.context ?? "Erro inesperado. Tente recarregar a página."}
            </p>
            <p className="text-red-400 text-xs font-mono mb-6 bg-red-50 rounded-lg p-2 text-left break-all">
              {this.state.error?.message ?? "Erro desconhecido"}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
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
