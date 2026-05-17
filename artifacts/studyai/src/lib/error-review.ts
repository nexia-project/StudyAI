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

export type ErrorReviewStats = {
  totalCompleted: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedAt: string | null;
  nextReviewDueAt: string | null;
  bySubject: Array<{
    subject: string;
    completed: number;
    averageAccuracy: number;
    lastCompletedAt: string;
  }>;
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

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function safeDate(value?: string | null): Date | null {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function buildStreak(dayKeys: string[], now = new Date()) {
  const uniqueDays = new Set(dayKeys);
  const today = localDayKey(now);
  const yesterday = localDayKey(addDays(now, -1));
  const start = uniqueDays.has(today) ? new Date(now) : uniqueDays.has(yesterday) ? addDays(now, -1) : null;
  let current = 0;
  if (start) {
    for (let cursor = start; uniqueDays.has(localDayKey(cursor)); cursor = addDays(cursor, -1)) {
      current += 1;
    }
  }

  let longest = 0;
  let run = 0;
  const ascending = [...uniqueDays].sort();
  let previous: Date | null = null;
  for (const key of ascending) {
    const currentDate = safeDate(`${key}T00:00:00`);
    if (!currentDate) continue;
    const consecutive = previous && localDayKey(addDays(previous, 1)) === key;
    run = consecutive ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = currentDate;
  }

  return { current, longest };
}

export function buildErrorReviewStats(history: ErrorReviewCompletion[], now = new Date()): ErrorReviewStats {
  const valid = history
    .map(item => ({ item, completedAt: safeDate(item.completedAt), nextReviewAt: safeDate(item.nextReviewAt) }))
    .filter((entry): entry is { item: ErrorReviewCompletion; completedAt: Date; nextReviewAt: Date | null } => Boolean(entry.completedAt))
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

  const dayKeys = valid.map(entry => localDayKey(entry.completedAt));
  const streak = buildStreak(dayKeys, now);
  const nowMs = now.getTime();
  const nextReviewDueAt = valid
    .map(entry => entry.nextReviewAt)
    .filter((date): date is Date => date instanceof Date && date.getTime() >= nowMs)
    .sort((a, b) => a.getTime() - b.getTime())[0]?.toISOString() ?? null;

  const grouped = new Map<string, { completed: number; accuracyTotal: number; lastCompletedAt: string }>();
  for (const { item, completedAt } of valid) {
    const current = grouped.get(item.subject) ?? { completed: 0, accuracyTotal: 0, lastCompletedAt: completedAt.toISOString() };
    current.completed += 1;
    current.accuracyTotal += typeof item.accuracy === "number" ? item.accuracy : 0;
    if (completedAt.getTime() > new Date(current.lastCompletedAt).getTime()) {
      current.lastCompletedAt = completedAt.toISOString();
    }
    grouped.set(item.subject, current);
  }

  return {
    totalCompleted: valid.length,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    lastCompletedAt: valid[0]?.completedAt.toISOString() ?? null,
    nextReviewDueAt,
    bySubject: [...grouped.entries()]
      .map(([subject, stats]) => ({
        subject,
        completed: stats.completed,
        averageAccuracy: Math.round(stats.accuracyTotal / Math.max(stats.completed, 1)),
        lastCompletedAt: stats.lastCompletedAt,
      }))
      .sort((a, b) => b.completed - a.completed || new Date(b.lastCompletedAt).getTime() - new Date(a.lastCompletedAt).getTime())
      .slice(0, 4),
  };
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
