'use client';
import { useState, useRef, ReactNode } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface FileUploadProps {
  onUpload: (urls: string[]) => void;
  accept?: string;
  label?: ReactNode;
  multiple?: boolean;
}

export default function FileUpload({
  onUpload,
  accept = 'image/*,video/*,.pdf,.doc,.docx',
  label = 'Загрузить файл',
  multiple = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        const { data } = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrls.push(data.url);
      }
      onUpload(uploadedUrls);

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Upload Error:', err);
      setError('Ошибка загрузки файла. Попробуйте ещё раз.');
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
