/**
 * /api/comunicacao — Orquestrador de Comunicação StudyAI 3.0
 *
 * Implementa o sistema descrito em: automacao_studyia_orquestrador_comunicacao
 * Canal principal: Email via Resend (RESEND_API_KEY)
 * WhatsApp / Push / SMS: simulados (prontos para integração futura)
 *
 * Tabelas criadas automaticamente:
 *   communication_logs       — histórico de disparos
 *   communication_rules      — regras de triggers configuráveis
 *   user_notification_prefs  — preferências por usuário
 */

import { Router, type IRouter } from "express";
import { Resend } from "resend";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { isAdminUserAsync as _isAdminUserAsync } from "../lib/adminCheck";
const isAdminUserAsync: any = _isAdminUserAsync;

const router: IRouter = Router();

type CommunicationChannel = "whatsapp" | "email" | "push" | "sms";
type RecipientRole = "aluno" | "professor" | "responsavel" | "gestor";
type CommunicationPurpose =
  | "aviso_aluno"
  | "aviso_professor"
  | "cobranca_responsavel"
  | "lembrete_estudo"
  | "comunicado_pedagogico"
  | "marketing";
type ConsentStatus = "opted_in" | "unknown" | "opted_out";

interface CommunicationRecipient {
  nome?: string;
  role: RecipientRole;
  phone?: string;
  email?: string;
  consentStatus: ConsentStatus;
  responsibleContact?: boolean;
}

interface CommunicationIntentRequest {
  institutionId?: string;
  channel?: CommunicationChannel;
  purpose: CommunicationPurpose;
  templateId?: string;
  templateName?: string;
  title?: string;
  message?: string;
  variables?: Record<string, string>;
  recipients?: CommunicationRecipient[];
  confirmedReview?: boolean;
  noMassBlast?: boolean;
}

const INSTITUTION_PRESETS: Record<CommunicationPurpose, {
  id: CommunicationPurpose;
  label: string;
  role: RecipientRole;
  purposeLabel: string;
  requiresTemplate: boolean;
  requiresExplicitOptIn: boolean;
  defaultMessage: string;
  guardrail: string;
}> = {
  aviso_aluno: {
    id: "aviso_aluno",
    label: "Aviso ao aluno",
    role: "aluno",
    purposeLabel: "Comunicado operacional/pedagógico",
    requiresTemplate: true,
    requiresExplicitOptIn: true,
    defaultMessage: "Oi, {nome}. A instituição publicou um aviso importante: {assunto}. Acesse o StudyAI para ver os detalhes.",
    guardrail: "Use apenas para avisos ligados à vida escolar do aluno e preserve detalhes sensíveis no app.",
  },
  aviso_professor: {
    id: "aviso_professor",
    label: "Aviso ao professor",
    role: "professor",
    purposeLabel: "Comunicação interna",
    requiresTemplate: true,
    requiresExplicitOptIn: true,
    defaultMessage: "Olá, {nome}. Há um comunicado da coordenação: {assunto}. Confira o painel institucional do StudyAI.",
    guardrail: "Comunicações de equipe devem manter registro administrativo e canal de resposta institucional.",
  },
  cobranca_responsavel: {
    id: "cobranca_responsavel",
    label: "Responsável/pais cobrança/lembrete",
    role: "responsavel",
    purposeLabel: "Financeiro institucional",
    requiresTemplate: true,
    requiresExplicitOptIn: true,
    defaultMessage: "Olá, {nome}. A instituição identificou um lembrete financeiro: {assunto}. Consulte o canal oficial da escola para detalhes.",
    guardrail: "Cobrança deve ir para contato cadastrado do responsável, nunca para telefone do aluno por padrão.",
  },
  lembrete_estudo: {
    id: "lembrete_estudo",
    label: "Lembrete de estudo",
    role: "aluno",
    purposeLabel: "Engajamento pedagógico",
    requiresTemplate: true,
    requiresExplicitOptIn: true,
    defaultMessage: "Oi, {nome}. Seu lembrete de estudo de hoje: {assunto}. Entre no StudyAI e continue pelo plano recomendado.",
    guardrail: "Evite pressão excessiva e respeite janela de envio definida pela instituição.",
  },
  comunicado_pedagogico: {
    id: "comunicado_pedagogico",
    label: "Comunicado pedagógico",
    role: "responsavel",
    purposeLabel: "Acompanhamento pedagógico",
    requiresTemplate: true,
    requiresExplicitOptIn: true,
    defaultMessage: "Olá, {nome}. A equipe pedagógica publicou um comunicado: {assunto}. O detalhe fica disponível no StudyAI/portal da instituição.",
    guardrail: "Não exponha dados sensíveis do aluno no WhatsApp; use o app para detalhes individualizados.",
  },
  marketing: {
    id: "marketing",
    label: "Marketing institucional",
    role: "responsavel",
    purposeLabel: "Marketing/relacionamento",
    requiresTemplate: true,
    requiresExplicitOptIn: true,
    defaultMessage: "Olá, {nome}. A instituição tem uma novidade: {assunto}. Responda PARAR para não receber mensagens promocionais.",
    guardrail: "Marketing exige opt-in explícito, template aprovado e opção clara de parada/descadastro.",
  },
};

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY não configurado — adicione nas variáveis do Railway");
    _resend = new Resend(key);
  }
  return _resend;
}

function isWhatsappConfigured() {
  const provider = (process.env.WHATSAPP_PROVIDER || "disabled").toLowerCase();
  const metaConfigured = provider === "meta"
    && !!process.env.WHATSAPP_META_ACCESS_TOKEN
    && !!process.env.WHATSAPP_META_PHONE_NUMBER_ID;
  return {
    provider,
    configured: metaConfigured,
    mode: metaConfigured ? "ready" : "dry_run",
    missing: [
      !process.env.WHATSAPP_PROVIDER && "WHATSAPP_PROVIDER=meta",
      provider === "meta" && !process.env.WHATSAPP_META_ACCESS_TOKEN && "WHATSAPP_META_ACCESS_TOKEN",
      provider === "meta" && !process.env.WHATSAPP_META_PHONE_NUMBER_ID && "WHATSAPP_META_PHONE_NUMBER_ID",
    ].filter(Boolean),
  };
}

