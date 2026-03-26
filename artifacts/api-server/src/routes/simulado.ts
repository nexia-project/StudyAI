import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SIMULADO_PROMPT = `Você é um professor especialista em criar simulados de prova. Gere um simulado completo baseado no conteúdo fornecido.

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
- As questões devem cobrir diferentes partes do conteúdo estudado
- Escalone a dificuldade: questões 1-3 fáceis, 4-6 médias, 7-9 difíceis, questão 10 desafio
- Use o estilo de questões que realmente cai em provas para a série informada
- As alternativas erradas devem ser plausíveis (erros comuns dos alunos), não óbvias
- A questão 10 deve ser a mais desafiadora — o tipo que separa nota 8 de nota 10
- Adapte linguagem e complexidade ao nível escolar informado
- A explicação deve ser detalhada (3-5 frases), incluindo a "pegadinha" se houver
- Distribua as respostas corretas: não concentre em uma letra só
- Cada questão deve testar um aspecto diferente do conteúdo`;

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

    const userContent = `Matéria/Conteúdo: ${materia}
Série do aluno: ${serie}
Resumo do que foi estudado: ${resumo}
Conteúdo detalhado por dia:
${diasConteudo}

Gere um simulado de 10 questões de múltipla escolha baseado EXATAMENTE neste conteúdo. As questões devem cobrir todos os principais tópicos estudados.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SIMULADO_PROMPT },
        { role: "user", content: userContent },
      ],
      max_tokens: 4000,
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
