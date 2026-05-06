import { Router, type IRouter } from "express";
import { getKnowledgeContext } from "../utils/knowledge-context";
import multer from "multer";
import { openai, OR } from "../lib/aiClient";
// Import from lib directly to avoid pdf-parse's startup self-test (reads a file at load time)
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import { checkFreeUsage } from "../lib/freeUsage";

const router: IRouter = Router();
// Use .any() to avoid "Unexpected field" errors with strict field-name matching;
// we filter uploaded files ourselves in the handler.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB per file
});

// ─── Profile Classification ──────────────────────────────────────────────────
type ProfileType = "fundamental" | "enem" | "vestibular" | "concurso" | "superior" | "generico";

function classifyProfile(objetivo?: string, serie?: string): ProfileType {
  const obj = (objetivo || "").toLowerCase();
  const ser = (serie || "").toLowerCase();
  if (obj.includes("concurso")) return "concurso";
  if (obj.includes("enem")) return "enem";
  if (obj.includes("vestibular")) return "vestibular";
  if (ser.includes("faculdade") || ser.includes("superior") || ser.includes("universit")) return "superior";
  if (ser.includes("fundamental")) return "fundamental";
  if (ser.includes("médio") || ser.includes("medio")) return "enem";
  return "generico";
}

// ─── JSON Structure (shared across all profiles) ─────────────────────────────
const JSON_SCHEMA = `
RESPONDA APENAS com um JSON válido, sem markdown, sem blocos de código. Use EXATAMENTE esta estrutura:

{
  "aluno": "nome do aluno",
  "materia": "nome da matéria ou tópico identificado",
  "emoji": "emoji que representa a matéria",
  "cor": "cor hex vibrante do tema (ex: #6366f1, #f59e0b, #10b981, #ef4444, #3b82f6, #ec4899)",
  "nivel": 1,
  "xpTotal": 500,
  "mensagemMotivacional": "Mensagem motivadora personalizada de 2-3 frases usando o nome do aluno",
  "resumoDoConteudo": "resumo em 2 frases do que será estudado",
  "conquistas": [
    {"nome": "nome da conquista", "emoji": "emoji", "descricao": "como ganhar esta conquista"}
  ],
  "dias": [
    {
      "numero": 1,
      "titulo": "Título criativo e descritivo do dia",
      "emoji": "emoji do dia",
      "xp": 100,
      "cor": "cor hex diferente para cada dia",
      "missao": "descrição do objetivo do dia em 1 frase",
      "tempoEstimado": "ex: 45 minutos",
      "topicos": [
        {
          "nome": "nome curto do tópico",
          "explicacao": "Explicação didática em 3-5 frases com exemplos reais e contextualizados ao perfil do aluno.",
          "gatilho": "Frase-âncora, sigla mnemônica, analogia ou associação CRIATIVA para fixar o conceito.",
          "exercicio": {
            "pergunta": "Questão no ESTILO DA PROVA REAL deste perfil de aluno — formulada como aparece no exame real",
            "resposta": "Resposta completa com raciocínio passo a passo + DICA: o que observar para não errar."
          }
        }
      ],
      "exerciciosDoDia": [
        {
          "numero": 1,
          "pergunta": "Questão nível fácil no estilo da prova real",
          "gabarito": "Resolução detalhada + ALERTA: erro mais comum nesta questão"
        },
        {
          "numero": 2,
          "pergunta": "Questão nível médio no estilo da prova real",
          "gabarito": "Resolução detalhada + DICA: como identificar o caminho correto"
        },
        {
          "numero": 3,
          "pergunta": "Questão nível difícil no estilo da prova real",
          "gabarito": "Resolução detalhada + ATENÇÃO: armadilhas e como evitá-las"
        }
      ],
      "atividade": "Atividade prática de fixação com foco em memorização ativa",
      "dica": "Dica de ouro: técnica específica de memorização para este conteúdo",
      "desafio": {
        "enunciado": "Questão desafio de alto nível, estilo prova real — exige raciocínio aprofundado",
        "gabarito": "Solução completa passo a passo + ESTRATÉGIA: como abordar este tipo de questão"
      }
    }
  ],
  "dicasGerais": [
    "Dica estratégica 1: técnica específica para esta matéria",
    "Dica estratégica 2: o que SEMPRE cai na prova e como se preparar",
    "Dica estratégica 3: erro mais comum e como evitar"
  ],
  "proximoNivel": "O que o aluno aprenderá depois e como este conteúdo se conecta com o próximo"
}`;

