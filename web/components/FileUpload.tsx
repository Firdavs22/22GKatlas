'use client';
import { useState, useRef } from 'react';
import api from '@/lib/api';

interface FileUploadProps {
  onUpload: (urls: string[]) => void;
  accept?: string;
  label?: string;
  multiple?: boolean;
}

export default function FileUpload({ onUpload, accept = 'image/*,video/*,.pdf,.doc,.docx', label = 'Загрузить файл', multiple = false }: FileUploadProps) {
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

      // Clear input so same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Upload Error:', err);
      setError('Ошибка загрузки файла. Попробуйте еще раз.');
    } finally {
      setUploading(false);
    }
  };

  const inputId = `file-upload-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="relative inline-block w-full">
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
        className={`flex items-center justify-center px-4 py-2 border border-dashed rounded-lg text-sm font-medium transition-colors ${
          uploading
            ? 'border-gray-300 text-gray-400 cursor-not-allowed bg-gray-50'
            : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50 cursor-pointer bg-white'
        }`}
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Загрузка...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            📄 {label}
          </span>
        )}
      </label>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
