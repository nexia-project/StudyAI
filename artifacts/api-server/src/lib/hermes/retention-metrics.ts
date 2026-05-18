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
  studentSuccessSignals: StudentSuccessSignal[];
  studentSuccessRecommendations: StudentSuccessRecommendation[];
}

export type StudentSuccessSignalStatus = "risk" | "ok" | "missing_signal";

export interface StudentSuccessRecommendation {
  signalId: string;
  action: string;
  metric: string;
  priority: "alta" | "media" | "baixa";
}

export interface StudentSuccessSignal {
  id: string;
  label: string;
  status: StudentSuccessSignalStatus;
  observed: string;
  count?: number;
  sampleUserIds: string[];
  action: string;
  metric: string;
  evidence: string[];
  confidence: "alta" | "media" | "baixa";
}

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

function buildSignal(input: StudentSuccessSignal): StudentSuccessSignal {
  return input;
}

function recommendationsFromSignals(signals: StudentSuccessSignal[]): StudentSuccessRecommendation[] {
  return signals
    .filter((signal) => signal.status === "risk")
    .map((signal) => ({
      signalId: signal.id,
      action: signal.action,
      metric: signal.metric,
      priority: signal.confidence === "alta" ? "alta" : signal.confidence === "media" ? "media" : "baixa",
    }));
}

