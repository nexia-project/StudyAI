import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Brain, Zap, Trophy, Clock, FileText, BarChart2, Star,
  ArrowRight, BookOpen, Sparkles, Users, GraduationCap,
  PenLine, Map, TrendingUp, Target, Briefcase, BookMarked,
  CheckCircle, ChevronDown, Mic, MessageSquare, Flame,
  Shield, Cpu, Layers, Volume2, Radio,
} from "lucide-react";
import { startCheckout } from "@/hooks/useSubscription";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── DATA ────────────────────────────────────────────────────────────────────

const stats = [
  { value: "+2.400", label: "Estudantes ativos", icon: Users },
  { value: "14.800+", label: "Planos gerados", icon: BookOpen },
  { value: "89%", label: "Taxa de acerto média", icon: TrendingUp },
  { value: "4.9★", label: "Avaliação dos usuários", icon: Star },
];

const features = [
  { icon: Mic, label: "Professora Paula", desc: "Tutora por voz com IA — fala com você, não com você ela. Proativa, contextual e humana.", accent: "from-orange-500 to-amber-400", glow: "#f9731633" },
  { icon: Brain, label: "Plano de Estudos IA", desc: "PDF, foto do caderno ou tema digitado. GPT-4o cria um cronograma cirúrgico personalizado.", accent: "from-violet-500 to-purple-400", glow: "#8b5cf633" },
  { icon: Zap, label: "Simulado Inteligente", desc: "10 questões geradas do seu material. Múltipla escolha, lacuna, V/F — com gabarito comentado.", accent: "from-blue-500 to-cyan-400", glow: "#3b82f633" },
  { icon: BookOpen, label: "Flashcards Anki", desc: "Repetição espaçada inteligente. A IA cria e ajusta o ritmo conforme seu desempenho.", accent: "from-emerald-500 to-teal-400", glow: "#10b98133" },
  { icon: Clock, label: "Pomodoro Gamificado", desc: "Timer de foco integrado ao plano. Cada sessão concluída gera XP e sobe no ranking.", accent: "from-pink-500 to-rose-400", glow: "#ec489933" },
  { icon: Trophy, label: "Ranking Global", desc: "Compita com estudantes do Brasil. Suba de Bronze ao Diamante e conquiste badges.", accent: "from-amber-500 to-yellow-400", glow: "#f59e0b33" },
  { icon: BarChart2, label: "Dashboard + Mapa de Calor", desc: "Visualize pontos fortes e fracos por matéria. Atualiza automaticamente com simulados.", accent: "from-indigo-500 to-blue-400", glow: "#6366f133" },
  { icon: PenLine, label: "Corretor de Redação", desc: "Nota 0–1000 nas 5 competências ENEM. Feedback detalhado pelo GPT-4o em 30 segundos.", accent: "from-fuchsia-500 to-pink-400", glow: "#d946ef33" },
  { icon: Target, label: "Simulado Adaptativo", desc: "A IA detecta suas lacunas e gera questões cirúrgicas. Quanto mais usa, mais preciso.", accent: "from-violet-600 to-indigo-400", glow: "#7c3aed33" },
];

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "",
    desc: "Experimente tudo com limites",
    highlight: false,
    features: [
      "1 plano de estudos por mês",
      "2 simulados por mês",
      "5 flashcards por semana",
      "5 mensagens/dia com a Professora Paula",
      "1 correção de redação por mês",
      "Dashboard de desempenho",
      "Timer Pomodoro",
    ],
    cta: "Começar Grátis",
  },
  {
    name: "Pro",
    price: "R$ 29,90",
    period: "/mês",
    desc: "Para estudantes sérios",
    highlight: true,
    features: [
      "Planos de estudos ilimitados",
      "Simulados ilimitados",
      "Flashcards ilimitados com IA avançada",
      "Professora Paula ilimitada + voz proativa",
      "Correções de redação ilimitadas",
      "Resumões estratégicos ilimitados",
      "Dashboard completo + mapa de calor",
      "Histórico de sessões",
      "Ranking prioritário",
    ],
    cta: "Assinar Pro",
  },
  {
    name: "Anual",
    price: "R$ 179,00",
    period: "/ano",
    desc: "Economize 50%",
    highlight: false,
    features: [
      "Tudo do plano Pro",
      "Prioridade no suporte",
      "Acesso antecipado a novas funções",
      "Badge exclusivo no ranking",
    ],
    cta: "Assinar Anual",
  },
];

