import type { ReactNode } from "react";
import { Icons } from "./Icons";

type AlertProps = {
  type?: "info" | "success" | "error" | "warning" | string;
  title?: ReactNode;
  children?: ReactNode;
  onClose?: () => void;
};

function Alert({ type = "info", title, children, onClose }: AlertProps) {
  return (
    <div className={`alert alert-${type}`} role="status">
      <div className="alert-icon">
        {type === "success" ? <Icons.Check /> : <Icons.AlertCircle />}
      </div>
      <div className="alert-content">
        {title && <strong>{title}</strong>}
        {children && <span>{children}</span>}
      </div>
      {onClose && (
        <button className="icon-button subtle" type="button" onClick={onClose} aria-label="Dismiss alert">
          <Icons.Close />
        </button>
      )}
    </div>
  );
}

export default Alert;
