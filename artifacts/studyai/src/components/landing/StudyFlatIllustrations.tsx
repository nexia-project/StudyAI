/**
 * Ilustrações vetoriais originais (flat / “desenho”) para a landing.
 * Paleta alinhada ao StudyAI — uso decorativo; não substituem texto acessível.
 */

export function StudyHeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 440 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="220" cy="300" rx="180" ry="28" fill="#E0E7FF" />
      <path
        d="M60 120c0-44 35-80 80-80h160c44 0 80 36 80 80v120H60V120z"
        fill="#F5F3FF"
        stroke="#C4B5FD"
        strokeWidth="2"
      />
      <rect x="120" y="88" width="200" height="12" rx="6" fill="#DDD6FE" />
      <rect x="140" y="108" width="160" height="8" rx="4" fill="#EDE9FE" />
      <rect x="150" y="195" width="140" height="8" rx="4" fill="#E9D5FF" />
      <rect x="150" y="212" width="100" height="8" rx="4" fill="#F3E8FF" />
      <rect x="165" y="148" width="110" height="70" rx="10" fill="#1E1B4B" stroke="#6366F1" strokeWidth="2" />
      <rect x="178" y="162" width="84" height="42" rx="4" fill="#312E81" />
      <circle cx="220" cy="178" r="6" fill="#A5B4FC" />
      <rect x="198" y="188" width="44" height="4" rx="2" fill="#818CF8" />
      <circle cx="130" cy="210" r="36" fill="#FDE68A" stroke="#F59E0B" strokeWidth="2" />
      <path d="M118 198c8-18 28-28 48-24" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
      <rect x="100" y="228" width="60" height="72" rx="14" fill="#6366F1" />
      <rect x="92" y="248" width="76" height="52" rx="12" fill="#4F46E5" />
      <circle cx="310" cy="200" r="34" fill="#FECDD3" stroke="#F472B6" strokeWidth="2" />
      <path d="M296 188c10-6 24-6 34 2" stroke="#9D174D" strokeWidth="2" strokeLinecap="round" />
      <rect x="278" y="224" width="64" height="76" rx="14" fill="#22D3EE" opacity="0.35" />
      <rect x="268" y="238" width="84" height="58" rx="14" fill="#06B6D4" />
      <path d="M320 248l28-16 12 20-32 8z" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
      <circle cx="380" cy="96" r="22" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
      <path d="M368 88c12-4 26 2 32 14" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 60c20 8 36 28 44 52M390 140c-16 10-28 26-32 46" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export function StudyBooksIllustration({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="40" y="120" width="56" height="64" rx="6" fill="#4F46E5" />
      <rect x="52" y="108" width="56" height="76" rx="6" fill="#6366F1" />
      <rect x="66" y="96" width="56" height="88" rx="6" fill="#818CF8" />
      <rect x="80" y="84" width="56" height="100" rx="6" fill="#A5B4FC" stroke="#4F46E5" strokeWidth="2" />
      <rect x="180" y="118" width="100" height="66" rx="10" fill="#FAF5FF" stroke="#C4B5FD" strokeWidth="2" />
      <circle cx="230" cy="148" r="22" fill="#FDE68A" stroke="#F59E0B" strokeWidth="2" />
      <path d="M218 138c8-6 22-6 30 4" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
      <rect x="210" y="162" width="40" height="36" rx="10" fill="#06B6D4" />
      <path d="M200 154h80M200 166h56" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

export function StudySparkIllustration({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="100" cy="100" r="72" fill="#EDE9FE" stroke="#A78BFA" strokeWidth="2" />
      <path d="M100 48l8 28 28 8-28 8-8 28-8-28-28-8 28-8z" fill="#7C3AED" />
      <circle cx="100" cy="100" r="18" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
      <path d="M36 100c12-20 32-36 56-44M164 100c-12 20-32 36-56 44" stroke="#C4B5FD" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
