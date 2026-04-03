'use client';
import React from 'react';
import Select from 'react-select';
import { Star } from 'lucide-react';
import { FieldWrapper } from './FieldWrapper';

export interface OptionType { label: string; value: string; }

interface SelectInputProps {
  label: string;
  required?: boolean;
  disabled?: boolean;
  options: OptionType[];
  value?: string | string[];
  onChange?: (val: any) => void;
  error?: string;
  isMulti?: boolean;
}

export function ChoiceInput({ label, required, disabled, options, value, onChange, error, isMulti }: SelectInputProps) {
  let parsedValue = null;
  if (isMulti && Array.isArray(value)) {
    parsedValue = options.filter(o => value.includes(o.value));
  } else if (!isMulti && typeof value === 'string') {
    parsedValue = options.find(o => o.value === value) || null;
  }

  return (
    <FieldWrapper label={label} required={required} error={error}>
      <Select
        isMulti={isMulti}
        isDisabled={disabled}
        options={options}
        value={parsedValue}
        onChange={(v: any) => {
          if (!v) return onChange?.(isMulti ? [] : '');
          if (isMulti) onChange?.((v as OptionType[]).map((o) => o.value));
          else onChange?.((v as OptionType).value);
        }}
        classNamePrefix="react-select"
        className="text-sm"
      />
    </FieldWrapper>
  );
}

export function RatingInput({ label, required, disabled, value, onChange, error, maxStars = 5 }: any) {
  const rating = Number(value) || 0;
  return (
    <FieldWrapper label={label} required={required} error={error}>
      <div className="flex items-center gap-1">
        {Array.from({ length: maxStars }).map((_, i) => (
          <Star
            key={i}
            className={`h-6 w-6 cursor-pointer transition-colors ${
              i < rating ? 'fill-primary text-primary' : 'text-muted-foreground hover:text-primary/50'
            } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
            onClick={() => onChange?.(i + 1)}
          />
        ))}
      </div>
    </FieldWrapper>
  );
}