// ─── Profile-specific System Prompts ─────────────────────────────────────────

const PROMPT_FUNDAMENTAL = `IDIOMA OBRIGATÓRIO: SEMPRE em português brasileiro (pt-BR). NUNCA use inglês ou outro idioma — nem uma palavra. Esta regra é absoluta.

Você é a Professora Paula, tutora educacional especialista em crianças e adolescentes do Ensino Fundamental. Sua missão é criar um plano de estudos DIVERTIDO, ACESSÍVEL e EFICAZ para alunos do 1º ao 9º ano.

SEU ESTILO É:
- Linguagem simples, animada e encorajadora — como uma professora legal que os alunos adoram
- Use analogias do cotidiano das crianças (jogos, séries, natureza, esportes)
- Celebre cada conquista com entusiasmo genuíno
- Nunca use linguagem técnica ou acadêmica desnecessária

PRINCÍPIOS DE APRENDIZADO INFANTIL:
1. VISUALIZAÇÃO: crie imagens mentais vívidas e histórias para fixar conceitos
2. REPETIÇÃO LÚDICA: jogos, desafios e atividades que tornam a revisão divertida
3. CONEXÃO COM O DIA A DIA: todo conceito deve ter exemplo da vida real da criança

REGRAS ESPECÍFICAS:
- Linguagem acessível, frases curtas, sem jargões
- Exemplos com personagens, animais, situações do cotidiano escolar
- Questões no formato das provas escolares (múltipla escolha simples, completar lacunas, verdadeiro/falso)
- Gamificação: chame o aluno de "explorador", "superaluno", "descobridor"
- Atividades lúdicas: desenhar, criar mapas mentais coloridos, jogos de memória
- Cada dia deve ser uma "aventura de descoberta"
- Tom: caloroso, paciente, nunca intimidador${JSON_SCHEMA}

REGRAS OBRIGATÓRIAS:
- Linguagem de criança/adolescente: simples, animada, encorajadora
- Títulos dos dias como aventuras: "Dia 1: A Grande Descoberta dos Números! 🌟"
- XP por dia: 50-100 (sessões curtas, conquistas frequentes)
- Todo tópico DEVE ter analogia ou história do cotidiano infantil
- Questões no estilo de provas escolares reais (não ENEM, não concurso)
- Gabaritos com explicações em linguagem simples e exemplos visuais
- Atividade sempre lúdica e criativa
- Dicas gerais: técnicas de estudo para crianças (mapas coloridos, músicas, etc.)
- Adapte profundamente ao ano escolar informado (1º ano ≠ 9º ano)
- Crie entre 3 a 5 dias de plano baseado no tempo disponível`;

const PROMPT_ENEM = `IDIOMA OBRIGATÓRIO: SEMPRE em português brasileiro (pt-BR). NUNCA use inglês ou outro idioma — nem uma palavra. Esta regra é absoluta.

Você é um estrategista de ENEM de alto nível. Sua missão é criar um plano de estudos CIRÚRGICO E GAMIFICADO para o ENEM 2025, focado em maximizar a nota do aluno dentro do tempo disponível.

CONTEXTO DO ENEM:
- Prova interdisciplinar com 4 áreas: Linguagens, Humanas, Natureza, Matemática + Redação
- 45 questões por caderno de área + 5 de Língua Estrangeira
- Questões sempre contextualizadas, nunca decorativas — exigem raciocínio aplicado
- Nota vai de 0 a 1000 por área (TRI)

PRINCÍPIOS CIENTÍFICOS DE APRENDIZADO:
1. ACTIVE RECALL: perguntas que forçam o cérebro a recuperar informação (nunca passivo)
2. GATILHOS DE MEMÓRIA: frases-âncora, siglas, analogias que grudam na cabeça
3. INTERDISCIPLINARIDADE: conectar conceitos de áreas diferentes como o ENEM exige

ESTRATÉGIA ENEM:
- Identifique o tema do conteúdo e conecte com as competências ENEM correspondentes
- Formule questões exatamente no estilo contextualizado do ENEM (texto-base + alternativas)
- Inclua habilidades da matriz do ENEM nos exercícios
- Foco em questões de alto índice de cobrança nos últimos 5 anos
- Para Redação ENEM: introdução, desenvolvimento (2 parágrafos), conclusão com proposta de intervenção${JSON_SCHEMA}

REGRAS OBRIGATÓRIAS:
- Linguagem jovem e motivadora — chame de "herói do ENEM", "estrategista"
- Títulos dos dias: "Dia 1: Dominando a Contextualização do ENEM 🎯"
- XP por dia: 80-200 (recompense progresso estratégico)
- Todo tópico DEVE ter gatilho de memória + conexão interdisciplinar
- Questões NO FORMATO ENEM: contextualização com texto/dado/imagem + 5 alternativas (A-E)
- Gabaritos com: resolução passo a passo + por que cada alternativa errada é errada
- Desafio: questão de alto nível estilo ENEM dos últimos 3 anos
- DicasGerais: estratégias específicas para a prova (tempo por questão, eliminação, TRI)
- Crie entre 3 a 7 dias baseado no tempo disponível`;

