import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Brain, Zap, Trophy, Clock, BarChart2, Star,
  ArrowRight, BookOpen, Sparkles, Users, GraduationCap,
  PenLine, Map, TrendingUp, Target, CheckCircle,
  ChevronDown, Mic, Volume2, Radio, Cpu, Layers, Shield,
} from "lucide-react";
import { startCheckout } from "@/hooks/useSubscription";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const features = [
  { icon: Mic, label: "Professora Paula", desc: "Tutora por voz — fala com você, sabe seu progresso e age proativamente.", color: "text-orange-500", bg: "bg-orange-50" },
  { icon: Brain, label: "Plano de Estudos IA", desc: "PDF, foto do caderno ou tema digitado. GPT-4o cria um cronograma personalizado.", color: "text-violet-600", bg: "bg-violet-50" },
  { icon: Zap, label: "Simulado Inteligente", desc: "10 questões do seu material, com gabarito comentado em tempo real.", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: BookOpen, label: "Flashcards Anki", desc: "Repetição espaçada inteligente. A IA cria os cards e ajusta o ritmo.", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: Clock, label: "Pomodoro Gamificado", desc: "Timer de foco integrado ao plano. Cada sessão gera XP e sobe no ranking.", color: "text-pink-500", bg: "bg-pink-50" },
  { icon: Trophy, label: "Ranking Global", desc: "Compita com estudantes do Brasil. Conquiste badges de Bronze ao Diamante.", color: "text-amber-500", bg: "bg-amber-50" },
  { icon: BarChart2, label: "Dashboard + Mapa de Calor", desc: "Visualize pontos fortes e fracos por matéria. Atualiza com cada simulado.", color: "text-indigo-500", bg: "bg-indigo-50" },
  { icon: PenLine, label: "Corretor de Redação", desc: "Nota 0–1000 nas 5 competências ENEM. Análise pelo GPT-4o em 30 segundos.", color: "text-rose-500", bg: "bg-rose-50" },
  { icon: Target, label: "Simulado Adaptativo", desc: "A IA detecta suas lacunas e gera questões cirúrgicas. Fica mais preciso com o uso.", color: "text-purple-600", bg: "bg-purple-50" },
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
  { name: "Mariana S.", role: "ENEM 2024 — Medicina", text: "Tirava 580. Depois de 2 meses com o StudyAI, fui para 724. A Paula me chamava quando ficava dias sem estudar. Era como ter uma tutora particular.", before: "580 pts", after: "724 pts", emoji: "🎓" },
  { name: "Carlos M.", role: "Aprovado no TRF", text: "Tentei 3 anos sem aprovação. O Simulado Adaptativo detectou meus pontos cegos e finalmente passei. A IA sabia onde eu precisava melhorar melhor do que eu mesmo.", before: "3 reprovações", after: "Aprovado!", emoji: "📋" },
  { name: "Juliana R.", role: "FUVEST — Direito", text: "Fotografava minha apostila no ônibus e em 30 segundos tinha exercícios sobre o que ia cair. Nunca estudei tão pouco e aprendi tanto.", before: "Sem foco", after: "Aprovada!", emoji: "⚡" },
  { name: "Rafael T.", role: "3ª série Ensino Médio", text: "Minha redação foi de 640 para 880. O corretor identificou que eu não desenvolvia proposta de intervenção. Nenhum professor tinha me dito isso antes.", before: "Redação 640", after: "Redação 880", emoji: "✍️" },
];

