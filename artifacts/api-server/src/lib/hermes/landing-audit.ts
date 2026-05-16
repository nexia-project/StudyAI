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
        { type: "badge", text: "Novo: Tutor Tiagão — voz proativa em PT-BR" },
        { type: "badge", text: "Fontes, revisão e controle humano" },
        { type: "eyebrow", text: "Centro de comando inteligente para estudar" },
        {
          type: "h1",
          text: "A/B hero (sessionStorage studyia_hero_ab_v1): (A) No ENEM, a semana rende mais quando o próximo passo fica claro. | (B) No estudo diário, seu tempo rende mais quando cada sessão tem direção clara.",
        },
        {
          type: "subhead",
          text: "Entre com seu objetivo, prova-alvo ou material. O StudyAI transforma tudo em um hub de diagnóstico, plano, treino, revisão e tutor IA, sem você ficar pulando entre ferramentas.",
        },
        {
          type: "subhead",
          text: "Feito para ENEM, vestibular, concursos e estudo cotidiano no Brasil. Comece sem cartão e avance com Tiagão, Notebook RAG, simulado e sala de estudos no mesmo login.",
        },
        { type: "cta_primary", text: "Começar grátis — 2 minutos" },
        {
          type: "cta_secondary",
          text: "Ver demonstração (1:32) — link com ícone Play, mesma linha que o primário em desktop",
        },
        {
          type: "text_link",
          text: "Ver preços e Pro — linha única abaixo do grupo de CTAs do hero",
        },
        {
          type: "product_preview",
          text: "Cluster visual StudyAI Hub: Diagnóstico, Notebook RAG, Tiagão e próxima ação sugerida.",
        },
      ],
      stats: [
        "ENEM: simulado, treino e revisão no mesmo fluxo",
        "RAG: respostas ancoradas no seu material",
        "Tiagão: voz e texto para orientar o próximo passo",
        "B2B: professor e gestor com revisão humana",
      ],
    },
    {
      id: "credibility",
      title: "Credibilidade sem logos inventados: o produto mostra como ajuda.",
      items: [
        "Próximo passo, não lista solta",
        "Seu material continua sendo fonte",
        "IA com limites claros",
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
    "Hero: composição premium em fundo escuro com gradientes, grid e card cluster de produto; hierarquia de CTA preservada — um botão primário + demonstração como ação secundária; preços em linha de texto abaixo.",
    "H1 em teste A/B (sessão): ENEM vs. tempo/foco; CTA dispara studyia_landing_cta com variant.",
    "Prova do hero evita números/logos não auditáveis e reforça capacidade verificável: ENEM, RAG, Tiagão e B2B com revisão humana.",
    "Bloco de credibilidade virou faixa de prova operacional: próximo passo, fontes e limites da IA.",
    "Faixa de novidades foi compactada no mobile para deixar a dobra hero/CTA aparecer mais cedo.",
    "Grid de 15 features pode sobrecarregar escaneabilidade.",
  ],
} as const;

export function landingAuditSummary(): string {
  return JSON.stringify(LANDING_AUDIT, null, 2);
}
