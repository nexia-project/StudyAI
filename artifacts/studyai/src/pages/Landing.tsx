import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Brain, Zap, Trophy, Clock, BarChart2, Star,
  ArrowRight, BookOpen, Sparkles, Users, GraduationCap,
  PenLine, Map, Target, CheckCircle, ChevronDown, Mic,
  Radio, Cpu, Layers, Shield, Building2, Globe, MessageSquare,
  TrendingUp, Bell, Play, Menu, X, MessageCircle, AlertTriangle,
} from "lucide-react";
import { startCheckout } from "@/hooks/useSubscription";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

const STATS = [
  { v: "+500 mil", l: "estudantes preparados" },
  { v: "89%", l: "taxa de aprovação média" },
  { v: "4.9★", l: "avaliação na loja" },
  { v: "24/7", l: "tutor IA disponível" },
];

const FEATURES = [
  { icon: Target,    label: "Plano de Estudos IA",      desc: "Plano personalizado dia a dia com IA. PDF, foto ou tema digitado.", color: "text-violet-500", bg: "bg-violet-900/40", border: "border-violet-500/30" },
  { icon: Mic,       label: "Tutor Tiagão 24h",         desc: "Primeiro tutor de voz proativo do Brasil. Chama você, age no app.", color: "text-orange-400", bg: "bg-orange-900/40",  border: "border-orange-500/30" },
  { icon: Layers,    label: "Notebook RAG",              desc: "Transforme qualquer material em aula interativa com IA.", color: "text-indigo-400", bg: "bg-indigo-900/40", border: "border-indigo-500/30" },
  { icon: PenLine,   label: "Corretor de Redação",       desc: "Nota 0–1000 em 30s nas 5 competências ENEM.", color: "text-rose-400",   bg: "bg-rose-900/40",   border: "border-rose-500/30"   },
  { icon: Zap,       label: "Simulado Adaptativo",       desc: "A IA detecta suas lacunas e gera questões cirúrgicas.", color: "text-blue-400",   bg: "bg-blue-900/40",   border: "border-blue-500/30"   },
  { icon: Users,     label: "Aula ao Vivo 2.0",         desc: "Sala virtual com quadro colaborativo, quiz e gravação automática.", color: "text-emerald-400", bg: "bg-emerald-900/40", border: "border-emerald-500/30" },
  { icon: BarChart2, label: "Análise Preditiva",         desc: "IA prevê risco de evasão e sugere intervenção em tempo real.", color: "text-cyan-400",   bg: "bg-cyan-900/40",   border: "border-cyan-500/30"   },
  { icon: Trophy,    label: "Gamificação Natural",       desc: "Streaks, conquistas, ranking e desafios semanais por turma.", color: "text-amber-400", bg: "bg-amber-900/40",  border: "border-amber-500/30"  },
];

const STEPS = [
  { num: "01", title: "Conte seus objetivos", desc: "IA analisa seu perfil em 2 minutos — nível, matérias, tempo disponível e data do ENEM.", icon: "🎯" },
  { num: "02", title: "Receba seu plano personalizado", desc: "Estudo diário, revisões, simulados e flashcards — tudo calculado para a sua realidade.", icon: "📅" },
  { num: "03", title: "Estude com tutor IA 24h", desc: "Dúvidas? O Tiagão explica por voz. Quer aprofundar? O Notebook transforma qualquer material em aula.", icon: "🤖" },
];

const TESTIMONIALS = [
  { name: "Mariana S.", role: "Medicina — USP 2024", text: "Tirava 580. Depois de 2 meses com o StudyAI, fui para 724. A Tiagão me chamava quando ficava dias sem estudar. Era como ter uma tutora particular.", before: "580 pts", after: "724 pts", emoji: "🎓" },
  { name: "Carlos M.", role: "Aprovado no TRF — 3ª tentativa", text: "O Simulado Adaptativo detectou meus pontos cegos. Finalmente passei após 3 anos tentando. A IA sabia onde eu precisava melhorar melhor do que eu mesmo.", before: "3 reprovações", after: "✅ Aprovado", emoji: "📋" },
  { name: "Juliana R.", role: "FUVEST — Direito", text: "Fotografava minha apostila no ônibus. Em 30 segundos tinha exercícios sobre o que ia cair. Nunca estudei tão pouco e aprendi tanto.", before: "Sem foco", after: "✅ Aprovada", emoji: "⚡" },
  { name: "Rafael T.", role: "3ª série — Ensino Médio", text: "Minha redação foi de 640 para 880. O corretor identificou que eu não desenvolvia proposta de intervenção. Nenhum professor havia me dito isso antes.", before: "Redação 640", after: "Redação 880", emoji: "✍️" },
];