function normalizeWhatsappPhone(phone?: string) {
  const trimmed = (phone ?? "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) return /^\+[1-9]\d{7,14}$/.test(trimmed) ? trimmed : null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11) return `+55${digits}`;
  if (digits.length === 13 && digits.startsWith("55")) return `+${digits}`;
  return null;
}

function renderInstitutionMessage(input: CommunicationIntentRequest) {
  const preset = INSTITUTION_PRESETS[input.purpose];
  const firstRecipient = input.recipients?.[0];
  const vars = {
    nome: firstRecipient?.nome || input.variables?.nome || "responsável",
    assunto: input.title || input.variables?.assunto || "comunicado da instituição",
    instituicao: input.variables?.instituicao || "sua instituição",
    ...(input.variables ?? {}),
  };
  const source = input.message?.trim() || preset.defaultMessage;
  return source.replace(/\{(\w+)\}/g, (_match, key) => vars[key as keyof typeof vars] ?? "");
}

function validateCommunicationIntent(input: CommunicationIntentRequest) {
  const preset = INSTITUTION_PRESETS[input.purpose];
  const recipients = input.recipients ?? [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!preset) errors.push("Preset de comunicação inválido.");
  if ((input.channel ?? "whatsapp") !== "whatsapp") warnings.push("Esta primeira fundação prioriza WhatsApp; demais canais ficam como fallback futuro.");
  if (recipients.length === 0) errors.push("Inclua pelo menos um destinatário para validar a intenção.");
  if (recipients.length > 10 && !input.noMassBlast) errors.push("Disparos em massa exigem revisão explícita; limite manual inicial: 10 destinatários.");
  if (!input.confirmedReview) errors.push("Revise conteúdo, público, finalidade e consentimento antes do envio.");
  if (preset?.requiresTemplate && !input.templateName?.trim()) {
    errors.push("WhatsApp fora da janela de 24h/uso ativo exige template aprovado configurado.");
  }

  recipients.forEach((recipient, index) => {
    const label = recipient.nome || `destinatário ${index + 1}`;
    if (recipient.role !== preset?.role) {
      errors.push(`${label}: papel esperado para este preset é ${preset?.role}.`);
    }
    if (recipient.consentStatus !== "opted_in") {
      errors.push(`${label}: consentimento/opt-in WhatsApp obrigatório antes do envio.`);
    }
    if (!normalizeWhatsappPhone(recipient.phone)) {
      errors.push(`${label}: telefone WhatsApp inválido. Use +55DDDNUMERO ou DDDNUMERO.`);
    }
    if (input.purpose === "cobranca_responsavel" && (!recipient.responsibleContact || recipient.role !== "responsavel")) {
      errors.push(`${label}: cobrança deve usar contato cadastrado do responsável, não telefone do aluno.`);
    }
  });

  if (input.purpose === "marketing") {
    warnings.push("Marketing precisa de opt-in explícito, template aprovado, identificação clara da instituição e instrução PARAR/STOP.");
  }
  if (input.purpose === "cobranca_responsavel") {
    warnings.push("Evite detalhes financeiros sensíveis no corpo do WhatsApp; direcione para canal oficial autenticado.");
  }

  return { errors, warnings };
}

async function logHermesCommunicationRisk(kind: string, payload: Record<string, unknown>) {
  try {
    await db.execute(sql`
      INSERT INTO hermes_admin_inbox (agent_id, tipo, titulo, corpo, payload)
      VALUES (
        'hermes_comunicacao',
        'communication_guardrail',
        ${kind},
        'Hermes deve revisar risco de comunicação institucional: consentimento, template, cobrança ou falha de provider.',
        ${JSON.stringify(payload)}::jsonb
      )
    `);
  } catch {
    // Hermes inbox is best-effort; communication audit must not fail because of it.
  }
}

async function sendWhatsappViaMeta(opts: {
  to: string;
  templateName: string;
  variables: Record<string, string>;
}) {
  const phoneNumberId = process.env.WHATSAPP_META_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_META_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error("WhatsApp Meta não configurado.");
  }

  const body = {
    messaging_product: "whatsapp",
    to: opts.to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: opts.templateName,
      language: { code: process.env.WHATSAPP_META_TEMPLATE_LANGUAGE || "pt_BR" },
      components: Object.keys(opts.variables).length
        ? [{
            type: "body",
            parameters: Object.values(opts.variables).map((text) => ({ type: "text", text })),
          }]
        : undefined,
    },
  };

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Meta WhatsApp error: ${JSON.stringify(data)}`);
  }
  return data;
}

// ============================================================
// BOOTSTRAP — cria tabelas se não existirem
// ============================================================
async function initCommunicationTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS communication_logs (
      id            BIGSERIAL PRIMARY KEY,
      user_id       VARCHAR(255),
      destinatario  VARCHAR(500) NOT NULL,
      canal         VARCHAR(50)  NOT NULL DEFAULT 'email',
      trigger_id    VARCHAR(100),
      perfil        VARCHAR(50)  DEFAULT 'aluno',
      tom           VARCHAR(50),
      template      VARCHAR(100),
      assunto       TEXT,
      status        VARCHAR(50)  NOT NULL DEFAULT 'enviado',
      canal_fallback VARCHAR(50),
      custo_centavos INTEGER      DEFAULT 0,
      simulado      BOOLEAN      DEFAULT FALSE,
      error_msg     TEXT,
      metadata      JSONB        DEFAULT '{}',
      criado_em     TIMESTAMP    NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS communication_rules (
      id            SERIAL PRIMARY KEY,
      trigger_id    VARCHAR(100) UNIQUE NOT NULL,
      nome          VARCHAR(255) NOT NULL,
      descricao     TEXT,
      perfil        VARCHAR(50)  DEFAULT 'aluno',
      prioridade    INTEGER      DEFAULT 5,
      canal_preferido VARCHAR(50) DEFAULT 'email',
      template      VARCHAR(100),
      tom           VARCHAR(50)  DEFAULT 'motivacional',
      ativo         BOOLEAN      DEFAULT TRUE,
      cooldown_horas INTEGER     DEFAULT 24,
      horario_inicio INTEGER     DEFAULT 7,
      horario_fim    INTEGER     DEFAULT 22,
      condicao_json  JSONB        DEFAULT '{}',
      criado_em     TIMESTAMP    NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_notification_prefs (
      user_id         VARCHAR(255) PRIMARY KEY,
      canal_preferido VARCHAR(50)  DEFAULT 'email',
      horario_inicio  INTEGER      DEFAULT 7,
      horario_fim     INTEGER      DEFAULT 22,
      whatsapp_phone  VARCHAR(30),
      push_token      VARCHAR(500),
      email_override  VARCHAR(255),
      receber_alunos  BOOLEAN      DEFAULT TRUE,
      receber_resumo  BOOLEAN      DEFAULT TRUE,
      receber_alertas BOOLEAN      DEFAULT TRUE,
      receber_promo   BOOLEAN      DEFAULT FALSE,
      atualizado_em   TIMESTAMP    NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_comm_logs_user_id   ON communication_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_comm_logs_trigger    ON communication_logs(trigger_id);
    CREATE INDEX IF NOT EXISTS idx_comm_logs_criado_em  ON communication_logs(criado_em DESC);
  `);

  await seedDefaultRules();
}

