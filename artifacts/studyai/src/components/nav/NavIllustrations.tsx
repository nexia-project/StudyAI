import { useId } from "react";
import { cn } from "@/lib/utils";

/** Mini ilustrações em SVG — paleta StudyAI (lilás / violeta), estilo flat futurista leve */
function GradientDefs({ prefix }: { prefix: string }) {
  return (
    <defs>
      <linearGradient id={`${prefix}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="55%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <linearGradient id={`${prefix}-b`} x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#e9d5ff" />
        <stop offset="100%" stopColor="#d8b4fe" />
      </linearGradient>
    </defs>
  );
}

/** Estudante no computador / plano */
export function IllStudyPlan({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <ellipse cx="12" cy="19" rx="9" ry="2.5" fill={`url(#${id}-b)`} opacity={0.55} />
      <rect x="5" y="11" width="14" height="8" rx="1.5" fill={`url(#${id}-a)`} opacity={0.35} />
      <circle cx="12" cy="7" r="3.2" fill={`url(#${id}-a)`} />
      <path d="M9 11h6l-1 6H10l-1-6z" fill={`url(#${id}-a)`} opacity={0.9} />
      <rect x="7" y="13" width="10" height="6" rx="0.8" fill="#faf5ff" stroke={`url(#${id}-a)`} strokeWidth="0.75" />
      <circle cx="12" cy="16" r="1" fill="#7c3aed" opacity={0.5} />
    </svg>
  );
}

/** Simulado / meta */
export function IllTargetExam({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <circle cx="12" cy="12" r="9" stroke={`url(#${id}-a)`} strokeWidth="1.5" opacity={0.25} />
      <circle cx="12" cy="12" r="6" stroke={`url(#${id}-a)`} strokeWidth="1.5" opacity={0.45} />
      <circle cx="12" cy="12" r="3" fill={`url(#${id}-a)`} opacity={0.85} />
      <circle cx="12" cy="12" r="1.2" fill="#faf5ff" />
    </svg>
  );
}

export function IllCalendar({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <rect x="4" y="6" width="16" height="14" rx="2" fill="#faf5ff" stroke={`url(#${id}-a)`} strokeWidth="1.2" />
      <path d="M4 10h16" stroke={`url(#${id}-a)`} strokeWidth="1.2" />
      <path d="M8 4v4M16 4v4" stroke={`url(#${id}-a)`} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="14" r="1.2" fill="#a855f7" />
      <circle cx="15" cy="14" r="1.2" fill="#c084fc" opacity={0.7} />
      <circle cx="12" cy="17" r="1.2" fill="#7c3aed" opacity={0.45} />
    </svg>
  );
}

/** Sala colaborativa — silhuetas + mesa */
export function IllStudyRoom({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <rect x="3" y="15" width="18" height="3" rx="1" fill={`url(#${id}-b)`} />
      <circle cx="8" cy="11" r="2.2" fill={`url(#${id}-a)`} />
      <path d="M6 13h4v4H6z" fill={`url(#${id}-a)`} opacity={0.85} />
      <circle cx="16" cy="11" r="2.2" fill={`url(#${id}-a)`} opacity={0.75} />
      <path d="M14 13h4v4h-4z" fill={`url(#${id}-a)`} opacity={0.65} />
      <ellipse cx="12" cy="18.5" rx="6" ry="1.3" fill={`url(#${id}-a)`} opacity={0.2} />
    </svg>
  );
}

export function IllNotebookStack({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <rect x="5" y="5" width="12" height="15" rx="1.5" fill="#faf5ff" stroke={`url(#${id}-a)`} strokeWidth="1.2" />
      <path d="M8 8h8M8 11h8M8 14h5" stroke="#c084fc" strokeWidth="1" strokeLinecap="round" opacity={0.9} />
      <rect x="7" y="16" width="10" height="2.5" rx="0.5" fill={`url(#${id}-a)`} opacity={0.35} />
      <rect x="6" y="6" width="12" height="15" rx="1.5" fill="none" stroke={`url(#${id}-a)`} strokeWidth="0.75" opacity={0.4} transform="rotate(-4 12 13.5)" />
    </svg>
  );
}

export function IllOpenBook({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <path d="M5 6c3 0 5 1.5 7 4 2-2.5 4-4 7-4v13c-3 0-5-1.5-7-4-2 2.5-4 4-7 4V6z" fill="#faf5ff" stroke={`url(#${id}-a)`} strokeWidth="1.1" />
      <path d="M12 10v9" stroke={`url(#${id}-a)`} strokeWidth="1" opacity={0.35} />
      <path d="M8 9h3M8 12h3M16 9h3M16 12h3" stroke="#d8b4fe" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

export function IllPaperPen({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <rect x="6" y="4" width="11" height="16" rx="1.2" fill="#faf5ff" stroke={`url(#${id}-a)`} strokeWidth="1.1" />
      <path d="M9 8h6M9 11h6M9 14h4" stroke="#e9d5ff" strokeWidth="1" strokeLinecap="round" />
      <path d="M15 17l4 3-2 1.5-3-2.5 1-2z" fill={`url(#${id}-a)`} />
    </svg>
  );
}

export function IllPathLevels({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <path d="M5 18h5v-4H5v4zm7 0h5v-8h-5v8zm7 0h3v-14h-3v14z" fill={`url(#${id}-b)`} opacity={0.65} />
      <circle cx="7.5" cy="10" r="2" fill={`url(#${id}-a)`} />
      <circle cx="14.5" cy="6" r="2" fill={`url(#${id}-a)`} opacity={0.85} />
      <circle cx="21" cy="14" r="1.5" fill={`url(#${id}-a)`} opacity={0.65} />
    </svg>
  );
}

/** Professor + lousa */
export function IllTeacherBoard({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <rect x="3" y="5" width="14" height="10" rx="1.2" fill="#2d005e" opacity={0.92} />
      <path d="M6 9h8M6 12h5" stroke="#e9d5ff" strokeWidth="0.9" strokeLinecap="round" opacity={0.85} />
      <circle cx="18.5" cy="15" r="2.5" fill={`url(#${id}-a)`} />
      <path d="M17 17l-2 5h3l-1-5z" fill={`url(#${id}-a)`} opacity={0.9} />
      <rect x="17" y="18" width="3" height="4" rx="0.5" fill={`url(#${id}-b)`} />
    </svg>
  );
}

export function IllBlackboard({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <rect x="4" y="6" width="16" height="11" rx="1.5" fill="#3b0764" stroke={`url(#${id}-a)`} strokeWidth="1" />
      <path d="M7 10c3 2 7 2 10 0" stroke="#f5d0fe" strokeWidth="1.2" strokeLinecap="round" opacity={0.85} />
      <circle cx="12" cy="13" r="2" stroke="#c084fc" strokeWidth="1" fill="none" />
      <rect x="11" y="17" width="2" height="3" fill={`url(#${id}-b)`} />
    </svg>
  );
}

export function IllMindSpark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <circle cx="12" cy="11" r="4.5" fill={`url(#${id}-b)`} opacity={0.55} />
      <path d="M12 5v2M12 15v2M5 11h2M17 11h2M7 7l1.5 1.5M15.5 15.5L17 17M17 7l-1.5 1.5M7 17l1.5-1.5" stroke={`url(#${id}-a)`} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="11" r="2.5" fill={`url(#${id}-a)`} />
    </svg>
  );
}

export function IllBarsSoft({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <rect x="5" y="12" width="4" height="8" rx="1.5" fill={`url(#${id}-a)`} opacity={0.85} />
      <rect x="10" y="8" width="4" height="12" rx="1.5" fill={`url(#${id}-a)`} opacity={0.65} />
      <rect x="15" y="10" width="4" height="10" rx="1.5" fill={`url(#${id}-b)`} opacity={0.95} />
    </svg>
  );
}

export function IllRadar({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <circle cx="12" cy="12" r="9" stroke={`url(#${id}-a)`} strokeWidth="1" opacity={0.25} />
      <path d="M12 12 L18 8" stroke={`url(#${id}-a)`} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill={`url(#${id}-a)`} opacity={0.35} />
      <circle cx="17" cy="9" r="2.5" fill={`url(#${id}-a)`} opacity={0.75} />
    </svg>
  );
}

export function IllHistory({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <circle cx="12" cy="12" r="8.5" stroke={`url(#${id}-a)`} strokeWidth="1.2" fill="#faf5ff" />
      <path d="M12 7v6l4 2" stroke={`url(#${id}-a)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2" stroke="#ddd6fe" strokeWidth="1" strokeLinecap="round" opacity={0.75} />
    </svg>
  );
}

export function IllFolderStack({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <path d="M5 8l2-2h6l2 2v11H5V8z" fill={`url(#${id}-b)`} opacity={0.85} />
      <path d="M5 10l2-2h7l2 2v9H5v-9z" fill={`url(#${id}-a)`} opacity={0.45} />
      <path d="M5 12l2-2h8l2 2v7H5v-7z" fill="#faf5ff" stroke={`url(#${id}-a)`} strokeWidth="1" />
    </svg>
  );
}

export function IllMedal({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <circle cx="12" cy="10" r="5" fill={`url(#${id}-a)`} />
      <circle cx="12" cy="10" r="2.8" fill="#faf5ff" opacity={0.35} />
      <path d="M9 14l3 7 3-7" fill={`url(#${id}-b)`} opacity={0.9} />
    </svg>
  );
}

export function IllPodium({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <rect x="6" y="12" width="4" height="7" rx="0.8" fill={`url(#${id}-b)`} />
      <rect x="10" y="9" width="4" height="10" rx="0.8" fill={`url(#${id}-a)`} />
      <rect x="14" y="14" width="4" height="5" rx="0.8" fill={`url(#${id}-b)`} opacity={0.75} />
      <circle cx="12" cy="6" r="2.5" fill={`url(#${id}-a)`} />
    </svg>
  );
}

export function IllChatWave({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <path d="M5 8h11a2 2 0 012 2v5a2 2 0 01-2 2h-4l-3 3v-3H5a2 2 0 01-2-2v-5a2 2 0 012-2z" fill="#faf5ff" stroke={`url(#${id}-a)`} strokeWidth="1.2" />
      <path d="M8 11h8M8 14h5" stroke="#d8b4fe" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function IllPeople({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <circle cx="9" cy="9" r="2.5" fill={`url(#${id}-a)`} />
      <path d="M6 15c0-2 1.5-3 3-3s3 1 3 3v2H6v-2z" fill={`url(#${id}-a)`} opacity={0.75} />
      <circle cx="16" cy="8.5" r="2.2" fill={`url(#${id}-a)`} opacity={0.65} />
      <path d="M13.5 14.5c0-1.6 1.2-2.7 2.5-2.7s2.5 1 2.5 2.7V17h-5v-2.5z" fill={`url(#${id}-b)`} opacity={0.95} />
    </svg>
  );
}

export function IllClipboard({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <rect x="7" y="4" width="10" height="16" rx="1.5" fill="#faf5ff" stroke={`url(#${id}-a)`} strokeWidth="1.1" />
      <rect x="10" y="3" width="4" height="3" rx="1" fill={`url(#${id}-a)`} opacity={0.55} />
      <path d="M9 9h6M9 12h6M9 15h4" stroke="#e9d5ff" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function IllLightbulb({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <path d="M12 4c2.8 0 5 2.2 5 5 0 2.5-2 4.5-2 7H9c0-2.5-2-4.5-2-7 0-2.8 2.2-5 5-5z" fill={`url(#${id}-a)`} opacity={0.9} />
      <path d="M9 17h6v1.5a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 18.5V17z" fill={`url(#${id}-b)`} />
      <path d="M12 8v3" stroke="#faf5ff" strokeWidth="1.2" strokeLinecap="round" opacity={0.65} />
    </svg>
  );
}

export function IllExamSheet({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <rect x="5" y="4" width="14" height="16" rx="1.5" fill="#faf5ff" stroke={`url(#${id}-a)`} strokeWidth="1.1" />
      <circle cx="9" cy="10" r="1.8" stroke={`url(#${id}-a)`} strokeWidth="1" fill="none" />
      <path d="M13 9h4M13 12h4M9 15h8" stroke="#ddd6fe" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function IllBuilding({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 shrink-0", className)} aria-hidden>
      <GradientDefs prefix={id} />
      <path d="M5 20V9l7-4 7 4v11H5z" fill="#faf5ff" stroke={`url(#${id}-a)`} strokeWidth="1.2" />
      <path d="M9 20v-5h6v5M12 9v3" stroke={`url(#${id}-a)`} strokeWidth="1" opacity={0.55} />
      <circle cx="12" cy="7" r="1.5" fill={`url(#${id}-a)`} />
    </svg>
  );
}
