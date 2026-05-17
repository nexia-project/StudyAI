export const SIMULADO_ERROR_REVIEW_DRAFT_KEY = "studyai:simulado-enem:error-review-draft:v1";
export const ERROR_REVIEW_MISSION_KEY = "studyai:error-review:mission:v1";

export type ErrorReviewItem = {
  questionNumber: number;
  materia: string;
  difficulty: string;
  selectedAnswer: string;
  correctAnswer: string;
  probableCause: string;
  correction: string;
  skill: string;
  reviewAction: string;
};

export type ErrorReviewMission = {
  title: string;
  subject: string;
  estimate: string;
  reason: string;
  primaryLabel: string;
  tiagaoPrompt: string;
  source: "simulado-enem";
  createdAt: string;
  errorsCount: number;
  accuracy: number;
  errorType: string;
  nextReviewAt: string;
};

export type ErrorReviewDraft = {
  title: string;
  content: string;
  materia?: string;
  createdAt?: string;
  source?: "simulado-enem";
  errorType?: string;
  probableCause?: string;
  nextMission?: string;
  errors?: ErrorReviewItem[];
  subjectFocus?: Array<{
    materia: string;
    errors: number;
    accuracy: number;
    skill: string;
    focus: string;
  }>;
  recommendation?: Record<string, unknown>;
  telemetry?: Record<string, unknown>;
};

export function emitHermesLearningSignal(detail: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("studyai:hermes-learning-signal", { detail }));
}

export function saveErrorReviewMission(mission: ErrorReviewMission) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ERROR_REVIEW_MISSION_KEY, JSON.stringify(mission));
}

export function readErrorReviewMission(maxAgeDays = 14): ErrorReviewMission | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ERROR_REVIEW_MISSION_KEY);
    if (!raw) return null;
    const mission = JSON.parse(raw) as ErrorReviewMission;
    if (!mission?.title || !mission?.createdAt) return null;
    const ageMs = Date.now() - new Date(mission.createdAt).getTime();
    if (!Number.isFinite(ageMs) || ageMs > maxAgeDays * 86400000) {
      localStorage.removeItem(ERROR_REVIEW_MISSION_KEY);
      return null;
    }
    return mission;
  } catch {
    localStorage.removeItem(ERROR_REVIEW_MISSION_KEY);
    return null;
  }
}

export function buildTiagaoErrorReviewPrompt(mission: Pick<ErrorReviewMission, "subject" | "errorsCount" | "errorType" | "reason">) {
  return [
    `Tiagão, quero revisar meus erros de ${mission.subject}.`,
    `Foram ${mission.errorsCount} erro(s), com padrão principal: ${mission.errorType}.`,
    `Motivo: ${mission.reason}`,
    "Me guia em uma missão curta: releitura do comando, correção comentada e uma questão parecida para checar se consertei a lacuna.",
  ].join("\n");
}
