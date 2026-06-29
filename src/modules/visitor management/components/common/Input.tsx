const Input = ({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  className = "",
}) => {
  return (
    <div className={`form-group ${className}`}>
      {label && <label htmlFor={name}>{label}</label>}

      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default Input;
