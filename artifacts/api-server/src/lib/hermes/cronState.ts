/** In-memory hint of last Hermes cron run (optional; resets on process restart). */
export type HermesCronHint = {
  job: "daily-learn" | "hourly-proactive";
  finishedAt: string;
  ran: string[];
  ok: boolean;
  errorCount: number;
};

let lastCronHint: HermesCronHint | null = null;

export function setHermesCronHint(hint: HermesCronHint): void {
  lastCronHint = hint;
}

export function getHermesCronHint(): HermesCronHint | null {
  return lastCronHint;
}
