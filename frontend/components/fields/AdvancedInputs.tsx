'use client';
import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FieldWrapper } from './FieldWrapper';
import { Upload } from 'lucide-react';

export function DateRangeInput({ label, required, disabled, value, onChange, error }: any) {
  const [startDate, endDate] = Array.isArray(value) ? value : [null, null];
  return (
    <FieldWrapper label={label} required={required} error={error}>
      <DatePicker
        selectsRange={true}
        startDate={startDate ? new Date(startDate) : undefined}
        endDate={endDate ? new Date(endDate) : undefined}
        onChange={(update) => onChange?.(update)}
        disabled={disabled}
        className="flex h-9 w-full rounded-[0.625rem] border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        placeholderText="Select date range"
        isClearable
      />
    </FieldWrapper>
  );
}

export function FileUploadInput({ label, required, disabled, value, onChange, error }: any) {
  // Simplified dropzone UI
  return (
    <FieldWrapper label={label} required={required} error={error}>
      <div className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed bg-muted' : 'border-input hover:border-primary/50 bg-transparent cursor-pointer'
      }`}>
        <Upload className="h-8 w-8 text-muted-foreground mb-4" />
        <p className="text-sm text-foreground font-medium">Click or drag file to this area to upload</p>
        <p className="text-xs text-muted-foreground mt-1">Support for a single or bulk upload.</p>
        {value && <div className="mt-4 text-xs font-mono bg-secondary px-2 py-1 rounded truncate max-w-full">{typeof value === 'string' ? value : 'File selected'}</div>}
        <input 
          type="file" 
          disabled={disabled} 
          onChange={(e) => {
            // Mock upload completion for now
            if (e.target.files?.[0]) onChange?.(e.target.files[0].name);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
        />
      </div>
    </FieldWrapper>
  );
}
