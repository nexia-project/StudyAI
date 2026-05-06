import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Mail, Bell, Phone, Zap, Clock, Users, CheckCircle2,
  AlertTriangle, TrendingUp, Send, Settings, ChevronDown, ChevronRight,
  Play, Pause, ToggleLeft, ToggleRight, BarChart2, Target, Flame,
  RefreshCw, Filter, Plus, Sparkles, ArrowRight, Info, Eye, X,
  Loader2, Check, BookOpen, Calendar, Trophy,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { cn } from "@/lib/utils";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

// ─── Types ─────────────────────────────────────────────────────────────────
type Canal = "whatsapp" | "email" | "push" | "sms";
type Tom = "motivacional" | "informativo" | "urgente" | "celebratorio" | "alerta";
type TriggerStatus = "ativo" | "pausado";

interface Trigger {
  id: string;
  nome: string;
  descricao: string;
  condicao: string;
  canal: Canal[];
  tom: Tom;
  status: TriggerStatus;
  disparos: number;
  taxaAbertura: number;
  icon: string;
}

interface Envio {
  id: string;
  aluno: string;
  trigger: string;
  canal: Canal;
  tom: Tom;
  horario: string;
  status: "enviado" | "aberto" | "clicado" | "falhou";
  mensagem: string;
}

interface Template {
  id: string;
  nome: string;
  canal: Canal;
  tom: Tom;
  preview: string;
  variaveis: string[];
}

// ─── Dados mock (seriam vindos do backend) ──────────────────────────────────
const TRIGGERS_INICIAIS: Trigger[] = [
  {
    id: "t1", nome: "Aluno Inativo 3 Dias", icon: "😴",
    descricao: "Aluno não acessa a plataforma há 3 ou mais dias",
    condicao: "dias_sem_acesso >= 3",
    canal: ["whatsapp", "push"], tom: "motivacional",
    status: "ativo", disparos: 847, taxaAbertura: 68,
  },
  {
    id: "t2", nome: "Meta Diária Não Atingida", icon: "🎯",
    descricao: "Aluno não completou a meta de estudo do dia",
    condicao: "progresso_diario < 100 AND hora >= 20:00",
    canal: ["push"], tom: "motivacional",
    status: "ativo", disparos: 2341, taxaAbertura: 71,
  },
  {
    id: "t3", nome: "Prova em 7 Dias", icon: "⏰",
    descricao: "Data de exame se aproxima",
    condicao: "dias_para_enem <= 7",
    canal: ["whatsapp", "email"], tom: "urgente",
    status: "ativo", disparos: 156, taxaAbertura: 89,
  },
  {
    id: "t4", nome: "Resultado de Simulado", icon: "📊",
    descricao: "Aluno concluiu um simulado",
    condicao: "simulado_concluido = true",
    canal: ["email"], tom: "informativo",
    status: "ativo", disparos: 1205, taxaAbertura: 62,
  },
  {
    id: "t5", nome: "Meta Atingida — Celebração", icon: "🏆",
    descricao: "Aluno atingiu meta semanal ou streak especial",
    condicao: "streak >= 7 OR meta_semanal = atingida",
    canal: ["push", "whatsapp"], tom: "celebratorio",
    status: "ativo", disparos: 432, taxaAbertura: 94,
  },
  {
    id: "t6", nome: "Queda de Desempenho", icon: "📉",
    descricao: "Desempenho caiu > 15% em relação à semana anterior",
    condicao: "delta_performance < -15",
    canal: ["email", "whatsapp"], tom: "alerta",
    status: "pausado", disparos: 203, taxaAbertura: 55,
  },
  {
    id: "t7", nome: "Novo Conteúdo Disponível", icon: "📚",
    descricao: "Professor publicou material ou plano de aula novo",
    condicao: "novo_conteudo = true AND aluno_na_turma = true",
    canal: ["push", "email"], tom: "informativo",
    status: "ativo", disparos: 3102, taxaAbertura: 48,
  },
  {
    id: "t8", nome: "Pais/Responsável — Relatório Semanal", icon: "👨‍👩‍👧",
    descricao: "Envio semanal de resumo de desempenho para responsáveis",
    condicao: "dia_semana = domingo AND hora = 09:00",
    canal: ["email"], tom: "informativo",
    status: "ativo", disparos: 678, taxaAbertura: 77,
  },
];

