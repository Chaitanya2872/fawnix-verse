import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  text?: ReactNode;
  children?: ReactNode;
  variant?: string;
  size?: string;
  icon?: ReactNode;
  ariaLabel?: string;
};

const Button = ({
  text,
  children,
  type = "button",
  onClick,
  variant = "",
  size = "",
  icon,
  className = "",
  disabled = false,
  ariaLabel,
}: ButtonProps) => {
  const variantClass = variant ? `btn-${variant}` : "";
  const sizeClass = size ? `btn-${size}` : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={["btn", variantClass, sizeClass, className].filter(Boolean).join(" ")}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children || text}
    </button>
  );
};

export default Button;
