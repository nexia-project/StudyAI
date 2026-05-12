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
  paginaAtual?: string;
  /** Últimas respostas do Tiagão (painel) — servidor evita repetir */
  ultimasFalasTiagao?: string[];
}

export function triggerProfessor(text: string, context: ProfessorEventContext = "generic") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ProfessorProactiveDetail>("professor:proactive", {
      detail: { text, context },
    })
  );
}

export interface ProfessorBehaviorDetail {
  reason: string;
  data?: Record<string, unknown>;
}

export function triggerProfessorBehavior(reason: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ProfessorBehaviorDetail>("professor:behavior", {
      detail: { reason, data },
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

// Detect current page from URL (works regardless of base path)
function detectCurrentPage(): string {
  const path = window.location.pathname;
  if (path.includes("/mapa")) return "Mapa de Desempenho";
  if (path.includes("/dashboard")) return "Dashboard de Progresso";
  if (path.includes("/redacao")) return "Correção de Redação ENEM";
  if (path.includes("/ranking")) return "Ranking Global";
  if (path.includes("/simulado-adaptativo")) return "Simulado Adaptativo";
  if (path.includes("/simulado")) return "Simulado";
  if (path.includes("/flashcards")) return "Flashcards";
  if (path.includes("/pomodoro")) return "Pomodoro";
  if (path.includes("/pricing")) return "Planos e Preços";
  if (path.includes("/historico")) return "Histórico de Planos";
  if (path.includes("/app")) return "Home / Gerador de Plano";
  return "StudyAI";
}

// Collect current student context from localStorage + current page
export function collectStudentContext(): StudentContext {
  try {
    const profile = JSON.parse(localStorage.getItem("studyai_profile") || "{}");
    const ctx = JSON.parse(localStorage.getItem("studyai_current_context") || "{}");

    const paginaAtual = detectCurrentPage();

    const ultimasFalasTiagao = (() => {
      try {
        const raw = sessionStorage.getItem("studyai_tiagao_recent_assistant");
        if (!raw) return undefined;
        const arr = JSON.parse(raw) as unknown;
        return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string").slice(-5) : undefined;
      } catch {
        return undefined;
      }
    })();

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
      paginaAtual,
      ultimasFalasTiagao,
    };
  } catch {
    return {};
  }
}
