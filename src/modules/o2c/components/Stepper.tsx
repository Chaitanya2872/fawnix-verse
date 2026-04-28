import { cn } from "@/lib/utils";

type StepState = "complete" | "current" | "upcoming";

type Step = {
  label: string;
  state: StepState;
};

type StepperProps = {
  steps: Step[];
  className?: string;
};

export function Stepper({ steps, className }: StepperProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
              step.state === "complete" && "border-emerald-500 bg-emerald-500 text-white",
              step.state === "current" && "border-blue-500 bg-blue-50 text-blue-700",
              step.state === "upcoming" && "border-slate-200 bg-white text-slate-400"
            )}
          >
            {index + 1}
          </div>
          <span
            className={cn(
              "text-xs font-semibold",
              step.state === "complete" && "text-emerald-700",
              step.state === "current" && "text-blue-700",
              step.state === "upcoming" && "text-slate-400"
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <span className="hidden h-px w-8 bg-slate-200 sm:block" />
          )}
        </div>
      ))}
    </div>
  );
}
