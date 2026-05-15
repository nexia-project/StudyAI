import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface PlatformMetrics {
  periodoDias: number;
  totalUsuarios: number;
  novosUsuariosPeriodo: number;
  novosUsuariosDiaAnterior: number;
  assinantesAtivos: number;
  assinantesTrialing: number;
  usuariosFree: number;
  waitlistTotal: number;
  waitlistPeriodo: number;
  atividadeEstudoPeriodo: number;
  simuladosPeriodo: number;
}

export async function fetchPlatformMetrics(periodoDias = 7): Promise<PlatformMetrics> {
  const dias = Math.max(1, Math.min(90, periodoDias));
  const sinceIso = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgoIso = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const scalar = async (q: ReturnType<typeof sql>) => {
    const res = await db.execute(q);
    return Number((res.rows as { total?: number }[])[0]?.total ?? 0);
  };

  const [
    totalUsuarios,
    novosUsuariosPeriodo,
    novosUsuariosDiaAnterior,
    assinantesAtivos,
    assinantesTrialing,
    usuariosFree,
    waitlistTotal,
    waitlistPeriodo,
    atividadeEstudoPeriodo,
    simuladosPeriodo,
  ] = await Promise.all([
    scalar(sql`SELECT COUNT(*)::int AS total FROM users`),
    scalar(sql`SELECT COUNT(*)::int AS total FROM users WHERE created_at >= ${sinceIso}`),
    scalar(
      sql`SELECT COUNT(*)::int AS total FROM users WHERE created_at >= ${twoDaysAgoIso} AND created_at < ${dayAgoIso}`,
    ),
    scalar(
      sql`SELECT COUNT(*)::int AS total FROM users WHERE stripe_subscription_status = 'active'`,
    ),
    scalar(
      sql`SELECT COUNT(*)::int AS total FROM users WHERE stripe_subscription_status = 'trialing'`,
    ),
    scalar(
      sql`SELECT COUNT(*)::int AS total FROM users WHERE stripe_subscription_status IS NULL OR stripe_subscription_status IN ('free', '')`,
    ),
    scalar(sql`SELECT COUNT(*)::int AS total FROM waitlist`),
    scalar(sql`SELECT COUNT(*)::int AS total FROM waitlist WHERE created_at >= ${sinceIso}`),
    scalar(sql`SELECT COUNT(*)::int AS total FROM user_activity WHERE created_at >= ${sinceIso}`),
    scalar(sql`SELECT COUNT(*)::int AS total FROM simulado_results WHERE created_at >= ${sinceIso}`),
  ]);

  return {
    periodoDias: dias,
    totalUsuarios,
    novosUsuariosPeriodo,
    novosUsuariosDiaAnterior,
    assinantesAtivos,
    assinantesTrialing,
    usuariosFree,
    waitlistTotal,
    waitlistPeriodo,
    atividadeEstudoPeriodo,
    simuladosPeriodo,
  };
}