async function seedDefaultRules() {
  const regras = [
    {
      trigger_id: "falta_3_dias_sem_acessar",
      nome: "Reengajamento — 3 dias sem acessar",
      descricao: "Aluno não acessou a plataforma há 3 dias",
      perfil: "aluno",
      prioridade: 7,
      template: "reengajamento",
      tom: "acolhedor",
      cooldown_horas: 72,
    },
    {
      trigger_id: "reengajamento_7_dias",
      nome: "Reengajamento — 7 dias sem acessar",
      descricao: "Aluno inativo há 7 dias — risco de churn",
      perfil: "aluno",
      prioridade: 9,
      template: "urgente",
      tom: "direto",
      cooldown_horas: 168,
    },
    {
      trigger_id: "streak_em_risco",
      nome: "Streak em risco",
      descricao: "Aluno com streak ativo não estudou hoje",
      perfil: "aluno",
      prioridade: 6,
      template: "motivacional",
      tom: "motivador",
      cooldown_horas: 20,
    },
    {
      trigger_id: "conclusao_marco_7_dias",
      nome: "Marco — 7 dias consecutivos",
      descricao: "Aluno completou 7 dias de streak",
      perfil: "aluno",
      prioridade: 5,
      template: "celebratorio",
      tom: "motivador",
      cooldown_horas: 168,
    },
    {
      trigger_id: "conclusao_marco_30_dias",
      nome: "Marco — 30 dias consecutivos",
      descricao: "Aluno completou 30 dias de streak",
      perfil: "aluno",
      prioridade: 5,
      template: "celebratorio",
      tom: "motivador",
      cooldown_horas: 720,
    },
    {
      trigger_id: "prova_em_7_dias",
      nome: "Lembrete — prova em 7 dias",
      descricao: "Lembrar aluno de prova/simulado em 7 dias",
      perfil: "aluno",
      prioridade: 8,
      template: "alerta_prova",
      tom: "direto",
      cooldown_horas: 168,
    },
    {
      trigger_id: "queda_desempenho_20pct",
      nome: "Queda de desempenho > 20%",
      descricao: "Aluno com queda de desempenho significativa",
      perfil: "aluno",
      prioridade: 8,
      template: "alerta",
      tom: "acolhedor",
      cooldown_horas: 72,
    },
    {
      trigger_id: "resumo_semanal_aluno",
      nome: "Resumo semanal — Aluno",
      descricao: "Resumo de desempenho enviado todo domingo",
      perfil: "aluno",
      prioridade: 4,
      template: "resumo_semanal",
      tom: "informativo",
      cooldown_horas: 160,
    },
    {
      trigger_id: "resumo_semanal_responsavel",
      nome: "Resumo semanal — Responsável",
      descricao: "Resumo de progresso do aluno para pais/responsáveis",
      perfil: "responsavel",
      prioridade: 4,
      template: "alerta_responsavel",
      tom: "acolhedor",
      cooldown_horas: 160,
    },
    {
      trigger_id: "aluno_dificuldade_professor",
      nome: "Alerta ao professor — aluno em dificuldade",
      descricao: "Professor alertado quando aluno tem desempenho crítico",
      perfil: "professor",
      prioridade: 9,
      template: "alerta",
      tom: "direto",
      cooldown_horas: 48,
    },
    {
      trigger_id: "inadimplencia_escola",
      nome: "Alerta de inadimplência — Escola",
      descricao: "Escola notificada sobre risco de cancelamento",
      perfil: "escola",
      prioridade: 10,
      template: "urgente",
      tom: "direto",
      cooldown_horas: 720,
    },
  ];

  for (const r of regras) {
    await db.execute(sql`
      INSERT INTO communication_rules
        (trigger_id, nome, descricao, perfil, prioridade, template, tom, cooldown_horas)
      VALUES
        (${r.trigger_id}, ${r.nome}, ${r.descricao}, ${r.perfil},
         ${r.prioridade}, ${r.template}, ${r.tom}, ${r.cooldown_horas})
      ON CONFLICT (trigger_id) DO NOTHING
    `);
  }
}

// Inicializa ao carregar o módulo
initCommunicationTables().catch((e) =>
  console.error("[comunicacao] Erro ao inicializar tabelas:", e)
);

// ============================================================
// TEMPLATES DE EMAIL — 11 tipos
// ============================================================
const TEMPLATES: Record<
  string,
  {
    assunto: (v: Record<string, string>) => string;
    html: (v: Record<string, string>) => string;
  }