const PROMPT_VESTIBULAR = `IDIOMA OBRIGATÓRIO: SEMPRE em português brasileiro (pt-BR). NUNCA use inglês ou outro idioma — nem uma palavra. Esta regra é absoluta.

Você é um preparador de elite para vestibulares das melhores universidades do Brasil (FUVEST, UNICAMP/COMVEST, UNESP, UNB, UFMG e similares). Sua missão é criar um plano de estudos ACADEMICAMENTE RIGOROSO que leve o aluno à aprovação.

CONTEXTO DO VESTIBULAR ELITE:
- Provas com profundidade conceitual muito superior ao ENEM
- FUVEST: 1ª fase (múltipla escolha, eliminação por erros) + 2ª fase (dissertativo/redação)
- COMVEST: questões abertas, redação, interpretação profunda
- Exige domínio completo dos conteúdos, não apenas reconhecimento

PRINCÍPIOS DE EXCELÊNCIA ACADÊMICA:
1. PROFUNDIDADE CONCEITUAL: nunca superficialidade — vá às raízes do conceito
2. CONEXÕES ENTRE DISCIPLINAS: vestibulares exigem visão integrada do conhecimento
3. RIGOR DE LINGUAGEM: respostas precisas, com terminologia correta da área

ESTRATÉGIA VESTIBULAR:
- Questões dissertativas que exigem elaboração completa de raciocínio
- Referências a obras, autores, teoremas, experimentos canônicos da área
- Exercícios de 1ª fase (eliminação) e 2ª fase (discursivo) intercalados
- Profundidade conceitual: "por que isso funciona assim?" e não apenas "como funciona"
- Para Exatas: resolução algébrica completa com demonstrações
- Para Humanas: análise crítica com referências históricas e culturais${JSON_SCHEMA}

REGRAS OBRIGATÓRIAS:
- Linguagem acadêmica e precisa — respeite a inteligência do aluno
- Chame de "candidato", "estudante", jamais linguagem infantilizada
- Títulos dos dias: "Dia 1: Fundamentos e Profundidade Conceitual 📐"
- XP por dia: 100-200 (reconheça o alto esforço exigido)
- Questões no formato FUVEST/COMVEST: múltipla escolha com eliminação OU dissertativas
- Gabaritos completos com toda a cadeia de raciocínio e menção a conceitos correlatos
- Desafio: questão de 2ª fase ou questão de alta complexidade da área
- DicasGerais: estratégias específicas para 1ª e 2ª fases, gestão de tempo, redação acadêmica
- Crie entre 4 a 7 dias baseado no tempo disponível`;

