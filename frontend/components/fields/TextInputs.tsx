import React from 'react';
import { FieldWrapper } from './FieldWrapper';
import { Input } from '../ui/Input';

interface ShortTextInputProps {
  label: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (val: string) => void;
  error?: string;
  placeholder?: string;
}

export function ShortTextInput({ label, required, disabled, value, onChange, error, placeholder }: ShortTextInputProps) {
  return (
    <FieldWrapper label={label} required={required} error={error}>
      <Input
        disabled={disabled}
        value={value || ''}
        placeholder={placeholder || 'Type your answer...'}
        onChange={(e) => onChange?.(e.target.value)}
        error={!!error}
      />
    </FieldWrapper>
  );
}

export function LongTextInput({ label, required, disabled, value, onChange, error, placeholder }: ShortTextInputProps) {
  return (
    <FieldWrapper label={label} required={required} error={error}>
      <textarea
        className="flex min-h-[80px] w-full rounded-[0.625rem] border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        disabled={disabled}
        value={value || ''}
        placeholder={placeholder || 'Type your answer...'}
        onChange={(e) => onChange?.(e.target.value)}
        rows={4}
      />
    </FieldWrapper>
  );
}

export function NumberInput({ label, required, disabled, value, onChange, error, placeholder, min, max, step, prefix, suffix }: ShortTextInputProps & { min?: number; max?: number; step?: number; prefix?: string; suffix?: string }) {
  return (
    <FieldWrapper label={label} required={required} error={error}>
      <div className="flex items-center gap-2">
        {prefix && <span className="text-sm text-muted-foreground font-medium">{prefix}</span>}
        <Input
          type="number"
          disabled={disabled}
          value={value || ''}
          placeholder={placeholder || '0'}
          onChange={(e) => {
            onChange?.(e.target.value);
          }}
          error={!!error}
          min={min}
          max={max}
          step={step}
        />
        {suffix && <span className="text-sm text-muted-foreground font-medium">{suffix}</span>}
      </div>
    </FieldWrapper>
  );
}

export function EmailInput({ label, required, disabled, value, onChange, error, placeholder }: ShortTextInputProps) {
  return (
    <FieldWrapper label={label} required={required} error={error}>
      <Input
        type="email"
        disabled={disabled}
        value={value || ''}
        placeholder={placeholder || 'name@example.com'}
        onChange={(e) => onChange?.(e.target.value)}
        error={!!error}
      />
    </FieldWrapper>
  );
}

export function PhoneInput({ label, required, disabled, value, onChange, error, placeholder }: ShortTextInputProps) {
  return (
    <FieldWrapper label={label} required={required} error={error}>
      <Input
        type="tel"
        disabled={disabled}
        value={value || ''}
        placeholder={placeholder || '+1 (555) 000-0000'}
        onChange={(e) => onChange?.(e.target.value)}
        error={!!error}
      />
    </FieldWrapper>
  );
}