const testimonials = [
  { name: "Mariana S.", role: "ENEM 2024 — Medicina", text: "Tirava 580. Depois de 2 meses com o StudyAI, fui para 724. A Professora Paula me chamava quando eu ficava dias sem estudar. Era como ter uma tutora particular.", before: "580 pts", after: "724 pts", emoji: "🎓" },
  { name: "Carlos M.", role: "Aprovado no TRF", text: "Tentei 3 anos sem aprovação. O Simulado Adaptativo detectou meus pontos cegos e finalmente passei. A IA sabia onde eu precisava melhorar melhor do que eu mesmo.", before: "3 reprovações", after: "Aprovado!", emoji: "📋" },
  { name: "Juliana R.", role: "FUVEST — Direito", text: "Fotografava minha apostila no ônibus e em 30 segundos tinha exercícios sobre o que ia cair. Nunca estudei tão pouco e aprendi tanto.", before: "Sem foco", after: "Aprovada!", emoji: "⚡" },
  { name: "Rafael T.", role: "3ª série Ensino Médio", text: "Minha nota de redação foi de 640 para 880. O corretor identificou que eu não desenvolvia proposta de intervenção. Nenhum professor tinha me dito isso antes.", before: "Redação 640", after: "Redação 880", emoji: "✍️" },
  { name: "Ana P.", role: "Concurso Polícia Federal", text: "Enviei o edital completo e o sistema montou um plano de 90 dias priorizando os tópicos com maior peso. A Paula me lembrava das revisões toda semana.", before: "Sem direção", after: "Aprovada 1ª fase", emoji: "🏆" },
];

const faqs = [
  { q: "O StudyAI é gratuito?", a: "Sim! O plano gratuito inclui plano de estudos personalizado, simulados, flashcards e a Professora Paula por voz. O plano Pro (R$29,90/mês) libera recursos ilimitados: correção de redação, simulado adaptativo, Paula proativa ilimitada e muito mais." },
  { q: "O que é a Professora Paula?", a: "Paula é uma tutora por voz com IA que interage com você de forma espontânea — sem precisar abrir o chat. Ela sabe seu progresso, suas matérias e seus pontos fracos. Quando percebe que você precisa estudar algo, ela te chama. Quando você gera um plano, ela já fala sobre ele. É como ter uma tutora particular 24h." },
  { q: "Como o plano de estudos é gerado?", a: "Você informa sua matéria, nível e objetivo (ENEM, vestibular ou concurso) ou envia um PDF/foto do caderno. O GPT-4o cria um cronograma personalizado dia a dia, com tópicos, exercícios, flashcards e dicas para o seu perfil." },
  { q: "Funciona para ENEM 2025, vestibular e concursos?", a: "Sim! O StudyAI foi desenvolvido para os três. A IA adapta o conteúdo, a linguagem e a dificuldade de acordo com o seu objetivo — ENEM, FUVEST, OAB ou qualquer concurso federal." },
  { q: "Como funciona a correção de redação?", a: "Você envia sua redação (foto ou texto) e a IA avalia nas 5 competências do ENEM, com nota em cada uma e sugestões de melhoria detalhadas. Tudo em menos de 30 segundos." },
  { q: "Precisa instalar algum aplicativo?", a: "Não! O StudyAI funciona direto no navegador do celular ou computador. Acesse study.ia.br e comece agora." },
];

