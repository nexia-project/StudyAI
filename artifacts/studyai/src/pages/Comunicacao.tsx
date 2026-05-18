import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Lock,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { cn } from "@/lib/utils";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

type RecipientRole = "aluno" | "professor" | "responsavel" | "gestor";
type CommunicationPurpose =
  | "aviso_aluno"
  | "aviso_professor"
  | "cobranca_responsavel"
  | "lembrete_estudo"
  | "comunicado_pedagogico"
  | "marketing";
type ConsentStatus = "opted_in" | "unknown" | "opted_out";

interface Preset {
  id: CommunicationPurpose;
  label: string;
  role: RecipientRole;
  purposeLabel: string;
  requiresTemplate: boolean;
  requiresExplicitOptIn: boolean;
  defaultMessage: string;
  guardrail: string;
}

interface CommunicationStatus {
  channels: {
    whatsapp: {
      configured: boolean;
      provider: string;
      mode: "ready" | "dry_run";
      missing: string[];
    };
    email: {
      configured: boolean;
      provider: string;
    };
  };
  presets: Preset[];
  guardrails: string[];
}

interface PreviewResponse {
  ok: boolean;
  dryRun: boolean;
  status: "blocked" | "ready_to_send" | "configuration_required";
  preview: string;
  validation: {
    errors: string[];
    warnings: string[];
  };
}

const FALLBACK_PRESETS: Preset[] = [
  {
    id: "aviso_aluno",
    label: "Aviso ao aluno",
    role: "aluno",
    purposeLabel: "Comunicado operacional/pedagógico",
    requiresTemplate: true,
    requiresExplicitOptIn: true,
    defaultMessage: "Oi, {nome}. A instituição publicou um aviso importante: {assunto}. Acesse o StudyAI para ver os detalhes.",
    guardrail: "Use apenas para avisos ligados à vida escolar do aluno.",
  },
  {
    id: "aviso_professor",
    label: "Aviso ao professor",
    role: "professor",
    purposeLabel: "Comunicação interna",
    requiresTemplate: true,
    requiresExplicitOptIn: true,
    defaultMessage: "Olá, {nome}. Há um comunicado da coordenação: {assunto}. Confira o painel institucional do StudyAI.",
    guardrail: "Comunicações de equipe devem manter registro administrativo.",
  },
  {
    id: "cobranca_responsavel",
    label: "Responsável/pais cobrança/lembrete",
    role: "responsavel",
    purposeLabel: "Financeiro institucional",
    requiresTemplate: true,
    requiresExplicitOptIn: true,
    defaultMessage: "Olá, {nome}. A instituição identificou um lembrete financeiro: {assunto}. Consulte o canal oficial da escola para detalhes.",
    guardrail: "Cobrança deve ir para contato cadastrado do responsável.",
  },
  {
    id: "lembrete_estudo",
    label: "Lembrete de estudo",
    role: "aluno",
    purposeLabel: "Engajamento pedagógico",
    requiresTemplate: true,
    requiresExplicitOptIn: true,
    defaultMessage: "Oi, {nome}. Seu lembrete de estudo de hoje: {assunto}. Entre no StudyAI e continue pelo plano recomendado.",
    guardrail: "Evite pressão excessiva e respeite janela de envio.",
  },
  {
    id: "comunicado_pedagogico",
    label: "Comunicado pedagógico",
    role: "responsavel",
    purposeLabel: "Acompanhamento pedagógico",
    requiresTemplate: true,
    requiresExplicitOptIn: true,
    defaultMessage: "Olá, {nome}. A equipe pedagógica publicou um comunicado: {assunto}. O detalhe fica disponível no StudyAI/portal da instituição.",
    guardrail: "Não exponha dados sensíveis do aluno no WhatsApp.",
  },
  {
    id: "marketing",
    label: "Marketing institucional",
    role: "responsavel",
    purposeLabel: "Marketing/relacionamento",
    requiresTemplate: true,
    requiresExplicitOptIn: true,
    defaultMessage: "Olá, {nome}. A instituição tem uma novidade: {assunto}. Responda PARAR para não receber mensagens promocionais.",
    guardrail: "Marketing exige opt-in explícito, template aprovado e opção PARAR/STOP.",
  },
];

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "red" | "violet" }) {
  const styles = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold", styles[tone])}>{children}</span>;
}

function roleLabel(role: RecipientRole) {
  return role === "responsavel" ? "Responsável/pais" : role === "professor" ? "Professor" : role === "gestor" ? "Gestor" : "Aluno";
}

