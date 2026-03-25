import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crashed:", error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-950 text-white px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          <h1 className="text-lg font-semibold">Frontend crashed while rendering</h1>
          <p className="mt-2 text-sm text-slate-300">
            Please share the error message below so we can fix it.
          </p>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-black/40 p-4 text-xs text-rose-200">
            {error.message}
          </pre>
        </div>
      </div>
    );
  }
}