const comparativo = [
  { aspecto: "Plano de estudos", tradicional: "Genérico, igual para todos", studyai: "100% personalizado para o seu material" },
  { aspecto: "Tutor disponível", tradicional: "Horário do professor / cursinho", studyai: "Professora Paula 24h — te chama por voz" },
  { aspecto: "Simulados", tradicional: "Questões antigas de banco fixo", studyai: "Gerados do seu conteúdo em tempo real" },
  { aspecto: "Feedback de redação", tradicional: "Aguarda dias / semanas", studyai: "Nota e análise completa em segundos" },
  { aspecto: "Identificação de lacunas", tradicional: "Você tenta adivinhar onde errou", studyai: "Mapa de Calor + Simulado Adaptativo" },
  { aspecto: "Motivação", tradicional: "Depende do humor do dia", studyai: "Ranking, XP, badges e Paula te incentivando" },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function Landing() {
  const [, navigate] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activeTest, setActiveTest] = useState(0);

  const handleStart = () => navigate("/app");
  const handlePro = async () => {
    setCheckoutLoading(true);
    try { await startCheckout(); } catch { navigate("/pricing"); }
    finally { setCheckoutLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#080818] text-white overflow-x-hidden">

      {/* ── Decorative ambient blobs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
      </div>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-white/8"
        style={{ background: "rgba(8,8,24,0.7)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-violet-600 flex items-center justify-center text-base font-black">S</div>
            <span className="font-black text-lg">StudyAI</span>
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 ml-1">Beta</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <a href="#funcoes" className="hover:text-white transition-colors">Funções</a>
            <a href="#paula" className="hover:text-white transition-colors">Professora Paula</a>
            <a href="#precos" className="hover:text-white transition-colors">Preços</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleStart}
              className="text-sm text-white/70 hover:text-white px-3 py-1.5 transition-colors">
              Entrar
            </button>
            <button onClick={handleStart}
              className="text-sm font-bold px-4 py-2 rounded-xl text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg,#f97316,#8b5cf6)" }}>
              Começar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border"
              style={{ background: "rgba(249,115,22,0.12)", borderColor: "rgba(249,115,22,0.3)", color: "#fb923c" }}>
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Novo: Professora Paula — Tutora por Voz com IA
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="mt-8 text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05]">
            Estude como se tivesse{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-orange-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
                um tutor particular
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 opacity-50"
                style={{ background: "linear-gradient(90deg,#f97316,#a855f7)" }} />
            </span>
            <br />ao seu lado — 24h por dia
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="mt-6 text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
            A Professora Paula fala com você por voz, sabe seu progresso, percebe quando você precisa estudar e age. Planos de estudo, simulados, flashcards e correção de redação — tudo powered by GPT-4o.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={handleStart}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg text-white transition-all hover:scale-105 active:scale-95 shadow-2xl"
              style={{ background: "linear-gradient(135deg,#f97316,#8b5cf6)", boxShadow: "0 0 60px rgba(139,92,246,0.4)" }}>
              Começar Grátis agora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={handleStart}
              className="flex items-center gap-2 px-6 py-4 rounded-2xl font-medium text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-all">
              <Mic className="w-4 h-4" /> Ouvir a Professora Paula
            </button>
          </motion.div>

          {/* Hero visual — floating glass card preview */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}
            className="mt-16 relative mx-auto max-w-2xl">
            {/* Main card */}
            <div className="rounded-3xl border border-white/10 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)" }}>
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/8">
                {["#ef4444","#f59e0b","#22c55e"].map((c, i) => (
                  <span key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                ))}
                <span className="ml-2 text-xs text-white/30 font-mono">study.ia.br/app</span>
              </div>
              {/* App preview content */}
              <div className="p-6 grid grid-cols-3 gap-3">
                {/* Left: plan card */}
                <div className="col-span-2 rounded-2xl p-4 border border-white/8"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-violet-500/30 flex items-center justify-center">
                      <Brain className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <span className="text-xs font-bold text-white/80">Plano de Matemática — ENEM</span>
                  </div>
                  {["Funções de 1° e 2° grau", "Geometria plana e espacial", "Probabilidade e estatística"].map((t, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-emerald-400" : "bg-white/20"}`} />
                      <span className="text-xs text-white/50">{t}</span>
                      {i === 0 && <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">✓ Concluído</span>}
                    </div>
                  ))}
                  <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 to-pink-500" />
                  </div>
                </div>
                {/* Right: XP + Paula */}
                <div className="flex flex-col gap-3">
                  <div className="rounded-2xl p-3 border border-white/8 text-center"
                    style={{ background: "rgba(249,115,22,0.1)" }}>
                    <div className="text-2xl font-black text-orange-400">1.250</div>
                    <div className="text-[10px] text-white/40 mt-0.5">XP acumulado</div>
                  </div>
                  <div className="rounded-2xl p-3 border border-orange-500/30 flex flex-col items-center gap-1"
                    style={{ background: "rgba(249,115,22,0.08)" }}>
                    <span className="text-2xl">👩‍🏫</span>
                    <div className="flex gap-0.5">
                      {[4,7,5,8,4].map((h,i) => (
                        <span key={i} className="inline-block w-1 bg-orange-400 rounded-full animate-bounce"
                          style={{ height: `${h}px`, animationDelay: `${i*100}ms` }} />
                      ))}
                    </div>
                    <span className="text-[9px] text-orange-400/70">Paula falando…</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Floating badge left */}
            <motion.div animate={{ y: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="absolute -left-8 top-1/3 hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 shadow-xl"
              style={{ background: "rgba(16,185,129,0.15)", backdropFilter: "blur(12px)" }}>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300">Dia 3 completo! +50 XP</span>
            </motion.div>
            {/* Floating badge right */}
            <motion.div animate={{ y: [4, -4, 4] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              className="absolute -right-8 top-1/4 hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 shadow-xl"
              style={{ background: "rgba(139,92,246,0.15)", backdropFilter: "blur(12px)" }}>
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-violet-300">Plano gerado com IA</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative z-10 py-10 px-6 border-y border-white/8"
        style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
              className="text-center">
              <div className="text-3xl font-black bg-gradient-to-r from-orange-400 to-violet-400 bg-clip-text text-transparent">{s.value}</div>
              <div className="text-sm text-white/40 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PAULA HERO SECTION ── */}
      <section id="paula" className="relative z-10 py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm border"
              style={{ background: "rgba(249,115,22,0.1)", borderColor: "rgba(249,115,22,0.25)", color: "#fb923c" }}>
              <Volume2 className="w-3.5 h-3.5" /> Exclusivo StudyAI
            </span>
            <h2 className="mt-6 text-4xl md:text-5xl font-black tracking-tight">
              Conheça a{" "}
              <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                Professora Paula
              </span>
            </h2>
            <p className="mt-4 text-lg text-white/50 max-w-xl mx-auto">
              A primeira tutora por voz com IA que age de forma proativa. Ela não espera você perguntar — ela chama você.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left: visual */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="relative">
              <div className="rounded-3xl p-8 border border-orange-500/20 text-center relative overflow-hidden"
                style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.08),rgba(139,92,246,0.06))", backdropFilter: "blur(20px)" }}>
                {/* Orb */}
                <div className="relative inline-flex items-center justify-center w-32 h-32 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full opacity-30 animate-ping"
                    style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />
                  <div className="absolute inset-2 rounded-full opacity-20 animate-pulse"
                    style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />
                  <div className="relative w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-2xl"
                    style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", boxShadow: "0 0 60px rgba(249,115,22,0.4)" }}>
                    👩‍🏫
                  </div>
                </div>
                <h3 className="text-2xl font-black mb-2">Professora Paula</h3>
                <p className="text-white/50 text-sm mb-6">Tutora de Voz com IA • Online 24h</p>
                {/* Fake speaking UI */}
                <div className="rounded-2xl p-4 border border-white/10"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="flex gap-1 justify-center mb-2">
                    {[3,8,12,8,5,10,6,9,4].map((h,i) => (
                      <span key={i} className="inline-block w-1.5 bg-gradient-to-t from-orange-500 to-amber-400 rounded-full animate-bounce"
                        style={{ height: `${h}px`, animationDelay: `${i*70}ms` }} />
                    ))}
                  </div>
                  <p className="text-sm text-orange-200/80 italic">
                    "Oi, João! Percebi que você não revisou Biologia essa semana. Que tal um simulado rápido agora?"
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right: bullets */}
            <div className="space-y-5">
              {[
                { icon: Radio, title: "Fala primeiro, sem você pedir", desc: "Paula percebe quando você ficou dias sem estudar, quando um plano foi gerado ou quando atingiu uma meta — e chama você por voz.", color: "text-orange-400", bg: "rgba(249,115,22,0.1)" },
                { icon: Cpu, title: "Sabe tudo sobre seu progresso", desc: "Ela tem acesso ao seu plano atual, dias concluídos, XP acumulado, matérias em estudo e histórico. Pergunte e ela responde com contexto real.", color: "text-violet-400", bg: "rgba(139,92,246,0.1)" },
                { icon: Layers, title: "Age no app por você", desc: "Peça para ela criar um plano de Física — ela preenche o formulário e submete. Peça o Ranking — ela abre. Peça o Mapa de Desempenho — ela navega.", color: "text-blue-400", bg: "rgba(59,130,246,0.1)" },
                { icon: Shield, title: "Voz natural, zero robótica", desc: "Sintetizada pela OpenAI TTS com voz nova — feminina, calorosa, fluida. Sem delay, sem texto-primeiro. Direto ao ouvido.", color: "text-emerald-400", bg: "rgba(16,185,129,0.1)" },
              ].map((b, i) => (
                <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                  className="flex gap-4 p-4 rounded-2xl border border-white/8 transition-all hover:border-white/15"
                  style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: b.bg }}>
                    <b.icon className={`w-5 h-5 ${b.color}`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">{b.title}</h4>
                    <p className="text-xs text-white/50 leading-relaxed">{b.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="funcoes" className="relative z-10 py-24 px-6 border-t border-white/8"
        style={{ background: "rgba(255,255,255,0.015)" }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              Tudo que você precisa para
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent"> passar</span>
            </h2>
            <p className="mt-4 text-white/50 text-lg max-w-xl mx-auto">
              9 ferramentas integradas, todas potencializadas pelo GPT-4o.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.05}
                className="group relative rounded-2xl p-5 border border-white/8 transition-all duration-300 hover:border-white/20 hover:-translate-y-1"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                {/* Glow on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${f.glow}, transparent 70%)` }} />
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.accent} flex items-center justify-center mb-4 shadow-lg`}>
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-sm text-white mb-2">{f.label}</h3>
                  <p className="text-xs text-white/45 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Como funciona</h2>
            <p className="mt-4 text-white/50 text-lg">De zero ao plano em menos de 60 segundos.</p>
          </motion.div>
          <div className="space-y-6">
            {[
              { num: "01", icon: FileText, title: "Envie o material ou escreva o tema", desc: "PDF, DOCX, foto do caderno ou simplesmente o tema que quer estudar. A IA entende qualquer formato." },
              { num: "02", icon: Sparkles, title: "O GPT-4o cria seu plano personalizado", desc: "Cronograma dia a dia, tópicos, exercícios e dicas de memorização adaptados para o seu perfil e objetivo." },
              { num: "03", icon: GraduationCap, title: "Paula te acompanha enquanto você evolui", desc: "Flashcards, simulados, Pomodoro e a Professora Paula te chamando quando você precisa revisar. Suba no ranking." },
            ].map((s, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className="flex gap-6 p-6 rounded-2xl border border-white/8"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-lg"
                  style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.2),rgba(139,92,246,0.2))", color: "#fb923c" }}>
                  {s.num}
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{s.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR WHO ── */}
      <section className="relative z-10 py-24 px-6 border-t border-white/8"
        style={{ background: "rgba(255,255,255,0.015)" }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Para quem é o StudyAI?</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: GraduationCap, badge: "ENEM / VESTIBULAR", title: "Vestibulandos", desc: "Do primeiro plano até o resultado. Simulados no estilo ENEM, correção de redação nas 5 competências e Paula te ajudando a focar.", bullets: ["Redação avaliada por IA com nota 0–1000", "Simulados do seu material em tempo real", "Plano adaptado por área de conhecimento"], from: "#8b5cf6", to: "#6d28d9" },
              { icon: Briefcase, badge: "CONCURSOS PÚBLICOS", title: "Concurseiros", desc: "Conteúdo extenso, tempo escasso. Envie o edital ou apostila e receba um plano cirúrgico focado nos tópicos com maior peso.", bullets: ["Plano a partir de edital ou apostila PDF", "Simulado Adaptativo ataca suas lacunas", "Pomodoro gamificado para manter a rotina"], from: "#3b82f6", to: "#1d4ed8" },
              { icon: BookMarked, badge: "ESTUDANTES EM GERAL", title: "Todos os estudantes", desc: "Provas do colegial, FUVEST, UNICAMP ou qualquer vestibular estadual. A IA se adapta ao conteúdo e ao seu nível.", bullets: ["Funciona para qualquer matéria ou banca", "Flashcards Anki para fixação real", "Ranking para manter a motivação"], from: "#f97316", to: "#ea580c" },
            ].map((p, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className="rounded-2xl p-6 border border-white/8 relative overflow-hidden group hover:border-white/15 transition-all"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="absolute top-0 left-0 right-0 h-px opacity-50"
                  style={{ background: `linear-gradient(90deg,transparent,${p.from},transparent)` }} />
                <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
                  style={{ background: `rgba(${p.from === "#8b5cf6" ? "139,92,246" : p.from === "#3b82f6" ? "59,130,246" : "249,115,22"},0.15)`, color: p.from }}>
                  {p.badge}
                </span>
                <h3 className="text-xl font-black mb-3">{p.title}</h3>
                <p className="text-sm text-white/50 mb-5 leading-relaxed">{p.desc}</p>
                <ul className="space-y-2">
                  {p.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-white/60">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: p.from }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              StudyAI vs{" "}
              <span className="text-white/30">método tradicional</span>
            </h2>
          </motion.div>
          <div className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="grid grid-cols-3 px-6 py-3 border-b border-white/8 text-xs font-bold text-white/40 uppercase tracking-wider">
              <span>Aspecto</span>
              <span className="text-center text-white/30">Tradicional</span>
              <span className="text-center" style={{ color: "#fb923c" }}>StudyAI</span>
            </div>
            {comparativo.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 px-6 py-4 gap-4 text-sm border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}>
                <span className="text-white/70 font-medium">{row.aspecto}</span>
                <span className="text-center text-white/30 text-xs">{row.tradicional}</span>
                <span className="text-center text-xs font-medium" style={{ color: "#4ade80" }}>✓ {row.studyai}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="relative z-10 py-24 px-6 border-t border-white/8"
        style={{ background: "rgba(255,255,255,0.015)" }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              Quem já usa o StudyAI
            </h2>
            <p className="mt-4 text-white/50">Resultados reais de estudantes brasileiros.</p>
          </motion.div>

          {/* Active testimonial */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTest}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl mx-auto rounded-3xl p-8 border border-white/10 mb-8 relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)" }}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,rgba(249,115,22,0.5),transparent)" }} />
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: "rgba(249,115,22,0.1)" }}>
                  {testimonials[activeTest].emoji}
                </div>
                <div>
                  <p className="font-bold text-white">{testimonials[activeTest].name}</p>
                  <p className="text-xs text-white/40">{testimonials[activeTest].role}</p>
                </div>
                <div className="ml-auto flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <p className="text-white/70 leading-relaxed italic">"{testimonials[activeTest].text}"</p>
              <div className="flex gap-4 mt-6">
                <div className="flex-1 rounded-xl px-4 py-2 text-center border border-white/8"
                  style={{ background: "rgba(239,68,68,0.08)" }}>
                  <div className="text-xs text-white/40 mb-1">Antes</div>
                  <div className="font-bold text-sm text-red-400">{testimonials[activeTest].before}</div>
                </div>
                <div className="text-white/20 self-center">→</div>
                <div className="flex-1 rounded-xl px-4 py-2 text-center border border-white/8"
                  style={{ background: "rgba(16,185,129,0.08)" }}>
                  <div className="text-xs text-white/40 mb-1">Depois</div>
                  <div className="font-bold text-sm text-emerald-400">{testimonials[activeTest].after}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="flex justify-center gap-2">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setActiveTest(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{ background: i === activeTest ? "#f97316" : "rgba(255,255,255,0.2)", transform: i === activeTest ? "scale(1.3)" : "scale(1)" }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precos" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Preços simples e justos</h2>
            <p className="mt-4 text-white/50 text-lg">Comece de graça. Evolua quando quiser.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className={`relative rounded-2xl p-6 border flex flex-col transition-all ${plan.highlight ? "border-orange-500/40 scale-105 shadow-2xl" : "border-white/10"}`}
                style={{
                  background: plan.highlight
                    ? "linear-gradient(135deg,rgba(249,115,22,0.12),rgba(139,92,246,0.08))"
                    : "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(20px)",
                }}>
                {plan.highlight && (
                  <>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black text-white"
                      style={{ background: "linear-gradient(135deg,#f97316,#8b5cf6)" }}>
                      MAIS POPULAR
                    </div>
                    <div className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
                      style={{ background: "linear-gradient(135deg,#f97316,#8b5cf6)", filter: "blur(20px)" }} />
                  </>
                )}
                <div className="relative">
                  <p className="text-white/50 text-sm font-medium">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mt-2 mb-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className="text-white/40 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-xs text-white/40 mb-6">{plan.desc}</p>
                  <button
                    onClick={plan.highlight ? handlePro : handleStart}
                    disabled={checkoutLoading && plan.highlight}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 mb-6 disabled:opacity-60"
                    style={plan.highlight
                      ? { background: "linear-gradient(135deg,#f97316,#8b5cf6)", color: "#fff", boxShadow: "0 4px 24px rgba(249,115,22,0.4)" }
                      : { background: "rgba(255,255,255,0.08)", color: "#fff" }}>
                    {checkoutLoading && plan.highlight ? "Carregando..." : plan.cta}
                  </button>
                  <ul className="space-y-3">
                    {plan.features.map((feat, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-white/60">
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="relative z-10 py-24 px-6 border-t border-white/8"
        style={{ background: "rgba(255,255,255,0.015)" }}>
        <div className="max-w-2xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Dúvidas frequentes</h2>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((item, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.05}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 rounded-2xl border border-white/8 text-left transition-all hover:border-white/15"
                  style={{ background: openFaq === i ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.03)" }}>
                  <span className="font-bold text-sm text-white/90">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-orange-400 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden">
                      <div className="px-5 pb-5 pt-2 text-sm text-white/50 leading-relaxed">{item.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative z-10 py-28 px-6">
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="absolute inset-0 rounded-3xl blur-3xl opacity-20 pointer-events-none"
            style={{ background: "linear-gradient(135deg,#f97316,#8b5cf6)" }} />
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="relative rounded-3xl p-12 border border-white/10 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)" }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(249,115,22,0.6),rgba(139,92,246,0.6),transparent)" }} />
            <div className="text-5xl mb-6">👩‍🏫</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              A Paula está esperando por você
            </h2>
            <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
              Crie seu plano de estudos, ouça a Paula e comece a evoluir agora. Grátis para sempre no básico.
            </p>
            <button onClick={handleStart}
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-xl text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg,#f97316,#8b5cf6)", boxShadow: "0 0 60px rgba(249,115,22,0.4)" }}>
              Começar Grátis agora
              <ArrowRight className="w-6 h-6" />
            </button>
            <p className="mt-5 text-sm text-white/30">Sem cartão de crédito • Cancele quando quiser</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/8 py-10 px-6"
        style={{ background: "rgba(255,255,255,0.01)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-violet-600 flex items-center justify-center text-sm font-black">S</div>
            <span className="font-black">StudyAI</span>
            <span className="text-white/20 text-sm ml-1">study.ia.br</span>
          </div>
          <p className="text-white/25 text-sm">© 2025 StudyAI · Powered by GPT-4o · Todos os direitos reservados</p>
          <div className="flex gap-4 text-sm text-white/30">
            <a href="#faq" className="hover:text-white/60 transition-colors">FAQ</a>
            <button onClick={handleStart} className="hover:text-white/60 transition-colors">Entrar</button>
            <button onClick={handleStart} className="hover:text-white/60 transition-colors">Começar</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
