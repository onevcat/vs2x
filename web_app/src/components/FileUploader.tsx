import React, { useRef } from 'react';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelected }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div
      className={`w-full min-h-[140px] flex flex-col justify-center items-center border-2 border-dashed rounded-xl bg-white text-gray-500 hover:border-blue-400 transition-all duration-150 cursor-pointer select-none
        ${dragActive ? 'border-blue-500 bg-blue-50 text-blue-700' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{ marginTop: 0, marginBottom: 0 }}
    >
      <input
        type="file"
        accept="application/json"
        ref={inputRef}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <span className="text-base md:text-lg font-medium">
        将 VSCode 主题 JSON 文件拖拽到此处
      </span>
      <span className="text-xs text-gray-400 mt-2">或点击上传</span>
    </div>
  );
};

export default FileUploader;
