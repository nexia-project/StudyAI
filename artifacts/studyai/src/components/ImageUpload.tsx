import { useState, useRef, ChangeEvent } from "react";
import { UploadCloud, Image as ImageIcon, X, Plus, FileText, FileType2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
}

type FileKind = "image" | "pdf" | "word" | "unknown";

function getFileKind(file: File): FileKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword" ||
    file.name.toLowerCase().endsWith(".docx") ||
    file.name.toLowerCase().endsWith(".doc")
  )
    return "word";
  return "unknown";
}

function FileIcon({ kind, className }: { kind: FileKind; className?: string }) {
  if (kind === "pdf") return <FileType2 className={cn("text-red-500", className)} />;
  if (kind === "word") return <FileText className={cn("text-violet-500", className)} />;
  return <ImageIcon className={cn("text-muted-foreground", className)} />;
}

function fileSizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPTED_TYPES = [
  "image/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pdf",
  ".doc",
  ".docx",
].join(",");

const KIND_LABELS: Record<FileKind, string> = {
  image: "Imagem",
  pdf: "PDF",
  word: "Word",
  unknown: "Arquivo",
};

const KIND_BADGE: Record<FileKind, string> = {
  image: "bg-violet-100 text-gray-700",
  pdf: "bg-red-100 text-red-700",
  word: "bg-violet-100 text-violet-700",
  unknown: "bg-gray-100 text-gray-600",
};

export function ImageUpload({ onFilesSelect, selectedFiles }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<(string | null)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_FILES = 50;

  const processFiles = (incoming: File[]) => {
    const valid = incoming.filter((f) => getFileKind(f) !== "unknown");
    const invalid = incoming.filter((f) => getFileKind(f) === "unknown");

    if (invalid.length > 0) {
      alert(`Formato não suportado: ${invalid.map((f) => f.name).join(", ")}\n\nUse: imagens, PDF ou Word (.docx/.doc)`);
    }
    if (valid.length === 0) return;

    const merged = [...selectedFiles, ...valid];
    if (merged.length > MAX_FILES) {
      alert(`Limite de ${MAX_FILES} arquivos atingido. Você tentou adicionar ${merged.length} arquivos no total.`);
      return;
    }
    onFilesSelect(merged);

    valid.forEach((file) => {
      const kind = getFileKind(file);
      if (kind === "image") {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviews((prev) => [...prev, null]);
      }
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
        accept={ACCEPTED_TYPES}
        multiple
        className="hidden"
      />

      {hasFiles ? (
        <div className="p-4 space-y-3">
          <div className="space-y-2">
            {selectedFiles.map((file, index) => {
              const kind = getFileKind(file);
              const preview = previews[index];
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 shadow-sm"
                >
                  {/* Thumbnail or icon */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
                    {preview ? (
                      <img src={preview} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <FileIcon kind={kind} className="w-7 h-7" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", KIND_BADGE[kind])}>
                        {KIND_LABELS[kind]}
                      </span>
                      <span className="text-xs text-gray-400">{fileSizeLabel(file.size)}</span>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={(e) => removeFile(index, e)}
                    className="flex-shrink-0 p-1.5 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-500 rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add more */}
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 text-primary font-semibold text-sm transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Adicionar mais arquivos
          </button>

          <p className="text-center text-xs text-muted-foreground">
            {selectedFiles.length} arquivo{selectedFiles.length !== 1 ? "s" : ""} selecionado{selectedFiles.length !== 1 ? "s" : ""}
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
            Envie seu material de estudo
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            Clique ou arraste arquivos aqui · até 50 arquivos
          </p>
          {/* Supported formats badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-violet-100 text-gray-700">
              <ImageIcon className="w-3.5 h-3.5" /> Imagens
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-red-100 text-red-700">
              <FileType2 className="w-3.5 h-3.5" /> PDF
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-violet-100 text-violet-700">
              <FileText className="w-3.5 h-3.5" /> Word (.doc/.docx)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
