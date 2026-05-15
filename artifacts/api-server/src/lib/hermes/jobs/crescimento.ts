import { openrouter, OR } from "../../aiClient";
import { fetchPlatformMetrics } from "../metrics";
import { insertAdminInbox, persistAcaoProativa, persistDescoberta } from "../persist";

export async function crescimentoDailyLearn(): Promise<void> {
  const metricas = await fetchPlatformMetrics(14);
  const taxaConversao =
    metricas.totalUsuarios > 0
      ? metricas.assinantesAtivos / metricas.totalUsuarios
      : 0;
  const taxaWaitlist =
    metricas.waitlistTotal > 0
      ? metricas.waitlistPeriodo / Math.max(1, metricas.waitlistTotal)
      : 0;

  const evidencia = {
    metricas,
    taxaConversaoAssinatura: taxaConversao,
    waitlistNovosPeriodo: metricas.waitlistPeriodo,
    taxaCrescimentoWaitlist: taxaWaitlist,
  };

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content:
          "Agente de crescimento StudyAI. Analise tendências de cadastro, waitlist e conversão. JSON: { descoberta: string, importancia: 1-5 }",
      },
      { role: "user", content: JSON.stringify(evidencia) },
    ],
    max_tokens: 400,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: { descoberta?: string; importancia?: number } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      descoberta: `Conversão ~${(taxaConversao * 100).toFixed(1)}%; waitlist +${metricas.waitlistPeriodo} no período.`,
      importancia: 2,
    };
  }

  await persistDescoberta(
    "crescimento",
    parsed.descoberta?.trim() || "Análise de conversão concluída.",
    evidencia,
    parsed.importancia ?? 2,
  );
}

export async function crescimentoProactive(): Promise<void> {
  const metricas = await fetchPlatformMetrics(7);

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content:
          "Sugira UM teste A/B de copy para StudyAI (ENEM/vestibulares). JSON: { tipo: string, descricao: string, payload: { headlineA, headlineB, metrica } }",
      },
      { role: "user", content: JSON.stringify(metricas) },
    ],
    max_tokens: 350,
    temperature: 0.6,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: {
    tipo?: string;
    descricao?: string;
    payload?: Record<string, unknown>;
  } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      tipo: "teste_copy",
      descricao: "Testar headline focada em nota ENEM vs. tempo de estudo economizado.",
      payload: { canal: "landing" },
    };
  }

  const descricao =
    parsed.descricao?.trim() || "Sugestão de teste A/B de copy na landing.";
  await persistAcaoProativa(
    "crescimento",
    parsed.tipo ?? "teste_copy",
    descricao,
    parsed.payload,
  );
  await insertAdminInbox(
    "crescimento",
    "teste_copy",
    "Sugestão de teste A/B",
    descricao,
    parsed.payload,
  );
}
