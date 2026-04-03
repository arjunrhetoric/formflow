import React from 'react';
import { cn } from '@/lib/utils';

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldWrapper({ label, required, description, error, children, className }: FieldWrapperProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
