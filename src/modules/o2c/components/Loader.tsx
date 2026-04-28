import { cn } from "@/lib/utils";

type LoaderProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap: Record<NonNullable<LoaderProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function Loader({ label = "Loading", size = "md", className }: LoaderProps) {
  return (
    <div className={cn("inline-flex items-center gap-2 text-sm text-slate-500", className)}>
      <span className={cn("animate-spin rounded-full border-2 border-slate-200 border-t-slate-600", sizeMap[size])} />
      <span>{label}</span>
    </div>
  );
}
