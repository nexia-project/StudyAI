function compactText(value: unknown, max = 160): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function splitStudySentences(content: string): string[] {
  return content
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => compactText(sentence, 220))
    .filter((sentence) => sentence.length > 45 && /[a-zA-ZÀ-ÿ]/.test(sentence))
    .slice(0, 120);
}

function titleWords(title: string): string[] {
  return title
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

function extractKeyTerms(title: string, content: string, limit = 18): string[] {
  const stop = new Set([
    "para", "como", "mais", "muito", "pela", "pelo", "entre", "sobre", "quando", "onde", "esta", "este",
    "essa", "esse", "isso", "ainda", "tambem", "porque", "anos", "cada", "todo", "toda", "ser", "tem",
    "com", "uma", "das", "dos", "que", "por", "sao", "aos", "nas", "nos", "seu", "sua", "suas", "seus",
  ]);
  const counts = new Map<string, number>();
  const titleSet = new Set(titleWords(title));
  const words = `${title} ${content.slice(0, 40_000)}`
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stop.has(word));
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + (titleSet.has(word) ? 5 : 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, limit);
}

function chunkArray<T>(items: T[], groups: number): T[][] {
  const buckets = Array.from({ length: groups }, () => [] as T[]);
  items.forEach((item, index) => buckets[index % groups].push(item));
  return buckets;
}

export function buildFallbackMindMap(title: string, content: string) {
  const sentences = splitStudySentences(content);
  const terms = extractKeyTerms(title, content, 32);
  const palette = ["#7c3aed", "#059669", "#ea580c", "#2563eb", "#db2777", "#0891b2", "#ca8a04", "#9333ea"];
  const branchNames = [
    "Ideia central",
    "Conceitos-chave",
    "Processos",
    "Exemplos",
    "Como cai",
    "Relacoes",
    "Revisao final",
  ];
  const branchIcons = ["🎯", "🧩", "⚙️", "💡", "📝", "🔗", "✅"];
  const sentenceGroups = chunkArray(sentences.length ? sentences : [title], branchNames.length);
  const termGroups = chunkArray(terms.length ? terms : title.split(/\s+/).filter(Boolean), branchNames.length);
  const categories = branchNames.map((name, i) => {
    const localTerms = termGroups[i].length ? termGroups[i] : terms.slice(i, i + 4);
    const localSentences = sentenceGroups[i].length ? sentenceGroups[i] : sentences.slice(i, i + 3);
    return {
      name,
      icone: branchIcons[i],
      cor: palette[i],
      topics: Array.from({ length: 3 }, (_, j) => {
        const term = compactText(localTerms[j] ?? localTerms[0] ?? title, 42);
        const sentence = compactText(localSentences[j] ?? localSentences[0] ?? content ?? title, 180);
        return {
          name: term ? term[0].toUpperCase() + term.slice(1) : `${name} ${j + 1}`,
          subtopics: [
            {
              name: j === 0 ? "Definicao essencial" : j === 1 ? "Exemplo da fonte" : "Ponto de prova",
              detail: sentence || `Relacione este ponto ao tema "${title}" e revise com suas proprias palavras.`,
              evidencia: sentence || compactText(content, 180) || title,
            },
            {
              name: j === 0 ? "Por que importa" : j === 1 ? "Conexao pratica" : "Pergunta-checkpoint",
              detail: j === 2
                ? `Explique como "${term || title}" se conecta ao tema central sem consultar o material.`
                : `Use este ramo para entender ${term || title} dentro do contexto geral do documento.`,
              evidencia: compactText(localSentences[(j + 1) % Math.max(localSentences.length, 1)] ?? sentence, 180),
            },
          ],
        };
      }),
    };
  });
  return {
    subject: compactText(title, 48) || "Mapa Mental",
    color: "#7c3aed",
    icone: "🧠",
    categories,
    conexoesCruzadas: [
      { de: "Ideia central", para: "Conceitos-chave", relacao: "A ideia central organiza os termos que precisam ser dominados." },
      { de: "Processos", para: "Exemplos", relacao: "Os exemplos mostram como os processos aparecem no material." },
      { de: "Conceitos-chave", para: "Relacoes", relacao: "Os termos importantes ganham sentido quando aparecem conectados entre si." },
      { de: "Como cai", para: "Revisao final", relacao: "Os checkpoints transformam o mapa em roteiro de estudo." },
    ],
    conceitosChave: terms.slice(0, 8).map((term) => `${term}: termo recorrente da fonte`),
    sourceSnippets: sentences.slice(0, 8).map((sentence, index) => ({
      ref: `Trecho ${index + 1}`,
      text: sentence,
    })),
  };
}