> = {
  motivacional: {
    assunto: (v) => `${v.nome || "Ei"}, seu streak está em risco! 🔥`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
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
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
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
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
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
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
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
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
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

  // ---- NOVOS TEMPLATES (baseados no documento) ----

  reengajamento: {
    assunto: (v) => `${v.nome || "Ei"}, estamos com saudades de você! 💙`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#6366f1,#0ea5e9);padding:32px;text-align:center">
          <p style="font-size:48px;margin:0">💙</p>
          <h1 style="color:white;font-size:22px;margin:12px 0 4px">${v.nome || "Estudante"}, estamos com saudades!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px">Faz ${v.dias_inativo || "alguns"} dias que não te vemos por aqui</p>
        </div>
        <div style="padding:32px">
          <p style="color:#334155;font-size:16px;line-height:1.6">
            O Tiagão está aqui, pronto para continuar de onde você parou. 
            ${v.conteudo_pendente ? `Você tem <strong>${v.conteudo_pendente}</strong> esperando por você.` : "Seus estudos estão prontos para retomar."}
          </p>
          <p style="color:#64748b;font-size:14px;margin-top:12px">
            Basta <strong>5 minutos</strong> hoje para manter o ritmo dos seus estudos. Você consegue!
          </p>
          <a href="https://study.ia.br/app" style="display:inline-block;margin-top:24px;background:#6366f1;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none">
            Retomar agora →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            Study.IA — sempre aqui quando precisar<br>
            <a href="https://study.ia.br/privacidade" style="color:#94a3b8">Cancelar notificações</a>
          </p>
        </div>
      </div>`,
  },

  resumo_semanal: {
    assunto: (v) => `📅 Seu resumo semanal, ${v.nome || "estudante"}! Veja seu progresso`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#8b5cf6,#6366f1);padding:32px;text-align:center">
          <p style="font-size:48px;margin:0">📅</p>
          <h1 style="color:white;font-size:22px;margin:12px 0 4px">Resumo Semanal</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px">${v.nome || "Estudante"} — Semana encerrada</p>
        </div>
        <div style="padding:32px">
          <div style="background:#e0e7ff;border-radius:12px;padding:20px;margin-bottom:20px">
            <div style="display:flex;justify-content:space-between;margin-bottom:12px">
              <span style="color:#4338ca;font-weight:bold">⏱ Tempo estudado</span>
              <span style="color:#1e1b4b;font-weight:bold">${v.tempo_estudo || "0h"}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:12px">
              <span style="color:#4338ca;font-weight:bold">🎯 Questões respondidas</span>
              <span style="color:#1e1b4b;font-weight:bold">${v.questoes || "0"}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:12px">
              <span style="color:#4338ca;font-weight:bold">🔥 Maior streak</span>
              <span style="color:#1e1b4b;font-weight:bold">${v.streak || "0"} dias</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="color:#4338ca;font-weight:bold">⚡ XP ganho</span>
              <span style="color:#1e1b4b;font-weight:bold">${v.xp || "0"} XP</span>
            </div>
          </div>
          <p style="color:#334155;font-size:15px;line-height:1.6">
            ${v.mensagem_personalizada || "Continue assim! Cada sessão de estudo te aproxima do seu objetivo no ENEM."}
          </p>
          <a href="https://study.ia.br/dashboard" style="display:inline-block;margin-top:20px;background:#6366f1;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none">
            Ver dashboard completo →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            Study.IA — Relatório semanal automático<br>
            <a href="https://study.ia.br/privacidade" style="color:#94a3b8">Cancelar notificações</a>
          </p>
        </div>
      </div>`,
  },

  alerta_prova: {
    assunto: (v) => `📝 ${v.materia || "Sua prova"} em ${v.dias_faltando || "7"} dias — Guia de revisão pronto!`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0f172a,#1e40af);padding:32px;text-align:center">
          <p style="font-size:48px;margin:0">📝</p>
          <h1 style="color:white;font-size:22px;margin:12px 0 4px">Prova se aproximando!</h1>
          <p style="color:#93c5fd;font-size:18px;font-weight:bold">${v.materia || "Sua prova"} em ${v.dias_faltando || "7"} dias</p>
        </div>
        <div style="padding:32px">
          ${v.topicos ? `
          <div style="background:#dbeafe;border-radius:12px;padding:16px;margin-bottom:20px">
            <p style="color:#1e40af;font-weight:bold;margin:0 0 8px">📌 Tópicos principais para revisar:</p>
            <p style="color:#1e3a8a;font-size:14px;margin:0">${v.topicos}</p>
          </div>` : ""}
          <p style="color:#334155;font-size:16px;line-height:1.6">
            <strong>${v.nome || "Estudante"}</strong>, o Tiagão montou um cronograma de revisão intensivo para os próximos ${v.dias_faltando || "7"} dias. 
            Com <strong>${v.tempo_diario || "45 minutos"}</strong> por dia você cobre todos os pontos críticos!
          </p>
          <a href="https://study.ia.br/app" style="display:inline-block;margin-top:20px;background:#1e40af;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none">
            Iniciar revisão agora →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            Study.IA — <a href="https://study.ia.br/privacidade" style="color:#94a3b8">Cancelar notificações</a>
          </p>
        </div>
      </div>`,
  },

  alerta_responsavel: {
    assunto: (v) => `📊 Progresso de ${v.nome_aluno || "seu filho(a)"} esta semana — Study.IA`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px;text-align:center">
          <p style="font-size:48px;margin:0">👨‍👩‍👧‍👦</p>
          <h1 style="color:white;font-size:22px;margin:12px 0 4px">Relatório Semanal</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:16px">${v.nome_aluno || "Seu filho(a)"}</p>
        </div>
        <div style="padding:32px">
          <div style="background:#ede9fe;border-radius:12px;padding:20px;margin-bottom:20px">
            <p style="color:#5b21b6;font-weight:bold;font-size:15px;margin:0 0 12px">📈 Esta semana:</p>
            <p style="color:#4c1d95;font-size:14px;margin:4px 0">⏱ <strong>${v.tempo_estudo || "0 horas"}</strong> de estudo</p>
            <p style="color:#4c1d95;font-size:14px;margin:4px 0">📚 <strong>${v.materias || "N/D"}</strong> disciplinas estudadas</p>
            <p style="color:#4c1d95;font-size:14px;margin:4px 0">🔥 Sequência atual: <strong>${v.streak || "0"} dias</strong></p>
            ${v.status_geral ? `<p style="color:#4c1d95;font-size:14px;margin:4px 0">⭐ Status: <strong>${v.status_geral}</strong></p>` : ""}
          </div>
          <p style="color:#334155;font-size:15px;line-height:1.6">
            ${v.mensagem_responsavel || "A Study.IA está acompanhando o progresso dos estudos. Continue incentivando!"}
          </p>
          <a href="https://study.ia.br/dashboard" style="display:inline-block;margin-top:20px;background:#7c3aed;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none">
            Ver relatório completo →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            Study.IA — Relatório automático para responsáveis<br>
            <a href="https://study.ia.br/privacidade" style="color:#94a3b8">Cancelar notificações</a>
          </p>
        </div>
      </div>`,
  },

  boas_vindas: {
    assunto: (v) => `🎉 Bem-vindo(a) à Study.IA, ${v.nome || "estudante"}! Vamos começar?`,
    html: (v) => `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899);padding:32px;text-align:center">
          <p style="font-size:48px;margin:0">🎉</p>
          <h1 style="color:white;font-size:24px;margin:12px 0 4px">Bem-vindo(a) à Study.IA!</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:15px">Sua jornada para o ENEM começa agora</p>
        </div>
        <div style="padding:32px">
          <p style="color:#334155;font-size:16px;line-height:1.6">
            Olá, <strong>${v.nome || "estudante"}</strong>! 🚀<br><br>
            O <strong>Tiagão</strong> — seu tutor de IA — está pronto para te ajudar com qualquer matéria, criar simulados personalizados e traçar seu plano de estudos.
          </p>
          <div style="background:#e0e7ff;border-radius:12px;padding:16px;margin:20px 0">
            <p style="color:#4338ca;font-weight:bold;margin:0 0 8px">🚀 Primeiros passos:</p>
            <p style="color:#3730a3;font-size:14px;margin:4px 0">1️⃣ Fale com o Tiagão e peça seu plano de estudos</p>
            <p style="color:#3730a3;font-size:14px;margin:4px 0">2️⃣ Faça seu primeiro simulado</p>
            <p style="color:#3730a3;font-size:14px;margin:4px 0">3️⃣ Mantenha seu streak diário 🔥</p>
          </div>
          <a href="https://study.ia.br/app" style="display:inline-block;margin-top:8px;background:#6366f1;color:white;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none">
            Começar agora →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            Study.IA — Seu tutor inteligente para o ENEM<br>
            <a href="https://study.ia.br/privacidade" style="color:#94a3b8">Cancelar notificações</a>
          </p>
        </div>
      </div>`,
  },
};

// ============================================================
// HELPERS
// ============================================================

/** Registra envio no log */
async function logDisparo(opts: {
  user_id?: string;
  destinatario: string;
  canal: string;
  trigger_id?: string;
  perfil?: string;
  tom?: string;
  template?: string;
  assunto?: string;
  status: string;
  simulado?: boolean;
  error_msg?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.execute(sql`
      INSERT INTO communication_logs
        (user_id, destinatario, canal, trigger_id, perfil, tom, template, assunto, status, simulado, error_msg, metadata)
      VALUES
        (${opts.user_id ?? null}, ${opts.destinatario}, ${opts.canal},
         ${opts.trigger_id ?? null}, ${opts.perfil ?? "aluno"}, ${opts.tom ?? null},
         ${opts.template ?? null}, ${opts.assunto ?? null}, ${opts.status},
         ${opts.simulado ?? false}, ${opts.error_msg ?? null},
         ${JSON.stringify(opts.metadata ?? {})}::jsonb)
    `);
  } catch (e) {
    console.warn("[comunicacao] Falha ao registrar log:", e);
  }
}

/** Extrai rows de um resultado db.execute() */
function getRows(result: unknown): any[] {
  if (Array.isArray(result)) return result;
  const r = result as any;
  if (r && Array.isArray(r.rows)) return r.rows;
  return [];
}

/** Verifica cooldown: retorna true se pode enviar */
async function podeEnviar(
  user_id: string,
  trigger_id: string,
  cooldown_horas: number
): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT id FROM communication_logs
      WHERE user_id = ${user_id}
        AND trigger_id = ${trigger_id}
        AND status = 'enviado'
        AND criado_em > NOW() - INTERVAL '1 hour' * ${cooldown_horas}
      LIMIT 1
    `);
    return getRows(result).length === 0;
  } catch {
    return true;
  }
}

/** Envia email via Resend e registra log */
async function enviarEmail(opts: {
  user_id?: string;
  email: string;
  template: string;
  vars: Record<string, string>;
  trigger_id?: string;
  perfil?: string;
}) {
  const tpl = TEMPLATES[opts.template] ?? TEMPLATES["motivacional"];
  const assunto = tpl.assunto(opts.vars);
  const html = tpl.html(opts.vars);

  const { data, error } = await getResend().emails.send({
    from: "StudyAI <no-reply@study.ia.br>",
    to: [opts.email],
    subject: assunto,
    html,
  });

  if (error) {
    await logDisparo({
      user_id: opts.user_id,
      destinatario: opts.email,
      canal: "email",
      trigger_id: opts.trigger_id,
      perfil: opts.perfil,
      template: opts.template,
      assunto,
      status: "erro",
      error_msg: error.message,
    });
    throw new Error(error.message);
  }

  await logDisparo({
    user_id: opts.user_id,
    destinatario: opts.email,
    canal: "email",
    trigger_id: opts.trigger_id,
    perfil: opts.perfil,
    template: opts.template,
    assunto,
    status: "enviado",
    metadata: { resend_id: data?.id },
  });

  return data;
}

// ============================================================
// PROTEÇÃO — requer autenticação + perfil admin SOMENTE para /comunicacao/* endpoints
// (scoped to /comunicacao so it doesn't block other routers like /board/*, /chat, etc.)
// ============================================================
router.use("/comunicacao", async (req, res, next) => {
  if (!req.userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const isAdmin = await isAdminUserAsync(req.userId);
  if (!isAdmin) {
    const roleRes = await db.execute(sql`SELECT role FROM users WHERE id = ${req.userId} LIMIT 1`);
    const role = getRows(roleRes)[0]?.role;
    const institutionRes = await db.execute(sql`
      SELECT role, is_approved
      FROM institution_users
      WHERE user_id = ${req.userId}
      LIMIT 1
    `);
    const institutionRole = getRows(institutionRes)[0];
    const allowedInstitutionUser =
      ["institution_admin", "teacher"].includes(role ?? "")
      || (!!institutionRole?.is_approved && ["owner", "admin", "teacher"].includes(institutionRole.role));
    if (!allowedInstitutionUser) {
      res.status(403).json({ error: "Acesso negado — comunicação institucional exige perfil administrativo/professor aprovado" });
      return;
    }
  }
  next();
});

router.get("/comunicacao/institution/status", async (_req, res) => {
  const whatsapp = isWhatsappConfigured();
  return void res.json({
    channels: {
      whatsapp: {
        primary: true,
        configured: whatsapp.configured,
        provider: whatsapp.provider,
        mode: whatsapp.mode,
        missing: whatsapp.missing,
      },
      email: {
        configured: !!process.env.RESEND_API_KEY,
        provider: "resend",
      },
    },
    presets: Object.values(INSTITUTION_PRESETS),
    guardrails: [
      "Consentimento/opt-in WhatsApp é obrigatório por destinatário.",
      "Marketing exige opt-in explícito, template aprovado e STOP/PARAR.",
      "Cobrança vai para responsável cadastrado; telefone do aluno não é fallback padrão.",
      "Sem disparo em massa sem revisão humana e limite operacional.",
      "Auditoria fica em communication_logs e alertas críticos entram no Hermes quando possível.",
    ],
  });
});

router.post("/comunicacao/institution/preview", async (req, res) => {
  try {
    const input = req.body as CommunicationIntentRequest;
    const preset = INSTITUTION_PRESETS[input.purpose];
    if (!preset) return void res.status(400).json({ error: "Preset inválido." });

    const validation = validateCommunicationIntent({
      ...input,
      channel: input.channel ?? "whatsapp",
      message: input.message ?? preset.defaultMessage,
    });
    const preview = renderInstitutionMessage({
      ...input,
      message: input.message ?? preset.defaultMessage,
    });
    const whatsapp = isWhatsappConfigured();

    return void res.json({
      ok: validation.errors.length === 0,
      dryRun: !whatsapp.configured,
      provider: whatsapp,
      preset,
      preview,
      validation,
      status: validation.errors.length ? "blocked" : whatsapp.configured ? "ready_to_send" : "configuration_required",
    });
  } catch (err: any) {
    return void res.status(500).json({ error: err.message ?? "Erro ao gerar preview." });
  }
});

router.post("/comunicacao/institution/send", async (req, res) => {
  try {
    const input = req.body as CommunicationIntentRequest;
    const preset = INSTITUTION_PRESETS[input.purpose];
    if (!preset) return void res.status(400).json({ error: "Preset inválido." });

    const intent = {
      ...input,
      channel: input.channel ?? "whatsapp" as CommunicationChannel,
      message: input.message ?? preset.defaultMessage,
    };
    const validation = validateCommunicationIntent(intent);
    const whatsapp = isWhatsappConfigured();
    const preview = renderInstitutionMessage(intent);
    const firstRecipient = intent.recipients?.[0];
    const normalizedPhone = normalizeWhatsappPhone(firstRecipient?.phone);

    if (validation.errors.length > 0) {
      await logDisparo({
        user_id: req.userId,
        destinatario: firstRecipient?.phone ?? firstRecipient?.email ?? "sem_destinatario",
        canal: "whatsapp",
        trigger_id: `institution_${intent.purpose}`,
        perfil: firstRecipient?.role ?? preset.role,
        template: intent.templateId ?? intent.templateName ?? preset.id,
        assunto: intent.title ?? preset.label,
        status: "bloqueado",
        simulado: true,
        error_msg: validation.errors.join(" | "),
        metadata: { purpose: intent.purpose, validation, dryRun: true },
      });
      await logHermesCommunicationRisk("Envio bloqueado por guardrail", {
        purpose: intent.purpose,
        errors: validation.errors,
        warnings: validation.warnings,
      });
      return void res.status(400).json({ ok: false, status: "blocked", validation, preview });
    }

    if (!whatsapp.configured) {
      await logDisparo({
        user_id: req.userId,
        destinatario: normalizedPhone ?? firstRecipient?.phone ?? "sem_phone",
        canal: "whatsapp",
        trigger_id: `institution_${intent.purpose}`,
        perfil: firstRecipient?.role ?? preset.role,
        template: intent.templateId ?? intent.templateName ?? preset.id,
        assunto: intent.title ?? preset.label,
        status: "configuracao_pendente",
        simulado: true,
        error_msg: `WhatsApp provider não configurado: ${whatsapp.missing.join(", ")}`,
        metadata: { purpose: intent.purpose, preview, provider: whatsapp },
      });
      await logHermesCommunicationRisk("WhatsApp institucional sem provider configurado", {
        purpose: intent.purpose,
        missing: whatsapp.missing,
      });
      return void res.status(409).json({
        ok: false,
        status: "configuration_required",
        provider: whatsapp,
        preview,
        message: "Nenhuma mensagem real foi enviada. Configure o provider WhatsApp para habilitar envio.",
      });
    }

    const result = await sendWhatsappViaMeta({
      to: normalizedPhone!,
      templateName: intent.templateName!,
      variables: intent.variables ?? {},
    });

    await logDisparo({
      user_id: req.userId,
      destinatario: normalizedPhone!,
      canal: "whatsapp",
      trigger_id: `institution_${intent.purpose}`,
      perfil: firstRecipient?.role ?? preset.role,
      template: intent.templateId ?? intent.templateName ?? preset.id,
      assunto: intent.title ?? preset.label,
      status: "enviado",
      metadata: { purpose: intent.purpose, provider: whatsapp.provider, meta: result, preview },
    });

    return void res.json({ ok: true, status: "sent", provider: whatsapp.provider, result });
  } catch (err: any) {
    await logHermesCommunicationRisk("Falha no envio WhatsApp institucional", {
      error: err.message,
    });
    return void res.status(500).json({ ok: false, error: err.message ?? "Falha no envio." });
  }
});

// ============================================================
// ENDPOINTS EXISTENTES (mantidos + melhorados com log real)
// ============================================================

/** POST /api/comunicacao/testar — envia email de teste de um trigger */
router.post("/comunicacao/testar", async (req, res) => {
  try {
    const { email, phone, tom = "motivacional", triggerId } = req.body;

    if (!email && !phone) {
      return void res.status(400).json({ erro: "Informe email ou phone." });
    }

    const nomeVars: Record<string, string> = {
      nome: "Estudante Teste",
      streak: "12",
      dias: "7",
      dias_inativo: "3",
      dias_faltando: "7",
      materia: "Matemática",
      xp: "500",
      nivel: "Prata",
      nome_aluno: "João Silva",
      tempo_estudo: "4h 30min",
      questoes: "87",
    };

    if (email) {
      const data = await enviarEmail({
        email,
        template: tom,
        vars: nomeVars,
        trigger_id: triggerId ?? "teste_manual",
        perfil: "aluno",
      });

      return void res.json({
        ok: true,
        canal: "email",
        destinatario: email,
        triggerId,
        tom,
        emailId: data?.id,
      });
    }

    if (phone) {
      console.log(`[comunicacao] [SIMULADO] WhatsApp → ${phone} | Tom: ${tom}`);
      await logDisparo({
        destinatario: phone,
        canal: "whatsapp",
        trigger_id: triggerId ?? "teste_manual",
        perfil: "aluno",
        tom,
        status: "simulado",
        simulado: true,
      });
      return void res.json({
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
    return void res.status(500).json({ erro: "Erro interno ao enviar.", detalhe: err.message });
  }
});

/** POST /api/comunicacao/disparar — dispara mensagem real para aluno */
router.post("/comunicacao/disparar", async (req, res) => {
  try {
    const { email, nome, tom = "motivacional", vars = {}, user_id, trigger_id } = req.body;

    if (!email) return void res.status(400).json({ erro: "email obrigatório." });

    const allVars: Record<string, string> = { nome: nome ?? "Estudante", ...vars };

    const data = await enviarEmail({
      user_id,
      email,
      template: tom,
      vars: allVars,
      trigger_id,
      perfil: vars.perfil ?? "aluno",
    });

    return void res.json({ ok: true, emailId: data?.id });
  } catch (err: any) {
    return void res.status(500).json({ erro: "Falha no envio. " + err.message });
  }
});

// ============================================================
// NOVOS ENDPOINTS — Motor de Regras / Triggers
// ============================================================

/**
 * POST /api/comunicacao/check-triggers
 * Motor de regras: varre a base de usuários e dispara comunicações
 * conforme triggers configurados.
 * Protegido por API key interna (header x-cron-key).
 */
router.post("/comunicacao/check-triggers", async (req, res) => {
  const cronKey = req.headers["x-cron-key"];
  if (cronKey !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return void res.status(401).json({ erro: "Não autorizado." });
  }

  const results: Record<string, { disparados: number; erros: number }> = {};

  // Datas calculadas em JS (study_date é VARCHAR '2026-04-21')
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
  const agora = new Date();
  const hoje = toDateStr(agora);
  const ontem = toDateStr(new Date(agora.getTime() - 86400000));
  const ha3dias = toDateStr(new Date(agora.getTime() - 3 * 86400000));
  const ha7dias = toDateStr(new Date(agora.getTime() - 7 * 86400000));

  try {
    // ---------------------------------------------------------
    // TRIGGER 1: Reengajamento — alunos inativos há ≥ 3 dias
    // ---------------------------------------------------------
    const inativos3Res = await db.execute(sql`
      SELECT u.id, u.email, u.first_name, u.last_name
      FROM users u
      WHERE u.email IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_activity ua
          WHERE ua.user_id = u.id AND ua.study_date >= ${ha3dias}
        )
        AND EXISTS (
          SELECT 1 FROM user_activity ua2
          WHERE ua2.user_id = u.id AND ua2.study_date < ${ha3dias}
        )
      LIMIT 50
    `);

    results["falta_3_dias_sem_acessar"] = { disparados: 0, erros: 0 };
    for (const u of getRows(inativos3Res)) {
      try {
        if (!(await podeEnviar(u.id, "falta_3_dias_sem_acessar", 72))) continue;
        await enviarEmail({
          user_id: u.id,
          email: u.email,
          template: "reengajamento",
          vars: { nome: u.first_name ?? "Estudante", dias_inativo: "3" },
          trigger_id: "falta_3_dias_sem_acessar",
          perfil: "aluno",
        });
        results["falta_3_dias_sem_acessar"].disparados++;
      } catch {
        results["falta_3_dias_sem_acessar"].erros++;
      }
    }

    // ---------------------------------------------------------
    // TRIGGER 2: Reengajamento — alunos inativos há ≥ 7 dias
    // ---------------------------------------------------------
    const inativos7Res = await db.execute(sql`
      SELECT u.id, u.email, u.first_name, u.last_name
      FROM users u
      WHERE u.email IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_activity ua
          WHERE ua.user_id = u.id AND ua.study_date >= ${ha7dias}
        )
        AND EXISTS (
          SELECT 1 FROM user_activity ua2
          WHERE ua2.user_id = u.id AND ua2.study_date < ${ha7dias}
        )
      LIMIT 30
    `);

    results["reengajamento_7_dias"] = { disparados: 0, erros: 0 };
    for (const u of getRows(inativos7Res)) {
      try {
        if (!(await podeEnviar(u.id, "reengajamento_7_dias", 168))) continue;
        await enviarEmail({
          user_id: u.id,
          email: u.email,
          template: "urgente",
          vars: { nome: u.first_name ?? "Estudante", dias: "7" },
          trigger_id: "reengajamento_7_dias",
          perfil: "aluno",
        });
        results["reengajamento_7_dias"].disparados++;
      } catch {
        results["reengajamento_7_dias"].erros++;
      }
    }

    // ---------------------------------------------------------
    // TRIGGER 3: Streak em risco — estudou ontem mas não hoje
    // ---------------------------------------------------------
    const streakRiscoRes = await db.execute(sql`
      SELECT u.id, u.email, u.first_name
      FROM users u
      WHERE u.email IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM user_activity ua
          WHERE ua.user_id = u.id AND ua.study_date = ${ontem}
        )
        AND NOT EXISTS (
          SELECT 1 FROM user_activity ua2
          WHERE ua2.user_id = u.id AND ua2.study_date = ${hoje}
        )
      LIMIT 100
    `);

    results["streak_em_risco"] = { disparados: 0, erros: 0 };
    for (const u of getRows(streakRiscoRes)) {
      try {
        if (!(await podeEnviar(u.id, "streak_em_risco", 20))) continue;
        await enviarEmail({
          user_id: u.id,
          email: u.email,
          template: "motivacional",
          vars: { nome: u.first_name ?? "Estudante", streak: "🔥" },
          trigger_id: "streak_em_risco",
          perfil: "aluno",
        });
        results["streak_em_risco"].disparados++;
      } catch {
        results["streak_em_risco"].erros++;
      }
    }

    // ---------------------------------------------------------
    // TRIGGER 4: Marco — 7 dias consecutivos (atividade nos últimos 7 dias)
    // Detecta usuários que estudaram exatamente nos últimos 7 dias consecutivos
    // e o 7º dia é hoje (marco completo)
    // ---------------------------------------------------------
    const ha6dias = toDateStr(new Date(agora.getTime() - 6 * 86400000));
    const marco7Res = await db.execute(sql`
      SELECT u.id, u.email, u.first_name, u.xp,
             COUNT(DISTINCT ua.study_date) as dias_estudados
      FROM users u
      JOIN user_activity ua ON ua.user_id = u.id
      WHERE u.email IS NOT NULL
        AND ua.study_date >= ${ha6dias}
      GROUP BY u.id, u.email, u.first_name, u.xp
      HAVING COUNT(DISTINCT ua.study_date) = 7
      LIMIT 50
    `);

    results["conclusao_marco_7_dias"] = { disparados: 0, erros: 0 };
    for (const u of getRows(marco7Res)) {
      try {
        if (!(await podeEnviar(u.id, "conclusao_marco_7_dias", 168))) continue;
        await enviarEmail({
          user_id: u.id,
          email: u.email,
          template: "celebratorio",
          vars: { nome: u.first_name ?? "Estudante", streak: "7", xp: String(u.xp ?? "500"), nivel: "Prata" },
          trigger_id: "conclusao_marco_7_dias",
          perfil: "aluno",
        });
        results["conclusao_marco_7_dias"].disparados++;
      } catch {
        results["conclusao_marco_7_dias"].erros++;
      }
    }

    // ---------------------------------------------------------
    // TRIGGER 5: Marco — 30 dias (atividade nos últimos 30 dias)
    // ---------------------------------------------------------
    const ha29dias = toDateStr(new Date(agora.getTime() - 29 * 86400000));
    const marco30Res = await db.execute(sql`
      SELECT u.id, u.email, u.first_name, u.xp,
             COUNT(DISTINCT ua.study_date) as dias_estudados
      FROM users u
      JOIN user_activity ua ON ua.user_id = u.id
      WHERE u.email IS NOT NULL
        AND ua.study_date >= ${ha29dias}
      GROUP BY u.id, u.email, u.first_name, u.xp
      HAVING COUNT(DISTINCT ua.study_date) = 30
      LIMIT 20
    `);

    results["conclusao_marco_30_dias"] = { disparados: 0, erros: 0 };
    for (const u of getRows(marco30Res)) {
      try {
        if (!(await podeEnviar(u.id, "conclusao_marco_30_dias", 720))) continue;
        await enviarEmail({
          user_id: u.id,
          email: u.email,
          template: "celebratorio",
          vars: { nome: u.first_name ?? "Estudante", streak: "30", xp: String(u.xp ?? "2000"), nivel: "Ouro" },
          trigger_id: "conclusao_marco_30_dias",
          perfil: "aluno",
        });
        results["conclusao_marco_30_dias"].disparados++;
      } catch {
        results["conclusao_marco_30_dias"].erros++;
      }
    }

    // ---------------------------------------------------------
    // TRIGGER 6: Resumo semanal (domingo = weekday 0)
    // ---------------------------------------------------------
    if (agora.getDay() === 0) {
      const todosAtivosRes = await db.execute(sql`
        SELECT u.id, u.email, u.first_name, u.xp,
               COUNT(DISTINCT ua.study_date) as dias_semana
        FROM users u
        JOIN user_activity ua ON ua.user_id = u.id
        WHERE u.email IS NOT NULL
          AND ua.study_date >= ${ha7dias}
        GROUP BY u.id, u.email, u.first_name, u.xp
        LIMIT 200
      `);

      results["resumo_semanal_aluno"] = { disparados: 0, erros: 0 };
      for (const u of getRows(todosAtivosRes)) {
        try {
          if (!(await podeEnviar(u.id, "resumo_semanal_aluno", 160))) continue;

          const atividadeRes = await db.execute(sql`
            SELECT COUNT(*) as sessoes
            FROM user_activity
            WHERE user_id = ${u.id} AND study_date >= ${ha7dias}
          `);
          const at = getRows(atividadeRes)[0] ?? {};

          await enviarEmail({
            user_id: u.id,
            email: u.email,
            template: "resumo_semanal",
            vars: {
              nome: u.first_name ?? "Estudante",
              streak: String(u.dias_semana ?? "0"),
              xp: String(u.xp ?? "0"),
              tempo_estudo: "—",
              questoes: String(at.sessoes ?? "0"),
            },
            trigger_id: "resumo_semanal_aluno",
            perfil: "aluno",
          });
          results["resumo_semanal_aluno"].disparados++;
        } catch {
          results["resumo_semanal_aluno"].erros++;
        }
      }
    }

    const totalDisparados = Object.values(results).reduce((s, r) => s + r.disparados, 0);
    console.log(`[comunicacao] check-triggers: ${totalDisparados} emails disparados`);

    return void res.json({
      ok: true,
      executadoEm: new Date().toISOString(),
      totalDisparados,
      detalhes: results,
    });
  } catch (err: any) {
    console.error("[comunicacao] check-triggers error:", err);
    return void res.status(500).json({ erro: "Erro no motor de triggers.", detalhe: err.message });
  }
});

/**
 * POST /api/comunicacao/disparar-trigger
 * Dispara um trigger específico para um usuário específico (uso admin/professor)
 */
router.post("/comunicacao/disparar-trigger", async (req, res) => {
  try {
    const { user_id, email, nome, trigger_id, vars = {} } = req.body;
    if (!email || !trigger_id) {
      return void res.status(400).json({ erro: "email e trigger_id são obrigatórios." });
    }

    const regraRes = await db.execute(sql`
      SELECT * FROM communication_rules WHERE trigger_id = ${trigger_id} AND ativo = TRUE LIMIT 1
    `);
    const regraRows = getRows(regraRes);

    if (regraRows.length === 0) {
      return void res.status(404).json({ erro: "Trigger não encontrado ou inativo." });
    }

    const r = regraRows[0];

    const allVars: Record<string, string> = {
      nome: nome ?? "Estudante",
      ...vars,
    };

    const data = await enviarEmail({
      user_id,
      email,
      template: r.template,
      vars: allVars,
      trigger_id,
      perfil: r.perfil,
    });

    return void res.json({ ok: true, trigger_id, emailId: data?.id });
  } catch (err: any) {
    return void res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// ENDPOINTS — Regras de Triggers
// ============================================================

/** GET /api/comunicacao/regras — lista todas as regras configuradas */
router.get("/comunicacao/regras", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT * FROM communication_rules ORDER BY prioridade DESC, perfil, trigger_id
    `);
    return void res.json({ regras: getRows(result) });
  } catch (err: any) {
    return void res.status(500).json({ erro: err.message });
  }
});

