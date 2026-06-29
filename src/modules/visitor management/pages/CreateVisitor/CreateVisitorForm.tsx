// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Alert from "../../components/common/Alert";
// import { Icons } from "../../components/common/Icons";
// import flowService from "../../services/flowService";
// import visitorRequestService, { PURPOSE_OPTIONS } from "../../services/visitorRequestService";

// const INITIAL = {
//   name: "",
//   email: "",
//   mobile: "",
//   company: "",
//   purpose: "",
//   otherPurpose: "",
//   fromDateTime: "",
//   toDateTime: "",
// };

// function CreateVisitorForm({ onSuccess }) {
//   const navigate = useNavigate();
//   const [form, setForm] = useState(INITIAL);
//   const [errors, setErrors] = useState({});
//   const [status, setStatus] = useState("idle");
//   const [apiError, setApiError] = useState(null);
//   const [createdId, setCreatedId] = useState(null);

//   const now = new Date();
//   const minDateTime = now.toISOString().slice(0, 16);

//   const validate = () => {
//     const e = {};
//     if (!form.name.trim()) e.name = "Full name is required.";
//     if (!form.email.trim()) e.email = "Email is required.";
//     if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address.";
//     if (!form.mobile.trim()) e.mobile = "Mobile number is required.";
//     if (form.mobile && !/^[0-9+\-\s()]{7,15}$/.test(form.mobile)) e.mobile = "Enter a valid mobile number.";
//     if (!form.purpose) e.purpose = "Purpose of visit is required.";
//     if (form.purpose === "OTHERS" && !form.otherPurpose.trim()) e.otherPurpose = "Describe the purpose when selecting Others.";
//     if (!form.fromDateTime) e.fromDateTime = "Visit start date and time is required.";
//     if (!form.toDateTime) e.toDateTime = "Visit end date and time is required.";
//     if (form.fromDateTime && form.toDateTime && form.toDateTime <= form.fromDateTime) {
//       e.toDateTime = "End time must be after start time.";
//     }
//     return e;
//   };

//   const handleChange = (event) => {
//     const { name, value } = event.target;
//     setForm((current) => ({ ...current, [name]: value }));
//     setErrors((current) => ({ ...current, [name]: undefined }));
//     if (status === "error") setStatus("idle");
//   };

//   const handleSubmit = async (event) => {
//     event.preventDefault();
//     const nextErrors = validate();
//     setErrors(nextErrors);

//     if (Object.keys(nextErrors).length > 0) {
//       setStatus("error");
//       return;
//     }

//     setStatus("saving");
//     setApiError(null);

//     try {
//       const visitor = await visitorRequestService.create(form);
//       console.log("[API] POST /api/visitor-requests response:", visitor);
//       flowService.setCurrentVisitor(visitor);
//       setCreatedId(visitor.visitorId);
//       setStatus("success");

//       window.setTimeout(() => {
//         if (onSuccess) onSuccess(visitor);
//         else navigate("/visitor-details-saved");
//       }, 650);
//     } catch (err) {
//       console.error("[API] POST /api/visitor-requests error:", err);
//       setStatus("error");
//       setApiError(err.message || "Failed to create visitor request. Check the server.");
//     }
//   };

//   const handleClear = () => {
//     setForm(INITIAL);
//     setErrors({});
//     setStatus("idle");
//     setApiError(null);
//   };

//   const field = (id, label, props = {}) => (
//     <div className="form-group">
//       <label htmlFor={id}>{label}</label>
//       <input
//         id={id}
//         name={id}
//         value={form[id]}
//         onChange={handleChange}
//         aria-invalid={Boolean(errors[id])}
//         {...props}
//       />
//       {errors[id] && <span className="form-error">{errors[id]}</span>}
//     </div>
//   );

//   return (
//     <form className="form-shell form-card" onSubmit={handleSubmit}>
//       {status === "error" && !apiError && (
//         <Alert type="error" title="Check required fields">
//           Some details need attention before submitting.
//         </Alert>
//       )}

//       {apiError && (
//         <Alert type="error" title="Server error" onClose={() => setApiError(null)}>
//           {apiError}
//         </Alert>
//       )}

