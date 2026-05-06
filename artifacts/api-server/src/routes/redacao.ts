import { Router } from "express";
import { aiChat } from "../lib/aiClient";
import { db } from "@workspace/db";
import { redacoesTable } from "@workspace/db/schema";
import { checkFreeUsage } from "../lib/freeUsage";
import { logAiUsage } from "../lib/aiCostLogger";
import { trackEvent } from "../lib/trackEvent";

const router = Router();

const SYSTEM_PROMPT = `IDIOMA OBRIGATORIO: SEMPRE em portugues brasileiro (pt-BR). NUNCA use ingles ou outro idioma — nem uma palavra. Esta regra e absoluta.

Voce e um corretor especialista em redacao do ENEM com mais de 20 anos de experiencia. 
Avalie a redacao enviada nas 5 competencias do ENEM, cada uma valendo de 0 a 200 pontos (em multiplos de 40: 0, 40, 80, 120, 160 ou 200).

As 5 competencias sao:
1. Dominio da norma culta da Lingua Portuguesa escrita
2. Compreensao da proposta e aplicacao de conceitos de varias areas do conhecimento para desenvolver o tema
3. Selecao, relacao, organizacao e interpretacao de informacoes, fatos, opinioes e argumentos em defesa de um ponto de vista
4. Conhecimento dos mecanismos linguisticos necessarios para a construcao da argumentacao
5. Elaboracao de proposta de intervencao para o problema abordado, respeitando os direitos humanos

Responda SOMENTE com um JSON valido no seguinte formato:
{
  "competencias": [
    { "numero": 1, "nome": "Dominio da Norma Culta", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..." },
    { "numero": 2, "nome": "Proposta e Repertorio", "nota": 120, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..." },
    { "numero": 3, "nome": "Selecao de Argumentos", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..." },
    { "numero": 4, "nome": "Coesao e Coerencia", "nota": 120, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..." },
    { "numero": 5, "nome": "Proposta de Intervencao", "nota": 80, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..." }
  ],
  "notaTotal": 640,
  "comentarioGeral": "...",
  "nivelGeral": "Bom",
  "proximosPasso": "..."
}
Seja especifico, didatico e encorajador. Feedback em portugues brasileiro. Nao inclua nada alem do JSON.`;

router.post("/api/redacao", checkFreeUsage, async (req, res) => {
  try {
    const { texto, tema } = req.body as { texto?: string; tema?: string };

    if (!texto || texto.trim().length < 100) {
      return res.status(400).json({ error: "Texto muito curto. Escreva pelo menos 100 caracteres." });
    }

    const userContent = tema
      ? `TEMA: ${tema}\n\nREDACAO:\n${texto}`
      : `REDACAO (sem tema especificado):\n${texto}`;

    const { response, config } = await aiChat({
      taskType: "essay-correction",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      jsonMode: true,
    });

    const raw = response.choices[0].message.content ?? "{}";
    logAiUsage({ feature: "redacao", model: config.model, tokensIn: response.usage?.prompt_tokens ?? 0, tokensOut: response.usage?.completion_tokens ?? 0, userId: (req as any).userId ?? null });
    const result = JSON.parse(raw);

    // Save to DB if user is authenticated
    if ((req as any).userId) {
      const userId = (req as any).userId as string;
      const comps: number[] = (result.competencias ?? []).map((c: any) => c.nota ?? 0);
      try {
        await db.insert(redacoesTable).values({
          userId,
          tema: tema ?? "Sem tema",
          tipo: "ENEM",
          texto,
          correction: result,
          scoreTotal: result.notaTotal ?? 0,
          comp1: comps[0] ?? 0,
          comp2: comps[1] ?? 0,
          comp3: comps[2] ?? 0,
          comp4: comps[3] ?? 0,
          comp5: comps[4] ?? 0,
        });
      } catch (dbErr) {
        console.warn("Redacao: failed to save to DB:", dbErr);
      }
      trackEvent({ userId, eventType: "essay_submitted", metadata: { tema: tema ?? "Sem tema", score: result.notaTotal ?? 0 } });
    }

    return res.json(result);
  } catch (err) {
    console.error("Redacao error:", err);
    return res.status(500).json({ error: "Erro ao corrigir redacao. Tente novamente." });
  }
});

export default router;
