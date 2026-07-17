import { ReactNode } from "react";

type P2PFormFieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
};

export function P2PFormField({ label, hint, children }: P2PFormFieldProps) {
  return (
    <label className="space-y-1 text-xs font-semibold text-slate-500">
      {label}
      {children}
      {hint ? <span className="block text-[0.7rem] font-normal text-slate-500">{hint}</span> : null}
    </label>
  );
}
