import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SIMULADO_PROMPT = `Você é um professor especialista em criar simulados originais e variados com base EXCLUSIVAMENTE no conteúdo fornecido pelo aluno.

⚠️ REGRA ABSOLUTA: Todas as questões devem ser derivadas APENAS do conteúdo fornecido no campo "Conteúdo detalhado por dia" e "Resumo". NÃO invente tópicos, NÃO acrescente informações externas, NÃO use conhecimento geral que não esteja no conteúdo enviado. Se o conteúdo fala de um capítulo específico, as questões devem ser sobre aquele capítulo. Se fala de um assunto específico, as questões devem ser sobre aquele assunto.

RESPONDA APENAS com um JSON válido, sem markdown. Use EXATAMENTE esta estrutura:

{
  "titulo": "Simulado - [Nome exato da matéria/conteúdo conforme fornecido]",
  "tempoMinutos": 20,
  "perguntas": [
    {
      "id": 1,
      "enunciado": "Enunciado completo da questão baseado no conteúdo fornecido. Use conceitos, definições e exemplos que aparecem no material do aluno.",
      "opcoes": {
        "A": "Primeira opção",
        "B": "Segunda opção",
        "C": "Terceira opção",
        "D": "Quarta opção"
      },
      "correta": "B",
      "explicacao": "Explicação completa citando especificamente o que foi estudado no conteúdo fornecido. Por que a correta é certa? Por que as erradas estão erradas? Inclua dica para não errar."
    }
  ]
}

REGRAS OBRIGATÓRIAS:
- Gere EXATAMENTE 10 questões de múltipla escolha com alternativas A, B, C e D
- O campo "correta" DEVE ser exatamente uma das letras: A, B, C ou D (sem ponto, sem parêntese)
- TODAS as questões devem ser baseadas no conteúdo fornecido — nenhuma questão de conhecimento geral fora do material
- VARIEDADE DE FORMATOS (distribua entre as 10 questões):
  • Definição: "O que é X conforme o conteúdo estudado?"
  • Aplicação: "Dado o conceito de X, o que acontece quando...?"
  • Comparação: "Qual a diferença entre X e Y apresentados no conteúdo?"
  • Identificação de erro: "Qual afirmação sobre X está INCORRETA segundo o conteúdo?"
  • Situação-problema baseada em exemplo do material
  • Completar lacuna usando termos do conteúdo
- Escalone a dificuldade: questões 1-3 fáceis, 4-6 médias, 7-9 difíceis, questão 10 desafio final
- As alternativas erradas devem ser plausíveis mas claramente erradas para quem estudou o conteúdo
- Distribua as respostas corretas: não repita a mesma letra mais de 3 vezes
- A explicação deve mencionar onde no conteúdo está a resposta
- Adapte linguagem e complexidade ao nível escolar informado`;

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

Conteúdo detalhado por dia (USE APENAS ESTE CONTEÚDO para criar as questões):
${diasConteudo}

⚠️ ATENÇÃO CRÍTICA: As 10 questões devem ser baseadas EXCLUSIVAMENTE no conteúdo acima. Não use nenhum conhecimento externo. Se um conceito não aparece no conteúdo acima, não faça questão sobre ele.

SEMENTE DE VARIAÇÃO: #${seed} — use para garantir ângulos e contextos únicos, mas SEMPRE dentro do conteúdo fornecido.

FORMATOS para distribuir entre as questões (escolha os mais adequados ao conteúdo):
${shuffledAngles.map((a, i) => `Q${i + 1}: ${a}`).join("\n")}

INSTRUÇÕES ADICIONAIS:
- A letra correta da questão 3 deve ser "${randomLetter}" (se possível sem forçar)
- Pelo menos 1 questão deve pedir para identificar a afirmação INCORRETA sobre o conteúdo
- Os distradores devem ser erros comuns de alunos da ${serie} sobre ESTE conteúdo específico
- Gere questões com enunciados variados — nunca repita o mesmo padrão de enunciado`;

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