export default function ComunicacaoPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [status, setStatus] = useState<CommunicationStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [selectedPurpose, setSelectedPurpose] = useState<CommunicationPurpose>("aviso_aluno");
  const [recipientName, setRecipientName] = useState("Maria Responsável");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientRole, setRecipientRole] = useState<RecipientRole>("aluno");
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>("unknown");
  const [responsibleContact, setResponsibleContact] = useState(false);
  const [title, setTitle] = useState("Comunicado importante");
  const [templateName, setTemplateName] = useState("");
  const [message, setMessage] = useState("");
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [noMassBlast, setNoMassBlast] = useState(true);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingStatus(true);
    fetch(`${BASE}/api/comunicacao/institution/status`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro ao carregar comunicação");
        return res.json();
      })
      .then((data: CommunicationStatus) => {
        setStatus(data);
        const preset = data.presets.find((item) => item.id === selectedPurpose);
        if (preset) {
          setMessage(preset.defaultMessage);
          setRecipientRole(preset.role);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingStatus(false));
  }, []);

  const presets = status?.presets?.length ? status.presets : FALLBACK_PRESETS;
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPurpose) ?? presets[0],
    [presets, selectedPurpose],
  );
  const whatsappConfigured = !!status?.channels.whatsapp.configured;

  useEffect(() => {
    if (!selectedPreset) return;
    setRecipientRole(selectedPreset.role);
    setMessage(selectedPreset.defaultMessage);
    setPreview(null);
    setSendResult(null);
  }, [selectedPreset?.id]);

  function buildPayload() {
    return {
      channel: "whatsapp",
      purpose: selectedPreset.id,
      templateId: selectedPreset.id,
      templateName: templateName.trim(),
      title: title.trim(),
      message,
      variables: {
        nome: recipientName.trim(),
        assunto: title.trim(),
      },
      confirmedReview,
      noMassBlast,
      recipients: [{
        nome: recipientName.trim(),
        role: recipientRole,
        phone: recipientPhone.trim(),
        consentStatus,
        responsibleContact,
      }],
    };
  }

  async function generatePreview() {
    setPreviewLoading(true);
    setError(null);
    setSendResult(null);
    try {
      const res = await fetch(`${BASE}/api/comunicacao/institution/preview`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar preview");
      setPreview(data);
    } catch (e: any) {
      setError(e.message ?? "Erro ao gerar preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function sendIntent() {
    setSendLoading(true);
    setError(null);
    setSendResult(null);
    try {
      const res = await fetch(`${BASE}/api/comunicacao/institution/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? data.validation?.errors?.join(" ") ?? "Envio bloqueado");
      setSendResult(data.status === "sent" ? "Mensagem enviada pelo provider configurado." : "Intenção registrada.");
    } catch (e: any) {
      setError(e.message ?? "Envio bloqueado");
    } finally {
      setSendLoading(false);
    }
  }

  if (isLoading || loadingStatus) {
    return (
      <div className="min-h-screen bg-slate-50 studyai-with-sidebar pt-14 md:pt-0">
        <AppNav />
        <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 studyai-with-sidebar pt-14 md:pt-0">
        <AppNav />
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <Lock className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <h1 className="text-xl font-black text-slate-800">Acesso restrito</h1>
          <p className="mt-2 text-sm text-slate-500">Entre como instituição, admin ou professor aprovado para usar a central de comunicação.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 studyai-with-sidebar pt-14 md:pt-0">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pt-8">
        <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="violet"><MessageSquare className="h-3.5 w-3.5" /> Comunicação institucional</Badge>
                <Badge tone={whatsappConfigured ? "green" : "amber"}>
                  {whatsappConfigured ? "WhatsApp configurado" : "WhatsApp em dry-run"}
                </Badge>
              </div>
              <h1 className="text-2xl font-black text-slate-900">Centro de Comunicação StudyAI</h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                Uma camada central para avisos da escola, professores, alunos e responsáveis, preservando visibilidade no app e bloqueando envio externo sem consentimento, template e provider seguro.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" /> Atualizar status
            </button>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-600" />
                <h2 className="font-black text-slate-800">Enviar aviso institucional</h2>
              </div>

              <label className="text-xs font-black uppercase tracking-wide text-slate-400">Modelo/preset seguro</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPurpose(preset.id)}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition-all",
                      selectedPreset.id === preset.id
                        ? "border-violet-400 bg-violet-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-violet-200",
                    )}
                  >
                    <p className="text-sm font-black text-slate-800">{preset.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{preset.purposeLabel}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="slate">{roleLabel(preset.role)}</Badge>
                      <Badge tone="amber">Template</Badge>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-900">{selectedPreset.guardrail}</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-700">
                  Detalhes sensíveis devem ficar no StudyAI/portal autenticado. WhatsApp serve como canal de chamada e confirmação auditável.
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-400">Nome do destinatário</label>
                  <input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
                    placeholder="Nome do aluno/professor/responsável"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-400">WhatsApp</label>
                  <input
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
                    placeholder="+5511999999999"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-400">Papel do destinatário</label>
                  <select
                    value={recipientRole}
                    onChange={(e) => setRecipientRole(e.target.value as RecipientRole)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
                  >
                    <option value="aluno">Aluno</option>
                    <option value="professor">Professor</option>
                    <option value="responsavel">Responsável/pais</option>
                    <option value="gestor">Gestor</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-400">Consentimento WhatsApp</label>
                  <select
                    value={consentStatus}
                    onChange={(e) => setConsentStatus(e.target.value as ConsentStatus)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
                  >
                    <option value="unknown">Não confirmado</option>
                    <option value="opted_in">Opt-in confirmado</option>
                    <option value="opted_out">Opt-out / PARAR</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={responsibleContact}
                    onChange={(e) => setResponsibleContact(e.target.checked)}
                    className="mt-1"
                  />
                  Este número é contato cadastrado do responsável quando a finalidade envolver cobrança/família.
                </label>
                <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={noMassBlast}
                    onChange={(e) => setNoMassBlast(e.target.checked)}
                    className="mt-1"
                  />
                  Não é disparo em massa; é uma intenção individual ou lote pequeno revisado.
                </label>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-400">Assunto</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
                    placeholder="Ex.: Reunião pedagógica, lembrete financeiro"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-400">Template WhatsApp aprovado</label>
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
                    placeholder="studyai_aviso_institucional"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-black uppercase tracking-wide text-slate-400">Mensagem/base do template</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm leading-relaxed outline-none focus:border-violet-400"
                  placeholder="Use {nome} e {assunto} para preview seguro."
                />
              </div>

              <label className="mt-4 flex items-start gap-2 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                <input
                  type="checkbox"
                  checked={confirmedReview}
                  onChange={(e) => setConfirmedReview(e.target.checked)}
                  className="mt-1"
                />
                Revisei público, finalidade, consentimento, template, janela de WhatsApp e ausência de dados sensíveis.
              </label>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={generatePreview}
                  disabled={previewLoading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700 hover:bg-violet-100 disabled:opacity-60"
                >
                  {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Gerar preview seguro
                </button>
                <button
                  type="button"
                  onClick={sendIntent}
                  disabled={!whatsappConfigured || sendLoading}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50",
                    whatsappConfigured ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-400",
                  )}
                >
                  {sendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar via WhatsApp
                </button>
              </div>

              {!whatsappConfigured && (
                <p className="mt-2 text-xs text-slate-500">
                  Envio real desabilitado: configure provider WhatsApp no backend. Preview e auditoria continuam disponíveis.
                </p>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-black text-slate-800">
                <ShieldCheck className="h-5 w-5 text-emerald-600" /> Status e conformidade
              </h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">WhatsApp</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={whatsappConfigured ? "green" : "amber"}>
                      {whatsappConfigured ? "Provider pronto" : "Provider não configurado"}
                    </Badge>
                    <Badge tone="slate">{status?.channels.whatsapp.provider ?? "disabled"}</Badge>
                  </div>
                  {!!status?.channels.whatsapp.missing?.length && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      Falta: {status.channels.whatsapp.missing.join(", ")}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Email fallback</p>
                  <div className="mt-2">
                    <Badge tone={status?.channels.email.configured ? "green" : "amber"}>
                      {status?.channels.email.configured ? "Resend configurado" : "Resend pendente"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-black text-slate-800">
                <Clock className="h-5 w-5 text-violet-600" /> Preview e decisão
              </h2>
              {preview ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-sm leading-relaxed text-slate-50">
                    {preview.preview}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={preview.ok ? "green" : "red"}>{preview.status}</Badge>
                    {preview.dryRun && <Badge tone="amber">dry-run</Badge>}
                  </div>
                  {!!preview.validation.errors.length && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                      <p className="mb-1 text-xs font-black uppercase tracking-wide text-red-700">Bloqueios</p>
                      {preview.validation.errors.map((item) => (
                        <p key={item} className="text-xs leading-relaxed text-red-700">• {item}</p>
                      ))}
                    </div>
                  )}
                  {!!preview.validation.warnings.length && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                      <p className="mb-1 text-xs font-black uppercase tracking-wide text-amber-700">Atenções</p>
                      {preview.validation.warnings.map((item) => (
                        <p key={item} className="text-xs leading-relaxed text-amber-700">• {item}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Gere o preview para ver a mensagem final, bloqueios de consentimento/template e status de provider antes de qualquer envio.
                </p>
              )}
              {sendResult && (
                <p className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> {sendResult}
                </p>
              )}
              {error && (
                <p className="mt-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-black text-slate-800">Guardrails obrigatórios</h2>
              <div className="mt-3 space-y-2">
                {(status?.guardrails ?? [
                  "Consentimento/opt-in WhatsApp é obrigatório por destinatário.",
                  "Marketing exige opt-in explícito, template aprovado e STOP/PARAR.",
                  "Cobrança vai para responsável cadastrado; telefone do aluno não é fallback padrão.",
                  "Sem disparo em massa sem revisão humana e limite operacional.",
                ]).map((item) => (
                  <p key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