const faqs = [
  { q: "O StudyAI é gratuito?", a: "Sim! O plano gratuito inclui plano de estudos, simulados, flashcards e a Professora Paula. O plano Pro (R$29,90/mês) libera recursos ilimitados: correção de redação, simulado adaptativo e Paula proativa sem limites." },
  { q: "O que é a Professora Paula?", a: "Paula é uma tutora por voz com IA que age de forma espontânea. Ela sabe seu progresso, suas matérias e pontos fracos. Quando percebe que você precisa estudar, ela te chama. É como ter uma tutora particular 24h." },
  { q: "Como o plano de estudos é gerado?", a: "Você informa sua matéria, nível e objetivo ou envia um PDF. O GPT-4o cria um cronograma personalizado dia a dia, com tópicos, exercícios e dicas para o seu perfil." },
  { q: "Funciona para ENEM 2025, vestibular e concursos?", a: "Sim! A IA adapta o conteúdo, a linguagem e a dificuldade para o seu objetivo — ENEM, FUVEST, OAB ou qualquer concurso federal." },
  { q: "Precisa instalar algum aplicativo?", a: "Não! O StudyAI funciona direto no navegador do celular ou computador. Acesse study.ia.br e comece agora." },
];

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
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">S</div>
            <span className="font-black text-lg tracking-tight">StudyAI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#funcoes" className="hover:text-gray-900 transition-colors">Funções</a>
            <a href="#paula" className="hover:text-gray-900 transition-colors">Professora Paula</a>
            <a href="#precos" className="hover:text-gray-900 transition-colors">Preços</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleStart} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Entrar
            </button>
            <button onClick={handleStart}
              className="text-sm font-bold px-4 py-2 rounded-xl text-white bg-gray-900 hover:bg-gray-700 transition-colors">
              Começar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-100">
              <Radio className="w-3 h-3 animate-pulse" /> Novo: Professora Paula — Tutora por Voz com IA
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="mt-6 text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] text-gray-900">
            Estude como se tivesse{" "}
            <span className="bg-gradient-to-r from-orange-500 to-violet-600 bg-clip-text text-transparent">
              um tutor particular
            </span>{" "}
            ao lado
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="mt-5 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            A Professora Paula fala com você por voz, sabe seu progresso e age de forma proativa. Planos de estudo, simulados, flashcards e correção de redação — powered by GPT-4o.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={handleStart}
              className="group flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-200">
              Começar Grátis
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={handleStart}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              <Mic className="w-4 h-4" /> Ver a Professora Paula
            </button>
          </motion.div>

          {/* Stats row */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}
            className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
            {[
              { v: "+2.400", l: "estudantes ativos" },
              { v: "14.800+", l: "planos gerados" },
              { v: "89%", l: "taxa de acerto média" },
              { v: "4.9★", l: "avaliação dos usuários" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-black text-gray-900 text-base">{s.v}</span>
                <span>{s.l}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PAULA FEATURE ── */}
      <section id="paula" className="py-20 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left text */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wide mb-4">
                <Volume2 className="w-3 h-3" /> Exclusivo StudyAI
              </span>
              <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-4">
                Conheça a Professora Paula
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                A primeira tutora por voz com IA que age de forma proativa. Ela não espera você perguntar — ela chama você.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Radio, title: "Fala primeiro, sem você pedir", desc: "Paula percebe quando você ficou dias sem estudar e chama por voz.", color: "text-orange-500", bg: "bg-orange-50" },
                  { icon: Cpu, title: "Sabe tudo sobre seu progresso", desc: "Tem acesso ao seu plano, XP, dias concluídos e matérias em estudo.", color: "text-violet-500", bg: "bg-violet-50" },
                  { icon: Layers, title: "Age no app por você", desc: "Peça para ela criar um plano ou navegar — ela executa diretamente.", color: "text-blue-500", bg: "bg-blue-50" },
                  { icon: Shield, title: "Voz natural, zero robótica", desc: "Sintetizada pela OpenAI TTS — feminina, calorosa e fluida.", color: "text-emerald-500", bg: "bg-emerald-50" },
                ].map((b, i) => (
                  <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1}
                    className="flex gap-3 items-start">
                    <div className={`w-9 h-9 rounded-xl ${b.bg} flex items-center justify-center flex-shrink-0`}>
                      <b.icon className={`w-4 h-4 ${b.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{b.title}</p>
                      <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right visual */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.2}
              className="flex justify-center">
              <div className="w-72 bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="p-5 text-center" style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-4xl mx-auto mb-3">
                    👩‍🏫
                  </div>
                  <p className="text-white font-black">Professora Paula</p>
                  <p className="text-orange-100 text-xs mt-0.5">Tutora de Voz com IA</p>
                </div>
                {/* Fake speaking UI */}
                <div className="p-5 space-y-3">
                  <div className="bg-orange-50 rounded-2xl p-3">
                    <div className="flex gap-1 justify-center mb-2">
                      {[3,7,11,7,4,9,5,8,3].map((h,i) => (
                        <span key={i} className="inline-block w-1 bg-orange-400 rounded-full animate-bounce"
                          style={{ height: `${h}px`, animationDelay: `${i*70}ms` }} />
                      ))}
                    </div>
                    <p className="text-xs text-orange-700 text-center italic">
                      "João, percebi que você não revisou Biologia essa semana. Que tal um simulado rápido agora?"
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-400">Responder...</div>
                    <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
                      <Mic className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-center text-xs text-gray-400">● Online 24h • Voz natural OpenAI</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="funcoes" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-12">
            <h2 className="text-4xl font-black tracking-tight text-gray-900">
              Tudo que você precisa para passar
            </h2>
            <p className="mt-3 text-gray-500 text-lg">9 ferramentas integradas, todas powered by GPT-4o.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.04}
                className="flex gap-3 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-white">
                <div className={`w-9 h-9 rounded-xl ${f.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <f.icon className={`w-4 h-4 ${f.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm mb-0.5">{f.label}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-12">
            <h2 className="text-4xl font-black tracking-tight text-gray-900">Como funciona</h2>
            <p className="mt-3 text-gray-500 text-lg">De zero ao plano em menos de 60 segundos.</p>
          </motion.div>
          <div className="space-y-4">
            {[
              { num: "1", title: "Envie o material ou escreva o tema", desc: "PDF, DOCX, foto do caderno ou simplesmente o tema que quer estudar. A IA entende qualquer formato." },
              { num: "2", title: "O GPT-4o cria seu plano personalizado", desc: "Cronograma dia a dia, tópicos, exercícios e dicas adaptados para o seu perfil e objetivo." },
              { num: "3", title: "Paula te acompanha enquanto você evolui", desc: "Flashcards, simulados, Pomodoro e a Paula te chamando quando precisar revisar. Suba no ranking." },
            ].map((s, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1}
                className="flex gap-4 p-5 rounded-2xl bg-white border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0 text-white font-black text-lg">
                  {s.num}
                </div>
                <div>
                  <p className="font-bold text-gray-800 mb-1">{s.title}</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-12">
            <h2 className="text-4xl font-black tracking-tight text-gray-900">
              StudyAI vs método tradicional
            </h2>
          </motion.div>
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <span>Aspecto</span>
              <span className="text-center">Tradicional</span>
              <span className="text-center text-orange-500">StudyAI</span>
            </div>
            {[
              { aspecto: "Plano de estudos", trad: "Genérico, igual para todos", ai: "100% personalizado para você" },
              { aspecto: "Tutor disponível", trad: "Horário fixo do professor", ai: "Paula 24h — te chama por voz" },
              { aspecto: "Simulados", trad: "Questões antigas de banco fixo", ai: "Gerados do seu conteúdo" },
              { aspecto: "Feedback de redação", trad: "Aguarda dias ou semanas", ai: "Nota completa em 30 segundos" },
              { aspecto: "Identificação de lacunas", trad: "Você tenta adivinhar", ai: "Mapa de Calor + Adaptativo" },
              { aspecto: "Motivação", trad: "Depende do humor do dia", ai: "XP, ranking e Paula te incentivando" },
            ].map((row, i) => (
              <div key={i} className={`grid grid-cols-3 px-5 py-3.5 gap-3 text-sm border-b border-gray-50 last:border-0 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                <span className="text-gray-700 font-medium text-xs">{row.aspecto}</span>
                <span className="text-center text-gray-400 text-xs">{row.trad}</span>
                <span className="text-center text-xs font-semibold text-emerald-600">✓ {row.ai}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-12">
            <h2 className="text-4xl font-black tracking-tight text-gray-900">Quem já usa o StudyAI</h2>
            <p className="mt-3 text-gray-500">Resultados reais de estudantes brasileiros.</p>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTest}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm max-w-xl mx-auto mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-2xl flex-shrink-0">
                  {testimonials[activeTest].emoji}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{testimonials[activeTest].name}</p>
                  <p className="text-xs text-gray-400">{testimonials[activeTest].role}</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm italic mb-5">"{testimonials[activeTest].text}"</p>
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl px-3 py-2 text-center bg-red-50 border border-red-100">
                  <p className="text-[10px] text-gray-400 mb-0.5">Antes</p>
                  <p className="font-bold text-sm text-red-500">{testimonials[activeTest].before}</p>
                </div>
                <div className="self-center text-gray-300 text-lg">→</div>
                <div className="flex-1 rounded-xl px-3 py-2 text-center bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] text-gray-400 mb-0.5">Depois</p>
                  <p className="font-bold text-sm text-emerald-600">{testimonials[activeTest].after}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-2">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setActiveTest(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{ background: i === activeTest ? "#f97316" : "#e5e7eb", transform: i === activeTest ? "scale(1.4)" : "scale(1)" }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precos" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-12">
            <h2 className="text-4xl font-black tracking-tight text-gray-900">Preços simples e justos</h2>
            <p className="mt-3 text-gray-500 text-lg">Comece de graça. Evolua quando quiser.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {plans.map((plan, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1}
                className={`rounded-2xl p-6 flex flex-col border transition-all ${plan.highlight ? "border-orange-400 shadow-xl shadow-orange-100 scale-[1.02]" : "border-gray-100"}`}
                style={{ background: plan.highlight ? "#fff7f0" : "#fff" }}>
                {plan.highlight && (
                  <div className="text-center mb-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-black text-white bg-orange-500">
                      MAIS POPULAR
                    </span>
                  </div>
                )}
                <p className="text-gray-400 text-sm font-medium">{plan.name}</p>
                <div className="flex items-baseline gap-1 mt-1 mb-1">
                  <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <p className="text-xs text-gray-400 mb-5">{plan.desc}</p>
                <button
                  onClick={plan.highlight ? handlePro : handleStart}
                  disabled={checkoutLoading && plan.highlight}
                  className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all mb-5 disabled:opacity-60 ${plan.highlight ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
                  {checkoutLoading && plan.highlight ? "Carregando..." : plan.cta}
                </button>
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-orange-500" : "text-gray-400"}`} />
                      {feat}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-2xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-12">
            <h2 className="text-4xl font-black tracking-tight text-gray-900">Dúvidas frequentes</h2>
          </motion.div>
          <div className="space-y-2">
            {faqs.map((item, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.05}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={`w-full flex items-center justify-between gap-4 p-4 rounded-xl text-left transition-all border ${openFaq === i ? "bg-white border-orange-200 shadow-sm" : "bg-white border-gray-100 hover:border-gray-200"}`}>
                  <span className="font-semibold text-sm text-gray-800">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-orange-400 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden">
                      <div className="px-4 pb-4 pt-1 text-sm text-gray-500 leading-relaxed bg-white border-x border-b border-orange-100 rounded-b-xl">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <p className="text-5xl mb-5">👩‍🏫</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-4">
              A Paula está esperando por você
            </h2>
            <p className="text-gray-500 text-lg mb-8 max-w-lg mx-auto">
              Crie seu plano, ouça a Paula e comece a evoluir agora. Grátis para sempre no básico.
            </p>
            <button onClick={handleStart}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-orange-200 text-lg">
              Começar Grátis agora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <p className="mt-4 text-sm text-gray-400">Sem cartão de crédito • Cancele quando quiser</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-violet-600 flex items-center justify-center text-white text-xs font-black">S</div>
            <span className="font-black text-gray-800">StudyAI</span>
            <span className="text-gray-400 text-sm">· study.ia.br</span>
          </div>
          <p className="text-gray-400 text-sm">© 2025 StudyAI · Powered by GPT-4o</p>
          <div className="flex gap-4 text-sm text-gray-400">
            <a href="#faq" className="hover:text-gray-700 transition-colors">FAQ</a>
            <button onClick={handleStart} className="hover:text-gray-700 transition-colors">Entrar</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
