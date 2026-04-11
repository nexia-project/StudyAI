export type ProfessorEventContext =
  | "plan_generated"
  | "simulado_done"
  | "flashcard_done"
  | "xp_gained"
  | "streak"
  | "redacao_done"
  | "generic";

export interface ProfessorProactiveDetail {
  text: string;
  context?: ProfessorEventContext;
}

export interface StudentContext {
  nome?: string;
  serie?: string;
  objetivo?: string;
  materia?: string;
  diasCompletos?: number;
  diasTotal?: number;
  xp?: number;
  meta?: string;
  ultimosTopicos?: string[];
  ultimaMensagem?: string;
}

export function triggerProfessor(text: string, context: ProfessorEventContext = "generic") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ProfessorProactiveDetail>("professor:proactive", {
      detail: { text, context },
    })
  );
}

// Dispatch an action from Paula (navigate, create plan, etc.)
export function triggerProfessorAction(type: string, param: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("professor:action", { detail: { type, param } })
  );
}

// Collect current student context from localStorage + any extra data written by Home.tsx
export function collectStudentContext(): StudentContext {
  try {
    const profile = JSON.parse(localStorage.getItem("studyai_profile") || "{}");
    const ctx = JSON.parse(localStorage.getItem("studyai_current_context") || "{}");
    return {
      nome: profile?.nome || ctx?.nome,
      serie: profile?.serie || ctx?.serie,
      objetivo: profile?.objetivo || ctx?.objetivo,
      materia: ctx?.materia,
      diasCompletos: ctx?.diasCompletos,
      diasTotal: ctx?.diasTotal,
      xp: ctx?.xp,
      ultimosTopicos: ctx?.ultimosTopicos,
      ultimaMensagem: ctx?.ultimaMensagem,
    };
  } catch {
    return {};
  }
}
