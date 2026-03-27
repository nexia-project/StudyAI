import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SIMULADO_SYSTEM_PROMPT = `Você é um professor especialista em criar simulados variados e originais com base EXCLUSIVAMENTE no conteúdo real fornecido pelo aluno.

⚠️ REGRA ABSOLUTA: Todas as questões devem ser extraídas DIRETAMENTE do conteúdo real enviado pelo aluno (textos de livros, apostilas, cadernos, PDFs). NÃO invente tópicos externos. NÃO use conhecimento geral que não esteja presente no material. Se o material fala de personagens, datas, fórmulas, teoremas ou conceitos específicos, as questões DEVEM ser sobre esses elementos concretos do material.

RESPONDA APENAS com um JSON válido, sem markdown. Estrutura EXATA:

{
  "titulo": "Simulado - [Nome exato do conteúdo identificado no material]",
  "tempoMinutos": 25,
  "perguntas": [
    {
      "id": 1,
      "enunciado": "Enunciado completo e claro da questão, citando termos e conceitos que aparecem literalmente no material do aluno",
      "opcoes": {
        "A": "Alternativa A completa",
        "B": "Alternativa B completa",
        "C": "Alternativa C completa",
        "D": "Alternativa D completa"
      },
      "correta": "B",
      "explicacao": "Explicação detalhada: por que B é correta citando o trecho do material. Por que A, C e D estão erradas. Dica para não esquecer."
    }
  ]
}

REGRAS OBRIGATÓRIAS:
- O campo "correta" DEVE ser exatamente uma letra: A, B, C ou D (sem ponto, sem parêntese, sem espaço)
- Distribua respostas corretas: não repita a mesma letra mais de 4 vezes entre todas as questões
- Adapte linguagem e complexidade ao nível escolar informado`;

const QUESTION_FORMATS = [
  "definição direta: 'O que é / O que significa [termo do material]?'",
  "aplicação: 'Dado o conceito de [X presente no material], o que acontece quando...?'",
  "identificação de erro: 'Qual afirmação sobre [tópico] está INCORRETA segundo o material?'",
  "cálculo ou resolução passo a passo com dados do material",
  "comparação: 'Qual a diferença entre [X] e [Y] conforme o conteúdo estudado?'",
  "causa e efeito extraído diretamente do material",
  "completar lacuna com termo específico do material",
  "cronologia ou sequência lógica de eventos/passos do conteúdo",
  "interpretação de situação-problema usando regra/fórmula do material",
  "exemplificação: qual dos exemplos abaixo ilustra corretamente o conceito [X] do material?",
  "exceção à regra: qual caso NÃO se aplica ao princípio [X] descrito no material?",
  "identificação do conceito: qual opção descreve corretamente [fenômeno/evento/personagem] do material?",
  "relação entre conceitos presentes no mesmo material",
  "questão de interpretação: de acordo com o trecho estudado, pode-se concluir que...",
  "pergunta sobre processo/método descrito no material passo a passo",
];

function shuffleArray<T>(arr: T[]): T[] {
  return arr
    .map((v) => ({ v, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ v }) => v);
}

router.post("/simulado", async (req, res) => {
  try {
    const { materia, serie, resumo, diasConteudo, conteudoTexto } = req.body as {
      materia: string;
      serie: string;
      resumo: string;
      diasConteudo: string;
      conteudoTexto?: string;
    };

    if (!materia || !resumo) {
      res.status(400).json({ erro: "Dados insuficientes para gerar o simulado." });
      return;
    }

    // Randomize number of questions between 12 and 18
    const numQuestoes = Math.floor(Math.random() * 7) + 12;
    const seed = Math.floor(Math.random() * 999999);
    const shuffledFormats = shuffleArray(QUESTION_FORMATS).slice(0, numQuestoes);
    const correctLetters = ["A", "B", "C", "D"];
    const targetDistribution = shuffleArray([
      ...Array(Math.ceil(numQuestoes / 4)).fill("A"),
      ...Array(Math.ceil(numQuestoes / 4)).fill("B"),
      ...Array(Math.ceil(numQuestoes / 4)).fill("C"),
      ...Array(Math.ceil(numQuestoes / 4)).fill("D"),
    ]).slice(0, numQuestoes);

    const hasRealContent = conteudoTexto && conteudoTexto.trim().length > 100;

    let contentSection = "";
    if (hasRealContent) {
      contentSection = `
═══════════════════════════════════════════
MATERIAL REAL DO ALUNO (USE ESTE CONTEÚDO COMO FONTE PRIMÁRIA DAS QUESTÕES):
═══════════════════════════════════════════
${conteudoTexto}
═══════════════════════════════════════════

Conteúdo estruturado do plano de estudos (use como complemento):
${diasConteudo}`;
    } else {
      contentSection = `Conteúdo detalhado por dia (USE APENAS ESTE CONTEÚDO para criar as questões):
${diasConteudo}`;
    }

    const userContent = `Matéria/Conteúdo: ${materia}
Série do aluno: ${serie}
Resumo: ${resumo}

${contentSection}

⚠️ ATENÇÃO CRÍTICA: As ${numQuestoes} questões devem ser baseadas EXCLUSIVAMENTE no conteúdo acima. Não use nenhum conhecimento externo. Todo conceito, dado, nome, fórmula e exemplo nas questões deve aparecer no material acima.

SEMENTE DE VARIAÇÃO: #${seed} — garanta questões únicas, nunca repetir perguntas anteriores.

DISTRIBUIÇÃO ALVO DAS RESPOSTAS CORRETAS (siga isso):
${targetDistribution.map((l, i) => `Q${i + 1}: ${l}`).join(", ")}

FORMATOS OBRIGATÓRIOS para cada questão (use estes ângulos, na ordem):
${shuffledFormats.map((f, i) => `Q${i + 1}: ${f}`).join("\n")}

INSTRUÇÕES FINAIS:
- Gere EXATAMENTE ${numQuestoes} questões com alternativas A, B, C e D
- Escalone dificuldade: Q1-Q${Math.floor(numQuestoes * 0.3)} fáceis → Q${Math.floor(numQuestoes * 0.3) + 1}-Q${Math.floor(numQuestoes * 0.65)} médias → Q${Math.floor(numQuestoes * 0.65) + 1}-Q${numQuestoes - 1} difíceis → Q${numQuestoes} desafio final
- Os distradores (alternativas erradas) devem ser plausíveis mas claramente errados para quem leu o material
- A explicação DEVE citar onde no material a resposta está
- Enunciados variados — nunca usar o mesmo padrão de início de frase duas vezes`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SIMULADO_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      max_tokens: 6000,
      temperature: 1.05,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      res.status(500).json({ erro: "Erro ao gerar o simulado." });
      return;
    }

    const simulado = JSON.parse(content);
    res.json({ simulado });
  } catch (error) {
    req.log.error({ error }, "Erro ao gerar simulado");
    res.status(500).json({ erro: "Erro ao gerar simulado: " + (error as Error).message });
  }
});

export default router;