//       {status === "success" && (
//         <Alert type="success" title="Visitor request created">
//           Request saved as {createdId}. Proceeding to face registration.
//         </Alert>
//       )}
//       <div className="form-row">
//       <section className="form-section">
//         <div className="form-section-header">
//           <span className="form-section-icon"><Icons.Users /></span>
//           <div>
//             <div className="form-section-title">Visitor Details</div>
//             <div className="form-section-subtitle">Identity and contact information</div>
//           </div>
//         </div>

//         <div className="form-grid full">
//           {field("name", "Full Name", { placeholder: "Visitor full name", autoComplete: "name" })}
//           {field("email", "Email Address", { placeholder: "visitor@example.com", type: "email", autoComplete: "email" })}
//           {field("mobile", "WhatsApp / Mobile", { placeholder: "+91 9876543210", type: "tel", autoComplete: "tel" })}
//           {field("company", "Company / Organization", { placeholder: "Company or organization" })}
//         </div>
//       </section>
//         </div>
//       <section className="form-section full">
//         <div className="form-section-header">
//           <span className="form-section-icon"><Icons.IdCard /></span>
//           <div>
//             <div className="form-section-title">Visit Details</div>
//             <div className="form-section-subtitle">Purpose and scheduled time window</div>
//           </div>
//         </div>

//         <div className="form-grid full">
//           <div className="form-group">
//             <label htmlFor="purpose">Purpose of Visit</label>
//             <select
//               id="purpose"
//               name="purpose"
//               value={form.purpose}
//               onChange={handleChange}
//               aria-invalid={Boolean(errors.purpose)}
//             >
//               <option value="">Select purpose</option>
//               {PURPOSE_OPTIONS.map((opt) => (
//                 <option key={opt.value} value={opt.value}>{opt.label}</option>
//               ))}
//             </select>
//             {errors.purpose && <span className="form-error">{errors.purpose}</span>}
//           </div>

//           {form.purpose === "OTHERS" && (
//             <div className="form-group">
//               <label htmlFor="otherPurpose">Describe Purpose</label>
//               <textarea
//                 id="otherPurpose"
//                 name="otherPurpose"
//                 placeholder="Describe the reason for the visit"
//                 value={form.otherPurpose}
//                 onChange={handleChange}
//                 aria-invalid={Boolean(errors.otherPurpose)}
//               />
//               {errors.otherPurpose && <span className="form-error">{errors.otherPurpose}</span>}
//             </div>
//           )}
//         </div>

//         <div className="form-grid full">
//           {field("fromDateTime", "Visit Start", { type: "datetime-local", min: minDateTime })}
//           {field("toDateTime", "Visit End", { type: "datetime-local", min: form.fromDateTime || minDateTime })}
//         </div>
//       </section>

//       <div className="form-actions">
//         <button type="button" className="btn btn-secondary" onClick={handleClear} disabled={status === "saving"}>
//           Clear
//         </button>
//         <button type="submit" className="btn btn-primary btn-lg" disabled={status === "saving"}>
//           {status === "saving" ? "Saving Request..." : "Register and Continue"}
//           {status !== "saving" && <Icons.ArrowRight />}
//         </button>
//       </div>
//     </form>
//   );
// }

// export default CreateVisitorForm;



import { useState } from "react";
import type { ChangeEvent, FormEvent, InputHTMLAttributes } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "../../components/common/Alert";
import { Icons } from "../../components/common/Icons";
import flowService from "../../services/flowService";
import visitorRequestService, { PURPOSE_OPTIONS } from "../../services/visitorRequestService";

const INITIAL = {
  name: "",
  email: "",
  mobile: "",
  company: "",
  purpose: "",
  otherPurpose: "",
  fromDateTime: "",
  toDateTime: "",
};

type VisitorFormData = typeof INITIAL;
type VisitorFormErrors = Partial<Record<keyof VisitorFormData, string>>;
type CreateVisitorFormProps = {
  onSuccess?: (visitor: { visitorId?: string }) => void;
};

