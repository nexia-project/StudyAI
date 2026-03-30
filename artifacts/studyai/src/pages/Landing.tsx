import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Brain,
  Zap,
  Trophy,
  Clock,
  FileText,
  BarChart2,
  CheckCircle,
  Star,
  ArrowRight,
  BookOpen,
  Sparkles,
  Users,
  ChevronRight,
  GraduationCap,
  PenLine,
  Map,
  TrendingUp,
  Target,
  Briefcase,
  BookMarked,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const features = [
  {
    icon: Brain,
    title: "Plano de Estudos com IA",
    desc: "Suba um PDF, DOCX ou foto do caderno — ou simplesmente digite o tema que quer dominar. Quanto mais detalhado, mais cirúrgico o plano. Quanto mais genérico, mais amplo e exploratório.",
    color: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/30",
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-400",
  },
  {
    icon: Zap,
    title: "Simulado Inteligente",
    desc: "10 questões geradas diretamente do seu material — múltipla escolha, lacuna, verdadeiro/falso — com correção e gabarito comentado.",
    color: "from-yellow-500/20 to-orange-500/20",
    border: "border-yellow-500/30",
    iconBg: "bg-yellow-500/20",
    iconColor: "text-yellow-400",
  },
  {
    icon: BookOpen,
    title: "Flashcards (Método Anki)",
    desc: "Pratique com repetição espaçada. A IA cria os cards a partir do seu plano e ajusta o ritmo conforme seu desempenho.",
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Clock,
    title: "Pomodoro Gamificado",
    desc: "Timer de foco integrado ao plano de estudos. Estude por ciclos e ganhe XP a cada sessão concluída.",
    color: "from-green-500/20 to-emerald-500/20",
    border: "border-green-500/30",
    iconBg: "bg-green-500/20",
    iconColor: "text-green-400",
  },
  {
    icon: Trophy,
    title: "Ranking Global",
    desc: "Compare seu desempenho com estudantes do Brasil. Suba na classificação e conquiste badges de Bronze ao Diamante.",
    color: "from-amber-500/20 to-yellow-500/20",
    border: "border-amber-500/30",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: BarChart2,
    title: "Dashboard de Progresso",
    desc: "Acompanhe simulados, taxa de acerto, flashcards e planos gerados. Veja sua evolução ao longo do tempo.",
    color: "from-pink-500/20 to-rose-500/20",
    border: "border-pink-500/30",
    iconBg: "bg-pink-500/20",
    iconColor: "text-pink-400",
  },
  {
    icon: PenLine,
    title: "Corretor de Redação ENEM",
    desc: "Cole sua redação e receba nota de 0 a 1000, avaliação nas 5 competências e feedback detalhado gerado pelo GPT-4o.",
    color: "from-indigo-500/20 to-violet-500/20",
    border: "border-indigo-500/30",
    iconBg: "bg-indigo-500/20",
    iconColor: "text-indigo-400",
  },
  {
    icon: Map,
    title: "Mapa de Calor de Desempenho",
    desc: "Visualize pontos fortes e fracos por matéria. O mapa atualiza automaticamente com base em todos os seus simulados e flashcards.",
    color: "from-emerald-500/20 to-green-500/20",
    border: "border-emerald-500/30",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: Target,
    title: "Simulado Adaptativo IA",
    desc: "A IA analisa seu histórico, detecta suas lacunas e gera 10 questões cirúrgicas focadas no que você mais precisa revisar. Quanto mais usa, mais preciso fica.",
    color: "from-purple-500/20 to-indigo-500/20",
    border: "border-purple-500/30",
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-400",
  },
];