async function sampleUserIds(q: ReturnType<typeof sql>): Promise<string[]> {
  try {
    const res = await db.execute(q);
    return (res.rows as { user_id?: string; id?: string }[])
      .map((row) => String(row.user_id ?? row.id ?? ""))
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    return [];
  }
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

  const [
    hasSimulados,
    hasFlashcards,
    hasActivityEvents,
    hasTiagaoSessions,
    hasStudySchedules,
    hasStudyPlans,
  ] = await Promise.all([
    tableExists("simulado_results"),
    tableExists("flashcard_sessions"),
    tableExists("activity_events"),
    tableExists("tiagao_sessions"),
    tableExists("study_schedules"),
    tableExists("study_plans"),
  ]);

  const stuckSample = await sampleUserIds(sql`
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

  let repeatedErrorsCount = 0;
  let repeatedErrorsSample: string[] = [];
  if (hasSimulados) {
    try {
      const repeatedRes = await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT sr.user_id
          FROM simulado_results sr
          WHERE sr.created_at >= ${sinceIso}
            AND sr.total > 0
          GROUP BY sr.user_id
          HAVING COUNT(*) >= 2
             AND AVG(sr.score::numeric / NULLIF(sr.total, 0)) < 0.6
             AND SUM(GREATEST(sr.total - sr.score, 0)) >= 3
        ) risky
      `);
      repeatedErrorsCount = Number((repeatedRes.rows[0] as { total?: number })?.total ?? 0);
      repeatedErrorsSample = await sampleUserIds(sql`
        SELECT sr.user_id
        FROM simulado_results sr
        WHERE sr.created_at >= ${sinceIso}
          AND sr.total > 0
        GROUP BY sr.user_id
        HAVING COUNT(*) >= 2
           AND AVG(sr.score::numeric / NULLIF(sr.total, 0)) < 0.6
           AND SUM(GREATEST(sr.total - sr.score, 0)) >= 3
        ORDER BY MAX(sr.created_at) DESC
        LIMIT 8
      `);
    } catch {
      repeatedErrorsCount = 0;
      repeatedErrorsSample = [];
    }
  }

  let abandonedSimuladoCount = 0;
  let abandonedSimuladoSample: string[] = [];
  if (hasActivityEvents) {
    try {
      const abandonedRes = await db.execute(sql`
        SELECT COUNT(DISTINCT s.user_id)::int AS total
        FROM activity_events s
        WHERE s.event_type = 'simulado_started'
          AND s.created_at >= ${sinceIso}
          AND NOT EXISTS (
            SELECT 1 FROM activity_events c
            WHERE c.user_id = s.user_id
              AND c.event_type = 'simulado_completed'
              AND c.created_at >= s.created_at
          )
      `);
      abandonedSimuladoCount = Number((abandonedRes.rows[0] as { total?: number })?.total ?? 0);
      abandonedSimuladoSample = await sampleUserIds(sql`
        SELECT DISTINCT s.user_id
        FROM activity_events s
        WHERE s.event_type = 'simulado_started'
          AND s.created_at >= ${sinceIso}
          AND NOT EXISTS (
            SELECT 1 FROM activity_events c
            WHERE c.user_id = s.user_id
              AND c.event_type = 'simulado_completed'
              AND c.created_at >= s.created_at
          )
        ORDER BY s.user_id
        LIMIT 8
      `);
    } catch {
      abandonedSimuladoCount = 0;
      abandonedSimuladoSample = [];
    }
  }

  let chatHeavyNoPracticeCount = 0;
  let chatHeavyNoPracticeSample: string[] = [];
  if (hasActivityEvents) {
    try {
      const chatRes = await db.execute(sql`
        WITH chat_users AS (
          SELECT user_id, COUNT(*)::int AS chats
          FROM activity_events
          WHERE event_type IN ('notebook_chat', 'notebook_source_added')
            AND created_at >= ${sinceIso}
          GROUP BY user_id
          HAVING COUNT(*) >= 5
        )
        SELECT COUNT(*)::int AS total
        FROM chat_users cu
        WHERE NOT EXISTS (
          SELECT 1 FROM simulado_results sr
          WHERE ${hasSimulados} AND sr.user_id = cu.user_id AND sr.created_at >= ${sinceIso}
        )
        AND NOT EXISTS (
          SELECT 1 FROM flashcard_sessions fs
          WHERE ${hasFlashcards} AND fs.user_id = cu.user_id AND fs.completed_at >= ${sinceIso}
        )
      `);
      chatHeavyNoPracticeCount = Number((chatRes.rows[0] as { total?: number })?.total ?? 0);
      chatHeavyNoPracticeSample = await sampleUserIds(sql`
        WITH chat_users AS (
          SELECT user_id, COUNT(*)::int AS chats
          FROM activity_events
          WHERE event_type IN ('notebook_chat', 'notebook_source_added')
            AND created_at >= ${sinceIso}
          GROUP BY user_id
          HAVING COUNT(*) >= 5
        )
        SELECT cu.user_id
        FROM chat_users cu
        WHERE NOT EXISTS (
          SELECT 1 FROM simulado_results sr
          WHERE ${hasSimulados} AND sr.user_id = cu.user_id AND sr.created_at >= ${sinceIso}
        )
        AND NOT EXISTS (
          SELECT 1 FROM flashcard_sessions fs
          WHERE ${hasFlashcards} AND fs.user_id = cu.user_id AND fs.completed_at >= ${sinceIso}
        )
        ORDER BY cu.chats DESC
        LIMIT 8
      `);
    } catch {
      chatHeavyNoPracticeCount = 0;
      chatHeavyNoPracticeSample = [];
    }
  } else if (hasTiagaoSessions) {
    try {
      const chatRes = await db.execute(sql`
        SELECT COUNT(DISTINCT ts.user_id)::int AS total
        FROM tiagao_sessions ts
        WHERE ts.started_at >= ${sinceIso}
          AND COALESCE(ts.questions_asked, 0) >= 5
      `);
      chatHeavyNoPracticeCount = Number((chatRes.rows[0] as { total?: number })?.total ?? 0);
      chatHeavyNoPracticeSample = await sampleUserIds(sql`
        SELECT DISTINCT ts.user_id
        FROM tiagao_sessions ts
        WHERE ts.started_at >= ${sinceIso}
          AND COALESCE(ts.questions_asked, 0) >= 5
        LIMIT 8
      `);
    } catch {
      chatHeavyNoPracticeCount = 0;
      chatHeavyNoPracticeSample = [];
    }
  }

  let noNextMissionCount = 0;
  let noNextMissionSample: string[] = [];
  if (hasStudySchedules || hasStudyPlans) {
    try {
      const noMissionRes = await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM users u
        WHERE u.stripe_subscription_status IN ('active', 'trialing')
          AND NOT EXISTS (
            SELECT 1 FROM study_schedules ss
            WHERE ${hasStudySchedules} AND ss.user_id = u.id AND COALESCE(ss.is_active, true) = true
          )
          AND NOT EXISTS (
            SELECT 1 FROM study_plans sp
            WHERE ${hasStudyPlans} AND sp.user_id = u.id AND sp.created_at >= NOW() - INTERVAL '30 days'
          )
      `);
      noNextMissionCount = Number((noMissionRes.rows[0] as { total?: number })?.total ?? 0);
      noNextMissionSample = await sampleUserIds(sql`
        SELECT u.id
        FROM users u
        WHERE u.stripe_subscription_status IN ('active', 'trialing')
          AND NOT EXISTS (
            SELECT 1 FROM study_schedules ss
            WHERE ${hasStudySchedules} AND ss.user_id = u.id AND COALESCE(ss.is_active, true) = true
          )
          AND NOT EXISTS (
            SELECT 1 FROM study_plans sp
            WHERE ${hasStudyPlans} AND sp.user_id = u.id AND sp.created_at >= NOW() - INTERVAL '30 days'
          )
        ORDER BY u.created_at ASC
        LIMIT 8
      `);
    } catch {
      noNextMissionCount = 0;
      noNextMissionSample = [];
    }
  }

  const studentSuccessSignals = [
    buildSignal({
      id: "stuck_student",
      label: "Aluno travado sem dias de estudo recentes",
      status: assinantesSemEstudo > 0 ? "risk" : "ok",
      observed: `${assinantesSemEstudo} assinante(s) active/trialing sem user_activity nos ultimos ${dias}d.`,
      count: assinantesSemEstudo,
      sampleUserIds: stuckSample,
      action: "Abrir plano de reengajamento com meta curta: 1 missao guiada, 1 pratica e retorno medido em 7 dias.",
      metric: "Percentual da amostra com novo user_activity em ate 7 dias.",
      evidence: ["users.stripe_subscription_status", "user_activity.created_at"],
      confidence: assinantesSemEstudo > 0 ? "alta" : "media",
    }),
    buildSignal({
      id: "no_study_days",
      label: "Aluno sem nenhum dia de estudo registrado",
      status: usuariosSemAtividadeNunca > 0 ? "risk" : "ok",
      observed: `${usuariosSemAtividadeNunca} usuario(s) nunca registraram user_activity.`,
      count: usuariosSemAtividadeNunca,
      sampleUserIds: amostraAssinantesEmRisco,
      action: "Revisar onboarding e criar primeira missao orientada para sair do estado vazio.",
      metric: "Usuarios novos com primeiro user_activity criado apos onboarding.",
      evidence: ["users", "user_activity"],
      confidence: usuariosSemAtividadeNunca > 0 ? "alta" : "media",
    }),
    buildSignal({
      id: "repeated_errors",
      label: "Erros repetidos em simulados",
      status: hasSimulados ? (repeatedErrorsCount > 0 ? "risk" : "ok") : "missing_signal",
      observed: hasSimulados
        ? `${repeatedErrorsCount} aluno(s) com 2+ simulados recentes, media <60% e 3+ erros acumulados.`
        : "Tabela simulado_results indisponivel para medir erros repetidos.",
      count: repeatedErrorsCount,
      sampleUserIds: repeatedErrorsSample,
      action: "Priorizar revisao no Caderno de Erros e treino curto da habilidade/materia fraca.",
      metric: "Revisoes concluidas no Caderno e melhora de acuracia no proximo simulado.",
      evidence: ["simulado_results.score", "simulado_results.total", "simulado_results.created_at"],
      confidence: hasSimulados ? "alta" : "baixa",
    }),
    buildSignal({
      id: "abandoned_simulado",
      label: "Simulado iniciado e nao concluido",
      status: hasActivityEvents ? (abandonedSimuladoCount > 0 ? "risk" : "ok") : "missing_signal",
      observed: hasActivityEvents
        ? `${abandonedSimuladoCount} aluno(s) com simulado_started sem simulado_completed posterior no periodo.`
        : "Tabela activity_events indisponivel para medir abandono de simulado.",
      count: abandonedSimuladoCount,
      sampleUserIds: abandonedSimuladoSample,
      action: "Criar retomada de simulado com checkpoint curto e opcao de continuar pelo Caderno/Simulado.",
      metric: "Taxa de simulado_started que vira simulado_completed no periodo seguinte.",
      evidence: ["activity_events.simulado_started", "activity_events.simulado_completed"],
      confidence: hasActivityEvents ? "media" : "baixa",
    }),
    buildSignal({
      id: "chat_heavy_no_practice",
      label: "Muito chat e pouca pratica",
      status:
        hasActivityEvents || hasTiagaoSessions
          ? chatHeavyNoPracticeCount > 0
            ? "risk"
            : "ok"
          : "missing_signal",
      observed:
        hasActivityEvents || hasTiagaoSessions
          ? `${chatHeavyNoPracticeCount} aluno(s) com uso intenso de chat/fonte e sem pratica recente observada.`
          : "Sem activity_events/tiagao_sessions para medir chat sem pratica.",
      count: chatHeavyNoPracticeCount,
      sampleUserIds: chatHeavyNoPracticeSample,
      action: "Converter a proxima resposta do Tiagao em pratica: quiz curto, flashcard ou simulado guiado.",
      metric: "Conversao de notebook_chat/tiagao_session para quiz, flashcard ou simulado em 7 dias.",
      evidence: ["activity_events.notebook_chat", "tiagao_sessions", "simulado_results", "flashcard_sessions"],
      confidence: hasActivityEvents || hasTiagaoSessions ? "media" : "baixa",
    }),
    buildSignal({
      id: "no_next_mission",
      label: "Sem proxima missao estruturada",
      status:
        hasStudySchedules || hasStudyPlans
          ? noNextMissionCount > 0
            ? "risk"
            : "ok"
          : "missing_signal",
      observed:
        hasStudySchedules || hasStudyPlans
          ? `${noNextMissionCount} assinante(s) sem study_schedule ativo e sem study_plan recente.`
          : "Sem study_schedules/study_plans para medir proxima missao.",
      count: noNextMissionCount,
      sampleUserIds: noNextMissionSample,
      action: "Gerar ou recuperar uma next-best-action com objetivo, tempo, CTA e criterio de sucesso.",
      metric: "Assinantes com missao ativa/recente e clique na proxima acao.",
      evidence: ["study_schedules.is_active", "study_plans.created_at"],
      confidence: hasStudySchedules || hasStudyPlans ? "media" : "baixa",
    }),
  ];

  return {
    scannedAt: new Date().toISOString(),
    periodoDias: dias,
    totalUsuarios,
    assinantesAtivos,
    assinantesSemEstudo,
    usuariosSemAtividadeNunca,
    inativosPorFaixa,
    amostraAssinantesEmRisco,
    studentSuccessSignals,
    studentSuccessRecommendations: recommendationsFromSignals(studentSuccessSignals),
  };
}
