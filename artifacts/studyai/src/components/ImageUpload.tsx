import { useState, useRef, ChangeEvent } from "react";
import { UploadCloud, Image as ImageIcon, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
}

export function ImageUpload({ onFilesSelect, selectedFiles }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = (incoming: File[]) => {
    const images = incoming.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) {
      alert("Por favor, envie apenas imagens.");
      return;
    }

    const merged = [...selectedFiles, ...images];
    onFilesSelect(merged);

    images.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = selectedFiles.filter((_, i) => i !== index);
    const nextPreviews = previews.filter((_, i) => i !== index);
    onFilesSelect(next);
    setPreviews(nextPreviews);
    if (next.length === 0 && inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const hasFiles = selectedFiles.length > 0;

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl border-2 border-dashed transition-all duration-300 ease-out overflow-hidden group",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : hasFiles
          ? "border-primary/50 bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-secondary/50",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept="image/*"
        multiple
        className="hidden"
      />

      {hasFiles ? (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="relative rounded-xl overflow-hidden aspect-square bg-secondary"
              >
                {previews[index] ? (
                  <img
                    src={previews[index]}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1">
                  <p className="text-white text-xs truncate">{file.name}</p>
                </div>
                <button
                  onClick={(e) => removeFile(index, e)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-destructive text-white rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <button
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-1 text-primary transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-6 h-6" />
              <span className="text-xs font-medium">Adicionar</span>
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {selectedFiles.length} imagem{selectedFiles.length !== 1 ? "ns" : ""} selecionada{selectedFiles.length !== 1 ? "s" : ""}
          </p>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center py-12 px-6 text-center cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Envie fotos do seu material
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Clique ou arraste uma ou mais imagens do seu caderno, livro ou quadro negro.
          </p>
        </div>
      )}
    </div>
  );
}