const steps = [
  {
    num: "01",
    icon: FileText,
    title: "Envie o material ou escreva o tema",
    desc: "Suba um PDF, DOCX ou foto do caderno para um plano cirúrgico baseado no seu conteúdo real. Ou simplesmente escreva o tema que quer estudar — sem precisar de arquivo.",
  },
  {
    num: "02",
    icon: Sparkles,
    title: "A IA gera seu plano",
    desc: "O GPT-4o analisa o material e cria um plano de estudos com tópicos, exercícios, desafios e dicas de memorização.",
  },
  {
    num: "03",
    icon: GraduationCap,
    title: "Estude e evolua",
    desc: "Use o simulado, flashcards e Pomodoro para fixar o conteúdo. Suba no ranking conforme aprende.",
  },
];

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "",
    desc: "Para experimentar",
    highlight: false,
    features: [
      "1 plano de estudos por mês",
      "1 simulado por mês",
      "Flashcards básicos",
      "Timer Pomodoro",
      "Acesso ao ranking",
    ],
    cta: "Começar Grátis",
    ctaVariant: "outline" as const,
  },
  {
    name: "Pro",
    price: "R$ 19,90",
    period: "/mês",
    desc: "Para estudantes sérios",
    highlight: true,
    features: [
      "Planos de estudos ilimitados",
      "Simulados ilimitados",
      "Flashcards com IA avançada",
      "Tutor IA no chat",
      "Dashboard completo",
      "Histórico de sessões",
      "Ranking prioritário",
    ],
    cta: "Assinar Pro",
    ctaVariant: "default" as const,
  },
  {
    name: "Anual",
    price: "R$ 159,90",
    period: "/ano",
    desc: "Economize 33%",
    highlight: false,
    features: [
      "Tudo do plano Pro",
      "Prioridade no suporte",
      "Acesso antecipado a novas funções",
      "Badge exclusivo no ranking",
    ],
    cta: "Assinar Anual",
    ctaVariant: "outline" as const,
  },
];

const stats = [
  { value: "+2.400", label: "Estudantes ativos", icon: Users, color: "text-violet-400" },
  { value: "14.800+", label: "Planos gerados", icon: BookOpen, color: "text-blue-400" },
  { value: "89%", label: "Taxa de acerto média", icon: TrendingUp, color: "text-emerald-400" },
  { value: "4.9★", label: "Avaliação dos usuários", icon: Star, color: "text-amber-400" },
];