const PROMPT_CONCURSO = `IDIOMA OBRIGATÓRIO: SEMPRE em português brasileiro (pt-BR). NUNCA use inglês ou outro idioma — nem uma palavra. Esta regra é absoluta.

Você é um coach especialista em aprovação em concursos públicos federais, estaduais e municipais com décadas de experiência em bancas como CESPE/CEBRASPE, FCC, VUNESP, AOCP, IBFC. Sua missão é criar um plano de estudos PROFISSIONAL E EFICIENTE que maximize as chances de aprovação.

CONTEXTO DO CONCURSO PÚBLICO:
- Alta competitividade: centenas/milhares de candidatos por vaga
- Conteúdo extenso: direito constitucional, administrativo, penal, português, raciocínio lógico, informática, legislação específica do órgão
- CESPE: questões certo/errado — cada alternativa independente, erros penalizam
- FCC: múltipla escolha, foco em letra de lei e jurisprudência
- Volume é chave: candidatos aprovados estudam 6-12 horas/dia

PRINCÍPIOS DO CONCURSEIRO EFICIENTE:
1. CICLO DE REVISÃO: estudar → revisar em 24h → revisar em 7 dias → revisar em 30 dias
2. QUESTÕES ANTERIORES: resolver provas da banca é o melhor treinamento
3. FOCO NO EDITAL: dominar o que está no edital, ignorar o que não está

ESTRATÉGIA DE APROVAÇÃO:
- Mapear os tópicos do edital e priorizar por peso/frequência de cobrança
- Questões no formato EXATO da banca (CESPE certo/errado ou FCC múltipla escolha)
- Memorização eficiente: lei seca → jurisprudência → doutrina (nesta ordem)
- Criar cronograma realista respeitando ciclo de revisão
- Identificar e dominar os "temas quentes" mais cobrados pela banca${JSON_SCHEMA}

REGRAS OBRIGATÓRIAS:
- Linguagem profissional, direta e objetiva — sem infantilização
- Chame de "candidato" — nunca "herói" ou "campeão"
- Títulos dos dias: "Dia 1: Direito Administrativo — Ato Administrativo e Vícios 📋"
- XP por dia: 100-200 (reflita o volume e dificuldade do conteúdo)
- Questões NO FORMATO DA BANCA: CESPE (Certo/Errado com justificativa) ou FCC (A/B/C/D/E)
- Gabaritos com: fundamentação legal COMPLETA (artigo, lei, súmula) + análise de cada item
- Gatilhos de memória: siglas, acrônimos, regras mnemônicas para decorar artigos de lei
- Atividade: resolver 10 questões da banca sobre o tema do dia
- Desafio: questão CESPE difícil ou FCC de prova recente
- DicasGerais: técnicas específicas para concurso (ciclo de revisão, como resolver CESPE, gestão de tempo)
- Crie entre 4 a 7 dias baseado no tempo disponível`;

const PROMPT_SUPERIOR = `IDIOMA OBRIGATÓRIO: SEMPRE em português brasileiro (pt-BR). NUNCA use inglês ou outro idioma — nem uma palavra. Esta regra é absoluta.

Você é um tutor universitário de alto nível, especialista em metodologias de aprendizado para o ensino superior. Sua missão é criar um plano de estudos ACADEMICAMENTE RIGOROSO E APROFUNDADO para estudantes universitários e de pós-graduação.

CONTEXTO UNIVERSITÁRIO:
- Conteúdo de alta complexidade teórica e prática
- Avaliações incluem provas, seminários, trabalhos acadêmicos e relatórios
- Pensamento crítico e analítico são essenciais
- Conexão com literatura científica e aplicação profissional

PRINCÍPIOS DE APRENDIZADO SUPERIOR:
1. PENSAMENTO CRÍTICO: questionar pressupostos, comparar teorias, formular hipóteses
2. SÍNTESE ACADÊMICA: integrar múltiplas fontes e perspectivas teóricas
3. APLICAÇÃO PRÁTICA: conectar teoria com contexto profissional real

ESTRATÉGIA UNIVERSITÁRIA:
- Partir dos fundamentos teóricos e avançar para aplicações complexas
- Incluir referências a autores, pesquisas e debates atuais da área
- Exercícios de análise, síntese e avaliação crítica (não apenas memorização)
- Conectar conteúdo com aplicações na área profissional do aluno
- Preparar para provas dissertativas e seminários de alto nível${JSON_SCHEMA}

REGRAS OBRIGATÓRIAS:
- Linguagem acadêmica, precisa e adulta
- Chame de "estudante" ou pelo nome — linguagem entre pares intelectuais
- Títulos dos dias: "Dia 1: Fundamentos Teóricos e Construção Conceitual 📖"
- XP por dia: 100-200
- Questões no estilo universitário: dissertativas, de análise, estudo de caso, problema
- Gabaritos completos com cadeia argumentativa e referências a conceitos correlatos
- Gatilhos de memória: diagramas conceituais, mapas teóricos, comparações entre escolas
- Atividade: produção escrita (resumo analítico, mapa conceitual, esquema teórico)
- Desafio: questão de prova universitária ou caso prático de análise
- DicasGerais: técnicas de estudo universitário (fichamento, revisão bibliográfica, Feynman)
- Crie entre 3 a 7 dias baseado no tempo disponível`;

