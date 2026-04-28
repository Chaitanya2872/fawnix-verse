import type { FieldError, FieldValues, Path, UseFormRegister } from "react-hook-form";
import { cn } from "@/lib/utils";

type FormInputProps<T extends FieldValues> = {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  error?: FieldError;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  multiline?: boolean;
};

export function FormInput<T extends FieldValues>({
  label,
  name,
  register,
  error,
  type = "text",
  placeholder,
  required,
  className,
  multiline,
}: FormInputProps<T>) {
  const baseClasses = cn(
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
    error && "border-rose-300 focus:border-rose-400 focus:ring-rose-100",
    className
  );

  return (
    <label className="text-sm font-medium text-slate-600">
      {label}
      {multiline ? (
        <textarea
          rows={3}
          className={baseClasses}
          placeholder={placeholder}
          {...register(name, { required })}
        />
      ) : (
        <input
          type={type}
          className={baseClasses}
          placeholder={placeholder}
          {...register(name, { required })}
        />
      )}
      {error ? <span className="mt-1 block text-xs text-rose-500">{error.message}</span> : null}
    </label>
  );
}
