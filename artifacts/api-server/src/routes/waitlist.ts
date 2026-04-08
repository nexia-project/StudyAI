import { Router } from "express";
import { db, waitlistTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import nodemailer from "nodemailer";

const router = Router();

const NOTIFICATION_EMAIL = "nexusatacado@gmail.com";

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

async function sendNotification(name: string | null, email: string) {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn("[waitlist] GMAIL_USER or GMAIL_APP_PASSWORD not set — email notification skipped");
      return;
    }
    await transporter.sendMail({
      from: `StudyAI <${process.env.GMAIL_USER}>`,
      to: NOTIFICATION_EMAIL,
      subject: `🎓 Novo inscrito na waitlist: ${email}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
          <h2 style="color: #059669; margin: 0 0 16px;">Novo inscrito na Waitlist!</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Nome:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 600;">${name || "(não informado)"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 600;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Data:</td>
              <td style="padding: 8px 0; color: #111827;">${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
            </tr>
          </table>
          <p style="margin: 16px 0 0; font-size: 13px; color: #9ca3af;">Enviado automaticamente pelo StudyAI</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[waitlist] Failed to send email notification:", err);
  }
}

function isDuplicateKeyError(err: any): boolean {
  if (!err) return false;
  if (err.code === "23505") return true;
  if (err.cause?.code === "23505") return true;
  if (typeof err.message === "string" && err.message.includes("duplicate key")) return true;
  return false;
}

// POST /api/waitlist — subscribe
router.post("/waitlist", async (req, res) => {
  const { email, name, source } = req.body as { email?: string; name?: string; source?: string };

  if (!email || !email.includes("@")) {
    res.status(400).json({ erro: "Email inválido." });
    return;
  }

  try {
    await db.insert(waitlistTable).values({
      email: email.trim().toLowerCase(),
      name: name?.trim() || null,
      source: source || "landing",
    });

    req.log.info({ email }, "Waitlist subscription");
    sendNotification(name || null, email.trim().toLowerCase()).catch(() => {});
    res.json({ ok: true, mensagem: "Email cadastrado com sucesso!" });
  } catch (err: any) {
    if (isDuplicateKeyError(err)) {
      res.json({ ok: true, mensagem: "Você já está na lista! Avisaremos em breve." });
    } else {
      req.log.error({ err }, "Waitlist error");
      res.status(500).json({ erro: "Erro ao cadastrar email." });
    }
  }
});

// GET /api/waitlist/count — total subscribers (public)
router.get("/waitlist/count", async (_req, res) => {
  try {
    const result = await db.execute(sql`SELECT COUNT(*) as total FROM waitlist`);
    const total = Number((result.rows[0] as any)?.total ?? 0);
    res.json({ total });
  } catch {
    res.json({ total: 0 });
  }
});

// GET /api/waitlist — admin list (only admin users can access)
router.get("/waitlist", async (req, res) => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ erro: "Não autorizado." });
    return;
  }
  try {
    const rows = await db.select().from(waitlistTable).orderBy(waitlistTable.createdAt);
    res.json({ waitlist: rows, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "Waitlist list error");
    res.status(500).json({ erro: "Erro ao buscar lista." });
  }
});

export default router;