const TEMPLATES: Template[] = [
  {
    id: "tp1", nome: "Streak em Risco (WhatsApp)", canal: "whatsapp", tom: "motivacional",
    preview: "🎯 Ei {nome}, seu streak de {streak} dias está em risco!\n\nVocê tem só {revisoes} revisões pendentes de {materia} ({tempo} min cada). Que tal agora?\n\n[Continuar estudando] ← link direto\n\nSe precisar de ajuda, o Tiagão tá online 🤖",
    variaveis: ["{nome}", "{streak}", "{revisoes}", "{materia}", "{tempo}"],
  },
  {
    id: "tp2", nome: "Relatório Pais (Email)", canal: "email", tom: "informativo",
    preview: "Assunto: {nome} está indo bem, mas precisa de atenção\n\nPrezado {responsavel},\n\n{nome} completou {progresso}% do plano de estudos esta semana, mas identificamos dificuldade em {topico_fraco}.\n\nSugestão: {tempo_extra} min de estudo extra neste tema.\n\nAcompanhe em tempo real: [link dashboard]\n\nAtt,\nEquipe Study.IA",
    variaveis: ["{nome}", "{responsavel}", "{progresso}", "{topico_fraco}", "{tempo_extra}"],
  },
  {
    id: "tp3", nome: "Prova Urgente (WhatsApp)", canal: "whatsapp", tom: "urgente",
    preview: "🚨 {nome}, ENEM em {dias} dias!\n\nSeus pontos fracos agora: {pontos_fracos}\n\nO Tiagão criou um plano de revisão express de {horas}h para você. Bora?\n\n[Ver plano] ← urgente",
    variaveis: ["{nome}", "{dias}", "{pontos_fracos}", "{horas}"],
  },
  {
    id: "tp4", nome: "Conquista (Push)", canal: "push", tom: "celebratorio",
    preview: "🏆 INCRÍVEL, {nome}!\n\n{streak} dias consecutivos de estudo! Você ganhou {xp} XP e subiu para {nivel}.\n\nSua dedicação está valendo! Continue assim 🔥",
    variaveis: ["{nome}", "{streak}", "{xp}", "{nivel}"],
  },
];

const HISTORICO_ENVIOS: Envio[] = [
  { id: "e1", aluno: "Maria S.", trigger: "Aluno Inativo 3 Dias", canal: "whatsapp", tom: "motivacional", horario: "Hoje 09:14", status: "clicado", mensagem: "🎯 Ei Maria, seu streak de 12 dias está em risco!..." },
  { id: "e2", aluno: "Carlos M.", trigger: "Meta Diária Não Atingida", canal: "push", tom: "motivacional", horario: "Hoje 20:05", status: "aberto", mensagem: "📚 Carlos, você ainda tem 30 min de estudo pra hoje..." },
  { id: "e3", aluno: "Juliana R.", trigger: "Resultado de Simulado", canal: "email", tom: "informativo", horario: "Hoje 18:30", status: "enviado", mensagem: "Seu resultado chegou! Você acertou 72% das questões..." },
  { id: "e4", aluno: "Rafael T.", trigger: "Prova em 7 Dias", canal: "whatsapp", tom: "urgente", horario: "Ontem 10:00", status: "clicado", mensagem: "🚨 Rafael, ENEM em 7 dias! Seus pontos fracos agora..." },
  { id: "e5", aluno: "Ana P.", trigger: "Meta Atingida — Celebração", canal: "push", tom: "celebratorio", horario: "Ontem 08:45", status: "clicado", mensagem: "🏆 INCRÍVEL, Ana! 7 dias consecutivos de estudo!..." },
  { id: "e6", aluno: "Pedro L.", trigger: "Queda de Desempenho", canal: "email", tom: "alerta", horario: "Seg 14:22", status: "aberto", mensagem: "Identificamos queda de 20% no desempenho em Matemática..." },
];

