/**
 * Client-side caches that may hold PII, study content, or another user's session data.
 * Cleared when the authenticated Clerk user changes so data does not bleed across accounts.
 */
export const STUDYAI_ACCOUNT_CHANGED = "studyai:account-changed";

export function clearStudyaiAccountLocalCaches(): void {
  if (typeof localStorage === "undefined") return;

  const shouldRemoveLs = (k: string) =>
    k.startsWith("tiagao_") ||
    k === "studyai_current_context" ||
    k === "studyai_restore_plan" ||
    k === "studyai_profile" ||
    /^studyai_.+_(topics|xp_awarded)$/.test(k);

  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && shouldRemoveLs(k)) keys.push(k);
  }
  for (const k of keys) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }

  if (typeof sessionStorage === "undefined") return;
  const ssKeys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k?.startsWith("studyai_tiagao_")) ssKeys.push(k);
  }
  for (const k of ssKeys) {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}
