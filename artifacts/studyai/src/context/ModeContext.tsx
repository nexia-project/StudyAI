import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AppMode = "aluno" | "professor" | "escola";

interface ModeContextValue {
  mode: AppMode;
  setMode: (m: AppMode) => void;
}

const ModeContext = createContext<ModeContextValue>({
  mode: "aluno",
  setMode: () => {},
});

const STORAGE_KEY = "studyai_app_mode";

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "aluno" || stored === "professor" || stored === "escola") return stored;
    } catch {}
    return "aluno";
  });

  function setMode(m: AppMode) {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}
  }

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}

export const MODE_CONFIG: Record<AppMode, {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  ring: string;
  defaultPath: string;
  description: string;
}> = {
  aluno: {
    label: "Aluno",
    emoji: "🎓",
    color: "text-violet-700",
    bg: "bg-violet-600",
    border: "border-violet-300",
    ring: "ring-violet-400",
    defaultPath: "/app",
    description: "Plano de estudos, simulados e tutor IA",
  },
  professor: {
    label: "Professor",
    emoji: "📚",
    color: "text-purple-900",
    bg: "bg-purple-700",
    border: "border-purple-300/80",
    ring: "ring-purple-400",
    defaultPath: "/professor",
    description: "Turmas, planos de aula e comunicação",
  },
  escola: {
    label: "Escola",
    emoji: "🏫",
    color: "text-purple-950",
    bg: "bg-purple-800",
    border: "border-purple-300/80",
    ring: "ring-purple-400",
    defaultPath: "/instituicao",
    description: "Gestão institucional e relatórios",
  },
};
