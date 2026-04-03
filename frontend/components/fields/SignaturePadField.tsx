'use client';
import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FieldWrapper } from './FieldWrapper';
import { Button } from '../ui/Button';

export function SignaturePadField({ label, required, disabled, value, onChange, error }: any) {
  const padRef = useRef<SignatureCanvas>(null);

  return (
    <FieldWrapper label={label} required={required} error={error}>
      <div className={`relative border rounded-lg bg-background overflow-hidden ${error ? 'border-destructive' : 'border-input'}`}>
        <div className={`absolute inset-0 z-10 ${disabled ? '' : 'hidden'}`} />
        <SignatureCanvas
          ref={padRef}
          penColor="#18181b"
          canvasProps={{ className: 'w-full h-32 opacity-80', style: { pointerEvents: disabled ? 'none' : 'auto' } }}
          onEnd={() => {
            if (padRef.current && !padRef.current.isEmpty()) {
              onChange?.(padRef.current.toDataURL());
            }
          }}
        />
      </div>
      {!disabled && (
        <div className="flex justify-end mt-1">
          <Button type="button" variant="ghost" className="h-6 text-xs px-2" onClick={() => { padRef.current?.clear(); onChange?.(null); }}>
            Clear Signature
          </Button>
        </div>
      )}
    </FieldWrapper>
  );
}
