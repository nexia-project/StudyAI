import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { simuladoResultsTable, flashcardSessionsTable, studyPlansTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Professor Tiagão <tiagao@study.ia.br>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

function buildWeeklyEmailHtml(nome: string, stats: {
  simulados: number;
  flashcards: number;
  xp: number;
  topMateria?: string;
}): string {
  const firstName = nome.split(" ")[0] || nome;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Resumo Semanal — StudyAI</title></head>
<body style="margin:0;padding:0;background:#f8f7ff;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7ff;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(99,102,241,0.12);">
  <tr>
    <td style="background:linear-gradient(135deg,#6366f1,#a855f7);padding:40px 40px 32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:8px;">👨‍🏫</div>
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;">Oi, ${firstName}! 👋</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Aqui está o seu resumo semanal do StudyAI</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 40px;">
      <h2 style="margin:0 0 20px;color:#1e1b4b;font-size:18px;font-weight:700;">📊 Sua semana em números</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="33%" align="center" style="padding:16px;background:#f3f0ff;border-radius:16px;margin:4px;">
            <div style="font-size:32px;font-weight:800;color:#6366f1;">${stats.simulados}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;">Simulados feitos</div>
          </td>
          <td width="4%"></td>
          <td width="33%" align="center" style="padding:16px;background:#f0fdf4;border-radius:16px;">
            <div style="font-size:32px;font-weight:800;color:#22c55e;">${stats.flashcards}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;">Flashcards revisados</div>
          </td>
          <td width="4%"></td>
          <td width="33%" align="center" style="padding:16px;background:#fff7ed;border-radius:16px;">
            <div style="font-size:32px;font-weight:800;color:#f59e0b;">${stats.xp}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;">XP acumulado</div>
          </td>
        </tr>
      </table>
      ${stats.topMateria ? `
      <div style="margin-top:24px;padding:20px;background:#fafafa;border-radius:16px;border-left:4px solid #6366f1;">
        <p style="margin:0;color:#374151;font-size:15px;">🎯 <strong>Matéria em foco esta semana:</strong> ${stats.topMateria}</p>
      </div>` : ""}
      <div style="margin-top:28px;padding:20px;background:linear-gradient(135deg,#ede9fe,#e0f2fe);border-radius:16px;">
        <p style="margin:0;color:#1e1b4b;font-size:15px;font-weight:600;">💬 Tiagão diz:</p>
        <p style="margin:8px 0 0;color:#4b5563;font-size:14px;line-height:1.6;">"${firstName}, tô muito orgulhoso do seu esforço! Continue assim que a aprovação tá chegando. Bora estudar mais essa semana? 🚀"</p>
      </div>
      <div style="margin-top:28px;text-align:center;">
        <a href="https://study.ia.br/app" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;">
          📚 Continuar Estudando
        </a>
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">StudyAI — Seu tutor inteligente para o ENEM 🎓</p>
      <p style="margin:4px 0 0;color:#d1d5db;font-size:11px;">study.ia.br</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// POST /api/notify/weekly — envia email semanal para o usuário logado
router.post("/api/notify/weekly", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user[0] || !user[0].email) {
      res.status(400).json({ erro: "Usuário sem email cadastrado" });
      return;
    }

    const [simResult, flashResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(simuladoResultsTable).where(eq(simuladoResultsTable.userId, userId)),
      db.select({ count: sql<number>`count(*)::int` }).from(flashcardSessionsTable).where(eq(flashcardSessionsTable.userId, userId)),
    ]);

    const topMateriaRow = await db.select({
      materia: simuladoResultsTable.materia,
      count: sql<number>`count(*)::int`,
    }).from(simuladoResultsTable).where(eq(simuladoResultsTable.userId, userId)).groupBy(simuladoResultsTable.materia).orderBy(desc(sql`count(*)`)).limit(1);

    const nome = user[0].studentName || user[0].firstName || user[0].email.split("@")[0];
    const html = buildWeeklyEmailHtml(nome, {
      simulados: simResult[0]?.count ?? 0,
      flashcards: flashResult[0]?.count ?? 0,
      xp: user[0].xp ?? 0,
      topMateria: topMateriaRow[0]?.materia,
    });

    await sendEmail(user[0].email, `📊 Seu resumo semanal no StudyAI, ${nome}!`, html);
    res.json({ sucesso: true });
  } catch (err: any) {
    console.error("notify/weekly:", err);
    res.status(500).json({ erro: err.message || "Erro ao enviar email" });
  }
});

// POST /api/notify/test-email — testa envio (admin only)
router.post("/api/notify/test-email", requireAuth, async (req, res) => {
  try {
    const { email, nome = "Estudante" } = req.body as { email: string; nome?: string };
    if (!email) { res.status(400).json({ erro: "email obrigatório" }); return; }
    const html = buildWeeklyEmailHtml(nome, { simulados: 12, flashcards: 87, xp: 1450, topMateria: "Matemática" });
    await sendEmail(email, `📊 Seu resumo semanal no StudyAI!`, html);
    res.json({ sucesso: true });
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

export default router;
