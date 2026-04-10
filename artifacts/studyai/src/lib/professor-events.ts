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

export function triggerProfessor(text: string, context: ProfessorEventContext = "generic") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ProfessorProactiveDetail>("professor:proactive", {
      detail: { text, context },
    })
  );
}
