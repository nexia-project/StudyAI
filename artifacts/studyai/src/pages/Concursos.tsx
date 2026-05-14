/**
 * Concursos — placeholder page.
 * TODO: implement concursos browser / search UI.
 */

import { FileText } from "lucide-react";

export default function ConcursosPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <FileText className="h-12 w-12 text-violet-400" />
      <h1 className="text-2xl font-bold text-slate-800">Concursos</h1>
      <p className="max-w-md text-sm text-slate-500">
        Em breve você poderá explorar questões e simulados de concursos por aqui.
      </p>
    </div>
  );
}
