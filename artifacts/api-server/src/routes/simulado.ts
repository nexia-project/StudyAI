import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SIMULADO_PROMPT = `Você é um professor especialista em criar simulados originais e variados. Gere um simulado COMPLETAMENTE DIFERENTE de qualquer simulado anterior sobre o mesmo conteúdo.

RESPONDA APENAS com um JSON válido, sem markdown. Use EXATAMENTE esta estrutura:

{
  "titulo": "Simulado - [Nome da Matéria/Conteúdo]",
  "tempoMinutos": 20,
  "perguntas": [
    {
      "id": 1,
      "enunciado": "Enunciado completo da questão, claro e sem ambiguidade. Use dados, contextos e exemplos reais.",
      "opcoes": {
        "A": "Primeira opção",
        "B": "Segunda opção",
        "C": "Terceira opção",
        "D": "Quarta opção"
      },
      "correta": "B",
      "explicacao": "Explicação completa de por que a alternativa correta é a certa. Mencione também por que as erradas estão erradas (especialmente as mais tentadoras). Inclua dica para não errar este tipo de questão na prova."
    }
  ]
}

REGRAS OBRIGATÓRIAS:
- Gere EXATAMENTE 10 questões de múltipla escolha (A, B, C, D)
- VARIEDADE DE FORMATOS obrigatória: inclua questões de tipos diferentes:
  • Aplicação prática ("Um aluno quer... qual é a resposta?")
  • Comparação ("Qual a diferença entre X e Y?")
  • Causa e efeito ("O que acontece quando...?")
  • Identificação de erro ("Qual afirmação está INCORRETA?")
  • Situação-problema ("Em uma prova que pede..., a fórmula correta é...")
  • Completar lacuna ("_____ é definido como...")
  • Interpretação de dados ou texto
- Escalone a dificuldade: questões 1-3 fáceis, 4-6 médias, 7-9 difíceis, questão 10 desafio
- Use o estilo de questões que realmente cai em provas para a série informada
- As alternativas erradas devem ser plausíveis (erros comuns dos alunos), não óbvias
- A questão 10 deve ser a mais desafiadora — o tipo que separa nota 8 de nota 10
- Adapte linguagem e complexidade ao nível escolar informado
- A explicação deve ser detalhada (3-5 frases), incluindo a "pegadinha" se houver
- Distribua as respostas corretas ALEATORIAMENTE entre A, B, C e D — não repita a mesma letra mais de 3 vezes
- Cada questão deve testar um aspecto e ângulo DIFERENTE do conteúdo
- Use contextos e cenários DIFERENTES em cada questão (não repita personagens ou situações)
- NUNCA repita o mesmo tipo de enunciado duas vezes`;

const QUESTION_ANGLES = [
  "definição e conceito fundamental",
  "aplicação prática no cotidiano",
  "cálculo ou resolução passo a passo",
  "comparação entre dois conceitos",
  "identificação de erro ou afirmação falsa",
  "causa e efeito",
  "interpretação de situação-problema",
  "ordem cronológica ou sequência lógica",
  "exemplificação de regra ou princípio",
  "exceção à regra geral",
];

function shuffleArray<T>(arr: T[]): T[] {
  return arr
    .map((v) => ({ v, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ v }) => v);
}

router.post("/simulado", async (req, res) => {
  try {
    const { materia, serie, resumo, diasConteudo } = req.body as {
      materia: string;
      serie: string;
      resumo: string;
      diasConteudo: string;
    };

    if (!materia || !resumo) {
      res.status(400).json({ erro: "Dados insuficientes para gerar o simulado." });
      return;
    }

    const seed = Math.floor(Math.random() * 100000);
    const shuffledAngles = shuffleArray(QUESTION_ANGLES).slice(0, 7);
    const randomLetter = ["A", "B", "C", "D"][Math.floor(Math.random() * 4)];

    const userContent = `Matéria/Conteúdo: ${materia}
Série do aluno: ${serie}
Resumo do que foi estudado: ${resumo}
Conteúdo detalhado por dia:
${diasConteudo}

SEMENTE DE VARIAÇÃO: #${seed} — use este número para garantir uma combinação única de questões, contextos e ângulos. Cada simulado com semente diferente DEVE produzir questões completamente diferentes.

ÂNGULOS OBRIGATÓRIOS para este simulado (distribua entre as 10 questões):
${shuffledAngles.map((a, i) => `Q${i + 1}: ${a}`).join("\n")}

RESTRIÇÕES DESTA VERSÃO:
- Evite exemplos com nomes genéricos (João, Maria) — invente situações mais criativas
- A letra correta da questão 3 deve ser "${randomLetter}"
- Pelo menos 2 questões devem apresentar gráficos, tabelas ou dados em formato texto
- Pelo menos 1 questão deve pedir ao aluno para identificar a afirmação INCORRETA
- Os distradores (alternativas erradas) devem explorar os erros mais comuns que alunos da ${serie} cometem

Gere um simulado de 10 questões COMPLETAMENTE ORIGINAL, com contextos e enunciados que eu nunca vi antes sobre este conteúdo.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SIMULADO_PROMPT },
        { role: "user", content: userContent },
      ],
      max_tokens: 4000,
      temperature: 1.1,
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
