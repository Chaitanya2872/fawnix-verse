import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarClock, RotateCcw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import flowService from "../../services/flowService";
import visitorRequestService, { PURPOSE_OPTIONS } from "../../services/visitorRequestService";
import { VMS_PATHS } from "../../routes/paths";
import type { VisitorRecord } from "../../types";

const INITIAL = {
  name: "",
  email: "",
  mobile: "",
  company: "",
  employeeToMeet: "",
  purpose: "",
  otherPurpose: "",
  fromDateTime: "",
  toDateTime: "",
};

type VisitorFormData = typeof INITIAL;
type VisitorFormErrors = Partial<Record<keyof VisitorFormData, string>>;

function CreateVisitorForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<VisitorFormData>(INITIAL);
  const [errors, setErrors] = useState<VisitorFormErrors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [apiError, setApiError] = useState<string | null>(null);

  const minDateTime = useMemo(() => new Date().toISOString().slice(0, 16), []);

  const validate = () => {
    const nextErrors: VisitorFormErrors = {};
    if (!form.name.trim()) nextErrors.name = "Full name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = "Enter a valid email address.";
    if (!form.mobile.trim()) nextErrors.mobile = "Mobile number is required.";
    if (form.mobile && !/^[0-9+\-\s()]{7,15}$/.test(form.mobile)) nextErrors.mobile = "Enter a valid mobile number.";
    if (!form.employeeToMeet.trim()) nextErrors.employeeToMeet = "Host name is required.";
    if (!form.purpose) nextErrors.purpose = "Purpose of visit is required.";
    if (form.purpose === "OTHERS" && !form.otherPurpose.trim()) nextErrors.otherPurpose = "Describe the purpose.";
    if (!form.fromDateTime) nextErrors.fromDateTime = "Visit start is required.";
    if (!form.toDateTime) nextErrors.toDateTime = "Visit end is required.";
    if (form.fromDateTime && form.toDateTime && form.toDateTime <= form.fromDateTime) {
      nextErrors.toDateTime = "End time must be after start time.";
    }
    return nextErrors;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setApiError(null);
    if (status === "error") setStatus("idle");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus("error");
      return;
    }

    setStatus("saving");
    setApiError(null);

    try {
      const visitor = (await visitorRequestService.create(form)) as VisitorRecord;
      const enrichedVisitor = { ...visitor, employeeToMeet: visitor.employeeToMeet || form.employeeToMeet };
      flowService.setCurrentVisitor(enrichedVisitor);
      navigate(enrichedVisitor.id ? VMS_PATHS.visitorDetails(enrichedVisitor.id) : VMS_PATHS.visitors);
    } catch (error) {
      setStatus("error");
      setApiError(error instanceof Error ? error.message : "Failed to create visitor request.");
    }
  };

  const handleClear = () => {
    setForm(INITIAL);
    setErrors({});
    setStatus("idle");
    setApiError(null);
  };

  return (
    <form className="rounded-lg border border-slate-200 bg-white shadow-sm" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-0 lg:grid-cols-2">
        <section className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
          <SectionHeader
            icon={<UserRound className="h-5 w-5" aria-hidden="true" />}
            title="Visitor Details"
            description="Identity and contact information used across approvals, badge preview, and desk lookup."
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Full Name" error={errors.name}>
              <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Visitor full name" autoComplete="name" />
            </Field>
            <Field id="mobile" label="Mobile" error={errors.mobile}>
              <Input id="mobile" name="mobile" type="tel" value={form.mobile} onChange={handleChange} placeholder="+91 9876543210" autoComplete="tel" />
            </Field>
            <Field id="email" label="Email" error={errors.email}>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="visitor@example.com" autoComplete="email" />
            </Field>
            <Field id="company" label="Company">
              <Input id="company" name="company" value={form.company} onChange={handleChange} placeholder="Company or organization" />
            </Field>
          </div>
        </section>

        <section className="p-5">
          <SectionHeader
            icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}
            title="Visit Details"
            description="The visit window controls QR validity and desk check-in eligibility."
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field id="employeeToMeet" label="Host / Employee To Meet" error={errors.employeeToMeet}>
              <Input id="employeeToMeet" name="employeeToMeet" value={form.employeeToMeet} onChange={handleChange} placeholder="Host name" />
            </Field>
            <Field id="purpose" label="Purpose" error={errors.purpose}>
              <select
                id="purpose"
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none transition focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select purpose</option>
                {PURPOSE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            {form.purpose === "OTHERS" ? (
              <div className="sm:col-span-2">
                <Field id="otherPurpose" label="Describe Purpose" error={errors.otherPurpose}>
                  <textarea
                    id="otherPurpose"
                    name="otherPurpose"
                    value={form.otherPurpose}
                    onChange={handleChange}
                    placeholder="Describe the reason for this visit"
                    className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </Field>
              </div>
            ) : null}
            <Field id="fromDateTime" label="Visit Start" error={errors.fromDateTime}>
              <Input id="fromDateTime" name="fromDateTime" type="datetime-local" min={minDateTime} value={form.fromDateTime} onChange={handleChange} />
            </Field>
            <Field id="toDateTime" label="Visit End" error={errors.toDateTime}>
              <Input id="toDateTime" name="toDateTime" type="datetime-local" min={form.fromDateTime || minDateTime} value={form.toDateTime} onChange={handleChange} />
            </Field>
          </div>
        </section>
      </div>

      {(status === "error" || apiError) ? (
        <div className="mx-5 mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {apiError || "Some fields need attention before the visitor can be registered."}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={handleClear} disabled={status === "saving"}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Clear
        </Button>
        <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700" disabled={status === "saving"}>
          {status === "saving" ? "Registering..." : "Register Visitor"}
          {status !== "saving" ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
        </Button>
      </div>
    </form>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">{icon}</span>
      <div>
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

export default CreateVisitorForm;