export function normalizeMindMap(input: unknown, title: string, content: string) {
  const fallback = buildFallbackMindMap(title, content);
  const parsed = input && typeof input === "object" ? input as any : {};
  const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
  const normalizedCategories = categories
    .map((cat: any, index: number) => ({
      name: compactText(cat?.name, 42) || fallback.categories[index % fallback.categories.length].name,
      icone: compactText(cat?.icone, 8) || fallback.categories[index % fallback.categories.length].icone,
      cor: /^#[0-9a-f]{6}$/i.test(String(cat?.cor ?? "")) ? cat.cor : fallback.categories[index % fallback.categories.length].cor,
      topics: (Array.isArray(cat?.topics) ? cat.topics : []).slice(0, 5).map((topic: any, topicIndex: number) => ({
        name: compactText(topic?.name, 52) || `Topico ${topicIndex + 1}`,
        subtopics: (Array.isArray(topic?.subtopics) ? topic.subtopics : []).slice(0, 5).map((sub: any) => {
          const isString = typeof sub === "string";
          return {
            name: compactText(isString ? sub : sub?.name, 60) || "Conceito",
            detail: compactText(isString ? sub : sub?.detail, 260) || "Revise este ponto com base na fonte selecionada.",
            evidencia: compactText(isString ? "" : sub?.evidencia ?? sub?.evidence ?? sub?.fonte, 220),
            pagina: compactText(isString ? "" : sub?.pagina ?? sub?.page ?? sub?.ref, 40),
          };
        }),
      })),
    }))
    .filter((cat: any) => cat.topics.length > 0);

  const subtopicCount = normalizedCategories.reduce((sum: number, cat: any) =>
    sum + cat.topics.reduce((topicSum: number, topic: any) => topicSum + topic.subtopics.length, 0), 0);
  const weak = normalizedCategories.length < 5 || subtopicCount < 20;
  const map = weak ? fallback : {
    subject: compactText(parsed.subject, 48) || fallback.subject,
    color: /^#[0-9a-f]{6}$/i.test(String(parsed.color ?? "")) ? parsed.color : fallback.color,
    icone: compactText(parsed.icone, 8) || fallback.icone,
    categories: normalizedCategories.slice(0, 8),
    conexoesCruzadas: Array.isArray(parsed.conexoesCruzadas) && parsed.conexoesCruzadas.length
      ? parsed.conexoesCruzadas.slice(0, 5).map((c: any) => ({
          de: compactText(c?.de, 48),
          para: compactText(c?.para, 48),
          relacao: compactText(c?.relacao, 160),
        }))
      : fallback.conexoesCruzadas,
    conceitosChave: Array.isArray(parsed.conceitosChave) && parsed.conceitosChave.length
      ? parsed.conceitosChave.slice(0, 8).map((c: any) => compactText(c, 90)).filter(Boolean)
      : fallback.conceitosChave,
    sourceSnippets: Array.isArray(parsed.sourceSnippets) && parsed.sourceSnippets.length
      ? parsed.sourceSnippets.slice(0, 8).map((s: any, index: number) => ({
          ref: compactText(s?.ref ?? s?.page ?? s?.pagina ?? `Trecho ${index + 1}`, 40),
          text: compactText(s?.text ?? s?.trecho ?? s?.evidencia, 220),
        })).filter((s: any) => s.text)
      : fallback.sourceSnippets,
  };
  return {
    ...map,
    generatedByFallback: weak,
    topics: map.categories.flatMap((cat: any) =>
      cat.topics.map((topic: any) => ({
        ...topic,
        color: cat.cor ?? map.color,
        category: cat.name,
        categoryIcon: cat.icone ?? "",
      })),
    ),
  };
}