const PLANS = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "",
    desc: "Comece agora, sem cartão",
    highlight: false,
    color: "border-slate-700",
    features: [
      "1 plano de estudos por mês",
      "2 simulados por mês",
      "5 flashcards por semana",
      "5 mensagens/dia com Tiagão",
      "1 correção de redação/mês",
      "Dashboard de desempenho",
    ],
    cta: "Começar Grátis",
    ctaStyle: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
  },
  {
    name: "Pro",
    price: "R$ 29,90",
    period: "/mês",
    desc: "Para estudantes sérios",
    highlight: true,
    color: "border-indigo-500",
    features: [
      "Planos e simulados ilimitados",
      "Flashcards com IA avançada",
      "Tiagão ilimitada + voz proativa",
      "Correções de redação ilimitadas",
      "Notebook RAG completo",
      "Dashboard + mapa de calor",
      "Histórico + ranking prioritário",
    ],
    cta: "Assinar Pro",
    ctaStyle: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30",
  },
  {
    name: "Escola",
    price: "Sob consulta",
    period: "",
    desc: "Para instituições de ensino",
    highlight: false,
    color: "border-emerald-700",
    features: [
      "Todos os alunos ilimitados",
      "Dashboard de gestão institucional",
      "Relatórios e análise preditiva",
      "Orquestrador de comunicação",
      "White label disponível",
      "Suporte dedicado",
    ],
    cta: "Falar com vendas",
    ctaStyle: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
];

const FAQS = [
  { q: "O StudyAI é gratuito?", a: "Sim! O plano gratuito inclui plano de estudos, simulados, flashcards, redação e acesso ao Tiagão (5 mensagens/dia). O Pro (R$29,90/mês) libera tudo ilimitado." },
  { q: "O que é a Professor Tiagão?", a: "Tiagão é o primeiro tutor por voz com IA do Brasil. Age de forma proativa — chama você quando percebe que está dias sem estudar, sabe seu plano e pontos fracos. É como ter um tutor particular 24h." },
  { q: "Como o plano de estudos é gerado?", a: "Você informa matéria, nível, tempo disponível e objetivo. Pode enviar PDF, DOCX ou foto do caderno. Nossa IA cria um cronograma personalizado dia a dia com tópicos, exercícios e flashcards." },
  { q: "Funciona para ENEM, vestibular e concursos?", a: "Sim! O StudyAI foi criado para estudantes brasileiros. A IA adapta conteúdo para ENEM, FUVEST, UNICAMP, OAB, Receita Federal, PRF, concursos militares e qualquer outra prova." },
  { q: "Como funciona a correção de redação ENEM?", a: "Envie sua redação (texto ou foto). A IA avalia nas 5 competências oficiais: domínio da norma culta, compreensão do tema, argumentos, coesão e proposta de intervenção. Resultado em menos de 30 segundos." },
  { q: "O que é o Notebook RAG?", a: "É o diferencial competitivo do StudyAI. Você sobe qualquer material (PDF, vídeo, site) e nossa IA responde com base exatamente naquele conteúdo — gerando resumos, flashcards, questões e planos de aula diretamente do seu material." },
  { q: "Vale mais do que um cursinho?", a: "Cursinhos tradicionais custam R$200–800/mês com conteúdo igual para todos. O StudyAI oferece plano 100% personalizado, simulados ilimitados e tutor IA 24h por R$29,90/mês — ou gratuitamente no plano básico." },
];

