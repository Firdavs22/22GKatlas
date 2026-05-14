'use client';
import { useState, useRef, ReactNode } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export interface UploadedFile {
  url: string;
  previewUrl?: string;
}

interface FileUploadProps {
  /** Receives just URLs (legacy contract). Use `onUploadDetailed` if you need previews. */
  onUpload?: (urls: string[]) => void;
  /** Receives full upload info per file ({ url, previewUrl? }). */
  onUploadDetailed?: (files: UploadedFile[]) => void;
  accept?: string;
  label?: ReactNode;
  multiple?: boolean;
}

export default function FileUpload({
  onUpload,
  onUploadDetailed,
  accept = 'image/*,video/*,.pdf,.doc,.docx',
  label = 'Загрузить файл',
  multiple = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;
    const files = Array.from(filesList);

    setUploading(true);
    setError(null);

    try {
      let uploaded: UploadedFile[];

      if (files.length > 1) {
        // Batch endpoint — one round-trip
        const formData = new FormData();
        for (const f of files) formData.append('files', f);
        const { data } = await api.post('/upload/batch', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploaded = data.files as UploadedFile[];
      } else {
        // Single upload
        const formData = new FormData();
        formData.append('file', files[0]);
        const { data } = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploaded = [data as UploadedFile];
      }

      onUploadDetailed?.(uploaded);
      onUpload?.(uploaded.map(u => u.url));

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      console.error('Upload error:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Ошибка загрузки файла. Попробуйте ещё раз.');
    } finally {
      setUploading(false);
    }
  };

  const inputId = `file-upload-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="inline-block">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
        className="hidden"
        id={inputId}
        disabled={uploading}
      />
      <label
        htmlFor={inputId}
        className={`inline-flex items-center justify-center gap-2 px-3 h-9 rounded-full text-sm font-medium transition-colors ${
          uploading
            ? 'text-slate-400 cursor-not-allowed'
            : 'text-slate-600 hover:text-brand hover:bg-brand-pale/40 cursor-pointer'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Загрузка…
          </>
        ) : typeof label === 'string' ? (
          <>
            <Upload size={16} />
            {label}
          </>
        ) : (
          label
        )}
      </label>
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  );
}
