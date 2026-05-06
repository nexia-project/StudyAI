import { Router } from "express";
import { aiChat } from "../lib/aiClient";
import { checkFreeUsage } from "../lib/freeUsage";
import { getKnowledgeContext } from "../utils/knowledge-context";
import { logAiUsage } from "../lib/aiCostLogger";

const router = Router();

const RESUMAO_PROMPT = `Voce e um professor estrategista especialista em aprovacoes no ENEM, vestibular e concursos publicos. Sua missao e criar um RESUMO ESTRATEGICO que vai realmente fazer diferenca no desempenho do aluno — nao um resumo generico, mas um guia cirurgico e personalizado.

RESPONDA APENAS com JSON valido, sem markdown. Use EXATAMENTE esta estrutura:

{
  "visaoGeral": "Visao geral estrategica do conteudo em 2-3 frases que mostram o BIG PICTURE: o que e, por que e importante e como dominar isso vai impactar a nota do aluno",
  "conceitosChave": [
    {
      "titulo": "Nome do conceito",
      "explicacao": "Explicacao direta de 2-3 frases: o que e, como funciona e POR QUE os professores cobram isso. Seja especifico, nao generico.",
      "comoMemorizar": "Tecnica concreta de memorizacao: sigla, rima, analogia, historia, associacao visual. Deve ser criativa e realmente grudar na cabeca.",
      "nivelImportancia": "alto"
    }
  ],
  "oQueMAisCai": [
    "Padrao de questao 1 que aparece FREQUENTEMENTE nesta materia — seja especifico sobre o tipo de questao",
    "Padrao de questao 2 com detalhes do que o examinador costuma cobrar"
  ],
  "armadilhas": [
    "Armadilha 1: O erro classico que derruba estudantes + como evitar",
    "Armadilha 2: Confusao conceitual comum + como diferenciar"
  ],
  "conexoes": "Como os topicos deste conteudo SE CONECTAM entre si e com outras materias. Mostre o mapa mental das relacoes para o aluno entender a estrutura do conhecimento, nao apenas pecas soltas.",
  "estrategiaRevisao": "Estrategia concreta e personalizada de como estudar ESTE conteudo especifico: qual ordem abordar os topicos, quanto tempo em cada um, e qual tecnica (mapas mentais, resumo ativo, questoes, etc) e mais eficaz para ESTA materia.",
  "dicaFinal": "Uma dica poderosa, especifica e acionavel que separa quem tira nota alta de quem fica na media nesta materia. Deve ser algo que o aluno pode implementar HOJE."
}

REGRAS:
- Minimo 4 e maximo 6 conceitosChave — os mais importantes, nao todos
- Minimo 4 e maximo 6 itens em oQueMAisCai e armadilhas
- Seja ESPECIFICO ao conteudo apresentado — nada generico
- Use linguagem direta, jovem e motivadora
- Foque em impacto real no desempenho em prova`;

router.post("/resumao", checkFreeUsage, async (req, res) => {
  try {
    const { materia, serie, conteudoTexto, planoResumo } = req.body as {
      materia?: string;
      serie?: string;
      conteudoTexto?: string;
      planoResumo?: string;
    };

    if (!conteudoTexto && !planoResumo) {
      return res.status(400).json({ error: "Conteudo necessario para gerar resumao." });
    }

    const contexto = [
      materia ? `Materia: ${materia}` : null,
      serie ? `Nivel do aluno: ${serie}` : null,
      conteudoTexto ? `\nConteudo estudado:\n${conteudoTexto.slice(0, 5000)}` : null,
      planoResumo ? `\nResumo do plano gerado:\n${planoResumo.slice(0, 3000)}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const queryText = (conteudoTexto || planoResumo || materia || "").slice(0, 150);
    const knowledgeCtx = await getKnowledgeContext({
      query: queryText,
      materia: materia || undefined,
      serie: serie || undefined,
      userId: (req as any).userId,
      maxCharsPerSource: 900,
    });

    const knowledgeBlock = knowledgeCtx.hasKnowledge
      ? `\n\n${knowledgeCtx.contextBlock}\n\nBNCC — Habilidades fundamentadas: ${knowledgeCtx.bnccHabilidades.join(", ") || "ver contexto acima"}`
      : "";

    const { response, config } = await aiChat({
      taskType: "summary",
      messages: [
        { role: "system", content: RESUMAO_PROMPT + knowledgeBlock },
        { role: "user", content: `Crie um resumo estrategico completo para este conteudo:\n\n${contexto}` },
      ],
      jsonMode: true,
    });

    const raw = response.choices[0].message.content;
    logAiUsage({ feature: "resumao", model: config.model, tokensIn: response.usage?.prompt_tokens ?? 0, tokensOut: response.usage?.completion_tokens ?? 0, userId: (req as any).userId ?? null });
    if (!raw) return res.status(500).json({ error: "Sem resposta da IA." });

    const resumao = JSON.parse(raw);
    return res.json({ resumao });
  } catch (err) {
    console.error("Resumao error:", err);
    return res.status(500).json({ error: "Erro ao gerar resumao estrategico." });
  }
});

export default router;