const personas = [
  {
    icon: GraduationCap,
    badge: "ENEM",
    title: "Vestibulandos",
    desc: "Do primeiro plano até o resultado. Simulados no estilo ENEM, correção de redação nas 5 competências e mapa de calor das suas matérias mais fracas.",
    bullets: ["Redação avaliada por IA com nota 0–1000", "Simulados gerados do seu próprio material", "Plano adaptado por área de conhecimento"],
    gradient: "from-violet-500/20 to-purple-500/10",
    border: "border-violet-500/25",
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-400",
    badgeBg: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  },
  {
    icon: Briefcase,
    badge: "CONCURSOS",
    title: "Concurseiros",
    desc: "Conteúdo extenso, tempo escasso. Envie o edital ou apostila e receba um plano cirúrgico focado nos tópicos com maior peso e menor domínio.",
    bullets: ["Plano a partir de edital ou apostila em PDF", "Simulado Adaptativo que ataca suas lacunas", "Pomodoro gamificado para manter a rotina"],
    gradient: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/25",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    icon: BookMarked,
    badge: "VESTIBULAR",
    title: "Estudantes em geral",
    desc: "Provas do colegial, recuperação, FUVEST, UNICAMP ou qualquer vestibular estadual. A IA se adapta ao conteúdo e ao nível que você informar.",
    bullets: ["Funciona para qualquer matéria ou banca", "Flashcards com método Anki para fixação", "Ranking para manter a motivação no dia a dia"],
    gradient: "from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-500/25",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
];

const comparativo = [
  { aspecto: "Plano de estudos", tradicional: "Genérico, igual para todos", studyai: "100% personalizado para o seu material" },
  { aspecto: "Simulados", tradicional: "Questões antigas de banco fixo", studyai: "Gerados do seu conteúdo em tempo real" },
  { aspecto: "Feedback de redação", tradicional: "Aguarda dias / semanas", studyai: "Nota e análise completa em segundos" },
  { aspecto: "Identificação de lacunas", tradicional: "Você tenta adivinhar onde errou", studyai: "Mapa de Calor mostra exatamente onde focar" },
  { aspecto: "Memorização", tradicional: "Releituras repetitivas", studyai: "Flashcards com espaçamento inteligente (Anki)" },
  { aspecto: "Motivação", tradicional: "Depende do humor do dia", studyai: "Ranking, XP, badges e Pomodoro gamificado" },
  { aspecto: "Disponibilidade", tradicional: "Horário do professor ou cursinho", studyai: "Tutor IA disponível 24h, 7 dias" },
];

const testimonials = [
  {
    name: "Mariana S.",
    role: "Estudante — ENEM 2024",
    text: "Passei de 580 para 720 pontos em 2 meses usando o StudyAI. Os simulados são incríveis — parecem questões reais!",
    stars: 5,
  },
  {
    name: "Carlos M.",
    role: "Concurseiro — TRF",
    text: "Nunca tinha conseguido manter uma rotina de estudos. Com o Pomodoro gamificado e o ranking, virou vício estudar.",
    stars: 5,
  },
  {
    name: "Juliana R.",
    role: "Vestibulando — FUVEST",
    text: "Fotografo minhas apostilas e em 30 segundos tenho um plano completo com exercícios. Simplesmente incrível.",
    stars: 5,
  },
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [wlEmail, setWlEmail] = useState("");
  const [wlName, setWlName] = useState("");
  const [wlStatus, setWlStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [wlMessage, setWlMessage] = useState("");

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!wlEmail.trim()) return;
    setWlStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: wlEmail.trim(), name: wlName.trim(), source: "landing" }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setWlStatus("success");
        setWlMessage(data.mensagem || "Email cadastrado! Avisaremos você em breve.");
        setWlEmail("");
        setWlName("");
      } else {
        setWlStatus("error");
        setWlMessage(data.erro || "Erro ao cadastrar. Tente novamente.");
      }
    } catch {
      setWlStatus("error");
      setWlMessage("Erro de conexão. Tente novamente.");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* ── NAVBAR ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">StudyAI</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#precos" className="hover:text-white transition-colors">Preços</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white"
              onClick={() => navigate("/app")}
            >
              Entrar
            </Button>
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-500 text-white"
              onClick={() => navigate("/app")}
            >
              Começar Grátis
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-purple-600/15 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-6"
          >
            <span className="text-base">🤖</span>
            Múltiplas IAs trabalhando por você — seus professores 24h
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6"
          >
            Estude de forma{" "}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              inteligente
            </span>
            .<br />
            Passe na prova.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Envie qualquer material e receba um plano de estudos personalizado com IA,
            simulados, flashcards e um tutor disponível 24h. Tudo em um só lugar.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="bg-violet-600 hover:bg-violet-500 text-white text-base px-8 h-12 shadow-lg shadow-violet-900/40"
              onClick={() => navigate("/app")}
            >
              Começar Grátis
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/10 text-white/80 hover:bg-white/5 text-base px-8 h-12"
              onClick={() => {
                document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Ver como funciona
            </Button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-12 text-sm text-white/40"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Sem cartão de crédito
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Gratuito para começar
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-violet-400" />
              +2.000 estudantes
            </div>
          </motion.div>
        </div>

        {/* App preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="relative max-w-4xl mx-auto mt-20"
        >
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#13131a] shadow-2xl shadow-black/60">
            <div className="flex items-center gap-1.5 px-4 py-3 bg-[#1a1a24] border-b border-white/5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <div className="flex-1 mx-4 h-5 rounded bg-white/5 flex items-center px-3">
                <span className="text-white/30 text-xs">studyai.app</span>
              </div>
            </div>
            <div className="p-3 sm:p-6 grid grid-cols-3 gap-2 sm:gap-4 min-h-[160px] sm:min-h-[200px]">
              {[
                { label: "Planos", val: "12", color: "text-violet-400" },
                { label: "Acerto", val: "87%", color: "text-green-400" },
                { label: "Cards", val: "340", color: "text-blue-400" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 rounded-xl p-2 sm:p-4 text-left border border-white/5">
                  <p className="text-white/40 text-[10px] sm:text-xs mb-1">{stat.label}</p>
                  <p className={`text-lg sm:text-2xl font-bold ${stat.color}`}>{stat.val}</p>
                </div>
              ))}
              <div className="col-span-3 bg-white/5 rounded-xl p-2 sm:p-4 border border-white/5">
                <p className="text-white/40 text-[10px] sm:text-xs mb-2">Plano de hoje</p>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">Matemática — Equações do 2º grau</p>
                    <p className="text-[10px] sm:text-xs text-white/40">3 tópicos · 2 exercícios · 1 desafio</p>
                  </div>
                  <ChevronRight className="ml-auto text-white/20 w-4 h-4 shrink-0" />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent pointer-events-none" />
        </motion.div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="py-14 px-6 border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i * 0.15}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-1">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className={`text-3xl font-black tracking-tight ${s.color}`}>{s.value}</p>
                <p className="text-white/45 text-sm font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARA QUEM É ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-violet-400 font-semibold text-sm uppercase tracking-widest mb-3">Para quem é</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Feito para quem quer passar
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Independente do seu objetivo, o StudyAI se adapta ao seu conteúdo, ritmo e nível.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {personas.map((p, i) => (
              <motion.div
                key={p.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i * 0.2}
                className={`relative rounded-2xl border ${p.border} bg-gradient-to-br ${p.gradient} p-7 flex flex-col gap-5 hover:scale-[1.02] transition-transform duration-200`}
              >
                <div>
                  <span className={`inline-flex items-center text-[11px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest mb-4 ${p.badgeBg}`}>
                    {p.badge}
                  </span>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${p.iconBg} flex items-center justify-center`}>
                      <p.icon className={`w-5 h-5 ${p.iconColor}`} />
                    </div>
                    <h3 className="font-black text-xl">{p.title}</h3>
                  </div>
                  <p className="text-white/55 text-sm leading-relaxed">{p.desc}</p>
                </div>
                <ul className="space-y-2 mt-auto">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-white/70">
                      <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${p.iconColor}`} />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="recursos" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-violet-400 font-semibold text-sm uppercase tracking-widest mb-3">Recursos</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Tudo que você precisa para passar
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Do plano de estudos ao simulado final — ferramentas poderosas em uma plataforma simples.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i * 0.5}
                className={`relative rounded-2xl border ${f.border} bg-gradient-to-br ${f.color} p-6 backdrop-blur-sm hover:scale-[1.02] transition-transform duration-200`}
              >
                <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESUMÃO ESTRATÉGICO SPOTLIGHT ── */}
      <section className="py-4 px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden border border-violet-500/30 bg-gradient-to-br from-violet-900/50 via-purple-900/30 to-[#0a0a0f] p-8 sm:p-14 flex flex-col md:flex-row items-center gap-10"
          >
            <div className="absolute top-0 left-0 w-72 h-72 bg-violet-500/15 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

            {/* Left: content */}
            <div className="relative z-10 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold uppercase tracking-widest mb-5">
                <span className="text-sm">🤖</span>
                IAs ensinando como seus melhores professores
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-5 leading-tight">
                Resumão Estratégico<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">
                  que realmente faz diferença
                </span>
              </h2>
              <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-6 max-w-lg">
                Antes de começar os exercícios, o GPT-4o analisa seu conteúdo e gera um guia cirúrgico: os conceitos mais cobrados, as armadilhas clássicas, técnicas de memorização personalizadas e a estratégia exata de estudo para <strong className="text-white">aquela matéria específica</strong>.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Conceitos-chave com técnica de memorização para cada um",
                  "O que mais cai na prova + armadilhas que derrubam estudantes",
                  "Conexões entre os tópicos para entender, não decorar",
                  "Estratégia de estudo personalizada para a matéria",
                  "Dica final que separa nota 8 de nota 10",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                    <CheckCircle className="w-4 h-4 text-violet-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => navigate("/app")}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-bold px-7 py-5 rounded-2xl shadow-lg shadow-violet-500/30 text-base"
              >
                <Brain className="w-4 h-4 mr-2" />
                Gerar meu resumão estratégico
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Right: mockup */}
            <div className="relative z-10 flex-shrink-0 w-full md:w-72 space-y-3">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/30 flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-white/80 text-xs font-black">Resumão Estratégico</p>
                    <p className="text-white/30 text-[10px]">Gerado por GPT-4o</p>
                  </div>
                  <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md bg-violet-500/30 text-violet-300 border border-violet-500/20 uppercase">IA</span>
                </div>
                {[
                  { icon: "🎯", label: "Visão Geral", preview: "Entenda o big picture antes de começar..." },
                  { icon: "📌", label: "Conceitos-chave", preview: "6 conceitos mais cobrados + como memorizar" },
                  { icon: "✅", label: "O que mais cai", preview: "4 padrões frequentes nesta matéria" },
                  { icon: "⚠️", label: "Armadilhas", preview: "Erros clássicos + como evitar cada um" },
                  { icon: "⭐", label: "Dica Final", preview: "O que separa nota 8 de nota 10" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-white/70 text-[11px] font-bold">{item.label}</p>
                      <p className="text-white/35 text-[10px] leading-snug">{item.preview}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── REDAÇÃO SPOTLIGHT ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden border border-indigo-500/30 bg-gradient-to-br from-indigo-900/60 via-violet-900/40 to-[#0a0a0f] p-8 sm:p-14 flex flex-col md:flex-row items-center gap-10"
          >
            {/* Glow */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-violet-500/15 blur-[80px] rounded-full pointer-events-none" />

            {/* Left: content */}
            <div className="relative z-10 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-5">
                <Sparkles className="w-3 h-3" />
                Novidade exclusiva
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-5 leading-tight">
                Corretor de Redação<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                  Nota 0–1000 em segundos
                </span>
              </h2>
              <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-6 max-w-lg">
                Cole sua redação e o GPT-4o avalia <strong className="text-white">todas as 5 competências ENEM</strong> com nota individual, feedback detalhado, pontos fortes e o que melhorar. Como ter um corretor especialista disponível 24h.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Avaliação nas 5 competências (C1 a C5)",
                  "Nota estimada de 0 a 1000 pontos",
                  "Feedback específico por parágrafo e competência",
                  "Sugestões concretas para aumentar a nota",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                    <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => navigate("/redacao")}
                className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold px-7 py-5 rounded-2xl shadow-lg shadow-indigo-500/30 text-base"
              >
                <PenLine className="w-4 h-4 mr-2" />
                Corrigir minha redação grátis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Right: score mockup */}
            <div className="relative z-10 flex-shrink-0 w-full md:w-72">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
                <div className="text-center">
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Sua nota estimada</p>
                  <p className="text-6xl font-black text-white">840</p>
                  <p className="text-white/40 text-sm">de 1000 pontos</p>
                  <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30">
                    <Star className="w-3 h-3 text-violet-400" />
                    <span className="text-violet-300 text-xs font-bold">Muito Bom</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "C1 Norma Culta", nota: 160, color: "bg-violet-500" },
                    { label: "C2 Repertório", nota: 160, color: "bg-blue-500" },
                    { label: "C3 Argumentação", nota: 200, color: "bg-emerald-500" },
                    { label: "C4 Coesão", nota: 160, color: "bg-amber-500" },
                    { label: "C5 Proposta", nota: 160, color: "bg-rose-500" },
                  ].map((c) => (
                    <div key={c.label}>
                      <div className="flex justify-between text-[10px] text-white/50 mb-1">
                        <span>{c.label}</span>
                        <span className="font-bold text-white/70">{c.nota}/200</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${c.color}`} style={{ width: `${(c.nota / 200) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MAPA SPOTLIGHT ── */}
      <section className="py-4 px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-emerald-900/50 via-green-900/30 to-[#0a0a0f] p-8 sm:p-14 flex flex-col md:flex-row-reverse items-center gap-10"
          >
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500/15 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute top-0 left-0 w-48 h-48 bg-green-500/10 blur-[80px] rounded-full pointer-events-none" />

            {/* Right: content */}
            <div className="relative z-10 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-5">
                <TrendingUp className="w-3 h-3" />
                Inteligência de aprendizado
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-5 leading-tight">
                Saiba exatamente<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400">
                  onde focar seu tempo
                </span>
              </h2>
              <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-6 max-w-lg">
                O <strong className="text-white">Mapa de Calor</strong> analisa toda a sua trajetória na plataforma — simulados, flashcards, frequência — e mostra em cores quais matérias estão fortes e quais precisam de atenção. Nada mais de estudar o que você já sabe.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Grade visual colorida por nível de domínio (verde = forte, vermelho = crítico)",
                  "Tendência de melhora ou queda por matéria",
                  "Resumo automático: pontos fortes × áreas para focar",
                  "Atualizado em tempo real a cada simulado ou flashcard",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => navigate("/mapa")}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold px-7 py-5 rounded-2xl shadow-lg shadow-emerald-500/30 text-base"
              >
                <Map className="w-4 h-4 mr-2" />
                Ver meu mapa de desempenho
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Left: heat grid mockup */}
            <div className="relative z-10 flex-shrink-0 w-full md:w-64">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-2.5">
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">Mapa de Calor</p>
                {[
                  { label: "Matemática", pct: 87, color: "bg-gradient-to-r from-emerald-400 to-green-500", tag: "Forte" },
                  { label: "Português", pct: 72, color: "bg-gradient-to-r from-lime-400 to-emerald-400", tag: "Bom" },
                  { label: "História", pct: 55, color: "bg-gradient-to-r from-amber-400 to-yellow-400", tag: "Regular" },
                  { label: "Química", pct: 38, color: "bg-gradient-to-r from-orange-400 to-amber-500", tag: "Fraco" },
                  { label: "Biologia", pct: 22, color: "bg-gradient-to-r from-red-500 to-rose-600", tag: "Crítico" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-white/60 font-semibold">{item.label}</span>
                      <span className="text-white/40 font-bold">{item.pct}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] text-white/40">Foco: Biologia, Química</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SIMULADO ADAPTATIVO SPOTLIGHT ── */}
      <section className="py-4 px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden border border-purple-500/30 bg-gradient-to-br from-purple-900/50 via-indigo-900/30 to-[#0a0a0f] p-8 sm:p-14 flex flex-col md:flex-row items-center gap-10"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/15 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

            {/* Left: content */}
            <div className="relative z-10 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-widest mb-5">
                <Zap className="w-3 h-3" />
                IA Adaptativa
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-5 leading-tight">
                O simulado que<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                  aprende com você
                </span>
              </h2>
              <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-6 max-w-lg">
                Diferente do simulado comum, o <strong className="text-white">Simulado Adaptativo</strong> lê seu histórico de desempenho, identifica suas lacunas reais e gera questões cirúrgicas focadas exatamente no que você mais precisa revisar. Quanto mais você usa, mais certeiro ele fica.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Análise automática do seu histórico de acertos e erros",
                  "Questões geradas especificamente para suas fraquezas",
                  "Funciona mesmo sem histórico — cria sua linha de base",
                  "Painel de evolução: compare sua nota atual com a média anterior",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => navigate("/app")}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold px-7 py-5 rounded-2xl shadow-lg shadow-purple-500/30 text-base"
              >
                <Target className="w-4 h-4 mr-2" />
                Experimentar simulado adaptativo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Right: diagnostic mockup */}
            <div className="relative z-10 flex-shrink-0 w-full md:w-72 space-y-3">
              {/* Badge adaptativo */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/30 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-purple-400" />
                  </div>
                  <p className="text-white/80 text-xs font-black">Análise Adaptativa</p>
                  <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md bg-purple-500/30 text-purple-300 uppercase">⚡ Personalizado</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Média ant.", value: "54%", color: "text-white/70" },
                    { label: "Agora", value: "73%", color: "text-emerald-400" },
                    { label: "Tendência", value: "📈", color: "text-emerald-400" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/5 rounded-xl p-2 text-center border border-white/10">
                      <p className={`font-black text-base ${s.color}`}>{s.value}</p>
                      <p className="text-white/30 text-[9px] font-semibold leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +19pp acima da sua média! Continue assim 🎉
                </p>
              </div>
              {/* Focused topics */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2.5">Foco das questões</p>
                <div className="space-y-1.5">
                  {[
                    { label: "Equações de 2º grau", lacuna: "Alta" },
                    { label: "Progressão Geométrica", lacuna: "Média" },
                    { label: "Trigonometria básica", lacuna: "Alta" },
                  ].map((t) => (
                    <div key={t.label} className="flex items-center justify-between">
                      <span className="text-white/60 text-[11px] font-medium">{t.label}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${t.lacuna === "Alta" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>
                        {t.lacuna}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── COMPARATIVO ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-violet-400 font-semibold text-sm uppercase tracking-widest mb-3">Comparativo</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              StudyAI vs método tradicional
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Veja por que estudar com IA é diferente de tudo que você já usou.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            custom={0.3}
            className="rounded-2xl border border-white/10 overflow-hidden"
          >
            {/* Header row */}
            <div className="grid grid-cols-[1fr_1fr_1fr] bg-white/5 border-b border-white/10 text-sm font-black uppercase tracking-wide">
              <div className="px-5 py-4 text-white/40">Aspecto</div>
              <div className="px-5 py-4 text-white/50 border-l border-white/10 flex items-center gap-2">
                <X className="w-4 h-4 text-red-400" /> Método Tradicional
              </div>
              <div className="px-5 py-4 border-l border-white/10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">StudyAI</span>
              </div>
            </div>

            {comparativo.map((row, i) => (
              <div
                key={row.aspecto}
                className={`grid grid-cols-[1fr_1fr_1fr] text-sm border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}
              >
                <div className="px-5 py-4 font-semibold text-white/70">{row.aspecto}</div>
                <div className="px-5 py-4 text-white/35 border-l border-white/5 flex items-start gap-2">
                  <X className="w-3.5 h-3.5 text-red-400/60 shrink-0 mt-0.5" />
                  {row.tradicional}
                </div>
                <div className="px-5 py-4 text-emerald-300/80 border-l border-white/5 flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  {row.studyai}
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            custom={0.5}
            className="text-center mt-8"
          >
            <Button
              size="lg"
              className="bg-violet-600 hover:bg-violet-500 text-white text-base px-8 h-12 shadow-lg shadow-violet-900/40"
              onClick={() => navigate("/app")}
            >
              Experimentar grátis
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-violet-400 font-semibold text-sm uppercase tracking-widest mb-3">Como funciona</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Em 3 passos simples
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i * 0.7}
                className="relative text-center"
              >
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-5">
                  <s.icon className="w-7 h-7 text-violet-400" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-bold text-xl mb-3">{s.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-violet-400 font-semibold text-sm uppercase tracking-widest mb-3">Depoimentos</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              Quem usou, aprovou
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i * 0.5}
                className="bg-white/5 border border-white/8 rounded-2xl p-6"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, si) => (
                    <Star key={si} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-white/40 text-xs">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precos" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-violet-400 font-semibold text-sm uppercase tracking-widest mb-3">Preços</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Simples e transparente
            </h2>
            <p className="text-white/50 text-lg">Comece grátis. Escale conforme evolui.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i * 0.5}
                className={`relative rounded-2xl border p-8 ${
                  plan.highlight
                    ? "border-violet-500/50 bg-gradient-to-b from-violet-600/10 to-purple-600/5 shadow-xl shadow-violet-900/30"
                    : "border-white/10 bg-white/4"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-violet-600 text-white text-xs font-bold">
                    Mais popular
                  </div>
                )}
                <p className="text-white/50 text-sm mb-1">{plan.desc}</p>
                <h3 className="font-black text-2xl mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-white/40 text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5 text-sm text-white/70">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.highlight
                      ? "bg-violet-600 hover:bg-violet-500 text-white"
                      : "border-white/15 text-white/80 hover:bg-white/5"
                  }`}
                  variant={plan.ctaVariant}
                  onClick={() => navigate("/app")}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WAITLIST ── */}
      <section id="lista-espera" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Lançamento em breve
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Entre na lista de espera
            </h2>
            <p className="text-white/50 text-lg">
              Seja um dos primeiros a saber quando o plano Pro for lançado. Quem entrar na lista ganha <span className="text-violet-400 font-semibold">30 dias grátis</span>.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            custom={0.5}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8"
          >
            {wlStatus === "success" ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-black mb-2">Você está na lista! 🎉</h3>
                <p className="text-white/60">{wlMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white/70 mb-1.5">
                      Seu nome
                    </label>
                    <input
                      type="text"
                      placeholder="João Silva"
                      value={wlName}
                      onChange={(e) => setWlName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/70 mb-1.5">
                      Seu email <span className="text-violet-400">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="joao@email.com"
                      value={wlEmail}
                      onChange={(e) => setWlEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    />
                  </div>
                </div>

                {wlStatus === "error" && (
                  <p className="text-red-400 text-sm">{wlMessage}</p>
                )}

                <Button
                  type="submit"
                  disabled={wlStatus === "loading"}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white h-12 text-base font-bold disabled:opacity-60"
                >
                  {wlStatus === "loading" ? "Cadastrando..." : "Quero 30 dias grátis →"}
                </Button>

                <p className="text-center text-white/30 text-xs">
                  Sem spam. Apenas avisaremos quando o Pro for lançado.
                </p>
              </form>
            )}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            custom={1}
            className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-white/40"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
              30 dias grátis ao entrar
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Sem cartão de crédito
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Cancele quando quiser
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-6">
              <GraduationCap className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Pronto para começar?
            </h2>
            <p className="text-white/50 text-lg mb-8">
              Junte-se a milhares de estudantes que já usam IA para estudar de forma mais eficiente.
            </p>
            <Button
              size="lg"
              className="bg-violet-600 hover:bg-violet-500 text-white text-base px-10 h-12 shadow-lg shadow-violet-900/40"
              onClick={() => navigate("/app")}
            >
              Criar minha conta grátis
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold">StudyAI</span>
          </div>

          <p className="text-white/30 text-sm">
            © {new Date().getFullYear()} StudyAI · Todos os direitos reservados
          </p>

          <div className="flex items-center gap-5 text-sm text-white/40">
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
