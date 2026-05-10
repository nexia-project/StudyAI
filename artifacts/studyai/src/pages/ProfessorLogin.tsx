import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  GraduationCap, ArrowLeft, RefreshCw, Shield, CheckCircle, Mail,
  BookOpen, Users, BarChart2, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudyAuth } from "@/hooks/useStudyAuth";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

type State = "loading" | "not_logged_in" | "wrong_role" | "requesting" | "requested" | "error";

export default function ProfessorLoginPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading, user, login } = useStudyAuth();
  const [state, setState] = useState<State>("loading");
  const [role, setRole] = useState<string | null>(null);
  const [form, setForm] = useState({ school: "", subject: "", message: "" });
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
      setRole(r);
      if (["teacher", "institution_admin", "admin"].includes(r ?? "")) {
        navigate("/professor");
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
      const res = await fetch(`${BASE}/api/teacher/request-access`, {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (state === "requested") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 max-w-md text-center">
          <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Solicitação Enviada!</h2>
          <p className="text-slate-400 mb-6">
            Sua solicitação de acesso ao Portal do Professor foi registrada. O administrador irá revisar e liberar seu acesso em breve.
          </p>
          <Button onClick={() => navigate("/app")} className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
            Voltar ao início
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar ao início
        </button>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left: Info */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mb-6 shadow-xl shadow-violet-900/40">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-3">Portal do Professor</h1>
            <p className="text-slate-400 mb-8">Acesso exclusivo para professores cadastrados na plataforma StudyAI.</p>

            <div className="space-y-4">
              {[
                { icon: Users, title: "Gerencie suas Turmas", desc: "Crie turmas, adicione alunos por código de convite e acompanhe o progresso de cada um." },
                { icon: BarChart2, title: "Relatórios Detalhados", desc: "Veja métricas de desempenho, taxa de acerto nos simulados e engajamento por turma." },
                { icon: BookOpen, title: "Conteúdo Pedagógico", desc: "Acesse materiais didáticos exclusivos e integre com o Professor Tiagão." },
                { icon: Zap, title: "Tarefas e Atividades", desc: "Envie tarefas para seus alunos e monitore a entrega em tempo real." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-violet-400" />
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
                  <span>Área restrita — faça login com sua conta de professor.</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Acesso ao Portal</h2>
                <p className="text-slate-400 text-sm mb-6">
                  Entre com sua conta StudyAI. Se você ainda não tem o perfil de professor ativado, pode solicitar abaixo após fazer login.
                </p>
                <Button
                  onClick={() => {
                    sessionStorage.setItem("auth_return_to", "/professor/login");
                    login();
                  }}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-3 font-bold text-base">
                  Entrar com minha conta
                </Button>
                <p className="text-center text-slate-500 text-xs mt-4">
                  Ainda não tem conta?{" "}
                  <button onClick={() => { sessionStorage.setItem("auth_return_to", "/professor/login"); navigate("/sign-up"); }}
                    className="text-violet-400 hover:text-violet-300">Cadastre-se grátis</button>
                </p>
              </div>
            )}

            {state === "wrong_role" && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8">
                <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-6 text-xs">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span>Seu perfil ainda não tem acesso ao Portal do Professor.</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Solicitar Acesso</h2>
                <p className="text-slate-400 text-sm mb-5">
                  Olá, {user?.firstName ?? "professor"}! Preencha os dados abaixo para solicitar ativação do seu perfil docente.
                </p>
                <form onSubmit={requestAccess} className="space-y-4">
                  <div>
                    <label className="text-slate-300 text-sm font-medium block mb-1.5">Escola / Instituição</label>
                    <input
                      type="text" required value={form.school}
                      onChange={e => setForm(p => ({ ...p, school: e.target.value }))}
                      placeholder="Nome da escola onde leciona"
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium block mb-1.5">Disciplina que leciona</label>
                    <input
                      type="text" required value={form.subject}
                      onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                      placeholder="Ex: Matemática, Português, Biologia..."
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium block mb-1.5">Mensagem (opcional)</label>
                    <textarea
                      rows={3} value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="Conte brevemente sobre sua experiência como professor..."
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm resize-none"
                    />
                  </div>
                  {errMsg && <p className="text-red-400 text-sm">{errMsg}</p>}
                  <Button type="submit" disabled={sending}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-3 font-bold">
                    {sending ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : "Enviar Solicitação"}
                  </Button>
                </form>
                <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-2 text-slate-500 text-xs">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Ou entre em contato: <a href="mailto:contato@study.ia.br" className="text-violet-400 hover:text-violet-300">contato@study.ia.br</a></span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
