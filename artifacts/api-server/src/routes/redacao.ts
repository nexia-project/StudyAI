import { Router } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { redacoesTable } from "@workspace/db/schema";
import { checkFreeUsage } from "../lib/freeUsage";
import { logAiUsage } from "../lib/aiCostLogger";
import { trackEvent } from "../lib/trackEvent";

const router = Router();
const openai = new OpenAI();

const SYSTEM_PROMPT = `IDIOMA OBRIGATÓRIO: SEMPRE em português brasileiro (pt-BR). NUNCA use inglês ou outro idioma — nem uma palavra. Esta regra é absoluta.

Você é um corretor especialista em redação do ENEM com mais de 20 anos de experiência. 
Avalie a redação enviada nas 5 competências do ENEM, cada uma valendo de 0 a 200 pontos (em múltiplos de 40: 0, 40, 80, 120, 160 ou 200).

As 5 competências são:
1. Domínio da norma culta da Língua Portuguesa escrita
2. Compreensão da proposta e aplicação de conceitos de várias áreas do conhecimento para desenvolver o tema
3. Seleção, relação, organização e interpretação de informações, fatos, opiniões e argumentos em defesa de um ponto de vista
4. Conhecimento dos mecanismos linguísticos necessários para a construção da argumentação
5. Elaboração de proposta de intervenção para o problema abordado, respeitando os direitos humanos

Responda SOMENTE com um JSON válido no seguinte formato:
{
  "competencias": [
    { "numero": 1, "nome": "Domínio da Norma Culta", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..." },
    { "numero": 2, "nome": "Proposta e Repertório", "nota": 120, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..." },
    { "numero": 3, "nome": "Seleção de Argumentos", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..." },
    { "numero": 4, "nome": "Coesão e Coerência", "nota": 120, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..." },
    { "numero": 5, "nome": "Proposta de Intervenção", "nota": 80, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..." }
  ],
  "notaTotal": 640,
  "comentarioGeral": "...",
  "nivelGeral": "Bom",
  "proximosPasso": "..."
}
Seja específico, didático e encorajador. Feedback em português brasileiro. Não inclua nada além do JSON.`;

router.post("/api/redacao", checkFreeUsage, async (req, res) => {
  try {
    const { texto, tema } = req.body as { texto?: string; tema?: string };

    if (!texto || texto.trim().length < 100) {
      return res.status(400).json({ error: "Texto muito curto. Escreva pelo menos 100 caracteres." });
    }

    const userContent = tema
      ? `TEMA: ${tema}\n\nREDAÇÃO:\n${texto}`
      : `REDAÇÃO (sem tema especificado):\n${texto}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = completion.choices[0].message.content ?? "{}";
    logAiUsage({ feature: "redacao", model: "gpt-4o", tokensIn: completion.usage?.prompt_tokens ?? 0, tokensOut: completion.usage?.completion_tokens ?? 0, userId: (req as any).userId ?? null });
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
    return res.status(500).json({ error: "Erro ao corrigir redação. Tente novamente." });
  }
});

export default router;
