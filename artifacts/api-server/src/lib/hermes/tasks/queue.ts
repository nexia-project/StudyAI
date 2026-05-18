import { db } from "@workspace/db";
import { hermesTarefasTable, type HermesTarefa } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { OR } from "../../aiClient";
import { injectHermes } from "../buildHermesContext";
import { chatCompletionCreateWithFallback } from "../../openrouterFallback";

function mapTaskRow(row: Record<string, unknown>): HermesTarefa {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    tipo: String(row.tipo),
    payload: (row.payload as HermesTarefa["payload"]) ?? null,
    status: String(row.status) as HermesTarefa["status"],
    resultado: (row.resultado as HermesTarefa["resultado"]) ?? null,
    erro: row.erro != null ? String(row.erro) : null,
    createdAt: row.created_at as Date,
    startedAt: (row.started_at as Date | null) ?? null,
    completedAt: (row.completed_at as Date | null) ?? null,
  };
}

export async function enqueueTask(
  agentId: string,
  tipo: string,
  payload?: Record<string, unknown> | null,
): Promise<string> {
  const [row] = await db
    .insert(hermesTarefasTable)
    .values({
      agentId,
      tipo,
      payload: payload ?? null,
      status: "pending",
    })
    .returning({ id: hermesTarefasTable.id });
  return row!.id;
}

/** Reivindica até `limit` tarefas pendentes (SKIP LOCKED) e marca como `processing`. */
export async function claimNextTasks(limit: number): Promise<HermesTarefa[]> {
  const n = Math.max(1, Math.min(50, Math.floor(limit)));
  const r = await db.execute(sql`
    WITH picked AS (
      SELECT id FROM hermes_tarefas
      WHERE status = 'pending'
        AND tipo <> 'action_center'
      ORDER BY created_at ASC
      LIMIT ${n}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE hermes_tarefas t
    SET status = 'processing', started_at = NOW()
    FROM picked p
    WHERE t.id = p.id
    RETURNING t.*
  `);
  const rows = (r as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
  return rows.map(mapTaskRow);
}

const TIPO_KIND: Record<string, "copy" | "mensagem" | "trilha" | "aula"> = {
  copy: "copy",
  mensagem: "mensagem",
  trilha: "trilha",
  aula: "aula",
  campanha: "copy",
  risco_churn: "mensagem",
  intervencao_usuario: "mensagem",
};

function resolveKind(tipo: string): "copy" | "mensagem" | "trilha" | "aula" {
  return TIPO_KIND[tipo] ?? "mensagem";
}

/**
 * Executa uma tarefa Hermes via OpenRouter + injectHermes (CQO / contexto plataforma).
 * Tipos genéricos: copy, mensagem, trilha, aula (mapeados a partir do `tipo` da fila).
 */
export async function executeTask(task: HermesTarefa): Promise<Record<string, unknown>> {
  const kind = resolveKind(task.tipo);
  const payload = (task.payload ?? {}) as Record<string, unknown>;
  const topicHint =
    typeof payload.descricao === "string"
      ? payload.descricao
      : typeof payload.tema === "string"
        ? payload.tema
        : task.tipo;

  const systemByKind: Record<"copy" | "mensagem" | "trilha" | "aula", string> = {
    copy:
      "Você é redator de growth do StudyAI (ENEM, vestibular, concursos). Produza copy curta, PT-BR, pronta para uso (título + corpo + CTA). Responda só JSON: { titulo, corpo, cta }.",
    mensagem:
      "Você é CS/retenção StudyAI. Redija mensagem curta (email ou in-app) em PT-BR, empática e acionável. Responda só JSON: { assunto, corpo, proximo_passo }.",
    trilha:
      "Você é estrategista pedagógico StudyAI. Esboce micro-trilha (3 passos) em PT-BR. Responda só JSON: { passos: [{ titulo, descricao }] }.",
    aula:
      "Você é professor StudyAI. Esboce mini-aula (objetivos + gancho + síntese) em PT-BR. Responda só JSON: { objetivos: string[], gancho: string, sintese: string }.",
  };

  const baseSystem = [
    `Agente: ${task.agentId}.`,
    systemByKind[kind],
    "Use o contexto Hermes quando útil; não cite o bloco interno ao destinatário final.",
  ].join(" ");

  const enriched = await injectHermes(baseSystem, topicHint.slice(0, 200));
  const userBlock = JSON.stringify(
    { tipoFila: task.tipo, kind, payload },
    null,
    0,
  ).slice(0, 12_000);

  const { response } = await chatCompletionCreateWithFallback({
    model: OR.claudeFast,
    messages: [
      { role: "system", content: enriched },
      { role: "user", content: userBlock },
    ],
    max_tokens: 900,
    temperature: 0.35,
    hasVision: false,
  });

  const text = response.choices[0]?.message?.content?.trim() ?? "";
  let parsed: Record<string, unknown> = { texto: text };
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* mantém wrapper */
  }
  return { kind, output: parsed, rawLen: text.length };
}

export async function processTask(task: HermesTarefa): Promise<void> {
  const out = await executeTask(task);
  await db
    .update(hermesTarefasTable)
    .set({
      status: "completed",
      resultado: out,
      erro: null,
      completedAt: new Date(),
    })
    .where(eq(hermesTarefasTable.id, task.id));
}

/** Reivindica e processa até `batchSize` tarefas. */
export async function processNextTasks(batchSize: number): Promise<{
  claimed: number;
  completed: number;
  failed: number;
  errors: string[];
}> {
  const tasks = await claimNextTasks(batchSize);
  let completed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const t of tasks) {
    try {
      await processTask(t);
      completed++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${t.id}: ${msg}`);
      await db
        .update(hermesTarefasTable)
        .set({
          status: "failed",
          erro: msg.slice(0, 4000),
          completedAt: new Date(),
        })
        .where(eq(hermesTarefasTable.id, t.id));
    }
  }

  return { claimed: tasks.length, completed, failed, errors };
}
