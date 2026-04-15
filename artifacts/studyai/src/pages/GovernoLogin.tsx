import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Globe, ArrowLeft, RefreshCw, Shield, CheckCircle, Mail,
  BarChart2, Building2, TrendingUp, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudyAuth } from "@/hooks/useStudyAuth";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

type State = "loading" | "not_logged_in" | "wrong_role" | "requesting" | "requested" | "error";

export default function GovernoLoginPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading, user, login } = useStudyAuth();
  const [state, setState] = useState<State>("loading");
  const [form, setForm] = useState({ organ: "", position: "", cpf: "", message: "" });
  const [sending, setSending] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { setState("not_logged_in"); return; }
    checkRole();
  }, [isAuthenticated, isLoading]);

  async function checkRole() {
    setState("loading");
    try {
      const res = await fetch(`${BASE}/api/subscription/status`);
      const d = await res.json();
      const r = d.role ?? null;
      if (["government", "admin"].includes(r ?? "")) {
        navigate("/governo");
      } else {
        setState("wrong_role");
      }
    } catch {
      setState("wrong_role");
    }
  }

  async function requestAccess(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setErrMsg("");
    try {
      const res = await fetch(`${BASE}/api/government/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setState("requested");
      } else {
        const d = await res.json();
        setErrMsg(d.error || "Erro ao enviar solicitação");
      }
    } catch {
      setErrMsg("Erro de conexão. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (state === "requested") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
          <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Solicitação Enviada!</h2>
          <p className="text-slate-400 mb-6">
            Sua solicitação de acesso ao Portal Governo foi registrada. Nossa equipe irá validar seus dados e liberar o acesso em até 48 horas.
          </p>
          <Button onClick={() => navigate("/app")} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
            Voltar ao início
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar ao início
        </button>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left: Info */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-xl shadow-emerald-900/40">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-3">Portal Governo</h1>
            <p className="text-slate-400 mb-8">Acesso exclusivo para gestores públicos e órgãos governamentais conveniados ao StudyAI.</p>

            <div className="space-y-4">
              {[
                { icon: BarChart2, title: "Painel de Impacto Educacional", desc: "Métricas consolidadas de desempenho de toda a plataforma: usuários ativos, taxa de acerto, engajamento." },
                { icon: TrendingUp, title: "Crescimento e Evolução", desc: "Gráficos semanais de crescimento de usuários e atividade educacional na plataforma." },
                { icon: Building2, title: "Gestão de Instituições", desc: "Visão de todas as instituições conveniadas, turmas ativas e alunos impactados." },
                { icon: FileText, title: "Relatórios para Políticas Públicas", desc: "Dados agregados para embasamento de decisões e relatórios governamentais." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{title}</p>
                    <p className="text-slate-500 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Login / Request */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {state === "not_logged_in" && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8">
                <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-6 text-xs">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span>Área restrita — acesso exclusivo para servidores e gestores públicos.</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Acesso ao Portal</h2>
                <p className="text-slate-400 text-sm mb-6">
                  Entre com sua conta StudyAI. Após o login, você poderá solicitar ativação do perfil governamental caso ainda não tenha.
                </p>
                <Button
                  onClick={() => {
                    sessionStorage.setItem("auth_return_to", "/governo/login");
                    login();
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-bold text-base">
                  Entrar com minha conta
                </Button>
                <p className="text-center text-slate-500 text-xs mt-4">
                  Ainda não tem conta?{" "}
                  <button onClick={() => { sessionStorage.setItem("auth_return_to", "/governo/login"); navigate("/sign-up"); }}
                    className="text-emerald-400 hover:text-emerald-300">Criar conta</button>
                </p>
              </div>
            )}

            {state === "wrong_role" && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8">
                <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-6 text-xs">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span>Seu perfil ainda não tem credencial governamental.</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Solicitar Acesso Governamental</h2>
                <p className="text-slate-400 text-sm mb-5">
                  Olá, {user?.firstName ?? "gestor"}! Informe seus dados institucionais para solicitar acesso ao painel.
                </p>
                <form onSubmit={requestAccess} className="space-y-4">
                  <div>
                    <label className="text-slate-300 text-sm font-medium block mb-1.5">Órgão / Secretaria</label>
                    <input
                      type="text" required value={form.organ}
                      onChange={e => setForm(p => ({ ...p, organ: e.target.value }))}
                      placeholder="Ex: Secretaria Municipal de Educação de SP"
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium block mb-1.5">Cargo / Função</label>
                    <input
                      type="text" required value={form.position}
                      onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
                      placeholder="Ex: Coordenador Pedagógico, Secretário de Educação..."
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium block mb-1.5">CPF do servidor</label>
                    <input
                      type="text" required value={form.cpf}
                      onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))}
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium block mb-1.5">Observações (opcional)</label>
                    <textarea
                      rows={2} value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="Descreva a finalidade de acesso ao painel..."
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm resize-none"
                    />
                  </div>
                  {errMsg && <p className="text-red-400 text-sm">{errMsg}</p>}
                  <Button type="submit" disabled={sending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-bold">
                    {sending ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : "Enviar Solicitação"}
                  </Button>
                </form>
                <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-2 text-slate-500 text-xs">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contato institucional: <a href="mailto:governo@study.ia.br" className="text-emerald-400 hover:text-emerald-300">governo@study.ia.br</a></span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
