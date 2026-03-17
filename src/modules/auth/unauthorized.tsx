import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/8 p-8 text-center shadow-2xl shadow-slate-950/30 backdrop-blur">
        <h1 className="text-lg font-semibold">Access restricted</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          You do not have permission to view this page. If you believe this is
          a mistake, contact your administrator.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
