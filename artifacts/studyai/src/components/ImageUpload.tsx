import { useState, useRef, ChangeEvent } from "react";
import { UploadCloud, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

export function ImageUpload({ onFileSelect, selectedFile }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Por favor, envie apenas imagens.");
      return;
    }
    
    onFileSelect(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl border-2 border-dashed transition-all duration-300 ease-out overflow-hidden group",
        isDragging 
          ? "border-primary bg-primary/5 scale-[1.02]" 
          : selectedFile 
            ? "border-primary/50 bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-secondary/50",
        !selectedFile && "cursor-pointer"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !selectedFile && inputRef.current?.click()}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept="image/*"
        className="hidden"
      />

      {selectedFile && preview ? (
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9]">
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
            <div className="flex items-center gap-2 text-white w-full">
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm font-medium truncate flex-1">{selectedFile.name}</span>
            </div>
          </div>
          <button
            onClick={clearSelection}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-destructive text-white rounded-full backdrop-blur-md transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Envie a foto do seu material
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Clique ou arraste a imagem do seu caderno, livro ou quadro negro aqui.
          </p>
        </div>
      )}
    </div>
  );
}
