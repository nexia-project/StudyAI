export const SIMULADO_ERROR_REVIEW_DRAFT_KEY = "studyai:simulado-enem:error-review-draft:v1";
export const ERROR_REVIEW_MISSION_KEY = "studyai:error-review:mission:v1";
export const ERROR_REVIEW_HISTORY_KEY = "studyai:error-review:history:v1";

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

export type ErrorReviewCompletion = ErrorReviewMission & {
  completedAt: string;
  savedNoteId?: string | number | null;
  completion: "saved_review_note" | "manual_close";
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

export function clearErrorReviewMission() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ERROR_REVIEW_MISSION_KEY);
}

function readHistoryStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

function writeHistoryStorage<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(items.slice(0, 20)));
}

export function readErrorReviewHistory(): ErrorReviewCompletion[] {
  return readHistoryStorage<ErrorReviewCompletion>(ERROR_REVIEW_HISTORY_KEY)
    .filter(item => item?.title && item?.createdAt && item?.completedAt);
}

export function completeErrorReviewMission(args: {
  mission: ErrorReviewMission;
  savedNoteId?: string | number | null;
  completion?: ErrorReviewCompletion["completion"];
}) {
  if (typeof window === "undefined") return;
  const completed: ErrorReviewCompletion = {
    ...args.mission,
    completedAt: new Date().toISOString(),
    savedNoteId: args.savedNoteId ?? null,
    completion: args.completion ?? "saved_review_note",
  };
  const history = readErrorReviewHistory()
    .filter(item => !(item.createdAt === completed.createdAt && item.subject === completed.subject));
  writeHistoryStorage(ERROR_REVIEW_HISTORY_KEY, [completed, ...history]);
  clearErrorReviewMission();
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
