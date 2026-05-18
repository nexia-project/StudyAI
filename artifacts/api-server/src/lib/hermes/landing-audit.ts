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
          text: "Entre com seu objetivo, prova-alvo ou material. O StudyAI organiza a jornada em um hub de diagnóstico, plano, treino, revisão e tutor IA, sem você ficar pulando entre ferramentas.",
        },
        {
          type: "subhead",
          text: "Feito para ENEM, vestibular, concursos e estudo cotidiano no Brasil. Comece sem cartão e avance do plano à sessão de estudo com Tiagão, Notebook RAG, simulado e sala de estudos no mesmo login.",
        },
        { type: "cta_primary", text: "Começar grátis — 2 minutos" },
        {
          type: "cta_secondary",
          text: "Ver a experiência em vídeo — link com ícone Play, mesma linha que o primário em desktop",
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
      id: "pain_outcomes",
      title: "O StudyAI não vende mais conteúdo. Ele organiza decisão.",
      audiences: [
        "Aluno: sabe o que estudar agora, erra menos e revisa melhor",
        "Professor: enxerga lacunas e orienta melhor",
        "Instituição: acompanha progresso e qualidade",
        "Equipe StudyAI: mantém qualidade com revisão de conteúdo, limites de IA e feedback",
      ],
    },
    {
      id: "credibility",
      title: "Antes de prometer resultado, o produto deixa o caminho visível.",
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
      id: "enem_destaque",
      title: "Simulado ENEM no fluxo — treino, erro e revisão conectados",
    },
    {
      id: "app_showcase",
      count: 7,
      narrative: "Rotas reais apresentadas como sequência: alvo, material, treino, revisão e orientação.",
      sampleTitles: [
        "Professor Tiagão",
        "Simulado ENEM",
        "Notebook RAG",
        "Cronograma e Sala de Estudos",
      ],
    },
    {
      id: "pillars",
      title: "Orientação e fonte: os dois pilares",
      items: ["Professor Tiagão", "Notebook RAG"],
    },
    {
      id: "features_grid",
      count: 8,
      sampleLabels: [
        "Diagnóstico e plano",
        "Material com contexto",
        "Treino guiado",
        "Tutor no fluxo",
      ],
    },
    {
      id: "steps",
      titles: [
        "Declare a missão",
        "Monte o centro de estudo",
        "Execute e ajuste",
      ],
    },
    {
      id: "video_briefs",
      title: "A história já está pronta para virar vídeo.",
      strategy: "Substitui MP4 genérico por cards de experiência com fluxo, duração, momentos-chave e chamada contextual.",
      briefs: [
        "Do caos ao próximo passo",
        "Tiagão: sessão curta, foco imediato",
        "Instituição: progresso e qualidade em uma visão",
      ],
    },
    {
      id: "use_cases",
      count: 4,
      note: "Substitui depoimentos com resultados não auditáveis por cenários de uso sem promessa de aprovação.",
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
    "Sequência narrativa reforçada: hero -> desafio por público -> solução/prova operacional -> como funciona -> produto -> personas -> confiança -> preço -> CTA.",
    "Grid de features reduzido de 15 para 8 capacidades para diminuir sobrecarga de escaneabilidade.",
    "Depoimentos com números/aprovações foram trocados por cenários de uso para evitar claims não auditáveis.",
    "Vídeos genéricos/placeholder foram removidos; a seção agora apresenta experiências do produto em linguagem final para usuários.",
  ],
} as const;

export function landingAuditSummary(): string {
  return JSON.stringify(LANDING_AUDIT, null, 2);
}
