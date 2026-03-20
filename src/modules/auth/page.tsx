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
import authHero from "@/assets/images/authpage.jpg";

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
    email: "",
    password: "",
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
          <section className="relative max-w-xl space-y-6">
            <div className="pointer-events-none absolute -top-10 left-4 h-28 w-28 rounded-full bg-emerald-400/20 blur-3xl login-float" />
            <div className="pointer-events-none absolute bottom-6 right-6 h-24 w-24 rounded-full bg-cyan-400/20 blur-3xl login-float login-float-delay" />

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur login-reveal">
              <div className="relative mx-auto flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.35),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(34,211,238,0.28),_transparent_55%)] blur-2xl login-pulse" />
                <div className="absolute inset-0 rounded-full border border-white/10 bg-white/5" />
                <div className="absolute inset-2 rounded-full border border-emerald-300/30 login-orbit" />
                <img
                  src={authHero}
                  alt="Fawnix Verse secure collaboration"
                  className="relative z-10 h-[88%] w-[88%] rounded-full object-cover shadow-2xl shadow-emerald-500/20"
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-emerald-100 uppercase login-reveal login-reveal-delay-1">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Trusted Digital Access
            </div>

            <div className="space-y-4 login-reveal login-reveal-delay-2">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Connect to your Fawnix Verse workspace
              </h1>
              <div className="h-px w-32 bg-gradient-to-r from-emerald-300/70 via-cyan-300/50 to-transparent login-shimmer" />
              <p className="max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
                A secure launch point for CRM, sales, and operations. Authenticate once
                to keep teams aligned and data flowing in real time.
              </p>
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

              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
