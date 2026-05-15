/**
 * Snapshot estático da estrutura de copy da landing (espelha Landing.tsx).
 * Usado pelo agente ux_layout — sem scrape de produção.
 */
export const LANDING_AUDIT = {
  source: "artifacts/studyai/src/pages/Landing.tsx",
  sections: [
    {
      id: "hero",
      elements: [
        { type: "badge", text: "Novo: Tutor Tiagão — Voz proativa em PT-BR" },
        { type: "badge", text: "Top 10 EdTech Brasil 2025" },
        {
          type: "h1",
          text: "Plano, voz, materiais e desafios reais — no mesmo lugar",
        },
        {
          type: "subhead",
          text: "StudyAI é a plataforma brasileira que une plano inteligente, Tiagão por voz, Notebook RAG, Lousa Imersiva, Tutor com GPT e Claude, Simulado ENEM e o módulo Fazedores…",
        },
        { type: "subhead", text: "Feito para o ENEM, vestibular e concursos brasileiros." },
        { type: "body", text: "No mesmo login você acessa Simulado ENEM, Notebook RAG…" },
        { type: "cta_primary", text: "Começar grátis — 2 minutos" },
        { type: "cta_secondary", text: "Ver demonstração — 1:32" },
        { type: "cta_tertiary", text: "Ver preços e Pro" },
      ],
      stats: [
        "100 mil+ estudantes impactados no ecossistema*",
        "Feedback muito positivo em testes com grupos focados*",
        "4.8★ média em pesquisas com usuários piloto*",
        "24/7 IA por texto e voz no app",
      ],
    },
    {
      id: "novidades_band",
      items: ["Fazedores", "Notebook RAG", "Lousa Imersiva", "Tutor IA (GPT e Claude)"],
    },
    {
      id: "app_showcase",
      count: 7,
      sampleTitles: [
        "Professor Tiagão",
        "Simulado ENEM",
        "Notebook RAG",
        "Cronograma e Sala de Estudos",
      ],
    },
    {
      id: "features_grid",
      count: 15,
      sampleLabels: [
        "Plano de Estudos IA",
        "Tutor Tiagão 24h",
        "Notebook RAG",
        "Corretor de Redação",
      ],
    },
    {
      id: "steps",
      titles: [
        "Conte seus objetivos",
        "Receba seu plano personalizado",
        "Estude com tutor IA 24h",
      ],
    },
    {
      id: "testimonials",
      count: 4,
    },
    {
      id: "pricing",
      plans: ["Grátis", "Pro"],
      ctaFree: "Começar Grátis",
    },
    {
      id: "cta_final",
      cta: "Começar grátis agora",
    },
  ],
  uxNotes: [
    "Hero concentra 3 CTAs + link preços — risco de competição visual.",
    "H1 mistura benefício (plano/voz) com lista de módulos implícita.",
    "Stats com asterisco de disclaimer — boa prática de clareza.",
    "Grid de 15 features pode sobrecarregar escaneabilidade.",
  ],
} as const;

export function landingAuditSummary(): string {
  return JSON.stringify(LANDING_AUDIT, null, 2);
}
