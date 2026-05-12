import { Router, type IRouter, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { pickDesafio, findById, type FazedorCategoria, type FazedorNivel } from "../lib/fazedores-bank";

const router: IRouter = Router();

let tableEnsured = false;

async function ensureFazedoresTable(): Promise<boolean> {
  if (tableEnsured) return true;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS fazedores_completions (
        id bigserial PRIMARY KEY,
        user_id text NOT NULL,
        desafio_id text NOT NULL,
        categoria text NOT NULL,
        titulo text,
        completed_at timestamptz DEFAULT now(),
        duration_sec integer,
        extra_done boolean DEFAULT false
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS fazedores_completions_user_idx
      ON fazedores_completions (user_id)
    `);
    tableEnsured = true;
    return true;
  } catch (err) {
    console.warn("[fazedores] ensure table failed (non-fatal):", err);
    return false;
  }
}

function parseCategoria(x: unknown): FazedorCategoria | undefined {
  if (x === "consertar" || x === "organizar" || x === "criar" || x === "estudar") return x;
  return undefined;
}

function parseNivel(x: unknown): FazedorNivel | undefined {
  if (x === "facil" || x === "medio" || x === "dificil") return x;
  return undefined;
}

/** POST /api/fazedores/desafio */
router.post("/fazedores/desafio", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      categoria?: string;
      nivel?: string;
      contexto?: string;
      desafioId?: string;
    };
    const categoria = parseCategoria(body.categoria);
    const nivel = parseNivel(body.nivel);
    const seed =
      typeof body.contexto === "string" && body.contexto.trim()
        ? `${req.userId ?? "anon"}:${body.contexto.trim()}`
        : req.userId ?? undefined;
    const desafio = pickDesafio({
      categoria,
      nivel,
      desafioId: typeof body.desafioId === "string" ? body.desafioId : undefined,
      seed,
    });
    res.json(desafio);
  } catch (err) {
    req.log?.error?.({ err }, "fazedores desafio");
    res.status(500).json({ erro: "Não foi possível gerar o desafio agora." });
  }
});

function feedbackAposPerguntas(desafioId: string, respostas: string[]): { feedback: string; proximoPasso: string } {
  const filled = respostas.filter((r) => typeof r === "string" && r.trim().length > 0).length;
  const base =
    filled >= 2
      ? "Boa: você parou para observar e colocou ideias suas no papel. Isso é exatamente o espírito Fazedores — pensar antes de agir."
      : "Legal começar. Tente completar pelo menos duas respostas com detalhe (mesmo que não tenha certeza): a ideia é exercitar o olhar de diagnóstico.";
  const d = findById(desafioId);
  const extra = d
    ? ` Agora você pode abrir o plano de ação do desafio "${d.titulo}" com calma — um passo de cada vez.`
    : " Agora abra o plano de ação e siga um passo de cada vez.";
  return {
    feedback: `${base}${extra}`,
    proximoPasso: "passos",
  };
}

/** POST /api/fazedores/responder */
router.post("/fazedores/responder", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      desafioId?: string;
      respostas?: unknown;
      etapa?: string;
      marcarCompleto?: boolean;
      fezExtra?: boolean;
      duracaoSeg?: number;
    };
    const desafioId = typeof body.desafioId === "string" ? body.desafioId : "";
    if (!desafioId) {
      res.status(400).json({ erro: "desafioId é obrigatório." });
      return;
    }
    const respostas = Array.isArray(body.respostas)
      ? body.respostas.map((r) => (typeof r === "string" ? r : ""))
      : [];

    if (body.marcarCompleto) {
      const d = findById(desafioId);
      if (req.userId && d) {
        const ok = await ensureFazedoresTable();
        if (ok) {
          try {
            await db.execute(sql`
              INSERT INTO fazedores_completions (user_id, desafio_id, categoria, titulo, duration_sec, extra_done)
              VALUES (
                ${req.userId},
                ${desafioId},
                ${d.categoria},
                ${d.titulo},
                ${typeof body.duracaoSeg === "number" ? Math.max(0, Math.floor(body.duracaoSeg)) : null},
                ${!!body.fezExtra}
              )
            `);
          } catch (err) {
            req.log?.warn?.({ err }, "fazedores insert completion");
          }
        }
      }
      res.json({
        feedback:
          "Desafio registrado! Guarde orgulho dessa vitória — completar no mundo real conta tanto quanto brilhar na prova.",
        proximoPasso: "conclusao",
      });
      return;
    }

    const out =
      body.etapa === "completar"
        ? {
            feedback:
              "Fechou com chave de ouro. Se quiser, volte ao Tutor e peça ajuda para transformar isso em resumo ou mapa mental.",
            proximoPasso: "conclusao",
          }
        : feedbackAposPerguntas(desafioId, respostas);
    res.json(out);
  } catch (err) {
    req.log?.error?.({ err }, "fazedores responder");
    res.status(500).json({ erro: "Erro ao processar respostas." });
  }
});

/** GET /api/fazedores/historico */
router.get("/fazedores/historico", async (req: Request, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado", desafiosCompletados: [] });
    return;
  }
  const ok = await ensureFazedoresTable();
  if (!ok) {
    res.json({ desafiosCompletados: [], persistencia: "indisponivel" });
    return;
  }
  try {
    const rows = await db.execute(sql`
      SELECT desafio_id, categoria, titulo, completed_at, duration_sec, extra_done
      FROM fazedores_completions
      WHERE user_id = ${req.userId}
      ORDER BY completed_at DESC
      LIMIT 200
    `);
    const desafiosCompletados = (rows.rows as any[]).map((r) => ({
      desafioId: r.desafio_id as string,
      categoria: r.categoria as string,
      titulo: r.titulo as string,
      completedAt: r.completed_at,
      durationSec: r.duration_sec,
      extraDone: r.extra_done,
    }));
    res.json({ desafiosCompletados });
  } catch (err) {
    req.log?.warn?.({ err }, "fazedores historico");
    res.json({ desafiosCompletados: [], persistencia: "erro_leitura" });
  }
});

/** GET /api/fazedores/estatisticas */
router.get("/fazedores/estatisticas", async (req: Request, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }
  const totals: Record<FazedorCategoria, number> = {
    consertar: 0,
    organizar: 0,
    criar: 0,
    estudar: 0,
  };
  const ok = await ensureFazedoresTable();
  if (!ok) {
    res.json({
      porCategoria: totals,
      tempoMedioSeg: null,
      taxaConclusao: null,
      taxaExtra: null,
      persistencia: "indisponivel",
    });
    return;
  }
  try {
    const rows = await db.execute(sql`
      SELECT categoria,
             COUNT(*)::int AS n,
             AVG(duration_sec)::float AS avg_dur,
             SUM(CASE WHEN extra_done THEN 1 ELSE 0 END)::int AS extras
      FROM fazedores_completions
      WHERE user_id = ${req.userId}
      GROUP BY categoria
    `);
    let total = 0;
    let extras = 0;
    let durSum = 0;
    let durN = 0;
    for (const r of rows.rows as any[]) {
      const cat = r.categoria as FazedorCategoria;
      const n = Number(r.n) || 0;
      if (cat in totals) totals[cat] = n;
      total += n;
      extras += Number(r.extras) || 0;
      if (r.avg_dur != null && !Number.isNaN(Number(r.avg_dur))) {
        durSum += Number(r.avg_dur) * n;
        durN += n;
      }
    }
    const tempoMedioSeg = durN > 0 ? Math.round(durSum / durN) : null;
    const taxaExtra = total > 0 ? Math.round((extras / total) * 1000) / 10 : null;
    res.json({
      porCategoria: totals,
      tempoMedioSeg,
      taxaConclusao: total > 0 ? 100 : null,
      taxaExtra,
      totalCompletos: total,
    });
  } catch (err) {
    req.log?.warn?.({ err }, "fazedores estatisticas");
    res.json({
      porCategoria: totals,
      tempoMedioSeg: null,
      taxaConclusao: null,
      taxaExtra: null,
      persistencia: "erro_leitura",
    });
  }
});

export default router;
