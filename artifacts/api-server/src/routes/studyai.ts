import { Router, type IRouter } from "express";
import multer from "multer";
import OpenAI from "openai";
// Import from lib directly to avoid pdf-parse's startup self-test (reads a file at load time)
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";

const router: IRouter = Router();
// Use .any() to avoid "Unexpected field" errors with strict field-name matching;
// we filter uploaded files ourselves in the handler.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB per file
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Você é um tutor educacional expert em técnicas de memorização e estratégias de prova. Sua missão é criar um plano de estudos GAMIFICADO e ESTRATÉGICO com foco total em fazer o aluno tirar notas altas na prova.

Você usa 3 princípios científicos de aprendizado:
1. ACTIVE RECALL: perguntas que forçam o cérebro a recuperar informação (não só ler)
2. GATILHOS DE MEMÓRIA: frases-âncora, siglas, analogias e associações que grudam na cabeça
3. PERGUNTAS ESTRATÉGICAS: as que professores mais cobram em provas, formuladas do jeito que aparecem nas avaliações

RESPONDA APENAS com um JSON válido, sem markdown, sem blocos de código. Use EXATAMENTE esta estrutura:

{
  "aluno": "nome do aluno",
  "materia": "nome da matéria ou tópico identificado",
  "emoji": "emoji que representa a matéria",
  "cor": "cor hex vibrante do tema (ex: #6366f1, #f59e0b, #10b981, #ef4444, #3b82f6, #ec4899)",
  "nivel": 1,
  "xpTotal": 500,
  "mensagemMotivacional": "Mensagem super motivadora de 2-3 frases usando o nome do aluno, focada em ele arrasar na prova",
  "resumoDoConteudo": "resumo em 2 frases do que será estudado",
  "conquistas": [
    {"nome": "nome da conquista", "emoji": "emoji", "descricao": "como ganhar esta conquista"}
  ],
  "dias": [
    {
      "numero": 1,
      "titulo": "Título criativo e empolgante do dia",
      "emoji": "emoji do dia",
      "xp": 100,
      "cor": "cor hex diferente para cada dia",
      "missao": "descrição da missão do dia em 1 frase motivadora focada em dominar para a prova",
      "tempoEstimado": "ex: 45 minutos",
      "topicos": [
        {
          "nome": "nome curto do tópico",
          "explicacao": "Explicação didática em 3-5 frases com exemplos reais. Destaque o que os professores MAIS COBRAM neste tópico e por quê é importante.",
          "gatilho": "Uma frase-âncora, sigla mnemônica, analogia ou associação CRIATIVA que faz o aluno nunca mais esquecer este conceito. Ex: 'Pense em X como Y', ou sigla, ou rima.",
          "exercicio": {
            "pergunta": "Pergunta estratégica no ESTILO DE PROVA: direta, com dados completos, do tipo que cai frequentemente na avaliação deste nível escolar",
            "resposta": "Resposta completa com raciocínio passo a passo. No final, inclua: DICA DE PROVA: o que observar para não errar esta questão."
          }
        }
      ],
      "exerciciosDoDia": [
        {
          "numero": 1,
          "pergunta": "Questão estratégica nível fácil — o tipo MAIS COMUM que cai em prova para este conteúdo",
          "gabarito": "Resolução detalhada passo a passo + ALERTA: erro clássico que os alunos cometem nesta questão"
        },
        {
          "numero": 2,
          "pergunta": "Questão estratégica nível médio — exige raciocínio ou combinação de conceitos, frequente em provas",
          "gabarito": "Resolução detalhada passo a passo + DICA: como identificar rapidamente o caminho certo na prova"
        },
        {
          "numero": 3,
          "pergunta": "Questão estratégica nível difícil — do tipo que separa nota 8 de nota 10, com pegadinhas comuns",
          "gabarito": "Resolução detalhada passo a passo + ATENÇÃO: a armadilha desta questão e como evitá-la"
        }
      ],
      "atividade": "Atividade prática de fixação com foco em memorização ativa (ex: criar resumo, flashcard, mapa mental, resolver sem consultar)",
      "dica": "Dica de ouro de memorização: uma técnica específica (mnemônico, visualização, associação) para fixar este conteúdo para sempre",
      "desafio": {
        "enunciado": "Questão desafio no estilo de prova difícil ou ENEM/vestibular — exige raciocínio elevado e combinação de vários conceitos do dia",
        "gabarito": "Solução completa passo a passo + ESTRATÉGIA: como abordar este tipo de questão na prova sem travar"
      }
    }
  ],
  "dicasGerais": [
    "Dica estratégica 1: técnica de estudo específica para esta matéria (ex: como estudar esta disciplina de forma eficaz)",
    "Dica estratégica 2: o que SEMPRE cai na prova neste assunto e como se preparar",
    "Dica estratégica 3: erro mais comum dos alunos nesta matéria e como evitar"
  ],
  "proximoNivel": "O que o aluno aprenderá depois de dominar este conteúdo e como isso se conecta com a matéria seguinte"
}

