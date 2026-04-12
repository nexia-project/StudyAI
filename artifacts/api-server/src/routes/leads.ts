import { Router } from "express";
import { db } from "@workspace/db";
import { corporateLeadsTable } from "@workspace/db/schema";
import { rateLimit } from "express-rate-limit";

const router = Router();

const leadsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "muitas_tentativas" },
});

router.post("/api/leads", leadsLimiter, async (req, res) => {
  const { name, email, institution, type, students, message } = req.body ?? {};

  if (!name || !email || !institution || !type) {
    return res.status(400).json({ erro: "campos_obrigatorios" });
  }

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(email)) {
    return res.status(400).json({ erro: "email_invalido" });
  }

  await db.insert(corporateLeadsTable).values({
    name: String(name).slice(0, 255),
    email: String(email).slice(0, 255).toLowerCase(),
    institution: String(institution).slice(0, 255),
    type: String(type).slice(0, 100),
    students: students ? String(students).slice(0, 50) : null,
    message: message ? String(message).slice(0, 1000) : null,
  });

  return res.json({ ok: true });
});

export default router;