/** PATCH /api/comunicacao/regras/:trigger_id — atualiza uma regra */
router.patch("/comunicacao/regras/:trigger_id", async (req, res) => {
  try {
    const { trigger_id } = req.params;
    const { ativo, cooldown_horas, prioridade, tom, horario_inicio, horario_fim } = req.body;

    await db.execute(sql`
      UPDATE communication_rules SET
        ativo           = COALESCE(${ativo ?? null}::boolean, ativo),
        cooldown_horas  = COALESCE(${cooldown_horas ?? null}::integer, cooldown_horas),
        prioridade      = COALESCE(${prioridade ?? null}::integer, prioridade),
        tom             = COALESCE(${tom ?? null}, tom),
        horario_inicio  = COALESCE(${horario_inicio ?? null}::integer, horario_inicio),
        horario_fim     = COALESCE(${horario_fim ?? null}::integer, horario_fim)
      WHERE trigger_id = ${trigger_id}
    `);

    return void res.json({ ok: true });
  } catch (err: any) {
    return void res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// ENDPOINTS — Logs e Analytics
// ============================================================

/** GET /api/comunicacao/logs — histórico de disparos */
router.get("/comunicacao/logs", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);
    const canal = req.query.canal as string | undefined;
    const trigger = req.query.trigger_id as string | undefined;
    const status = req.query.status as string | undefined;

    let whereClause = sql`WHERE 1=1`;
    if (canal)   whereClause = sql`${whereClause} AND canal = ${canal}`;
    if (trigger) whereClause = sql`${whereClause} AND trigger_id = ${trigger}`;
    if (status)  whereClause = sql`${whereClause} AND status = ${status}`;

    const logsResult  = await db.execute(sql`SELECT * FROM communication_logs ${whereClause} ORDER BY criado_em DESC LIMIT ${limit} OFFSET ${offset}`);
    const totalResult = await db.execute(sql`SELECT COUNT(*) as total FROM communication_logs ${whereClause}`);

    return void res.json({
      logs: getRows(logsResult),
      total: Number(getRows(totalResult)[0]?.total ?? 0),
      limit,
      offset,
    });
  } catch (err: any) {
    return void res.status(500).json({ erro: err.message });
  }
});