// ─── Sub-componentes ─────────────────────────────────────────────────────────
const CANAL_ICONS: Record<Canal, { icon: string; label: string; color: string; bg: string }> = {
  whatsapp: { icon: "💬", label: "WhatsApp", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  email:    { icon: "📧", label: "Email",    color: "text-blue-700",  bg: "bg-blue-50 border-blue-200"   },
  push:     { icon: "🔔", label: "Push",     color: "text-indigo-700",bg: "bg-indigo-50 border-indigo-200"},
  sms:      { icon: "📱", label: "SMS",      color: "text-orange-700",bg: "bg-orange-50 border-orange-200"},
};

const TOM_CONFIG: Record<Tom, { label: string; color: string; bg: string }> = {
  motivacional: { label: "Motivacional", color: "text-amber-700",   bg: "bg-amber-50"   },
  informativo:  { label: "Informativo",  color: "text-blue-700",    bg: "bg-blue-50"    },
  urgente:      { label: "Urgente",      color: "text-red-700",     bg: "bg-red-50"     },
  celebratorio: { label: "Celebratório", color: "text-emerald-700", bg: "bg-emerald-50" },
  alerta:       { label: "Alerta",       color: "text-orange-700",  bg: "bg-orange-50"  },
};

const STATUS_CONFIG = {
  enviado:  { label: "Enviado",  color: "text-slate-500",   bg: "bg-slate-100",   icon: "📤" },
  aberto:   { label: "Aberto",   color: "text-blue-600",    bg: "bg-blue-50",     icon: "👁"  },
  clicado:  { label: "Clicado",  color: "text-emerald-600", bg: "bg-emerald-50",  icon: "✅" },
  falhou:   { label: "Falhou",   color: "text-red-600",     bg: "bg-red-50",      icon: "❌" },
};

function CanalBadge({ canal }: { canal: Canal }) {
  const c = CANAL_ICONS[canal];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border", c.bg, c.color)}>
      {c.icon} {c.label}
    </span>
  );
}

function TomBadge({ tom }: { tom: Tom }) {
  const t = TOM_CONFIG[tom];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold", t.bg, t.color)}>
      {t.label}
    </span>
  );
}

