import { Router } from "express";
import OpenAI from "openai";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const RESUMAO_PROMPT = `Você é um professor estrategista especialista em aprovações no ENEM, vestibular e concursos públicos. Sua missão é criar um RESUMO ESTRATÉGICO que vai realmente fazer diferença no desempenho do aluno — não um resumo genérico, mas um guia cirúrgico e personalizado.

RESPONDA APENAS com JSON válido, sem markdown. Use EXATAMENTE esta estrutura:

{
  "visaoGeral": "Visão geral estratégica do conteúdo em 2-3 frases que mostram o BIG PICTURE: o que é, por que é importante e como dominar isso vai impactar a nota do aluno",
  "conceitosChave": [
    {
      "titulo": "Nome do conceito",
      "explicacao": "Explicação direta de 2-3 frases: o que é, como funciona e POR QUE os professores cobram isso. Seja específico, não genérico.",
      "comoMemorizar": "Técnica concreta de memorização: sigla, rima, analogia, história, associação visual. Deve ser criativa e realmente grudar na cabeça.",
      "nivelImportancia": "alto"
    }
  ],
  "oQueMAisCai": [
    "Padrão de questão 1 que aparece FREQUENTEMENTE nesta matéria — seja específico sobre o tipo de questão",
    "Padrão de questão 2 com detalhes do que o examinador costuma cobrar"
  ],
  "armadilhas": [
    "Armadilha 1: O erro clássico que derruba estudantes + como evitar",
    "Armadilha 2: Confusão conceitual comum + como diferenciar"
  ],
  "conexoes": "Como os tópicos deste conteúdo SE CONECTAM entre si e com outras matérias. Mostre o mapa mental das relações para o aluno entender a estrutura do conhecimento, não apenas peças soltas.",
  "estrategiaRevisao": "Estratégia concreta e personalizada de como estudar ESTE conteúdo específico: qual ordem abordar os tópicos, quanto tempo em cada um, e qual técnica (mapas mentais, resumo ativo, questões, etc) é mais eficaz para ESTA matéria.",
  "dicaFinal": "Uma dica poderosa, específica e acionável que separa quem tira nota alta de quem fica na média nesta matéria. Deve ser algo que o aluno pode implementar HOJE."
}

REGRAS:
- Mínimo 4 e máximo 6 conceitosChave — os mais importantes, não todos
- Mínimo 4 e máximo 6 itens em oQueMAisCai e armadilhas
- Seja ESPECÍFICO ao conteúdo apresentado — nada genérico
- Use linguagem direta, jovem e motivadora
- Foque em impacto real no desempenho em prova`;

export default router;

router.post("/resumao", async (req, res) => {
  try {
    const { materia, serie, conteudoTexto, planoResumo } = req.body as {
      materia?: string;
      serie?: string;
      conteudoTexto?: string;
      planoResumo?: string;
    };

    if (!conteudoTexto && !planoResumo) {
      return res.status(400).json({ error: "Conteúdo necessário para gerar resumão." });
    }

    const contexto = [
      materia ? `Matéria: ${materia}` : null,
      serie ? `Nível do aluno: ${serie}` : null,
      conteudoTexto ? `\nConteúdo estudado:\n${conteudoTexto.slice(0, 5000)}` : null,
      planoResumo ? `\nResumo do plano gerado:\n${planoResumo.slice(0, 3000)}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: RESUMAO_PROMPT },
        {
          role: "user",
          content: `Crie um resumo estratégico completo para este conteúdo:\n\n${contexto}`,
        },
      ],
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content;
    if (!raw) return res.status(500).json({ error: "Sem resposta da IA." });

    const resumao = JSON.parse(raw);
    return res.json({ resumao });
  } catch (err) {
    console.error("Resumão error:", err);
    return res.status(500).json({ error: "Erro ao gerar resumão estratégico." });
  }
});