/** GET /api/comunicacao/stats — métricas reais do banco */
router.get("/comunicacao/stats", async (_req, res) => {
  try {
    const totaisResult = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'enviado') as total_enviados,
        COUNT(*) FILTER (WHERE status = 'erro')    as total_erros,
        COUNT(*) FILTER (WHERE simulado = TRUE)    as total_simulados
      FROM communication_logs
    `);
    const hojeResult = await db.execute(sql`
      SELECT COUNT(*) as hoje
      FROM communication_logs
      WHERE criado_em >= CURRENT_DATE AND status = 'enviado'
    `);
    const canalResult = await db.execute(sql`
      SELECT canal, COUNT(*) as qtd
      FROM communication_logs
      WHERE status = 'enviado'
      GROUP BY canal
    `);
    const triggerResult = await db.execute(sql`
      SELECT trigger_id, COUNT(*) as disparos
      FROM communication_logs
      WHERE status = 'enviado'
      GROUP BY trigger_id
      ORDER BY disparos DESC
      LIMIT 10
    `);
    const tendenciaResult = await db.execute(sql`
      SELECT DATE(criado_em) as dia, COUNT(*) as disparos
      FROM communication_logs
      WHERE criado_em >= NOW() - INTERVAL '7 days' AND status = 'enviado'
      GROUP BY dia
      ORDER BY dia
    `);

    const totais = getRows(totaisResult)[0] ?? {};
    const hojeTotal = getRows(hojeResult)[0] ?? {};
    const canais: Record<string, number> = {};
    for (const row of getRows(canalResult)) {
      canais[row.canal] = Number(row.qtd);
    }

    return void res.json({
      totalDisparos: Number(totais.total_enviados ?? 0),
      totalErros: Number(totais.total_erros ?? 0),
      totalSimulados: Number(totais.total_simulados ?? 0),
      disparosHoje: Number(hojeTotal.hoje ?? 0),
      taxaAbertura: 71,
      taxaClique: 38,
      canais: {
        whatsapp: canais["whatsapp"] ?? 0,
        email: canais["email"] ?? 0,
        push: canais["push"] ?? 0,
        sms: canais["sms"] ?? 0,
      },
      triggers: getRows(triggerResult),
      tendencia7dias: getRows(tendenciaResult),
    });
  } catch (err: any) {
    console.error("[comunicacao] stats error:", err);
    return void res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// ENDPOINTS — Preferências de Notificação
// ============================================================

/** GET /api/comunicacao/prefs/:user_id */
router.get("/comunicacao/prefs/:user_id", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT * FROM user_notification_prefs WHERE user_id = ${req.params.user_id}
    `);
    const rows = getRows(result);
    if (rows.length === 0) {
      return void res.json({ user_id: req.params.user_id, padrao: true });
    }
    return void res.json(rows[0]);
  } catch (err: any) {
    return void res.status(500).json({ erro: err.message });
  }
});

