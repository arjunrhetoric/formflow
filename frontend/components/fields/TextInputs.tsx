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
        placeholder={placeholder}
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
        className="flex min-h-[80px] w-full rounded-[0.625rem] border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </FieldWrapper>
  );
}

export function NumberInput({ label, required, disabled, value, onChange, error, placeholder }: ShortTextInputProps) {
  return (
    <FieldWrapper label={label} required={required} error={error}>
      <Input
        type="number"
        disabled={disabled}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        error={!!error}
      />
    </FieldWrapper>
  );
}
