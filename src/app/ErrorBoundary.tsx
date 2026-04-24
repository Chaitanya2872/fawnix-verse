import { Component, type ErrorInfo, type ReactNode } from "react";
import { useNavigate, useRouteError } from "react-router-dom";

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

export function RouteErrorFallback() {
  const error = useRouteError();
  const navigate = useNavigate();
  const message =
    error instanceof Error
      ? error.message
      : "Something unexpected happened while opening this page.";

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Something Went Wrong</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">This page hit an unexpected error.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          We kept the app running, but this screen could not finish loading. You can retry the page or go back to the previous screen.
        </p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

