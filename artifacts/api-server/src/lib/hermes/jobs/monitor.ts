import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { fetchPlatformMetrics } from "../metrics";
import { insertAdminInbox } from "../persist";

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const res = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${tableName}
      ) AS exists
    `);
    return Boolean((res.rows[0] as { exists?: boolean })?.exists);
  } catch {
    return false;
  }
}

async function fetchRecentErrorPatterns(hours = 24): Promise<{
  source: string;
  total: number;
} | null> {
  const candidates = ["error_logs", "api_error_logs", "server_logs", "application_logs"] as const;
  for (const table of candidates) {
    if (!(await tableExists(table))) continue;
    try {
      const res = await db.execute(
        sql.raw(`
          SELECT COUNT(*)::int AS total
          FROM ${table}
          WHERE created_at >= NOW() - INTERVAL '${hours} hours'
        `),
      );
      const total = Number((res.rows[0] as { total?: number })?.total ?? 0);
      if (total > 0) return { source: table, total };
    } catch {
      continue;
    }
  }
  return null;
}

function detectMetricAnomalies(metricas: Awaited<ReturnType<typeof fetchPlatformMetrics>>): string[] {
  const anomalies: string[] = [];
  const mediaDiariaNovos = metricas.novosUsuariosPeriodo / metricas.periodoDias;

  if (mediaDiariaNovos > 0 && metricas.novosUsuariosDiaAnterior < mediaDiariaNovos * 0.35) {
    anomalies.push(
      `Queda de cadastros: ontem ${metricas.novosUsuariosDiaAnterior} vs média ${mediaDiariaNovos.toFixed(1)}/dia.`,
    );
  }
  if (metricas.totalUsuarios > 30 && metricas.atividadeEstudoPeriodo < metricas.totalUsuarios * 0.03) {
    anomalies.push(
      `Atividade de estudo crítica: ${metricas.atividadeEstudoPeriodo} eventos / ${metricas.totalUsuarios} usuários no período.`,
    );
  }
  if (metricas.assinantesAtivos > 5 && metricas.simuladosPeriodo === 0) {
    anomalies.push("Nenhum simulado concluído no período apesar de base pagante ativa.");
  }
  return anomalies;
}

/** Produtor de alertas de saúde — distinto do agente inbox (canal UI). */
export async function monitorProactive(): Promise<void> {
  const [metricas, errorPatterns] = await Promise.all([
    fetchPlatformMetrics(7),
    fetchRecentErrorPatterns(24),
  ]);

  const issues: string[] = [];

  if (errorPatterns && errorPatterns.total >= 10) {
    issues.push(`${errorPatterns.total} registros em ${errorPatterns.source} (24h).`);
  }

  issues.push(...detectMetricAnomalies(metricas));

  if (issues.length === 0) return;

  const corpo = issues.join(" ");
  await insertAdminInbox("monitor", "saude_sistema", "Alerta de saúde da plataforma", corpo, {
    metricas,
    errorPatterns: errorPatterns ?? { stub: "platform_metrics" },
    issues,
  });
}
