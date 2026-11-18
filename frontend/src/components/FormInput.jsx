import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  error = '',
  hint = '',
  options = [],
  rows = 3,
  min,
  max,
  step,
  autoComplete,
  className = '',
}) {
  const id = `field-${name}`;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword && showPassword ? 'text' : type;

  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
          {required && <span className="form-required">*</span>}
        </label>
      )}

      {type === 'select' ? (
        <select
          id={id}
          name={name}
          className="form-control"
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
        >
          {options.map((opt) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={optVal} value={optVal}>
                {optLabel}
              </option>
            );
          })}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          name={name}
          className="form-control"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
        />
      ) : isPassword ? (
        <div className="password-input-wrap">
          <input
            id={id}
            name={name}
            type={resolvedType}
            className="form-control password-input-control"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            autoComplete={autoComplete}
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
            disabled={disabled}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          className="form-control"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          autoComplete={autoComplete}
        />
      )}

      {error && <span className="form-error">{error}</span>}
      {!error && hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}