function CreateVisitorForm({ onSuccess }: CreateVisitorFormProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState<VisitorFormErrors>({});
  const [status, setStatus] = useState("idle");
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const now = new Date();
  const minDateTime = now.toISOString().slice(0, 16);

  const validate = () => {
    const e: VisitorFormErrors = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (!form.mobile.trim()) e.mobile = "Mobile number is required.";
    if (form.mobile && !/^[0-9+\-\s()]{7,15}$/.test(form.mobile)) e.mobile = "Enter a valid mobile number.";
    if (!form.purpose) e.purpose = "Purpose of visit is required.";
    if (form.purpose === "OTHERS" && !form.otherPurpose.trim()) e.otherPurpose = "Describe the purpose when selecting Others.";
    if (!form.fromDateTime) e.fromDateTime = "Visit start date and time is required.";
    if (!form.toDateTime) e.toDateTime = "Visit end date and time is required.";
    if (form.fromDateTime && form.toDateTime && form.toDateTime <= form.fromDateTime) {
      e.toDateTime = "End time must be after start time.";
    }
    return e;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
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
      const visitor = await visitorRequestService.create(form);
      console.log("[API] POST /api/visitor-requests response:", visitor);
      flowService.setCurrentVisitor(visitor);
      setCreatedId(visitor.visitorId);
      setStatus("success");

      window.setTimeout(() => {
        if (onSuccess) onSuccess(visitor);
        else navigate("/visitor-requests");
      }, 650);
    } catch (err) {
      console.error("[API] POST /api/visitor-requests error:", err);
      setStatus("error");
      setApiError(err.message || "Failed to create visitor request. Check the server.");
    }
  };

  const handleClear = () => {
    setForm(INITIAL);
    setErrors({});
    setStatus("idle");
    setApiError(null);
  };

  const field = (id: keyof VisitorFormData, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        value={form[id]}
        onChange={handleChange}
        aria-invalid={Boolean(errors[id])}
        {...props}
      />
      {errors[id] && <span className="form-error">{errors[id]}</span>}
    </div>
  );

  return (
    <form className="form-shell form-card" onSubmit={handleSubmit}>
      {status === "error" && !apiError && (
        <Alert type="error" title="Check required fields">
          Some details need attention before submitting.
        </Alert>
      )}

      {apiError && (
        <Alert type="error" title="Server error" onClose={() => setApiError(null)}>
          {apiError}
        </Alert>
      )}

      {status === "success" && (
        <Alert type="success" title="Visitor request created">
          Request saved as {createdId}. Proceeding to face registration.
        </Alert>
      )}

      <div className="form-row">
        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-icon"><Icons.Users /></span>
            <div>
              <div className="form-section-title">Visitor Details</div>
              <div className="form-section-subtitle">Identity and contact information</div>
            </div>
          </div>

          <div className="form-grid full">
            {field("name", "Full Name", { placeholder: "Visitor full name", autoComplete: "name" })}
            {field("email", "Email Address", { placeholder: "visitor@example.com", type: "email", autoComplete: "email" })}
            {field("mobile", "WhatsApp / Mobile", { placeholder: "+91 9876543210", type: "tel", autoComplete: "tel" })}
            {field("company", "Company / Organization", { placeholder: "Company or organization" })}
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header">
            <span className="form-section-icon"><Icons.IdCard /></span>
            <div>
              <div className="form-section-title">Visit Details</div>
              <div className="form-section-subtitle">Purpose and scheduled time window</div>
            </div>
          </div>

          <div className="form-grid full">
            <div className="form-group">
              <label htmlFor="purpose">Purpose of Visit</label>
              <select
                id="purpose"
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
                aria-invalid={Boolean(errors.purpose)}
              >
                <option value="">Select purpose</option>
                {PURPOSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.purpose && <span className="form-error">{errors.purpose}</span>}
            </div>

            {form.purpose === "OTHERS" && (
              <div className="form-group">
                <label htmlFor="otherPurpose">Describe Purpose</label>
                <textarea
                  id="otherPurpose"
                  name="otherPurpose"
                  placeholder="Describe the reason for the visit"
                  value={form.otherPurpose}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.otherPurpose)}
                />
                {errors.otherPurpose && <span className="form-error">{errors.otherPurpose}</span>}
              </div>
            )}

            {field("fromDateTime", "Visit Start", { type: "datetime-local", min: minDateTime })}
            {field("toDateTime", "Visit End", { type: "datetime-local", min: form.fromDateTime || minDateTime })}
          </div>
        </section>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={handleClear} disabled={status === "saving"}>
          Clear
        </button>
        <button type="submit" className="btn btn-primary btn-lg" disabled={status === "saving"}>
          {status === "saving" ? "Saving Request..." : "Register and Continue"}
          {status !== "saving" && <Icons.ArrowRight />}
        </button>
      </div>
    </form>
  );
}

export default CreateVisitorForm;
