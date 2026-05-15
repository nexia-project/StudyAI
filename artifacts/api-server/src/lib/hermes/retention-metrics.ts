import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface InactiveUserPatterns {
  scannedAt: string;
  periodoDias: number;
  totalUsuarios: number;
  assinantesAtivos: number;
  /** Assinantes sem registro em user_activity no período. */
  assinantesSemEstudo: number;
  usuariosSemAtividadeNunca: number;
  inativosPorFaixa: { faixa: string; count: number }[];
  /** IDs (amostra) para ações proativas — sem PII extra. */
  amostraAssinantesEmRisco: string[];
}

export async function fetchInactiveUserPatterns(periodoDias = 14): Promise<InactiveUserPatterns> {
  const dias = Math.max(1, Math.min(90, periodoDias));
  const sinceIso = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

  const scalar = async (q: ReturnType<typeof sql>) => {
    const res = await db.execute(q);
    return Number((res.rows as { total?: number }[])[0]?.total ?? 0);
  };

  const [
    totalUsuarios,
    assinantesAtivos,
    assinantesSemEstudo,
    usuariosSemAtividadeNunca,
  ] = await Promise.all([
    scalar(sql`SELECT COUNT(*)::int AS total FROM users`),
    scalar(
      sql`SELECT COUNT(*)::int AS total FROM users WHERE stripe_subscription_status IN ('active', 'trialing')`,
    ),
    scalar(sql`
      SELECT COUNT(*)::int AS total
      FROM users u
      WHERE u.stripe_subscription_status IN ('active', 'trialing')
        AND NOT EXISTS (
          SELECT 1 FROM user_activity ua
          WHERE ua.user_id = u.id AND ua.created_at >= ${sinceIso}
        )
    `),
    scalar(sql`
      SELECT COUNT(*)::int AS total
      FROM users u
      WHERE NOT EXISTS (SELECT 1 FROM user_activity ua WHERE ua.user_id = u.id)
    `),
  ]);

  let inativosPorFaixa: { faixa: string; count: number }[] = [];
  try {
    const faixaRes = await db.execute(sql`
      SELECT
        CASE
          WHEN last_act IS NULL THEN 'nunca'
          WHEN last_act < NOW() - INTERVAL '30 days' THEN '30d+'
          WHEN last_act < NOW() - INTERVAL '14 days' THEN '14-30d'
          WHEN last_act < NOW() - INTERVAL '7 days' THEN '7-14d'
          ELSE 'ativo_7d'
        END AS faixa,
        COUNT(*)::int AS count
      FROM users u
      LEFT JOIN (
        SELECT user_id, MAX(created_at) AS last_act
        FROM user_activity
        GROUP BY user_id
      ) act ON act.user_id = u.id
      GROUP BY 1
      ORDER BY count DESC
    `);
    inativosPorFaixa = (faixaRes.rows as { faixa?: string; count?: number }[]).map((r) => ({
      faixa: String(r.faixa ?? "unknown"),
      count: Number(r.count ?? 0),
    }));
  } catch {
    inativosPorFaixa = [];
  }

  let amostraAssinantesEmRisco: string[] = [];
  try {
    const sampleRes = await db.execute(sql`
      SELECT u.id
      FROM users u
      WHERE u.stripe_subscription_status IN ('active', 'trialing')
        AND NOT EXISTS (
          SELECT 1 FROM user_activity ua
          WHERE ua.user_id = u.id AND ua.created_at >= ${sinceIso}
        )
      ORDER BY u.created_at ASC
      LIMIT 8
    `);
    amostraAssinantesEmRisco = (sampleRes.rows as { id?: string }[])
      .map((r) => String(r.id ?? ""))
      .filter(Boolean);
  } catch {
    amostraAssinantesEmRisco = [];
  }

  return {
    scannedAt: new Date().toISOString(),
    periodoDias: dias,
    totalUsuarios,
    assinantesAtivos,
    assinantesSemEstudo,
    usuariosSemAtividadeNunca,
    inativosPorFaixa,
    amostraAssinantesEmRisco,
  };
}
