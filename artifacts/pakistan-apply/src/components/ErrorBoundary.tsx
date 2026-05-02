import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PakApply] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-6">
              An unexpected error occurred. Refresh the page to continue — your data is safe.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left text-slate-400 bg-slate-50 rounded-xl p-3 mb-6 overflow-auto max-h-28 whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            )}
            <Button
              onClick={() => window.location.reload()}
              className="bg-sky-600 hover:bg-sky-700 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