function getSystemPrompt(profile: ProfileType): string {
  switch (profile) {
    case "fundamental": return PROMPT_FUNDAMENTAL;
    case "enem": return PROMPT_ENEM;
    case "vestibular": return PROMPT_VESTIBULAR;
    case "concurso": return PROMPT_CONCURSO;
    case "superior": return PROMPT_SUPERIOR;
    default: return PROMPT_ENEM;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

function isImage(mimetype: string) {
  return mimetype.startsWith("image/");
}

function isPdf(mimetype: string, originalname: string) {
  return mimetype === "application/pdf" || originalname.toLowerCase().endsWith(".pdf");
}

function isWord(mimetype: string, originalname: string) {
  return (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword" ||
    originalname.toLowerCase().endsWith(".docx") ||
    originalname.toLowerCase().endsWith(".doc")
  );
}

async function extractTextFromFile(file: Express.Multer.File): Promise<string | null> {
  if (isPdf(file.mimetype, file.originalname)) {
    try {
      const data = await pdfParse(file.buffer);
      return data.text?.trim() || null;
    } catch {
      return null;
    }
  }
  if (isWord(file.mimetype, file.originalname)) {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value?.trim() || null;
    } catch {
      return null;
    }
  }
  return null;
}

router.post("/analisar", checkFreeUsage, (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      req.log?.error({ err }, "Multer error");
      res.status(400).json({ erro: `Erro no upload: ${(err as Error).message}` });
      return;
    }
    next();
  });
}, async (req, res) => {
  try {
    const { nome, serie, tempo, dificuldades, texto, url, objetivo, concursoAlvo, topicosAnteriores } = req.body as {
      nome?: string;
      serie?: string;
      tempo?: string;
      dificuldades?: string;
      texto?: string;
      url?: string;
      objetivo?: string;
      concursoAlvo?: string;
      topicosAnteriores?: string;
    };

    // If URL provided, fetch its content and prepend to texto
    let textoFinal = texto || "";
    if (url?.trim()) {
      try {
        const urlRes = await fetch(url.trim(), {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; StudyAI/1.0; +https://study.ia.br)" },
          signal: AbortSignal.timeout(8000),
        });
        if (urlRes.ok) {
          const html = await urlRes.text();
          const extracted = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 10000);
          if (extracted.length > 200) {
            textoFinal = `Conteúdo extraído do link (${url}):\n${extracted}` + (textoFinal ? `\n\n${textoFinal}` : "");
          }
        }
      } catch {
        // URL fetch failed — continue with any existing texto
      }
    }

    const isPremium = (req as any).isPremium === true;

    // Classify student profile based on objective + grade level
    const profile = classifyProfile(objetivo, serie);
    const systemPrompt = getSystemPrompt(profile);

    // Build enriched student profile string
    const perfilLines = [
      `- Nome: ${nome || "Estudante"}`,
      `- Série/Nível: ${serie || "Não informado"}`,
      `- Objetivo: ${objetivo || "Estudo geral"}`,
      concursoAlvo ? `- Concurso/Alvo específico: ${concursoAlvo}` : "",
      `- Tempo disponível por dia: ${tempo || "1 hora"}`,
      dificuldades ? `- Dificuldades relatadas: ${dificuldades}` : "",
      topicosAnteriores ? `- IMPORTANTE — Tópicos já estudados anteriormente (NÃO repita, aprofunde ou avance): ${topicosAnteriores}` : "",
      !isPremium ? `- RESTRIÇÃO: Plano gratuito — crie EXATAMENTE 3 dias, independente do tempo disponível.` : "",
    ].filter(Boolean).join("\n");

    const perfil = perfilLines;

    // Add premium restriction to system prompt if needed
    const baseSystemPrompt = isPremium
      ? systemPrompt
      : systemPrompt + "\n\nRESTRIÇÃO OBRIGATÓRIA: Este aluno está no plano gratuito. Crie EXATAMENTE 3 dias de plano, sem exceções.";

    // ── Consulta automática: BNCC + Wikipedia + base do aluno ──────────────────
    // Build query from the available context — first 150 chars of texto or objetivo
    const knowledgeQuery = (textoFinal || objetivo || concursoAlvo || "plano de estudos").slice(0, 150);
    const knowledgeCtx = await getKnowledgeContext({
      query: knowledgeQuery,
      serie: serie || undefined,
      objetivo: objetivo || undefined,
      userId: (req as any).userId,
      maxCharsPerSource: 1000,
    }).catch(() => ({ contextBlock: "", bnccHabilidades: [], hasKnowledge: false, summary: "failed" }));

    const finalSystemPrompt = knowledgeCtx.hasKnowledge
      ? baseSystemPrompt + knowledgeCtx.contextBlock
      : baseSystemPrompt;

    const files = req.files as Express.Multer.File[] | undefined;

    // ── Streaming support ──────────────────────────────────────────────
    const wantsStream = req.headers.accept?.includes("text/event-stream");
    if (wantsStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
    }
    const sendSSE = (data: object) => {
      if (wantsStream) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        (res as any).flush?.();
      }
    };
    // ──────────────────────────────────────────────────────────────────

    // Build the OpenAI messages depending on input type
    type OAIMessage = { role: "system" | "user"; content: string | ContentPart[] };
    let messages: OAIMessage[] = [];

    if (files && files.length > 0) {
      const imageParts: ContentPart[] = [];
      const textParts: string[] = [];

      // Max chars to send as extracted text (~12 000 chars ≈ 9 000 tokens, safe under 30 k TPM)
      const MAX_TEXT_CHARS = 12_000;
      let accumulatedTextChars = 0;

      for (const file of files) {
        if (isImage(file.mimetype)) {
          imageParts.push({
            type: "image_url",
            image_url: {
              url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
            },
          });
        } else {
          if (accumulatedTextChars >= MAX_TEXT_CHARS) continue; // already at limit
          const extracted = await extractTextFromFile(file);
          if (extracted && extracted.length > 0) {
            const remaining = MAX_TEXT_CHARS - accumulatedTextChars;
            const chunk = extracted.slice(0, remaining);
            const truncated = extracted.length > remaining;
            accumulatedTextChars += chunk.length;
            textParts.push(
              `--- Conteúdo de "${file.originalname}"${truncated ? " (truncado para caber no limite)" : ""} ---\n${chunk}`
            );
          }
        }
      }

      const hasImages = imageParts.length > 0;
      const hasText = textParts.length > 0;

      if (!hasImages && !hasText) {
        res.status(400).json({ erro: "Não foi possível extrair conteúdo dos arquivos enviados." });
        return;
      }

      void hasImages; // hasImages is used for message building above
      const content: ContentPart[] = [...imageParts];
      let userText = `Perfil do aluno:\n${perfil}\n\nCrie um plano de estudos gamificado COMPLETO com explicações, exercícios e gabaritos.`;
      if (hasImages) {
        userText = `Analise ${imageParts.length > 1 ? "estas imagens" : "esta imagem"} de conteúdo escolar e ${hasText ? "o texto extraído dos outros arquivos " : ""}crie um plano de estudos gamificado COMPLETO.\n\n${userText}`;
      }
      if (hasText) {
        userText += `\n\nConteúdo extraído dos documentos:\n${textParts.join("\n\n")}`;
      }
      content.push({ type: "text", text: userText });

      messages = [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: hasImages ? content : content.filter((p) => p.type === "text") as ContentPart[] },
      ];
    } else if (textoFinal) {
      const textoTruncado = textoFinal.slice(0, 12_000);
      messages = [
        { role: "system", content: finalSystemPrompt },
        {
          role: "user",
          content: `Conteúdo para estudar:\n${textoTruncado}\n\nPerfil do aluno:\n${perfil}\n\nCrie um plano COMPLETO com explicações detalhadas, exercícios e gabaritos para cada dia.`,
        },
      ];
    } else {
      res.status(400).json({ erro: "Envie uma imagem, PDF, Word ou texto para análise." });
      return;
    }

    // ── Unified OpenAI call (streaming or not) ─────────────────────────
    let aiResponse: string;

    if (wantsStream) {
      sendSSE({ type: "status", message: "Analisando conteúdo..." });
      const abortCtrl = new AbortController();
      res.on("close", () => abortCtrl.abort());
      const stream = await openai.chat.completions.create({
        model: OR.pro,
        messages: messages as any,
        max_tokens: 4500,
        response_format: { type: "json_object" },
        stream: true,
      }, { signal: abortCtrl.signal }) as any;
      let accumulated = "";
      for await (const chunk of stream) {
        if (abortCtrl.signal.aborted) break;
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          accumulated += delta;
          sendSSE({ type: "progress", chars: accumulated.length });
        }
      }
      if (!accumulated) {
        sendSSE({ type: "error", message: "Erro ao gerar o plano." });
        res.end();
        return;
      }
      aiResponse = accumulated;
    } else {
      const response = await openai.chat.completions.create({
        model: OR.pro,
        messages: messages as any,
        max_tokens: 4500,
        response_format: { type: "json_object" },
      }) as any;
      const raw = response.choices[0].message.content;
      if (!raw) {
        res.status(500).json({ erro: "Erro ao gerar o plano." });
        return;
      }
      aiResponse = raw;
    }
    // ──────────────────────────────────────────────────────────────────

    const plano = JSON.parse(aiResponse);

    // Build the richest possible raw text to pass to the simulado generator.
    // Priority: (1) actual file text (PDF/DOCX), (2) typed text, (3) plan content itself.
    // For image-only uploads nothing can be extracted directly, so we serialize
    // the generated plan — which was built from the image — as the content source.
    const rawParts: string[] = [];
    if (texto) rawParts.push(texto);

    const allFiles = req.files as Express.Multer.File[] | undefined;
    let hasImageOnly = false;
    if (allFiles && allFiles.length > 0) {
      const imageFiles = allFiles.filter(f => isImage(f.mimetype));
      const docFiles = allFiles.filter(f => !isImage(f.mimetype));
      hasImageOnly = imageFiles.length > 0 && docFiles.length === 0 && !texto;

      for (const file of docFiles) {
        const extracted = await extractTextFromFile(file);
        if (extracted && extracted.length > 0) {
          rawParts.push(`[${file.originalname}]\n${extracted}`);
        }
      }
    }

    // If no extractable text, serialize the plan itself as rich text content
    if (rawParts.length === 0 || hasImageOnly) {
      const planParts: string[] = [];
      if (plano.resumoDoConteudo) planParts.push(`Resumo: ${plano.resumoDoConteudo}`);
      if (Array.isArray(plano.dias)) {
        for (const dia of plano.dias) {
          let dayStr = `=== ${dia.titulo || `Dia ${dia.numero}`} ===`;
          if (dia.missao) dayStr += `\n${dia.missao}`;
          if (Array.isArray(dia.topicos)) {
            for (const t of dia.topicos) {
              if (typeof t === "object" && t !== null) {
                const to = t as any;
                dayStr += `\n- ${to.nome}`;
                if (to.explicacao) dayStr += `\n  ${to.explicacao}`;
                if (to.gatilho) dayStr += `\n  Memorização: ${to.gatilho}`;
                if (to.exercicio?.pergunta) dayStr += `\n  Q: ${to.exercicio.pergunta}`;
                if (to.exercicio?.resposta) dayStr += `\n  R: ${to.exercicio.resposta}`;
              } else {
                dayStr += `\n- ${t}`;
              }
            }
          }
          if (Array.isArray(dia.exerciciosDoDia)) {
            for (const ex of dia.exerciciosDoDia) {
              dayStr += `\n  Exercício: ${ex.pergunta}\n  Gabarito: ${ex.gabarito}`;
            }
          }
          const desafio = dia.desafio;
          if (desafio && typeof desafio === "object" && desafio.enunciado) {
            dayStr += `\n  Desafio: ${desafio.enunciado}\n  Solução: ${desafio.gabarito || ""}`;
          }
          planParts.push(dayStr);
        }
      }
      if (Array.isArray(plano.dicasGerais)) {
        planParts.push(`Dicas: ${plano.dicasGerais.join(" | ")}`);
      }
      rawParts.push(planParts.join("\n\n"));
    }

    const conteudoTexto = rawParts.join("\n\n---\n\n").slice(0, 8000);

    if (wantsStream) {
      sendSSE({ type: "done", plano, conteudoTexto });
      res.end();
    } else {
      res.json({ plano, conteudoTexto });
    }
  } catch (error) {
    req.log.error({ error }, "Erro ao processar análise");
    if (res.headersSent) {
      // SSE already started — emit error event and close
      try {
        res.write(`data: ${JSON.stringify({ type: "error", message: (error as Error).message })}\n\n`);
      } catch { /* ignore */ }
      res.end();
    } else {
      res.status(500).json({ erro: "Erro ao processar: " + (error as Error).message });
    }
  }
});

export default router;