export function buildFallbackSlides(title: string, content: string) {
  const sentences = splitStudySentences(content);
  const terms = extractKeyTerms(title, content, 12);
  const pick = (index: number, fallback: string) => sentences[index] ?? fallback;
  const evidence = (index: number) => compactText(sentences[index] ?? sentences[0] ?? `Baseado no documento "${title}".`, 180);
  const visual = (kind: string, label: string, description: string) => ({
    tipo: kind,
    titulo: label,
    descricao: description,
    caption: "Visual estruturado a partir da fonte; substitui slide vazio quando imagem real nao estiver disponivel.",
    credito: "StudyAI Notebook RAG",
  });
  const enrich = (slide: any, index: number, layout: string, visualPlan: ReturnType<typeof visual>) => ({
    layout,
    visual: visualPlan,
    evidencia: evidence(index),
    comoExplicar: `Comece pelo objetivo do slide, leia a evidencia da fonte e peça ao aluno para conectar com ${terms[index % Math.max(terms.length, 1)] ?? "a ideia central"}.`,
    exemplo: pick(index + 1, `Exemplo guiado: use "${compactText(title, 50)}" para mostrar causa, consequencia e aplicacao.`),
    checkpoint: index % 2 === 0
      ? "Checkpoint: qual evidencia da fonte sustenta essa ideia?"
      : "Checkpoint: explique este ponto com suas palavras em uma frase.",
    ...slide,
  });
  const agenda = ["Objetivo da aula", "Conceitos essenciais", "Exemplo guiado", "Checkpoint", "Resumo para revisar"];
  return {
    titulo: compactText(title, 70) || "Apresentacao StudyAI",
    subtitulo: "Material estruturado a partir da fonte selecionada",
    autor: "Professor Tiagao",
    tema: "indigo",
    objetivos: [
      `Explicar o tema "${compactText(title, 60)}" com base na fonte.`,
      "Identificar conceitos, exemplos e relacoes importantes.",
      "Responder checkpoints para verificar entendimento.",
    ],
    prerequisitos: terms.slice(0, 3).map((term) => `Noção previa de ${term}`),
    indicadoresQualidade: ["estrutura pedagogica", "exemplos da fonte", "checkpoint", "resumo imprimivel"],
    slides: [
      { tipo: "capa", layout: "capa_visual", titulo: compactText(title, 70) || "Apresentacao StudyAI", subtitulo: "Roteiro de estudo gerado pelo Notebook RAG", visual: visual("cover", "Imagem de abertura", `Representacao visual de ${compactText(title, 70)}`), evidencia: evidence(0), comoExplicar: "Apresente o objetivo e diga que os proximos slides seguem a fonte enviada." },
      { tipo: "agenda", layout: "processo", titulo: "Roteiro", itens: agenda, visual: visual("process", "Sequencia da aula", "Trilha em cinco passos: objetivo, conceito, exemplo, pratica e revisao."), evidencia: evidence(0), comoExplicar: "Mostre que a apresentacao tem começo, desenvolvimento e verificacao.", checkpoint: "Checkpoint: em qual etapa voce acha que tera mais dificuldade?" },
      enrich({ tipo: "conteudo", titulo: "Objetivo", subtitulo: "O que dominar ao final", bullets: [
        pick(0, `Compreender o tema central: ${title}.`),
        "Separar conceitos principais de detalhes secundarios.",
        "Usar exemplos da fonte para justificar respostas.",
      ], destaque: "Checkpoint: explique o tema em 30 segundos." }, 0, "split_visual_text", visual("target", "Objetivo + evidencia", "Card de objetivo conectado ao trecho-base da fonte.")),
      enrich({ tipo: "conteudo", titulo: "Conceitos essenciais", subtitulo: "Termos que organizam o assunto", bullets: terms.slice(0, 5).map((term) => `${term}: termo recorrente no material`) }, 1, "cards_conceito", visual("cards", "Cards de conceitos", "Cards com termos-chave, relacoes e exemplos curtos.")),
      enrich({ tipo: "conteudo", titulo: "Exemplo guiado", subtitulo: "Como aplicar a ideia", bullets: [
        pick(1, "Localize um trecho da fonte que sustente a ideia central."),
        pick(2, "Transforme o trecho em explicacao com causa e consequencia."),
        "Conclua conectando o exemplo ao objetivo da aula.",
      ], destaque: "Exemplo bom cita a fonte e explica por que ela importa." }, 2, "exemplo_com_evidencia", visual("example", "Exemplo resolvido", "Quadro com problema, evidencia, raciocinio e conclusao.")),
      enrich({ tipo: "comparacao", titulo: "Compare e diferencie", esquerda: { titulo: "Ideia principal", itens: [pick(3, title), "Serve para orientar a revisao."] }, direita: { titulo: "Detalhes de apoio", itens: [pick(4, "Dados, exemplos e termos ajudam a provar a ideia."), "Use para enriquecer respostas."] } }, 3, "comparacao", visual("compare", "Comparacao lado a lado", "Duas colunas com criterio claro e evidencia da fonte.")),
      enrich({ tipo: "conteudo", titulo: "Erros comuns", subtitulo: "O que evitar", bullets: [
        "Decorar termos sem explicar relacoes.",
        "Ignorar exemplos especificos da fonte.",
        "Responder sem objetivo, evidencia e conclusao.",
      ], destaque: "Pegadinha: resumo util nao e lista solta; precisa de hierarquia." }, 4, "erro_reparo", visual("warning", "Erro comum + reparo", "Card de pegadinha com causa provavel e como corrigir.")),
      enrich({ tipo: "conteudo", titulo: "Checkpoint", subtitulo: "Teste rapido", bullets: [
        `Qual e a ideia central de "${compactText(title, 50)}"?`,
        `Quais tres termos aparecem como base: ${terms.slice(0, 3).join(", ") || "conceitos principais"}?`,
        "Que exemplo da fonte voce usaria numa resposta?",
      ] }, 5, "exercicio", visual("question", "Checkpoint de aprendizagem", "Perguntas curtas para confirmar entendimento.")),
      { tipo: "encerramento", layout: "sintese", titulo: "Resumo final", mensagem: pick(5, "Revise objetivo, conceitos, exemplo e checkpoint antes de avançar."), dicaEnem: "Em provas, transforme o tema em causa, consequencia e exemplo concreto.", visual: visual("summary", "Sintese visual", "Mapa de revisao: objetivo, conceitos, evidencia e acao."), evidencia: evidence(5), comoExplicar: "Feche retomando a fonte e indique o proximo exercicio.", checkpoint: "Checkpoint final: qual ponto voce revisaria amanha?" },
    ],
  };
}

