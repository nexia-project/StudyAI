import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Target, BookOpen, ArrowRight, Sparkles } from "lucide-react";

const GRADES = [
  "1º Ano - Fundamental", "2º Ano - Fundamental", "3º Ano - Fundamental",
  "4º Ano - Fundamental", "5º Ano - Fundamental", "6º Ano - Fundamental",
  "7º Ano - Fundamental", "8º Ano - Fundamental", "9º Ano - Fundamental",
  "1º Ano - Médio", "2º Ano - Médio", "3º Ano - Médio",
  "Faculdade / Ensino Superior", "Outro / Concurso / Idiomas",
];

const GOALS = [
  { id: "enem", label: "ENEM 2025", emoji: "📚", desc: "Quero passar no ENEM" },
  { id: "vestibular", label: "Vestibular", emoji: "🎓", desc: "FUVEST, UNICAMP e outros" },
  { id: "concurso", label: "Concurso Público", emoji: "🏛️", desc: "Federal, estadual ou municipal" },
  { id: "escola", label: "Escola / Faculdade", emoji: "📖", desc: "Provas e trabalhos" },
  { id: "outros", label: "Outro objetivo", emoji: "🎯", desc: "Aprender algo específico" },
];

export type OnboardingData = {
  nome: string;
  serie: string;
  objetivo: string;
};

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void;
}

const STORAGE_KEY = "studyai_profile";

export function hasOnboarded(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return true;
  }
}

export function getOnboardingData(): OnboardingData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [nome, setNome] = useState("");
  const [serie, setSerie] = useState("");
  const [objetivo, setObjetivo] = useState("");

  const handleComplete = () => {
    const data: OnboardingData = { nome: nome.trim() || "Herói", serie, objetivo };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
    onComplete(data);
  };

  const steps = [
    {
      title: "Bem-vindo ao StudyAI! 🚀",
      subtitle: "Vou criar uma experiência de estudos única para você. Primeiro, como posso te chamar?",
      content: (
        <div className="space-y-4">
          <input
            autoFocus
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && nome.trim() && setStep(1)}
            placeholder="Seu nome ou apelido"
            className="w-full px-6 py-4 text-xl rounded-2xl border-2 border-primary/20 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-center font-bold"
          />
          <button
            onClick={() => nome.trim() && setStep(1)}
            disabled={!nome.trim()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-black text-lg flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition-opacity shadow-lg"
          >
            Continuar <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      ),
    },
    {
      title: `Em qual série você está, ${nome || "amigo"}?`,
      subtitle: "Isso me ajuda a adaptar o conteúdo ao seu nível.",
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {GRADES.map((g) => (
              <button
                key={g}
                onClick={() => { setSerie(g); setStep(2); }}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold text-left transition-all hover:border-primary hover:bg-primary/5 ${
                  serie === g ? "border-primary bg-primary/10 text-primary" : "border-gray-200 text-gray-700"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Qual é o seu objetivo principal?",
      subtitle: "Vou personalizar tudo para você chegar lá mais rápido.",
      content: (
        <div className="space-y-3">
          {GOALS.map((g) => (
            <button
              key={g.id}
              onClick={() => { setObjetivo(g.label); setTimeout(handleComplete, 150); }}
              className={`w-full px-5 py-4 rounded-2xl border-2 text-left transition-all hover:border-primary hover:bg-primary/5 flex items-center gap-4 ${
                objetivo === g.label ? "border-primary bg-primary/10" : "border-gray-200"
              }`}
            >
              <span className="text-3xl">{g.emoji}</span>
              <div>
                <p className="font-black text-gray-900">{g.label}</p>
                <p className="text-sm text-gray-500">{g.desc}</p>
              </div>
            </button>
          ))}
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="bg-gradient-to-r from-primary via-accent to-pink-500 p-6 text-white text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              {step === 0 ? <Sparkles className="w-6 h-6" /> : step === 1 ? <GraduationCap className="w-6 h-6" /> : <Target className="w-6 h-6" />}
            </div>
          </div>
          <div className="flex gap-2 justify-center mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? "bg-white w-8" : "bg-white/30 w-4"}`}
              />
            ))}
          </div>
          <h2 className="text-xl font-black leading-tight">{current.title}</h2>
          <p className="text-white/80 text-sm mt-1">{current.subtitle}</p>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {current.content}
            </motion.div>
          </AnimatePresence>

          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>

        <div className="px-6 pb-4 flex items-center gap-2 text-xs text-gray-400">
          <BookOpen className="w-3 h-3" />
          <span>Seus dados são salvos com segurança para personalizar sua experiência</span>
        </div>
      </motion.div>
    </div>
  );
}
