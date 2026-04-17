import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useRequestOtp, useVerifyOtp } from "./hooks";
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
  const requestOtpMutation = useRequestOtp();
  const verifyOtpMutation = useVerifyOtp();
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");
  const [otpForm, setOtpForm] = useState({
    empCode: "",
    otp: "",
  });
  const [otpStatus, setOtpStatus] = useState<{
    message?: string;
    expiresInMinutes?: number;
  } | null>(null);
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

  const handleRequestOtp = async () => {
    setErrorMessage(null);
    try {
      const response = await requestOtpMutation.mutateAsync({
        emp_code: otpForm.empCode.trim(),
      });
      setOtpStatus({
        message: response.message,
        expiresInMinutes: response.expires_in_minutes,
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to request OTP."));
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await verifyOtpMutation.mutateAsync({
        emp_code: otpForm.empCode.trim(),
        otp: otpForm.otp.trim(),
      });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to verify OTP."));
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ── LEFT: full-bleed image panel ── */}
      <div className="relative hidden lg:flex lg:w-1/2">
        <img
          src={authHero}
          alt="Fawnix Verse secure collaboration"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* dark scrim so text is readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/50 to-slate-950/75" />

        {/* overlay content — bottom-anchored */}
        <div className="relative z-10 mt-auto p-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-emerald-100 uppercase backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Trusted Digital Access
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Connect to your
            <br />
            Fawnix Verse workspace
          </h1>
          <div className="my-4 h-px w-24 bg-gradient-to-r from-emerald-300/70 via-cyan-300/50 to-transparent" />
          <p className="max-w-sm text-base leading-7 text-white/70">
            A secure launch point for CRM, sales, and operations. Authenticate
            once to keep teams aligned and data flowing in real time.
          </p>
        </div>
      </div>

      {/* ── RIGHT: login panel ── */}
      <div className="flex w-full items-center justify-center bg-white px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* header */}
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mb-1 text-2xl font-semibold text-slate-900">Login</h2>
          <p className="mb-6 text-sm text-slate-500">
            Enter your workspace credentials to open the dashboard.
          </p>

          {/* tab switcher */}
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode("password");
                setErrorMessage(null);
              }}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                authMode === "password"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign in with Email
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("otp");
                setErrorMessage(null);
              }}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                authMode === "otp"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign in with Fawnix
            </button>
          </div>

          {/* password form */}
          {authMode === "password" ? (
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
          ) : (
            /* OTP form */
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              <div className="space-y-2">
                <Label htmlFor="empCode">Employee Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="empCode"
                    value={otpForm.empCode}
                    onChange={(event) =>
                      setOtpForm((current) => ({
                        ...current,
                        empCode: event.target.value,
                      }))
                    }
                    placeholder="Enter your employee code"
                    className="h-11 border-slate-200 bg-white focus-visible:ring-emerald-500"
                    required
                  />
                  <Button
                    type="button"
                    onClick={handleRequestOtp}
                    className="h-11 bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={
                      requestOtpMutation.isPending || !otpForm.empCode.trim()
                    }
                  >
                    {requestOtpMutation.isPending ? "Sending..." : "Request OTP"}
                  </Button>
                </div>
                {otpStatus?.message ? (
                  <p className="text-xs text-emerald-700">
                    {otpStatus.message}
                    {otpStatus.expiresInMinutes
                      ? ` (expires in ${otpStatus.expiresInMinutes} min)`
                      : ""}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">OTP</Label>
                <Input
                  id="otp"
                  value={otpForm.otp}
                  onChange={(event) =>
                    setOtpForm((current) => ({
                      ...current,
                      otp: event.target.value,
                    }))
                  }
                  placeholder="Enter OTP"
                  className="h-11 border-slate-200 bg-white focus-visible:ring-emerald-500"
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
                className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={verifyOtpMutation.isPending}
              >
                {verifyOtpMutation.isPending
                  ? "Verifying..."
                  : "Sign in with Fawnix"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}