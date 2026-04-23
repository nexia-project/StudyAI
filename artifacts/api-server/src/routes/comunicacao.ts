/**
 * /api/comunicacao — Orquestrador de Comunicação StudyAI 3.0
 * Envia emails via Resend e simula WhatsApp/Push
 */
import { Router, type IRouter } from "express";
import { Resend } from "resend";

const router: IRouter = Router();

const resend = new Resend(process.env.RESEND_API_KEY);

const TEMPLATES: Record<string, {
  assunto: (vars: Record<string, string>) => string;
  html: (vars: Record<string, string>) => string;
}> = {
  motivacional: {
    assunto: (v) => `${v.nome || "Ei"}, seu streak está em risco! 🔥`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center">
          <p style="font-size:48px;margin:0">🎯</p>
          <h1 style="color:white;font-size:22px;margin:12px 0 4px">Ei ${v.nome || "estudante"}!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px">Seu streak está em risco</p>
        </div>
        <div style="padding:32px">
          <p style="color:#334155;font-size:16px;line-height:1.6">
            Você tem revisões pendentes que estão esperando por você.<br>
            Só <strong>15-20 minutos</strong> de estudo hoje mantêm sua sequência!
          </p>
          <a href="https://study.ia.br/app" style="display:inline-block;margin-top:20px;background:#6366f1;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none">
            Continuar estudando →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            O Tiagão está online e pronto para te ajudar 🤖<br>
            <a href="https://study.ia.br/privacidade" style="color:#94a3b8">Cancelar notificações</a>
          </p>
        </div>
      </div>`,
  },
  informativo: {
    assunto: (v) => `Seu resultado chegou, ${v.nome || ""}! 📊`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">
          <p style="font-size:48px;margin:0">📊</p>
          <h1 style="color:white;font-size:22px;margin:12px 0 4px">Resultado do Simulado</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px">${v.nome || "Estudante"}</p>
        </div>
        <div style="padding:32px">
          <p style="color:#334155;font-size:16px;line-height:1.6">
            Seu simulado foi corrigido! Acesse o dashboard para ver a análise completa do seu desempenho por matéria.
          </p>
          <a href="https://study.ia.br/dashboard" style="display:inline-block;margin-top:20px;background:#0ea5e9;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none">
            Ver resultado completo →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            Study.IA — <a href="https://study.ia.br/privacidade" style="color:#94a3b8">Cancelar notificações</a>
          </p>
        </div>
      </div>`,
  },
  urgente: {
    assunto: (v) => `🚨 ENEM em ${v.dias || "poucos"} dias — Plano de revisão pronto!`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#ef4444,#f97316);padding:32px;text-align:center">
          <p style="font-size:48px;margin:0">🚨</p>
          <h1 style="color:white;font-size:22px;margin:12px 0 4px">ENEM está chegando!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:18px;font-weight:bold">${v.dias || "X"} dias restantes</p>
        </div>
        <div style="padding:32px">
          <p style="color:#334155;font-size:16px;line-height:1.6">
            <strong>${v.nome || "Estudante"}</strong>, o Tiagão criou um plano de revisão express personalizado para você. 
            Foque nos seus pontos fracos e maximize sua nota!
          </p>
          <a href="https://study.ia.br/app" style="display:inline-block;margin-top:20px;background:#ef4444;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none">
            Ver plano de revisão urgente →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            Study.IA — <a href="https://study.ia.br/privacidade" style="color:#94a3b8">Cancelar notificações</a>
          </p>
        </div>
      </div>`,
  },
  celebratorio: {
    assunto: (v) => `🏆 INCRÍVEL ${v.nome || ""}! ${v.streak || "X"} dias de sequência!`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#10b981,#059669);padding:32px;text-align:center">
          <p style="font-size:48px;margin:0">🏆</p>
          <h1 style="color:white;font-size:22px;margin:12px 0 4px">Conquista desbloqueada!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:18px;font-weight:bold">${v.streak || "X"} dias consecutivos! 🔥</p>
        </div>
        <div style="padding:32px">
          <p style="color:#334155;font-size:16px;line-height:1.6">
            Parabéns, <strong>${v.nome || "estudante"}</strong>! Você ganhou <strong>${v.xp || "500"} XP</strong> 
            e subiu para o nível <strong>${v.nivel || "Prata"}</strong>. Continue assim!
          </p>
          <a href="https://study.ia.br/ranking" style="display:inline-block;margin-top:20px;background:#10b981;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none">
            Ver sua posição no ranking →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            Study.IA — <a href="https://study.ia.br/privacidade" style="color:#94a3b8">Cancelar notificações</a>
          </p>
        </div>
      </div>`,
  },
  alerta: {
    assunto: (v) => `⚠️ Identificamos dificuldade em ${v.materia || "algumas matérias"}, ${v.nome || ""}`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;text-align:center">
          <p style="font-size:48px;margin:0">⚠️</p>
          <h1 style="color:white;font-size:22px;margin:12px 0 4px">Atenção, ${v.nome || "estudante"}!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px">Identificamos uma área que precisa de reforço</p>
        </div>
        <div style="padding:32px">
          <p style="color:#334155;font-size:16px;line-height:1.6">
            Detectamos queda no desempenho em <strong>${v.materia || "algumas matérias"}</strong>. 
            O Tiagão preparou exercícios específicos para você recuperar o terreno perdido.
          </p>
          <a href="https://study.ia.br/dashboard" style="display:inline-block;margin-top:20px;background:#f59e0b;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none">
            Ver plano de recuperação →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            Study.IA — <a href="https://study.ia.br/privacidade" style="color:#94a3b8">Cancelar notificações</a>
          </p>
        </div>
      </div>`,
  },
};

// POST /api/comunicacao/testar — envia email de teste de um trigger
router.post("/comunicacao/testar", async (req, res) => {
  try {
    const { email, phone, tom = "motivacional", triggerId } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ erro: "Informe email ou phone." });
    }

    const nomeVars: Record<string, string> = {
      nome: "Estudante Teste",
      streak: "12",
      dias: "7",
      materia: "Matemática",
      xp: "500",
      nivel: "Prata",
    };

    const template = TEMPLATES[tom] ?? TEMPLATES["motivacional"];

    if (email) {
      const { data, error } = await resend.emails.send({
        from: "StudyAI <no-reply@study.ia.br>",
        to: [email],
        subject: template.assunto(nomeVars),
        html: template.html(nomeVars),
      });

      if (error) {
        console.error("[comunicacao] Resend error:", error);
        return res.status(500).json({ erro: "Falha no envio de email. " + (error.message ?? "") });
      }

      return res.json({
        ok: true,
        canal: "email",
        destinatario: email,
        triggerId,
        tom,
        emailId: data?.id,
      });
    }

    // WhatsApp é simulado (integração futura com WhatsApp Business API)
    if (phone) {
      console.log(`[comunicacao] [SIMULADO] WhatsApp → ${phone} | Tom: ${tom}`);
      return res.json({
        ok: true,
        canal: "whatsapp",
        destinatario: phone,
        triggerId,
        tom,
        simulado: true,
        mensagem: "WhatsApp Business API — integração em configuração. Mensagem simulada com sucesso.",
      });
    }
  } catch (err: any) {
    console.error("[comunicacao] Erro:", err);
    return res.status(500).json({ erro: "Erro interno ao enviar." });
  }
});

// POST /api/comunicacao/disparar — dispara mensagem real para aluno (uso interno/professor)
router.post("/comunicacao/disparar", async (req, res) => {
  try {
    const { email, nome, tom = "motivacional", vars = {} } = req.body;

    if (!email) return res.status(400).json({ erro: "email obrigatório." });

    const template = TEMPLATES[tom] ?? TEMPLATES["motivacional"];
    const allVars = { nome: nome ?? "Estudante", ...vars };

    const { data, error } = await resend.emails.send({
      from: "StudyAI <no-reply@study.ia.br>",
      to: [email],
      subject: template.assunto(allVars),
      html: template.html(allVars),
    });

    if (error) {
      return res.status(500).json({ erro: "Falha no envio. " + (error.message ?? "") });
    }

    return res.json({ ok: true, emailId: data?.id });
  } catch (err: any) {
    return res.status(500).json({ erro: "Erro interno." });
  }
});

// GET /api/comunicacao/stats — métricas dos triggers (mock)
router.get("/comunicacao/stats", async (_req, res) => {
  return res.json({
    totalDisparos: 9164,
    disparosHoje: 247,
    taxaAbertura: 71,
    taxaClique: 38,
    canais: { whatsapp: 4203, email: 3102, push: 1859 },
    triggers: [
      { id: "t1", disparos: 847,  taxaAbertura: 68 },
      { id: "t2", disparos: 2341, taxaAbertura: 71 },
      { id: "t3", disparos: 156,  taxaAbertura: 89 },
      { id: "t4", disparos: 1205, taxaAbertura: 62 },
      { id: "t5", disparos: 432,  taxaAbertura: 94 },
    ],
  });
});

export default router;
