import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "./hooks";
import { getApiErrorMessage } from "@/services/api-client";

type RedirectState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

function getRedirectPath(state: unknown) {
  const redirectState = state as RedirectState | null;
  const from = redirectState?.from;

  if (!from?.pathname) {
    return "/crm/leads";
  }

  return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();
  const [credentials, setCredentials] = useState({
    email: import.meta.env.DEV
      ? import.meta.env.VITE_DEV_AUTH_EMAIL ?? "admin@fawnix.com"
      : "",
    password: import.meta.env.DEV
      ? import.meta.env.VITE_DEV_AUTH_PASSWORD ?? "Admin@123"
      : "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTo = getRedirectPath(location.state);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await loginMutation.mutateAsync(credentials);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to sign in right now."));
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.28),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.22),_transparent_38%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-blue-100 uppercase">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Secure ERP Access
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Sign in to continue working in Fawnix Verse
              </h1>
              <p className="max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
                Access your CRM, inventory, and operational modules through the
                same workspace, now backed by the live authentication APIs.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">Protected workspace</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Session tokens are stored locally and refreshed against the
                  Spring Boot auth service.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">Role-ready access</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  The login flow is aligned with the backend RBAC scaffold for
                  admins, managers, and sales reps.
                </p>
              </div>
            </div>
          </section>

          <Card className="border border-white/10 bg-white/95 text-slate-900 shadow-2xl shadow-slate-950/25">
            <CardHeader className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl">Login</CardTitle>
                <CardDescription className="text-sm text-slate-500">
                  Enter your workspace credentials to open the dashboard.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={credentials.email}
                    onChange={(event) =>
                      setCredentials((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="name@company.com"
                    className="h-11 border-slate-200 bg-white focus-visible:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={credentials.password}
                    onChange={(event) =>
                      setCredentials((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Enter your password"
                    className="h-11 border-slate-200 bg-white focus-visible:ring-blue-500"
                    required
                  />
                </div>

                {errorMessage ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                </Button>

                {import.meta.env.DEV ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-slate-600">
                    <p className="font-medium text-slate-800">Local development account</p>
                    <p className="mt-1">
                      Email: <span className="font-medium">admin@fawnix.com</span>
                    </p>
                    <p>
                      Password: <span className="font-medium">Admin@123</span>
                    </p>
                  </div>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
