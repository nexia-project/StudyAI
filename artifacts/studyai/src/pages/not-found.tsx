import { useLocation } from "wouter";
import { BookOpen } from "lucide-react";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50">
      <div className="text-center px-6 max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6 shadow-lg">
          <BookOpen className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Página não encontrada</h1>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Parece que você tentou acessar uma seção que não existe ou o link está desatualizado.
        </p>
        <button
          onClick={() => navigate("/app")}
          className="w-full py-3 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-primary to-accent shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          Voltar para o StudyAI
        </button>
        <button
          onClick={() => navigate("/")}
          className="mt-3 w-full py-3 px-6 rounded-2xl font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
        >
          Ver página inicial
        </button>
      </div>
    </div>
  );
}
