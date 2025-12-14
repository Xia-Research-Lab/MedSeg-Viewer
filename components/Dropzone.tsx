import React, { useRef, useState } from 'react';
import { Upload, FileJson, Image as ImageIcon } from 'lucide-react';

interface DropzoneProps {
  onFileAccepted: (file: File) => void;
  accept: 'json' | 'image';
  label: string;
  disabled?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileAccepted, accept, label, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAccept(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAccept(e.target.files[0]);
    }
  };

  const validateAndAccept = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (accept === 'json' && extension === 'json') {
      onFileAccepted(file);
    } else if (accept === 'image' && ['jpg', 'jpeg', 'png'].includes(extension || '')) {
      onFileAccepted(file);
    } else {
      alert(`Invalid file type. Please upload a ${accept === 'json' ? 'JSON' : 'Image'} file.`);
    }
  };

  const Icon = accept === 'json' ? FileJson : ImageIcon;

  return (
    <div
      onClick={() => !disabled && fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all
        ${disabled ? 'opacity-50 cursor-not-allowed border-slate-700 bg-slate-900' : 
          isDragOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-400 hover:bg-slate-800'}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept === 'json' ? '.json' : '.jpg,.jpeg,.png'}
        disabled={disabled}
      />
      <Icon className={`w-8 h-8 mb-2 ${isDragOver ? 'text-blue-400' : 'text-slate-400'}`} />
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <span className="text-xs text-slate-500 mt-1">
        {accept === 'json' ? 'Drag & Drop .json' : 'Drag & Drop .png/.jpg'}
      </span>
    </div>
  );
};