const B2B_TYPES = ["Escola privada", "Cursinho pré-vestibular", "Universidade / Faculdade", "Secretaria de Educação", "ONG / Terceiro Setor", "Empresa (RH / T&D)", "Outro"];
const B2B_STUDENTS = ["Até 100 alunos", "101 – 500 alunos", "501 – 2.000 alunos", "2.001 – 10.000 alunos", "Mais de 10.000 alunos"];

export default function Landing() {
  const [, navigate] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTest, setActiveTest] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [b2bForm, setB2bForm] = useState({ name: "", email: "", institution: "", type: "", students: "", message: "" });
  const [b2bLoading, setB2bLoading] = useState(false);
  const [b2bDone, setB2bDone] = useState(false);
  const [b2bError, setB2bError] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setActiveTest(v => (v + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => navigate("/app");
  const handlePro = async () => {
    setCheckoutLoading(true);
    try { await startCheckout(); } catch { navigate("/pricing"); }
    finally { setCheckoutLoading(false); }
  };

  const handleB2bSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setB2bError("");
    if (!b2bForm.name || !b2bForm.email || !b2bForm.institution || !b2bForm.type) {
      setB2bError("Preencha todos os campos obrigatórios."); return;
    }
    setB2bLoading(true);
    try {
      const res = await fetch(`${BASE}/api/leads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b2bForm) });
      if (!res.ok) throw new Error("erro");
      setB2bDone(true);
    } catch { setB2bError("Erro ao enviar. Tente novamente ou mande email para contato@study.ia.br."); }
    finally { setB2bLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-[#0F172A]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
          <a href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/30">S</div>
            <span className="font-black text-lg tracking-tight text-white">Study<span className="text-indigo-400">.IA</span></span>
          </a>

          <div className="hidden md:flex items-center gap-6 flex-1">
            <a href="#para-alunos" className="text-sm text-slate-400 hover:text-white font-medium transition-colors">Para alunos</a>
            <a href="#para-professores" className="text-sm text-slate-400 hover:text-white font-medium transition-colors">Para professores</a>
            <a href="#para-escolas" className="text-sm text-slate-400 hover:text-white font-medium transition-colors">Para escolas</a>
            <a href="#precos" className="text-sm text-slate-400 hover:text-white font-medium transition-colors">Preços</a>
          </div>

          <div className="md:hidden flex-1" />

          <div className="flex items-center gap-2.5">
            <button onClick={handleStart} className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors font-medium px-2">Entrar</button>
            <button onClick={handleStart}
              className="text-sm font-bold px-5 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]">
              Começar grátis
            </button>
            <button onClick={() => setMobileMenuOpen(v => !v)} className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
              className="overflow-hidden border-t border-white/10 bg-slate-900 md:hidden">
              <div className="px-6 py-4 flex flex-col gap-4">
                {["#para-alunos", "#para-professores", "#para-escolas", "#precos"].map((href, i) => (
                  <a key={i} href={href} onClick={() => setMobileMenuOpen(false)}
                    className="text-slate-300 hover:text-white font-medium transition-colors">
                    {["Para alunos", "Para professores", "Para escolas", "Preços"][i]}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        {/* Glow backgrounds */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px]" />
          <div className="absolute top-40 right-10 w-[300px] h-[300px] bg-violet-600/15 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-8">
              <Radio className="w-3 h-3 animate-pulse text-indigo-400" /> Novo: Tutor Tiagão — Voz proativa com IA em PT-BR
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.04] mb-6">
            A IA que entende{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              como você aprende
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="text-xl text-slate-400 leading-relaxed max-w-3xl mx-auto mb-10">
            Plano de estudos personalizado + Tutor IA 24h + Simulados adaptativos + Tudo integrado.<br />
            <span className="text-slate-300 font-medium">Feito para o ENEM, vestibular e concursos brasileiros.</span>
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button onClick={handleStart}
              className="group flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all hover:scale-[1.03] active:scale-[0.97] shadow-xl shadow-indigo-500/30 text-base">
              Começar grátis — 2 minutos
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={handleStart}
              className="flex items-center gap-2.5 px-8 py-4 rounded-2xl font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/15 transition-all text-base">
              <Play className="w-4 h-4" /> Ver demonstração
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}
            className="flex flex-wrap items-center justify-center gap-8 text-sm">
            {STATS.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="font-black text-white text-xl">{s.v}</span>
                <span className="text-slate-500">{s.l}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SOCIAL PROOF (school logos placeholder) ── */}
      <section className="border-y border-white/5 py-8 px-6 bg-white/3">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Confiado por estudantes das melhores escolas do Brasil</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-40">
            {["USP", "UNICAMP", "PUC", "Cursinho Popular", "FUVEST", "Colégio Objetivo", "Abril Educação"].map(name => (
              <span key={name} className="text-sm font-black text-slate-400 tracking-tight">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-14">
            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Como funciona</p>
            <h2 className="text-4xl font-black tracking-tight text-white">3 passos para transformar seus estudos</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1}
                className="relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl mb-4">
                  {step.icon}
                </div>
                <span className="absolute top-5 right-5 text-5xl font-black text-white/5 group-hover:text-white/10 transition-all">{step.num}</span>
                <h3 className="font-black text-white text-lg mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TUTOR TIAGÃO FEATURE ── */}
      <section id="para-alunos" className="py-24 px-6 bg-gradient-to-b from-transparent via-indigo-950/30 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wide mb-4">
                <Radio className="w-3 h-3 animate-pulse" /> Exclusivo Study.IA
              </span>
              <h2 className="text-4xl font-black tracking-tight text-white mb-4">
                Conheça a Professor Tiagão
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-8">
                O primeiro tutor por voz com IA que age de forma proativa. Não espera você perguntar — <strong className="text-white">ela chama você</strong>.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Radio,  title: "Fala primeiro, sem você pedir",    desc: "Percebe quando você ficou dias sem estudar e chama por voz.", color: "text-orange-400" },
                  { icon: Cpu,    title: "Sabe tudo sobre seu progresso",     desc: "Acesso ao seu plano, XP, matérias e histórico completo.", color: "text-violet-400" },
                  { icon: Layers, title: "Age no app por você",              desc: "Peça para criar um plano ou navegar — ela executa.", color: "text-blue-400" },
                  { icon: Shield, title: "Voz natural, zero robótica",        desc: "Voz calorosa e fluida, 100% exclusiva do Study.IA.", color: "text-emerald-400" },
                ].map((b, i) => (
                  <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1}
                    className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                      <b.icon className={`w-4 h-4 ${b.color}`} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{b.title}</p>
                      <p className="text-slate-400 text-sm leading-snug">{b.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <button onClick={handleStart}
                className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all text-sm shadow-lg shadow-indigo-500/30">
                Conhecer o Tiagão <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            {/* Visual card do Tiagão */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}>
              <div className="relative rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-violet-600 flex items-center justify-center font-black text-white text-sm">T</div>
                  <div>
                    <p className="font-black text-white text-sm">Professor Tiagão</p>
                    <p className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Online agora</p>
                  </div>
                  <Mic className="w-4 h-4 text-orange-400 ml-auto animate-pulse" />
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    { role: "tiagao", msg: "🎯 Ei Ana! Você ficou 3 dias sem estudar. Seu streak de 12 dias está em risco!" },
                    { role: "user",   msg: "Que bom que me lembrou! Posso estudar só 20 minutos hoje?" },
                    { role: "tiagao", msg: "Claro! Já preparei uma revisão express de Funções — os seus pontos mais fracos. Vamos?" },
                    { role: "user",   msg: "Sim! Começar agora." },
                    { role: "tiagao", msg: "✅ Abrindo o módulo de Funções Logarítmicas... Prontas as suas 5 questões personalizadas!" },
                  ].map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] text-xs leading-snug ${
                        m.role === "tiagao" ? "bg-indigo-600/30 text-slate-200 rounded-tl-sm" : "bg-white/10 text-slate-300 rounded-tr-sm"
                      }`}>{m.msg}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                    <Mic className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                    <span className="text-xs text-slate-500">Falar com o Tiagão...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="funcoes" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14">
            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Diferenciais</p>
            <h2 className="text-4xl font-black tracking-tight text-white">Tudo integrado. Uma única plataforma.</h2>
            <p className="text-slate-400 mt-3 max-w-2xl mx-auto">Cada módulo conversa com os outros. Seu erro no simulado vira flashcard, que vira plano de aula, que vira revisão programada automaticamente.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.06}
                className={`p-5 rounded-2xl ${f.bg} border ${f.border} hover:scale-[1.02] transition-all cursor-pointer group`}>
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <f.icon className={`w-4.5 h-4.5 ${f.color}`} />
                </div>
                <p className="font-black text-white text-sm mb-1.5">{f.label}</p>
                <p className="text-slate-400 text-xs leading-snug">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROFESSOR SECTION ── */}
      <section id="para-professores" className="py-24 px-6 bg-gradient-to-b from-transparent via-violet-950/20 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.6 }}>
              <div className="rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
                <p className="text-xs font-black text-slate-400 uppercase mb-4">Portal do Professor</p>
                <div className="space-y-2">
                  {[
                    { icon: Users,        label: "3 Turmas ativas",           sub: "90 alunos monitorados",    color: "text-indigo-400" },
                    { icon: AlertTriangle, label: "2 alunos em atenção",       sub: "Risco de abandono detectado", color: "text-amber-400" },
                    { icon: MessageSquare, label: "Comunicação automatizada",  sub: "12 mensagens enviadas hoje", color: "text-green-400" },
                    { icon: Brain,        label: "Plano de Aula IA gerado",   sub: "Funções Logarítmicas — 9º B", color: "text-violet-400" },
                    { icon: TrendingUp,   label: "Desempenho da turma",       sub: "+8% vs semana anterior",  color: "text-emerald-400" },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                        <Icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                        <div className="flex-1">
                          <p className="font-bold text-white text-xs">{item.label}</p>
                          <p className="text-slate-500 text-[11px]">{item.sub}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-400 uppercase tracking-wide mb-4">
                <BookOpen className="w-3 h-3" /> Para Professores
              </span>
              <h2 className="text-4xl font-black tracking-tight text-white mb-4">
                Ensine mais. Administre menos.
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                IA que gera planos de aula, detecta alunos em risco e envia mensagens automáticas — para você focar no que importa: ensinar.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Plano de Aula IA com 6 personas pedagógicas",
                  "Validador por pares (3 IAs revisam cada aula)",
                  "Análise preditiva de risco de evasão",
                  "Orquestrador de comunicação (WhatsApp + Email)",
                  "Notebook RAG para material da turma",
                  "Gerador de provas e atividades",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate("/professor")}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-500 transition-all text-sm shadow-lg shadow-violet-500/30">
                Acessar portal do professor <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── ESCOLA SECTION ── */}
      <section id="para-escolas" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wide mb-4">
                <Building2 className="w-3 h-3" /> Para Escolas
              </span>
              <h2 className="text-4xl font-black tracking-tight text-white mb-4">
                Gestão institucional com IA
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                Dashboard completo para gestores, relatórios automáticos e análise preditiva. Zero aluno perdido.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Dashboard de gestão de turmas e professores",
                  "Relatórios automáticos de desempenho",
                  "Análise preditiva de risco de evasão escolar",
                  "Orquestrador de comunicação com responsáveis",
                  "White label disponível para sua marca",
                  "Suporte dedicado e onboarding assistido",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => { document.getElementById("institucional")?.scrollIntoView({ behavior: "smooth" }); }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all text-sm shadow-lg shadow-emerald-500/30">
                Falar com nossa equipe <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.6 }} className="rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
              <p className="text-xs font-black text-slate-400 uppercase mb-4">⚠️ Alunos em Atenção</p>
              {[
                { nome: "Maria S.", prob: 70, motivo: "5 dias sem acessar, queda em Matemática", acao: "Enviar convite para aula de reforço" },
                { nome: "João P.",  prob: 45, motivo: "Dificuldade em 3 tópicos correlacionados", acao: "Gerar plano de recuperação" },
                { nome: "Lucas M.", prob: 38, motivo: "Meta semanal não atingida por 2 semanas", acao: "Agendar conversa com responsável" },
              ].map((aluno, i) => (
                <div key={i} className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-bold text-white text-sm">{aluno.nome}</p>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${aluno.prob >= 60 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
                      {aluno.prob}% risco
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">{aluno.motivo}</p>
                  <div className="flex gap-2">
                    <button className="text-[11px] font-bold px-2.5 py-1 bg-indigo-600/30 text-indigo-300 rounded-lg hover:bg-indigo-600/50 transition-colors">
                      Enviar msg
                    </button>
                    <button className="text-[11px] font-bold px-2.5 py-1 bg-white/10 text-slate-300 rounded-lg hover:bg-white/15 transition-colors">
                      {aluno.acao.split(" ").slice(0, 2).join(" ")}...
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-slate-800/20 to-transparent">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-12">
            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Depoimentos</p>
            <h2 className="text-4xl font-black tracking-tight text-white">Resultados reais</h2>
          </motion.div>
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div key={activeTest}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="bg-slate-900 border border-white/10 rounded-3xl p-8 md:p-10">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl flex-shrink-0">
                    {TESTIMONIALS[activeTest].emoji}
                  </div>
                  <div>
                    <p className="font-black text-white text-lg">{TESTIMONIALS[activeTest].name}</p>
                    <p className="text-slate-400 text-sm">{TESTIMONIALS[activeTest].role}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold">Antes: {TESTIMONIALS[activeTest].before}</span>
                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold">Depois: {TESTIMONIALS[activeTest].after}</span>
                    </div>
                  </div>
                </div>
                <p className="text-slate-300 text-lg leading-relaxed italic">"{TESTIMONIALS[activeTest].text}"</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center justify-center gap-2 mt-6">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setActiveTest(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === activeTest ? "bg-indigo-400 w-6" : "bg-slate-600 hover:bg-slate-400"}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PREÇOS ── */}
      <section id="precos" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14">
            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Preços</p>
            <h2 className="text-4xl font-black tracking-tight text-white">Planos claros. Sem surpresas.</h2>
            <p className="text-slate-400 mt-3">Enquanto cursinhos tradicionais custam R$200–800/mês, o Study.IA cabe no seu bolso.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1}
                className={`relative rounded-3xl bg-slate-900 border-2 ${plan.color} p-8 flex flex-col ${plan.highlight ? "ring-2 ring-indigo-500/40 ring-offset-2 ring-offset-[#0F172A]" : ""}`}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-full shadow-lg shadow-indigo-500/30">MAIS POPULAR</span>
                  </div>
                )}
                <div className="mb-6">
                  <p className="font-black text-white text-lg">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-slate-400 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">{plan.desc}</p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={plan.name === "Pro" ? handlePro : plan.name === "Escola" ? () => document.getElementById("institucional")?.scrollIntoView({ behavior: "smooth" }) : handleStart}
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${plan.ctaStyle}`}>
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-12">
            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Dúvidas frequentes</p>
            <h2 className="text-4xl font-black tracking-tight text-white">FAQ</h2>
          </motion.div>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.05}
                className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left group">
                  <span className="font-bold text-white text-sm pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <p className="px-6 pb-5 text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORMULÁRIO B2B ── */}
      <section id="institucional" className="py-24 px-6 bg-gradient-to-b from-transparent via-emerald-950/20 to-transparent">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-10">
            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-3">Para instituições</p>
            <h2 className="text-4xl font-black tracking-tight text-white">Falar com nossa equipe</h2>
            <p className="text-slate-400 mt-3">Descubra como o Study.IA pode ser implementado na sua escola ou cursinho.</p>
          </motion.div>

          {b2bDone ? (
            <div className="text-center py-12 bg-slate-900 rounded-3xl border border-emerald-500/30">
              <div className="text-4xl mb-4">✅</div>
              <p className="font-black text-white text-xl">Recebemos seu contato!</p>
              <p className="text-slate-400 mt-2">Nossa equipe entrará em contato em até 24h úteis.</p>
            </div>
          ) : (
            <form onSubmit={handleB2bSubmit} className="bg-slate-900 border border-white/10 rounded-3xl p-8 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase block mb-1.5">Nome *</label>
                  <input value={b2bForm.name} onChange={e => setB2bForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Seu nome"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase block mb-1.5">Email *</label>
                  <input type="email" value={b2bForm.email} onChange={e => setB2bForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@instituicao.com"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase block mb-1.5">Nome da Instituição *</label>
                <input value={b2bForm.institution} onChange={e => setB2bForm(p => ({ ...p, institution: e.target.value }))}
                  placeholder="Colégio / Cursinho / Universidade"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase block mb-1.5">Tipo *</label>
                  <select value={b2bForm.type} onChange={e => setB2bForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
                    <option value="" className="bg-slate-900">Selecione...</option>
                    {B2B_TYPES.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase block mb-1.5">Nº de alunos</label>
                  <select value={b2bForm.students} onChange={e => setB2bForm(p => ({ ...p, students: e.target.value }))}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
                    <option value="" className="bg-slate-900">Selecione...</option>
                    {B2B_STUDENTS.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase block mb-1.5">Mensagem</label>
                <textarea value={b2bForm.message} onChange={e => setB2bForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Como podemos ajudar sua instituição?"
                  rows={3}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none" />
              </div>
              {b2bError && <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">{b2bError}</p>}
              <button type="submit" disabled={b2bLoading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-60">
                {b2bLoading ? "Enviando..." : "Solicitar demonstração gratuita →"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiA2djZoNnYtNmgtNnptLTEyIDB2NmgtNnY2aDZ2Nmg2di02aC02di02aC02em0tNiA2SDEydjZoNnYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
            <div className="relative px-8 py-16">
              <p className="text-5xl mb-4">🚀</p>
              <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Pronto para transformar seus estudos?</h2>
              <p className="text-indigo-200 text-lg mb-8">Não precisa de cartão. Começa em 2 minutos. Cancela quando quiser.</p>
              <button onClick={handleStart}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-black text-indigo-600 bg-white hover:bg-indigo-50 transition-all hover:scale-[1.03] active:scale-[0.97] text-base shadow-xl">
                Começar grátis agora <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">S</div>
                <span className="font-black text-white">Study<span className="text-indigo-400">.IA</span></span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">A IA que entende como você aprende. Feito com 💜 no Brasil.</p>
            </div>
            <div>
              <p className="font-black text-slate-400 text-xs uppercase tracking-widest mb-3">Produto</p>
              <ul className="space-y-2">
                {[["Funcionalidades", "#funcoes"], ["Para alunos", "#para-alunos"], ["Para professores", "#para-professores"], ["Para escolas", "#para-escolas"]].map(([label, href]) => (
                  <li key={label}><a href={href} className="text-sm text-slate-500 hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-black text-slate-400 text-xs uppercase tracking-widest mb-3">Plataforma</p>
              <ul className="space-y-2">
                {[["Preços", "#precos"], ["FAQ", "#faq"], ["Blog", "#"], ["Carreiras", "#"]].map(([label, href]) => (
                  <li key={label}><a href={href} className="text-sm text-slate-500 hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-black text-slate-400 text-xs uppercase tracking-widest mb-3">Legal</p>
              <ul className="space-y-2">
                {[["Privacidade", "/privacidade"], ["Termos", "/privacidade"], ["LGPD", "/privacidade"], ["Suporte", "mailto:suporte@study.ia.br"]].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-slate-500 hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-xs">© 2025 Study.IA — Feito com 💜 no Brasil</p>
            <div className="flex items-center gap-4">
              <a href="mailto:contato@study.ia.br" className="text-xs text-slate-500 hover:text-white transition-colors">contato@study.ia.br</a>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <a href="https://study.ia.br" className="text-xs text-slate-500 hover:text-white transition-colors">study.ia.br</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