function TestSendModal({ trigger, onClose }: { trigger: Trigger; onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!email && !phone) { setError("Informe email ou telefone."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/api/comunicacao/testar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerId: trigger.id, canal: trigger.canal[0], email, phone, tom: trigger.tom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro");
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? "Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-black text-slate-800 text-lg">Testar Disparo</h3>
            <p className="text-sm text-slate-500 mt-0.5">{trigger.icon} {trigger.nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="font-black text-slate-800">Mensagem enviada!</p>
            <p className="text-sm text-slate-500 mt-1">Verifique sua caixa de entrada</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm">Fechar</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase mb-2">Canais do trigger</p>
              <div className="flex gap-2 flex-wrap">
                {trigger.canal.map(c => <CanalBadge key={c} canal={c} />)}
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase block mb-1">Email de teste</label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="aluno@exemplo.com"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            {trigger.canal.includes("whatsapp") && (
              <div>
                <label className="text-xs font-black text-slate-500 uppercase block mb-1">WhatsApp (com DDD)</label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            )}
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <button onClick={handleSend} disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? "Enviando..." : "Enviar teste"}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = "triggers" | "templates" | "historico" | "configuracoes";

export default function ComunicacaoPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("triggers");
  const [triggers, setTriggers] = useState<Trigger[]>(TRIGGERS_INICIAIS);
  const [testTrigger, setTestTrigger] = useState<Trigger | null>(null);
  const [filtroCanal, setFiltroCanal] = useState<Canal | "todos">("todos");
  const [templateAberto, setTemplateAberto] = useState<string | null>(null);

  const totalDisparos = triggers.reduce((s, t) => s + t.disparos, 0);
  const totalAtivos = triggers.filter(t => t.status === "ativo").length;
  const mediaAbertura = Math.round(triggers.reduce((s, t) => s + t.taxaAbertura, 0) / triggers.length);

  function toggleTrigger(id: string) {
    setTriggers(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === "ativo" ? "pausado" : "ativo" } : t
    ));
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "triggers",      label: "Triggers",    icon: Zap        },
    { id: "templates",     label: "Templates",   icon: MessageSquare },
    { id: "historico",     label: "Histórico",   icon: Clock      },
    { id: "configuracoes", label: "Configurar",  icon: Settings   },
  ];

  const triggersVisiveis = filtroCanal === "todos"
    ? triggers
    : triggers.filter(t => t.canal.includes(filtroCanal));

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <div className="pt-16 pb-24 md:pb-8 max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="py-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <span className="text-2xl">📡</span> Orquestrador de Comunicação
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Zero aluno perdido, zero professor sobrecarregado — mensagens automáticas e inteligentes.
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-200">
              <Plus className="w-4 h-4" /> Novo trigger
            </button>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: "Disparos totais", value: totalDisparos.toLocaleString("pt-BR"), icon: "📤", color: "bg-indigo-50 border-indigo-200" },
              { label: "Triggers ativos", value: totalAtivos.toString(), icon: "⚡", color: "bg-emerald-50 border-emerald-200" },
              { label: "Taxa média abertura", value: `${mediaAbertura}%`, icon: "👁", color: "bg-amber-50 border-amber-200" },
              { label: "Canais configurados", value: "4", icon: "📡", color: "bg-indigo-50 border-indigo-200" },
            ].map((m, i) => (
              <div key={i} className={cn("rounded-2xl border p-4", m.color)}>
                <p className="text-2xl mb-1">{m.icon}</p>
                <p className="text-xl font-black text-slate-800">{m.value}</p>
                <p className="text-xs text-slate-500 font-medium">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Fluxo visual */}
        <div className="bg-slate-900 rounded-2xl p-5 mb-5 text-white overflow-x-auto">
          <p className="text-xs font-black text-slate-400 uppercase mb-3">Fluxo de envio automatizado</p>
          <div className="flex items-center gap-2 min-w-max">
            {["🔍 Detecção", "🧠 Análise", "⚖️ Decisão", "✍️ Personalização", "📤 Envio", "📊 Medição"].map((step, i, arr) => (
              <div key={i} className="flex items-center gap-2">
                <div className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold whitespace-nowrap">{step}</div>
                {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
            {[
              "Sistema detecta evento",
              "Canal? Tom? Horário?",
              "WhatsApp ou Email?",
              "Nome, progresso, próxima ação",
              "API WhatsApp / Resend",
              "Abriu? Clicou? Converteu?",
            ].map((desc, i) => (
              <p key={i} className="text-[10px] text-slate-400 leading-snug">{desc}</p>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 mb-5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-1 justify-center",
                tab === t.id ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:bg-slate-50"
              )}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Triggers */}
        {tab === "triggers" && (
          <div className="space-y-3">
            {/* Filtro canal */}
            <div className="flex gap-2 flex-wrap">
              <p className="text-xs font-black text-slate-400 uppercase self-center mr-1">Canal:</p>
              {(["todos", "whatsapp", "email", "push", "sms"] as const).map(c => (
                <button key={c} onClick={() => setFiltroCanal(c)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-all border",
                    filtroCanal === c
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  )}>
                  {c === "todos" ? "Todos" : CANAL_ICONS[c].icon + " " + CANAL_ICONS[c].label}
                </button>
              ))}
            </div>

            {triggersVisiveis.map(trigger => (
              <motion.div key={trigger.id} layout
                className={cn(
                  "bg-white rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all",
                  trigger.status === "pausado" ? "opacity-60 border-slate-200" : "border-slate-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50"
                )}>
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{trigger.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-slate-800 text-sm">{trigger.nome}</p>
                      <TomBadge tom={trigger.tom} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{trigger.descricao}</p>
                    <code className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono mt-1 inline-block">{trigger.condicao}</code>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {trigger.canal.map(c => <CanalBadge key={c} canal={c} />)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <p className="text-lg font-black text-slate-800">{trigger.disparos.toLocaleString("pt-BR")}</p>
                    <p className="text-[10px] text-slate-400 font-medium">disparos</p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className={cn("text-lg font-black", trigger.taxaAbertura >= 70 ? "text-emerald-600" : trigger.taxaAbertura >= 50 ? "text-amber-600" : "text-red-500")}>
                      {trigger.taxaAbertura}%
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">abertura</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => toggleTrigger(trigger.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                        trigger.status === "ativo"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                      )}>
                      {trigger.status === "ativo" ? <><ToggleRight className="w-3.5 h-3.5" /> Ativo</> : <><ToggleLeft className="w-3.5 h-3.5" /> Pausado</>}
                    </button>
                    <button onClick={() => setTestTrigger(trigger)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-all">
                      <Send className="w-3.5 h-3.5" /> Testar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tab: Templates */}
        {tab === "templates" && (
          <div className="space-y-3">
            {TEMPLATES.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <button onClick={() => setTemplateAberto(templateAberto === t.id ? null : t.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left">
                  <span className="text-xl">{CANAL_ICONS[t.canal].icon}</span>
                  <div className="flex-1">
                    <p className="font-black text-slate-800 text-sm">{t.nome}</p>
                    <div className="flex gap-2 mt-1">
                      <CanalBadge canal={t.canal} />
                      <TomBadge tom={t.tom} />
                    </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", templateAberto === t.id && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {templateAberto === t.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-5 pb-4 space-y-3">
                        <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono">{t.preview}</pre>
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase mb-1.5">Variáveis dinâmicas</p>
                          <div className="flex flex-wrap gap-2">
                            {t.variaveis.map(v => (
                              <code key={v} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-mono font-bold">{v}</code>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5">
                            <Settings className="w-3.5 h-3.5" /> Editar template
                          </button>
                          <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5" /> Testar envio
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Histórico */}
        {tab === "historico" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-600">{HISTORICO_ENVIOS.length} envios recentes</p>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                <Filter className="w-3.5 h-3.5" /> Filtrar
              </button>
            </div>
            {HISTORICO_ENVIOS.map(envio => {
              const sc = STATUS_CONFIG[envio.status];
              return (
                <div key={envio.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">{CANAL_ICONS[envio.canal].icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-slate-800 text-sm">{envio.aluno}</p>
                      <CanalBadge canal={envio.canal} />
                      <TomBadge tom={envio.tom} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Trigger: {envio.trigger}</p>
                    <p className="text-xs text-slate-600 mt-1 italic leading-snug">"{envio.mensagem}"</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-bold", sc.bg, sc.color)}>
                      {sc.icon} {sc.label}
                    </span>
                    <p className="text-[10px] text-slate-400">{envio.horario}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: Configurações */}
        {tab === "configuracoes" && (
          <div className="space-y-4">
            {/* Canais */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-black text-slate-800 mb-4">📡 Canais de Envio</h3>
              <div className="space-y-3">
                {[
                  { canal: "whatsapp" as Canal, status: "Configurado", badge: "bg-emerald-100 text-emerald-700", info: "WhatsApp Business API — via Meta" },
                  { canal: "email" as Canal, status: "Configurado", badge: "bg-emerald-100 text-emerald-700", info: "Resend — contato@study.ia.br" },
                  { canal: "push" as Canal, status: "Configurado", badge: "bg-emerald-100 text-emerald-700", info: "Firebase Cloud Messaging (FCM)" },
                  { canal: "sms" as Canal, status: "Configurar", badge: "bg-amber-100 text-amber-700", info: "Twilio — fallback para WhatsApp" },
                ].map(row => (
                  <div key={row.canal} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-2xl">{CANAL_ICONS[row.canal].icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-slate-700 text-sm">{CANAL_ICONS[row.canal].label}</p>
                      <p className="text-xs text-slate-400">{row.info}</p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", row.badge)}>{row.status}</span>
                    <button className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-bold transition-all">
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Horários de envio */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-black text-slate-800 mb-4">⏰ Janelas de Envio (Horário de Brasília)</h3>
              <div className="space-y-2">
                {[
                  { canal: "WhatsApp", janela: "07:00 – 21:00", dias: "Seg a Sáb" },
                  { canal: "Email",    janela: "08:00 – 20:00", dias: "Seg a Dom" },
                  { canal: "Push",     janela: "07:00 – 22:00", dias: "Seg a Dom" },
                ].map(row => (
                  <div key={row.canal} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                    <p className="font-bold text-slate-700">{row.canal}</p>
                    <p className="text-slate-500">{row.dias} · {row.janela}</p>
                    <button className="text-indigo-600 text-xs font-bold hover:underline">Editar</button>
                  </div>
                ))}
              </div>
            </div>

            {/* LGPD */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-amber-800 text-sm">Conformidade LGPD</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    Todas as mensagens incluem link de opt-out obrigatório. Dados de alunos menores de 18 anos exigem consentimento do responsável.
                    O StudyAI não vende ou compartilha dados com terceiros para fins publicitários.
                  </p>
                  <button className="mt-2 text-xs font-bold text-amber-700 underline">Ver política de privacidade →</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de teste */}
      <AnimatePresence>
        {testTrigger && (
          <TestSendModal trigger={testTrigger} onClose={() => setTestTrigger(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
