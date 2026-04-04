'use client';
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FieldWrapper } from './FieldWrapper';
import { Upload, CheckCircle, Loader2, FileText, X } from 'lucide-react';
import { signUpload } from '@/lib/api/uploads';

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

export function FileUploadInput({ label, required, disabled, value, onChange, error, maxSizeMb, allowedTypes }: any) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const getResourceType = (file: File) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'raw';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || disabled) return;

    const maxBytes = Number(maxSizeMb || 10) * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`File must be ${Number(maxSizeMb || 10)}MB or smaller.`);
      return;
    }

    const normalizedAllowedTypes = Array.isArray(allowedTypes)
      ? allowedTypes.map((type) => String(type).replace(/^\./, '').trim().toLowerCase()).filter(Boolean)
      : [];

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (normalizedAllowedTypes.length && !normalizedAllowedTypes.includes(fileExtension)) {
      setUploadError(`Allowed file types: ${normalizedAllowedTypes.join(', ')}`);
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadError('');
    // Mark field as pending upload so form submit can't pass with an incomplete file object.
    onChange?.({ __uploading: true, original_name: file.name });

    try {
      const resourceType = getResourceType(file);

      // Get signed upload params from backend
      const signRes = await signUpload('formflow/uploads', resourceType);
      const { cloudName, apiKey, folder, timestamp, signature } = signRes.data;

      // Upload directly to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signature);
      formData.append('folder', folder);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          setProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      };

      xhr.onload = () => {
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (!result?.public_id || !result?.secure_url) {
              setUploadError('Upload did not return a valid file URL. Please try again.');
              onChange?.(null);
              return;
            }
            onChange?.({
              cloudinary_public_id: result.public_id,
              url: result.secure_url,
              original_name: file.name,
              size_bytes: file.size,
              format: result.format,
              resource_type: result.resource_type || resourceType,
            });
          } catch {
            setUploadError('Upload failed. Invalid server response.');
            onChange?.(null);
          }
        } else {
          try {
            const result = JSON.parse(xhr.responseText);
            setUploadError(result?.error?.message || 'Upload failed. Please try again.');
            onChange?.(null);
          } catch {
            setUploadError('Upload failed. Please try again.');
            onChange?.(null);
          }
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        setUploadError('Upload failed. Check your connection.');
        onChange?.(null);
      };

      xhr.send(formData);
    } catch (err: any) {
      setUploading(false);
      setUploadError(err.response?.data?.message || 'Could not sign upload');
    }
  };

  const fileInfo = value && typeof value === 'object' ? value : null;

  return (
    <FieldWrapper label={label} required={required} error={error || uploadError}>
      {fileInfo ? (
        <div className="flex items-center gap-3 p-3 border border-input rounded-xl bg-muted/30">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileInfo.original_name || 'Uploaded file'}</p>
            <p className="text-xs text-muted-foreground">
              {fileInfo.size_bytes ? `${(fileInfo.size_bytes / 1024).toFixed(1)} KB` : 'Uploaded'}
              {fileInfo.format ? ` · ${fileInfo.format.toUpperCase()}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <CheckCircle className="h-4 w-4 text-green-600" />
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange?.(null)}
                className="h-6 w-6 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed bg-muted' :
          uploading ? 'border-primary/50 bg-primary/5' :
          'border-input hover:border-primary/50 bg-transparent cursor-pointer hover:bg-muted/30'
        }`}>
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary mb-3 animate-spin" />
              <p className="text-sm font-medium text-foreground">Uploading... {progress}%</p>
              <div className="w-48 h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-foreground font-medium">Click or drag file to upload</p>
              <p className="text-xs text-muted-foreground mt-1">
                {Array.isArray(allowedTypes) && allowedTypes.length
                  ? `${allowedTypes.join(', ')} up to ${Number(maxSizeMb || 10)}MB`
                  : `PDF, Images, Documents up to ${Number(maxSizeMb || 10)}MB`}
              </p>
            </>
          )}
          {!uploading && (
            <input
              type="file"
              accept={Array.isArray(allowedTypes) && allowedTypes.length
                ? allowedTypes.map((type) => `.${String(type).replace(/^\./, '').trim()}`).join(',')
                : '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp'}
              disabled={disabled}
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
          )}
        </div>
      )}
    </FieldWrapper>
  );
}