export function normalizeSlides(input: unknown, title: string, content: string) {
  const fallback = buildFallbackSlides(title, content);
  const parsed = input && typeof input === "object" ? input as any : {};
  const rawSlides = Array.isArray(parsed.slides) ? parsed.slides : [];
  const slides = rawSlides
    .map((slide: any, index: number) => {
      const tipo = ["capa", "agenda", "conteudo", "comparacao", "citacao", "encerramento", "destaque_numerico", "timeline"].includes(slide?.tipo)
        ? slide.tipo
        : "conteudo";
      const common = {
        layout: compactText(slide?.layout, 40) || (tipo === "conteudo" ? "split_visual_text" : tipo),
        visual: slide?.visual && typeof slide.visual === "object" ? {
          tipo: compactText(slide.visual.tipo ?? slide.visual.kind, 32) || "structured-card",
          titulo: compactText(slide.visual.titulo ?? slide.visual.title, 70) || "Visual estruturado",
          descricao: compactText(slide.visual.descricao ?? slide.visual.description ?? slide.visual.prompt, 180) || "Card visual gerado a partir do documento.",
          caption: compactText(slide.visual.caption, 160),
          credito: compactText(slide.visual.credito ?? slide.visual.credit, 100),
          url: typeof slide.visual.url === "string" ? slide.visual.url : undefined,
        } : undefined,
        evidencia: compactText(slide?.evidencia ?? slide?.fonte ?? slide?.citation, 180),
        comoExplicar: compactText(slide?.comoExplicar ?? slide?.notasProfessor ?? slide?.speakerNotes, 220),
        exemplo: compactText(slide?.exemplo, 180),
        checkpoint: compactText(slide?.checkpoint ?? slide?.pergunta, 180),
      };
      if (tipo === "agenda") return { tipo, ...common, titulo: compactText(slide.titulo, 70) || "Roteiro", itens: (Array.isArray(slide.itens) ? slide.itens : []).slice(0, 6).map((x: any) => compactText(x, 90)).filter(Boolean) };
      if (tipo === "comparacao") return {
        tipo,
        ...common,
        titulo: compactText(slide.titulo, 70) || "Comparacao",
        esquerda: { titulo: compactText(slide.esquerda?.titulo, 50) || "Lado A", itens: (Array.isArray(slide.esquerda?.itens) ? slide.esquerda.itens : []).slice(0, 5).map((x: any) => compactText(x, 120)).filter(Boolean) },
        direita: { titulo: compactText(slide.direita?.titulo, 50) || "Lado B", itens: (Array.isArray(slide.direita?.itens) ? slide.direita.itens : []).slice(0, 5).map((x: any) => compactText(x, 120)).filter(Boolean) },
      };
      if (tipo === "encerramento") return { tipo, ...common, titulo: compactText(slide.titulo, 70) || "Conclusao", mensagem: compactText(slide.mensagem, 180) || "Revise os pontos principais.", dicaEnem: compactText(slide.dicaEnem, 160) };
      if (tipo === "citacao") return { tipo, ...common, texto: compactText(slide.texto, 220) || compactText(title, 120), autor: compactText(slide.autor, 70) };
      if (tipo === "destaque_numerico") return { tipo, ...common, titulo: compactText(slide.titulo, 70) || "Dados importantes", numeros: (Array.isArray(slide.numeros) ? slide.numeros : []).slice(0, 4).map((n: any) => ({ valor: compactText(n?.valor, 24), label: compactText(n?.label ?? n?.descricao, 80) })).filter((n: any) => n.valor) };
      if (tipo === "timeline") return { tipo, ...common, titulo: compactText(slide.titulo, 70) || "Linha do tempo", etapas: (Array.isArray(slide.etapas) ? slide.etapas : []).slice(0, 5).map((e: any, i: number) => ({ numero: compactText(e?.numero ?? e?.ano ?? String(i + 1), 12), titulo: compactText(e?.titulo ?? e?.evento, 70), descricao: compactText(e?.descricao, 130) })) };
      return {
        tipo: index === 0 ? "capa" : tipo,
        ...common,
        titulo: compactText(slide.titulo, 70) || (index === 0 ? fallback.titulo : `Slide ${index + 1}`),
        subtitulo: compactText(slide.subtitulo, 120),
        bullets: (Array.isArray(slide.bullets) ? slide.bullets : Array.isArray(slide.itens) ? slide.itens : []).slice(0, 6).map((x: any) => compactText(x, 150)).filter(Boolean),
        destaque: compactText(slide.destaque, 170),
      };
    })
    .filter((slide: any) => slide.titulo || slide.texto);
  const contentSlides = slides.filter((slide: any) => slide.tipo !== "capa" && slide.tipo !== "agenda").length;
  const richSlides = slides.filter((slide: any) =>
    slide.tipo === "capa" ||
    slide.tipo === "agenda" ||
    slide.tipo === "encerramento" ||
    Boolean(slide.visual || slide.evidencia || slide.comoExplicar || slide.checkpoint || slide.exemplo)
  ).length;
  const weak = slides.length < 8 || contentSlides < 5 || richSlides < Math.min(slides.length, 7);
  if (weak) return { ...fallback, generatedByFallback: true };
  return {
    titulo: compactText(parsed.titulo, 70) || fallback.titulo,
    subtitulo: compactText(parsed.subtitulo, 140) || fallback.subtitulo,
    autor: compactText(parsed.autor, 70) || "Professor Tiagao",
    tema: ["indigo", "rose", "emerald", "amber"].includes(parsed.tema) ? parsed.tema : fallback.tema,
    objetivos: Array.isArray(parsed.objetivos) && parsed.objetivos.length ? parsed.objetivos.slice(0, 5).map((x: any) => compactText(x, 150)) : fallback.objetivos,
    prerequisitos: Array.isArray(parsed.prerequisitos) && parsed.prerequisitos.length ? parsed.prerequisitos.slice(0, 5).map((x: any) => compactText(x, 120)) : fallback.prerequisitos,
    indicadoresQualidade: Array.isArray(parsed.indicadoresQualidade) && parsed.indicadoresQualidade.length ? parsed.indicadoresQualidade.slice(0, 6).map((x: any) => compactText(x, 120)) : fallback.indicadoresQualidade,
    slides: slides.slice(0, 14),
    generatedByFallback: false,
  };
}
