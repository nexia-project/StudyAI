import { Router, type IRouter } from "express";
import multer from "multer";
import OpenAI from "openai";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Você é um tutor educacional gamificado e motivador. Crie um plano de estudos COMPLETO, INTERATIVO e GAMIFICADO.

RESPONDA APENAS com um JSON válido, sem markdown, sem blocos de código. Use EXATAMENTE esta estrutura:

{
  "aluno": "nome do aluno",
  "materia": "nome da matéria ou tópico identificado",
  "emoji": "emoji que representa a matéria",
  "cor": "cor hex vibrante do tema (ex: #6366f1, #f59e0b, #10b981, #ef4444, #3b82f6, #ec4899)",
  "nivel": 1,
  "xpTotal": 500,
  "mensagemMotivacional": "Mensagem super motivadora e personalizada de 2-3 frases, usando o nome do aluno",
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
      "missao": "descrição da missão do dia em 1 frase motivadora",
      "tempoEstimado": "ex: 45 minutos",
      "topicos": [
        {
          "nome": "nome curto do tópico",
          "explicacao": "Explicação didática e completa do tópico em 3-5 frases. Deve ensinar o conteúdo de verdade, com exemplos práticos embutidos.",
          "exercicio": {
            "pergunta": "Uma questão prática sobre este tópico específico",
            "resposta": "A resposta completa e explicada, mostrando o raciocínio passo a passo"
          }
        }
      ],
      "exerciciosDoDia": [
        {
          "numero": 1,
          "pergunta": "Enunciado completo do exercício",
          "gabarito": "Resposta detalhada com desenvolvimento completo, mostrando cada passo do raciocínio"
        },
        {
          "numero": 2,
          "pergunta": "Segundo exercício",
          "gabarito": "Resposta detalhada"
        },
        {
          "numero": 3,
          "pergunta": "Terceiro exercício (mais difícil)",
          "gabarito": "Resposta detalhada"
        }
      ],
      "atividade": "atividade prática e divertida para fazer",
      "dica": "dica de ouro para memorizar ou entender melhor",
      "desafio": {
        "enunciado": "Enunciado completo do desafio bônus, mais difícil que os exercícios normais",
        "gabarito": "Solução completa e explicada do desafio"
      }
    }
  ],
  "dicasGerais": ["dica 1", "dica 2", "dica 3"],
  "proximoNivel": "O que o aluno aprenderá depois de dominar este conteúdo"
}

REGRAS OBRIGATÓRIAS:
- Use linguagem jovem, empolgante, como um game
- Chame o aluno de "herói", "campeão", etc
- Cada dia deve ter título criativo tipo "Dia 1: O Grande Despertar 🌅"
- XP por dia varia de 50 a 200
- OBRIGATÓRIO: Cada tópico DEVE ter explicação COMPLETA e DIDÁTICA + exercício com resposta
- OBRIGATÓRIO: Cada dia DEVE ter exatamente 3 exerciciosDoDia com gabaritos completos
- OBRIGATÓRIO: O desafio DEVE ter enunciado e gabarito com solução passo a passo
- As explicações devem ensinar de verdade, não só citar o assunto
- Os exercícios devem ser compatíveis com a série/nível do aluno
- Adapte toda a linguagem e complexidade à série escolar informada
- Crie entre 3 a 7 dias de plano baseado no tempo disponível`;

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

router.post("/analisar", upload.array("files", 10), async (req, res) => {
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
      const content: ContentPart[] = files.map((file) => ({
        type: "image_url",
        image_url: {
          url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        },
      }));

      content.push({
        type: "text",
        text: `Analise ${files.length > 1 ? "estas imagens" : "esta imagem"} de conteúdo escolar e crie um plano de estudos gamificado COMPLETO com explicações, exercícios e gabaritos.\n\nPerfil do aluno:\n${perfil}`,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
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
      res.status(400).json({ erro: "Envie uma imagem ou texto para análise." });
      return;
    }

    if (!aiResponse) {
      res.status(500).json({ erro: "Erro ao gerar o plano." });
      return;
    }

    const plano = JSON.parse(aiResponse);
    res.json({ plano });
  } catch (error) {
    req.log.error({ error }, "Erro ao processar análise");
    res
      .status(500)
      .json({ erro: "Erro ao processar: " + (error as Error).message });
  }
});

export default router;