REGRAS OBRIGATÓRIAS:
- Use linguagem jovem, empolgante, como um game — chame o aluno de "herói", "campeão"
- Cada dia tem título criativo tipo "Dia 1: Ativando o Modo Gênio 🧠"
- XP por dia varia de 50 a 200 baseado na dificuldade
- OBRIGATÓRIO: Todo tópico DEVE ter gatilho de memória — frases criativas que grudam na cabeça
- OBRIGATÓRIO: As perguntas devem ser formuladas COMO APARECEM EM PROVAS — não perguntas genéricas
- OBRIGATÓRIO: Os gabaritos DEVEM incluir alertas de erros comuns e dicas de prova
- OBRIGATÓRIO: O desafio DEVE ser uma questão de nível elevado com estratégia de abordagem
- OBRIGATÓRIO: As dicasGerais devem ser estratégias PRÁTICAS e ESPECÍFICAS, não genéricas
- Adapte dificuldade, linguagem e tipo de questão ao nível escolar informado
- Crie entre 3 a 7 dias de plano baseado no tempo disponível do aluno`;

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

router.post("/analisar", (req, res, next) => {
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
    const { nome, serie, tempo, dificuldades, texto } = req.body as {
      nome?: string;
      serie?: string;
      tempo?: string;
      dificuldades?: string;
      texto?: string;
    };

    const perfil = `
      - Nome: ${nome || "Herói"}
      - Série: ${serie || "Não informado"}
      - Tempo disponível por dia: ${tempo || "1 hora"}
      - Dificuldades: ${dificuldades || "Nenhuma informada"}
    `;

    const files = req.files as Express.Multer.File[] | undefined;
    let aiResponse: string | null = null;

    if (files && files.length > 0) {
      const imageParts: ContentPart[] = [];
      const textParts: string[] = [];

      for (const file of files) {
        if (isImage(file.mimetype)) {
          imageParts.push({
            type: "image_url",
            image_url: {
              url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
            },
          });
        } else {
          const extracted = await extractTextFromFile(file);
          if (extracted && extracted.length > 0) {
            textParts.push(`--- Conteúdo de "${file.originalname}" ---\n${extracted}`);
          }
        }
      }

      const hasImages = imageParts.length > 0;
      const hasText = textParts.length > 0;

      if (!hasImages && !hasText) {
        res.status(400).json({ erro: "Não foi possível extrair conteúdo dos arquivos enviados." });
        return;
      }

      const content: ContentPart[] = [...imageParts];

      let userText = `Perfil do aluno:\n${perfil}\n\nCrie um plano de estudos gamificado COMPLETO com explicações, exercícios e gabaritos.`;

      if (hasImages) {
        userText = `Analise ${imageParts.length > 1 ? "estas imagens" : "esta imagem"} de conteúdo escolar e ${hasText ? "o texto extraído dos outros arquivos " : ""}crie um plano de estudos gamificado COMPLETO.\n\n${userText}`;
      }

      if (hasText) {
        userText += `\n\nConteúdo extraído dos documentos:\n${textParts.join("\n\n")}`;
      }

      content.push({ type: "text", text: userText });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: hasImages ? content : content.filter((p) => p.type === "text") },
        ],
        max_tokens: 6000,
        response_format: { type: "json_object" },
      });

      aiResponse = response.choices[0].message.content;
    } else if (texto) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Conteúdo para estudar:\n${texto}\n\nPerfil do aluno:\n${perfil}\n\nCrie um plano COMPLETO com explicações detalhadas, exercícios e gabaritos para cada dia.`,
          },
        ],
        max_tokens: 6000,
        response_format: { type: "json_object" },
      });

      aiResponse = response.choices[0].message.content;
    } else {
      res.status(400).json({ erro: "Envie uma imagem, PDF, Word ou texto para análise." });
      return;
    }

    if (!aiResponse) {
      res.status(500).json({ erro: "Erro ao gerar o plano." });
      return;
    }

    const plano = JSON.parse(aiResponse);

    // Build the full raw text content to pass to simulado generator
    const allTextParts: string[] = [];
    if (texto) allTextParts.push(texto);
    const filesForText = req.files as Express.Multer.File[] | undefined;
    if (filesForText) {
      for (const file of filesForText) {
        if (!isImage(file.mimetype)) {
          const extracted = await extractTextFromFile(file);
          if (extracted && extracted.length > 0) {
            allTextParts.push(`[${file.originalname}]\n${extracted}`);
          }
        }
      }
    }
    const conteudoTexto = allTextParts.join("\n\n---\n\n").slice(0, 12000);

    res.json({ plano, conteudoTexto });
  } catch (error) {
    req.log.error({ error }, "Erro ao processar análise");
    res
      .status(500)
      .json({ erro: "Erro ao processar: " + (error as Error).message });
  }
});

export default router;