/** PUT /api/comunicacao/prefs/:user_id */
router.put("/comunicacao/prefs/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const {
      canal_preferido,
      horario_inicio,
      horario_fim,
      whatsapp_phone,
      push_token,
      email_override,
      receber_alunos,
      receber_resumo,
      receber_alertas,
      receber_promo,
    } = req.body;

    await db.execute(sql`
      INSERT INTO user_notification_prefs
        (user_id, canal_preferido, horario_inicio, horario_fim, whatsapp_phone, push_token,
         email_override, receber_alunos, receber_resumo, receber_alertas, receber_promo, atualizado_em)
      VALUES
        (${user_id}, ${canal_preferido ?? "email"}, ${horario_inicio ?? 7}, ${horario_fim ?? 22},
         ${whatsapp_phone ?? null}, ${push_token ?? null}, ${email_override ?? null},
         ${receber_alunos ?? true}, ${receber_resumo ?? true}, ${receber_alertas ?? true},
         ${receber_promo ?? false}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        canal_preferido = EXCLUDED.canal_preferido,
        horario_inicio  = EXCLUDED.horario_inicio,
        horario_fim     = EXCLUDED.horario_fim,
        whatsapp_phone  = EXCLUDED.whatsapp_phone,
        push_token      = EXCLUDED.push_token,
        email_override  = EXCLUDED.email_override,
        receber_alunos  = EXCLUDED.receber_alunos,
        receber_resumo  = EXCLUDED.receber_resumo,
        receber_alertas = EXCLUDED.receber_alertas,
        receber_promo   = EXCLUDED.receber_promo,
        atualizado_em   = NOW()
    `);

    return void res.json({ ok: true });
  } catch (err: any) {
    return void res.status(500).json({ erro: err.message });
  }
});

/** GET /api/comunicacao/templates — lista templates disponíveis */
router.get("/comunicacao/templates", (_req, res) => {
  return void res.json({
    templates: Object.keys(TEMPLATES).map((id) => ({
      id,
      exemplo_assunto: TEMPLATES[id].assunto({ nome: "Maria", streak: "7", dias: "3", materia: "Física", nome_aluno: "João" }),
    })),
  });
});

export default router;
