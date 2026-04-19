import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Brain, Zap, Trophy, Clock, BarChart2, Star,
  ArrowRight, BookOpen, Sparkles, Users, GraduationCap,
  PenLine, Map, TrendingUp, Target, CheckCircle,
  ChevronDown, Mic, Volume2, Radio, Cpu, Layers, Shield,
  Building2, Globe, BookMarked, LayoutDashboard, Menu, X,
  FlaskConical, BarChart, BookMarked as BookIcon, Settings,
} from "lucide-react";
import { startCheckout } from "@/hooks/useSubscription";

/* ── Landing Nav Dropdown ──────────────────────────────────────────────── */
interface LandingDropdownItem { label: string; desc?: string; href?: string; path?: string; icon?: React.ElementType; }
interface LandingGroup { label: string; items: LandingDropdownItem[]; }

function LandingDropdown({ group, onNavigate }: { group: LandingGroup; onNavigate: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors py-2 px-1">
        {group.label} <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 py-1.5">
            {group.items.map((item, i) => (
              <button key={i}
                onClick={() => { if (item.path) onNavigate(item.path); if (item.href) window.location.href = item.href; setOpen(false); }}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group">
                {item.icon && (
                  <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-orange-50 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                    <item.icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-orange-500 transition-colors" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  {item.desc && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.desc}</p>}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const features = [
  { icon: Mic, label: "Professor Tiagão", desc: "Tutora por voz — fala com você, sabe seu progresso e age proativamente.", color: "text-orange-500", bg: "bg-orange-50" },
  { icon: Brain, label: "Plano de Estudos IA", desc: "PDF, foto do caderno ou tema digitado. Nossa IA cria um cronograma personalizado.", color: "text-violet-600", bg: "bg-violet-50" },
  { icon: Zap, label: "Simulado Inteligente", desc: "10 questões do seu material, com gabarito comentado em tempo real.", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: BookOpen, label: "Flashcards Anki", desc: "Repetição espaçada inteligente. A IA cria os cards e ajusta o ritmo.", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: Clock, label: "Pomodoro Gamificado", desc: "Timer de foco integrado ao plano. Cada sessão concluída mantém sua sequência de estudos.", color: "text-pink-500", bg: "bg-pink-50" },
  { icon: Trophy, label: "Ranking Global + XP", desc: "Cada tópico, simulado e flashcard gera XP real no banco. Suba de Bronze ao Diamante.", color: "text-amber-500", bg: "bg-amber-50" },
  { icon: BarChart2, label: "Dashboard + Mapa de Calor", desc: "Visualize pontos fortes e fracos por matéria. Atualiza com cada simulado.", color: "text-indigo-500", bg: "bg-indigo-50" },
  { icon: PenLine, label: "Corretor de Redação", desc: "Nota 0–1000 nas 5 competências ENEM. Análise pela nossa IA em 30 segundos.", color: "text-rose-500", bg: "bg-rose-50" },
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
      "5 mensagens/dia com a Professor Tiagão",
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
      "Professor Tiagão ilimitada + voz proativa",
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
  { name: "Mariana S.", role: "ENEM 2024 — Medicina", text: "Tirava 580. Depois de 2 meses com o StudyAI, fui para 724. A Tiagão me chamava quando ficava dias sem estudar. Era como ter uma professor particular.", before: "580 pts", after: "724 pts", emoji: "🎓" },
  { name: "Carlos M.", role: "Aprovado no TRF", text: "Tentei 3 anos sem aprovação. O Simulado Adaptativo detectou meus pontos cegos e finalmente passei. A IA sabia onde eu precisava melhorar melhor do que eu mesmo.", before: "3 reprovações", after: "Aprovado!", emoji: "📋" },
  { name: "Juliana R.", role: "FUVEST — Direito", text: "Fotografava minha apostila no ônibus e em 30 segundos tinha exercícios sobre o que ia cair. Nunca estudei tão pouco e aprendi tanto.", before: "Sem foco", after: "Aprovada!", emoji: "⚡" },
  { name: "Rafael T.", role: "3ª série Ensino Médio", text: "Minha redação foi de 640 para 880. O corretor identificou que eu não desenvolvia proposta de intervenção. Nenhum professor tinha me dito isso antes.", before: "Redação 640", after: "Redação 880", emoji: "✍️" },
];

const faqs = [
  { q: "O StudyAI é gratuito?", a: "Sim! O plano gratuito inclui plano de estudos personalizado, simulados, flashcards, correção de redação e acesso à Professor Tiagão. O plano Pro (R$29,90/mês) libera tudo ilimitado: simulado adaptativo avançado, Tiagão proativa por voz, correções ilimitadas e muito mais." },
  { q: "O que é a Professor Tiagão?", a: "Tiagão é a primeira professor por voz com IA do Brasil. Ela age de forma proativa — fala com você quando percebe que você ficou dias sem estudar, sabe seu plano de estudos, suas matérias e pontos fracos. É como ter uma professor particular disponível 24 horas por dia, 7 dias por semana." },
  { q: "Como o plano de estudos personalizado é gerado?", a: "Você informa sua matéria, nível de conhecimento, tempo disponível e objetivo (ENEM 2025, vestibular ou concurso). Pode também enviar um PDF, DOCX ou foto do caderno. Nossa IA analisa tudo e cria um cronograma personalizado dia a dia, com tópicos, exercícios práticos, flashcards e dicas de memorização específicos para o seu perfil." },
  { q: "Funciona para ENEM 2025, vestibular e concursos públicos?", a: "Sim! O StudyAI foi criado especialmente para estudantes brasileiros. A IA adapta o conteúdo, a linguagem e a dificuldade para o seu objetivo — seja o ENEM 2025, FUVEST, UNICAMP, UEL, ENADE, OAB, Receita Federal, INSS, PRF, concursos militares ou qualquer outra prova federal ou estadual." },
  { q: "Como funciona a correção de redação ENEM?", a: "Você envia sua redação (texto digitado ou foto) e a IA avalia nas 5 competências oficiais do ENEM: domínio da norma culta, compreensão do tema, seleção de argumentos, coesão e proposta de intervenção. Você recebe nota de 0 a 1000 em cada competência e sugestões detalhadas de melhoria — tudo em menos de 30 segundos." },
  { q: "O tutor IA responde qualquer dúvida de qualquer matéria?", a: "Sim! O tutor IA do StudyAI responde dúvidas de Matemática, Português, História, Biologia, Química, Física, Geografia, Sociologia, Filosofia, Inglês e todas as matérias do ENEM e vestibular — 24 horas por dia, com explicações didáticas, exemplos práticos e linguagem acessível." },
  { q: "O que é o Simulado Adaptativo com IA?", a: "É um simulado que aprende com você. A IA analisa todo o seu histórico de respostas, identifica suas lacunas e pontos fracos, e gera 10 questões cirúrgicas focadas exatamente no que você mais precisa revisar. Quanto mais você usa, mais preciso e personalizado ele fica — como um cursinho que conhece cada aluno individualmente." },
  { q: "Vale mais do que um cursinho presencial?", a: "Enquanto cursinhos tradicionais custam R$200 a R$800 por mês com conteúdo igual para todos, o StudyAI oferece plano 100% personalizado, simulados ilimitados do seu próprio material, tutor IA 24h e correção de redação por apenas R$29,90/mês — ou até gratuitamente no plano básico. É o cursinho do futuro, no seu ritmo e no seu bolso." },
  { q: "Posso usar o StudyAI no celular?", a: "Sim! O StudyAI funciona perfeitamente em qualquer celular Android ou iPhone, direto no navegador — sem precisar instalar nenhum aplicativo. Acesse study.ia.br e comece agora mesmo. A interface é totalmente adaptada para telas menores." },
  { q: "Como funciona o Mapa de Calor de Desempenho?", a: "O Mapa de Calor é um painel visual que mostra seus pontos fortes e fracos por matéria. Ele atualiza automaticamente com base em todos os seus simulados, flashcards e exercícios. Assim você sabe exatamente onde focar o estudo para maximizar sua nota — sem desperdiçar tempo revisando o que já domina." },
  { q: "O Pomodoro do StudyAI é diferente?", a: "Sim! O Pomodoro do StudyAI é gamificado e integrado ao seu plano de estudos. Cada sessão concluída gera XP (pontos de experiência) que sobem no ranking nacional de estudantes. Você também conquista badges e medalhas conforme avança — tornando o estudo mais motivador e consistente." },
];

const B2B_TYPES = [
  "Escola privada",
  "Cursinho pré-vestibular",
  "Universidade / Faculdade",
  "Entidade governamental",
  "Secretaria de Educação",
  "ONG / Terceiro Setor",
  "Empresa (RH / T&D)",
  "Outro",
];

const B2B_STUDENTS = [
  "Até 100 alunos",
  "101 – 500 alunos",
  "501 – 2.000 alunos",
  "2.001 – 10.000 alunos",
  "Mais de 10.000 alunos",
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activeTest, setActiveTest] = useState(0);

  const [b2bForm, setB2bForm] = useState({ name: "", email: "", institution: "", type: "", students: "", message: "" });
  const [b2bLoading, setB2bLoading] = useState(false);
  const [b2bDone, setB2bDone] = useState(false);
  const [b2bError, setB2bError] = useState("");

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleB2bSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setB2bError("");
    if (!b2bForm.name || !b2bForm.email || !b2bForm.institution || !b2bForm.type) {
      setB2bError("Preencha todos os campos obrigatórios.");
      return;
    }
    setB2bLoading(true);
    try {
      const res = await fetch(`${BASE}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b2bForm),
      });
      if (!res.ok) throw new Error("erro");
      setB2bDone(true);
    } catch {
      setB2bError("Erro ao enviar. Tente novamente ou mande e-mail para contato@study.ia.br.");
    } finally {
      setB2bLoading(false);
    }
  };

  const handleStart = () => navigate("/app");
  const handlePro = async () => {
    setCheckoutLoading(true);
    try { await startCheckout(); } catch { navigate("/pricing"); }
    finally { setCheckoutLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-200">S</div>
            <span className="font-black text-lg tracking-tight text-gray-900">StudyAI</span>
          </a>

          {/* Desktop grouped nav */}
          <div className="hidden md:flex items-center gap-2 flex-1">
            <LandingDropdown
              onNavigate={navigate}
              group={{
                label: "Plataforma",
                items: [
                  { icon: Sparkles,       label: "Funcionalidades",       desc: "Veja tudo que a plataforma oferece",  href: "#funcoes"     },
                  { icon: Mic,            label: "Professor Tiagão",      desc: "Tutora por voz com IA em PT-BR",      href: "#paula"       },
                  { icon: Target,         label: "Simulado ENEM",         desc: "Simulado completo com gabarito",      path: "/simulado-enem" },
                  { icon: BarChart2,      label: "Dashboard de Estudos",  desc: "Visualize sua evolução por matéria",  path: "/app"         },
                ],
              }}
            />
            <LandingDropdown
              onNavigate={navigate}
              group={{
                label: "Para Quem",
                items: [
                  { icon: GraduationCap, label: "Alunos",      desc: "ENEM, vestibulares e concursos",     path: "/app"       },
                  { icon: BookOpen,      label: "Professores",  desc: "Portal completo para docentes",      path: "/professor" },
                  { icon: Building2,     label: "Escolas",      desc: "Gestão de turmas e relatórios",      href: "#institucional" },
                  { icon: Globe,         label: "Governo",      desc: "Parcerias educacionais e acesso",    path: "/governo"   },
                ],
              }}
            />
            <a href="#precos" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors px-1">Preços</a>
            <a href="#faq"    className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors px-1">FAQ</a>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex-1" />

          {/* CTA buttons */}
          <div className="flex items-center gap-2.5">
            <button onClick={handleStart}
              className="hidden sm:block text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium px-2">
              Entrar
            </button>
            <button onClick={handleStart}
              className="text-sm font-bold px-4 py-2 rounded-xl text-white bg-orange-500 hover:bg-orange-600 transition-all shadow-md shadow-orange-200 hover:scale-[1.02] active:scale-[0.98]">
              Começar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-20 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left: text */}
            <div className="text-center md:text-left">
              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-100">
                  <Radio className="w-3 h-3 animate-pulse" /> Novo: Professor Tiagão — Tutora por Voz com IA
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
                className="mt-6 text-5xl sm:text-6xl md:text-6xl font-black tracking-tight leading-[1.05] text-gray-900">
                Estude como se tivesse{" "}
                <span className="bg-gradient-to-r from-orange-500 to-violet-600 bg-clip-text text-transparent">
                  um tutor particular
                </span>{" "}
                ao lado
              </motion.h1>

              <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
                className="mt-5 text-xl text-gray-500 leading-relaxed">
                O Professor Tiagão fala com você por voz, sabe seu progresso e age de forma proativa. Planos de estudo, simulados, flashcards e correção de redação — tudo com nossa IA exclusiva.
              </motion.p>

              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}
                className="mt-8 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
                <button onClick={handleStart}
                  className="group flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-200">
                  Começar Grátis
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button onClick={handleStart}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                  <Mic className="w-4 h-4" /> Ver o Professor Tiagão
                </button>
              </motion.div>
            </div>

            {/* Right: Tiagão character */}
            <motion.div
              initial={{ opacity: 0, x: 30, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", damping: 20, stiffness: 200 }}
              className="flex justify-center md:justify-end">
              <motion.img
                src="/tiagao-hero.png"
                alt="Professor Tiagão"
                className="w-64 h-64 sm:w-80 sm:h-80 object-contain select-none"
                style={{ filter: "drop-shadow(0 8px 40px rgba(99,102,241,0.35))" }}
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              />
            </motion.div>
          </div>

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
                Conheça a Professor Tiagão
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                A primeira professor por voz com IA que age de forma proativa. Ela não espera você perguntar — ela chama você.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Radio, title: "Fala primeiro, sem você pedir", desc: "Tiagão percebe quando você ficou dias sem estudar e chama por voz.", color: "text-orange-500", bg: "bg-orange-50" },
                  { icon: Cpu, title: "Sabe tudo sobre seu progresso", desc: "Tem acesso ao seu plano, XP, dias concluídos e matérias em estudo.", color: "text-violet-500", bg: "bg-violet-50" },
                  { icon: Layers, title: "Age no app por você", desc: "Peça para ela criar um plano ou navegar — ela executa diretamente.", color: "text-blue-500", bg: "bg-blue-50" },
                  { icon: Shield, title: "Voz natural, zero robótica", desc: "Voz feminina, calorosa e fluida — 100% exclusiva do StudyAI.", color: "text-emerald-500", bg: "bg-emerald-50" },
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
                <div className="pt-4 pb-2 text-center" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
                  <div className="w-36 h-36 mx-auto select-none">
                    <img src="/tiagao-hero.png" alt="Professor Tiagão" className="w-full h-full object-contain" style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.25))" }} />
                  </div>
                  <p className="text-white font-black pb-3">Professor Tiagão</p>
                  <p className="text-indigo-100 text-xs pb-4">Tutor de Voz com IA</p>
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
                  <p className="text-center text-xs text-gray-400">● Online 24h • Voz exclusiva StudyAI</p>
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
            <p className="mt-3 text-gray-500 text-lg">9 ferramentas integradas, todas com inteligência artificial.</p>
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
              { num: "2", title: "Nossa IA cria seu plano personalizado", desc: "Cronograma dia a dia, tópicos, exercícios e dicas adaptados para o seu perfil e objetivo." },
              { num: "3", title: "Tiagão te acompanha enquanto você evolui", desc: "Flashcards, simulados, Pomodoro e o Tiagão te chamando quando precisar revisar. Suba no ranking." },
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

      {/* ── XP JOURNEY ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">
              <Trophy className="w-3 h-3" /> Sistema de Conquistas
            </span>
            <h2 className="text-4xl font-black tracking-tight text-gray-900">
              Cada estudo vira XP real
            </h2>
            <p className="mt-3 text-gray-500 text-lg max-w-xl mx-auto">
              Tópico concluído, simulado feito, flashcard dominado — tudo gera pontos que ficam salvos e sobem no ranking nacional.
            </p>
          </motion.div>

          {/* XP sources */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.1}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {[
              { icon: "📚", label: "Tópico concluído", xp: "+100 XP", color: "bg-violet-50 border-violet-100" },
              { icon: "⚡", label: "Simulado feito", xp: "até +200 XP", color: "bg-blue-50 border-blue-100" },
              { icon: "🃏", label: "Flashcards", xp: "até +50 XP", color: "bg-emerald-50 border-emerald-100" },
              { icon: "🗺️", label: "Plano criado", xp: "+25 XP", color: "bg-orange-50 border-orange-100" },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.07}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border text-center ${item.color}`}>
                <span className="text-2xl">{item.icon}</span>
                <p className="text-xs text-gray-600 font-medium leading-tight">{item.label}</p>
                <p className="text-sm font-black text-gray-900">{item.xp}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Badge progression */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.2}
            className="relative">
            {/* connecting line */}
            <div className="absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-amber-300 via-gray-300 to-blue-400 hidden sm:block" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { emoji: "🥉", name: "Bronze", range: "0 – 499 XP", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
                { emoji: "🥈", name: "Prata", range: "500 – 1.499 XP", color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
                { emoji: "🥇", name: "Ouro", range: "1.500 – 2.999 XP", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
                { emoji: "💎", name: "Diamante", range: "3.000+ XP", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
              ].map((badge, i) => (
                <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.08}
                  className={`relative flex flex-col items-center gap-2 p-5 rounded-2xl border ${badge.bg} ${badge.border} text-center`}>
                  <span className="text-3xl">{badge.emoji}</span>
                  <p className={`font-black text-sm ${badge.color}`}>{badge.name}</p>
                  <p className="text-xs text-gray-400 leading-tight">{badge.range}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
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
              { aspecto: "Tutor disponível", trad: "Horário fixo do professor", ai: "Tiagão 24h — te chama por voz" },
              { aspecto: "Simulados", trad: "Questões antigas de banco fixo", ai: "Gerados do seu conteúdo" },
              { aspecto: "Feedback de redação", trad: "Aguarda dias ou semanas", ai: "Nota completa em 30 segundos" },
              { aspecto: "Identificação de lacunas", trad: "Você tenta adivinhar", ai: "Mapa de Calor + Adaptativo" },
              { aspecto: "Motivação", trad: "Depende do humor do dia", ai: "XP, ranking e Tiagão te incentivando" },
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

      {/* ── ÁREAS DEDICADAS: PROFESSOR E GOVERNO ── */}
      <section id="areas" className="py-20 px-6 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-600 shadow-sm mb-4">
              <Building2 className="w-3 h-3 text-indigo-500" />
              Portais exclusivos
            </span>
            <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-3">
              Área do Professor e Área do Governo
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              O StudyAI vai além do aluno individual — temos portais dedicados para professores gerenciarem turmas e para órgãos públicos acompanharem a educação em escala.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">

            {/* Card Professor */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.05}
              className="group relative bg-white rounded-3xl border border-indigo-100 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
              <div className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-5">
                  <GraduationCap className="w-7 h-7 text-indigo-600" />
                </div>
                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 mb-3">
                  Para Educadores
                </span>
                <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">
                  Área do Professor 👨‍🏫
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  Crie e gerencie turmas, acompanhe o desempenho de cada aluno em tempo real, compartilhe planos de estudo personalizados e identifique quem precisa de atenção — tudo em um só lugar.
                </p>
                <ul className="space-y-2.5 mb-8">
                  {[
                    "Criação de turmas com código de convite",
                    "Dashboard de desempenho por aluno",
                    "Relatórios de evolução e lacunas",
                    "Atribuição de planos e simulados",
                    "Alertas de alunos em risco de evasão",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/professor")}
                  className="group/btn w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300">
                  Acessar Área do Professor
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>

            {/* Card Governo */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.1}
              className="group relative bg-white rounded-3xl border border-emerald-100 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
              <div className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-5">
                  <Globe className="w-7 h-7 text-emerald-700" />
                </div>
                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 mb-3">
                  Para Órgãos Públicos
                </span>
                <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">
                  Área do Governo 🏛️
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  Painel de dados educacionais para secretarias, ministérios e entidades públicas — monitore o engajamento e desempenho de estudantes em escala municipal, estadual ou federal.
                </p>
                <ul className="space-y-2.5 mb-8">
                  {[
                    "Visão consolidada de toda a plataforma",
                    "Estatísticas por cidade, estado e escola",
                    "Taxa de engajamento e retenção",
                    "Evolução semanal de simulados e planos",
                    "Dados para políticas públicas de educação",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/governo")}
                  className="group/btn w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-all shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300">
                  Acessar Área do Governo
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── B2B / INSTITUCIONAL ── */}
      <section id="institucional" className="py-20 px-6 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-14 items-start">

            {/* Left — pitch */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 uppercase tracking-wide mb-4">
                <GraduationCap className="w-3 h-3" /> Para Instituições de Ensino
              </span>
              <h2 className="text-4xl font-black tracking-tight mb-4 leading-tight">
                StudyAI para escolas, cursinhos e governo
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Leve tutoria por IA personalizada para centenas ou milhares de alunos de uma vez. Planos institucionais com painel de gestão, relatórios de desempenho da turma e suporte dedicado.
              </p>

              <div className="space-y-5 mb-8">
                {[
                  { emoji: "🏫", title: "Escolas e colégios privados", desc: "Complemento ideal para reforço escolar e preparação para vestibular." },
                  { emoji: "📝", title: "Cursinhos pré-vestibular", desc: "Simulados adaptativos individuais para cada aluno da sua turma, em escala." },
                  { emoji: "🏛️", title: "Redes públicas e secretarias", desc: "Democratize o acesso à tutoria de qualidade para alunos de escola pública." },
                  { emoji: "🎓", title: "Universidades e faculdades", desc: "Suporte à permanência e desempenho acadêmico com IA pedagógica." },
                  { emoji: "💼", title: "Empresas (T&D / concursos)", desc: "Prepare equipes para certificações, OAB, concursos e treinamentos internos." },
                ].map((item, i) => (
                  <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.06}
                    className="flex gap-3 items-start">
                    <span className="text-xl mt-0.5">{item.emoji}</span>
                    <div>
                      <p className="font-semibold text-white text-sm">{item.title}</p>
                      <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Preços sob medida · Contrato flexível · Onboarding dedicado</span>
              </div>
            </motion.div>

            {/* Right — form */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.15}>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                {b2bDone ? (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4">🎉</div>
                    <p className="text-xl font-black text-white mb-2">Recebemos seu contato!</p>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Nossa equipe vai analisar sua demanda e entrar em contato em até <strong className="text-white">1 dia útil</strong> para agendar uma conversa.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="font-black text-white text-lg mb-1">Agende uma conversa</p>
                    <p className="text-gray-400 text-sm mb-6">Sem compromisso — entendemos sua demanda e apresentamos uma proposta.</p>

                    <form onSubmit={handleB2bSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Nome *</label>
                          <input
                            type="text"
                            value={b2bForm.name}
                            onChange={e => setB2bForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Seu nome"
                            className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">E-mail *</label>
                          <input
                            type="email"
                            value={b2bForm.email}
                            onChange={e => setB2bForm(f => ({ ...f, email: e.target.value }))}
                            placeholder="seu@email.com"
                            className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Instituição *</label>
                        <input
                          type="text"
                          value={b2bForm.institution}
                          onChange={e => setB2bForm(f => ({ ...f, institution: e.target.value }))}
                          placeholder="Nome da escola, cursinho ou empresa"
                          className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Tipo de instituição *</label>
                          <select
                            value={b2bForm.type}
                            onChange={e => setB2bForm(f => ({ ...f, type: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none"
                          >
                            <option value="" className="bg-gray-900">Selecione...</option>
                            {B2B_TYPES.map(t => <option key={t} value={t} className="bg-gray-900">{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Nº de alunos</label>
                          <select
                            value={b2bForm.students}
                            onChange={e => setB2bForm(f => ({ ...f, students: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none"
                          >
                            <option value="" className="bg-gray-900">Selecione...</option>
                            {B2B_STUDENTS.map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Mensagem ou contexto (opcional)</label>
                        <textarea
                          value={b2bForm.message}
                          onChange={e => setB2bForm(f => ({ ...f, message: e.target.value }))}
                          placeholder="Conte um pouco sobre sua necessidade..."
                          rows={3}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                        />
                      </div>

                      {b2bError && (
                        <p className="text-red-400 text-xs">{b2bError}</p>
                      )}

                      <button
                        type="submit"
                        disabled={b2bLoading}
                        className="w-full py-3 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        {b2bLoading ? "Enviando..." : "Quero conhecer os planos institucionais →"}
                      </button>

                      <p className="text-center text-xs text-gray-500">
                        Resposta em até 1 dia útil · Sem spam · Seus dados são protegidos pela LGPD
                      </p>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
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

      {/* ── SEO CONTENT: ENEM 2025 ── */}
      <section className="py-20 px-6 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-6">
              O melhor aplicativo para estudar para o ENEM 2025
            </h2>
            <div className="prose prose-gray max-w-none text-gray-600 space-y-4 text-sm leading-relaxed">
              <p>
                O <strong className="text-gray-800">StudyAI</strong> é a plataforma de estudos com inteligência artificial mais completa do Brasil para quem quer passar no <strong className="text-gray-800">ENEM 2025</strong>, vestibular ou concurso público. Diferente de aplicativos genéricos, o StudyAI usa <strong className="text-gray-800">nossa própria IA educacional</strong> para criar um plano de estudos 100% personalizado com base no seu nível, tempo disponível, pontos fracos e objetivo específico.
              </p>
              <p>
                Para quem vai fazer o <strong className="text-gray-800">ENEM 2025</strong>, o StudyAI gera simulados no estilo das provas reais, avalia redações nas 5 competências oficiais e cria um cronograma de estudos adaptado por área de conhecimento: <strong className="text-gray-800">Matemática e suas Tecnologias</strong>, <strong className="text-gray-800">Ciências da Natureza</strong>, <strong className="text-gray-800">Ciências Humanas</strong> e <strong className="text-gray-800">Linguagens e Códigos</strong>. O Mapa de Calor mostra exatamente onde você perde pontos, para focar onde mais importa.
              </p>
              <p>
                Para <strong className="text-gray-800">concursos públicos</strong> — como Receita Federal, INSS, PRF, Polícia Federal, concursos militares, concursos estaduais e municipais — o StudyAI lê o edital ou apostila em PDF e extrai os tópicos de maior peso. O <strong className="text-gray-800">Simulado Adaptativo</strong> detecta suas lacunas e gera questões cirúrgicas para que você não perca tempo revisando o que já sabe.
              </p>
              <p>
                Para vestibulares como <strong className="text-gray-800">FUVEST</strong>, <strong className="text-gray-800">UNICAMP</strong>, <strong className="text-gray-800">UEL</strong>, <strong className="text-gray-800">ENADE</strong> e <strong className="text-gray-800">vestibulares estaduais</strong>, o StudyAI adapta o conteúdo, a linguagem e a dificuldade das questões ao perfil específico de cada banca. Você estuda menos, aprende mais e chega na prova com confiança.
              </p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.1}>
              <h3 className="text-xl font-black text-gray-900 mb-4">Como estudar para o ENEM com IA</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>A metodologia do StudyAI combina as técnicas mais eficazes de aprendizagem comprovadas pela ciência cognitiva: <strong className="text-gray-800">repetição espaçada</strong> (método Anki) para memorização de longo prazo, <strong className="text-gray-800">técnica Pomodoro</strong> para manter o foco, <strong className="text-gray-800">prática de recuperação</strong> com simulados frequentes e <strong className="text-gray-800">feedback imediato</strong> para corrigir erros antes que virem hábitos.</p>
                <p>Estudantes que usam o StudyAI por pelo menos 30 minutos por dia reportam melhora média de <strong className="text-gray-800">89% na taxa de acerto</strong> nos simulados ao longo de 60 dias — com planos adaptados ao seu ritmo, não ao ritmo de uma turma genérica de cursinho.</p>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.2}>
              <h3 className="text-xl font-black text-gray-900 mb-4">Correção de redação ENEM com IA</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>A redação é responsável por <strong className="text-gray-800">200 dos 1000 pontos do ENEM</strong> — e é onde muitos estudantes perdem pontos por falta de feedback adequado. O corretor de redação do StudyAI avalia sua redação nas <strong className="text-gray-800">5 competências oficiais do MEC</strong>: domínio da norma culta, compreensão da proposta, seleção de argumentos, coesão textual e proposta de intervenção social.</p>
                <p>Em menos de 30 segundos você recebe nota detalhada em cada competência, análise dos seus pontos fortes, identificação dos erros mais graves e sugestões práticas para chegar mais perto da nota <strong className="text-gray-800">1000 na redação</strong>.</p>
              </div>
            </motion.div>
          </div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.3}
            className="mt-12 p-6 rounded-2xl bg-orange-50 border border-orange-100">
            <h3 className="text-xl font-black text-gray-900 mb-3">Por que o StudyAI é diferente de outros apps de estudo?</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-700">
              {[
                { title: "Plano do SEU material", desc: "Não usamos banco de questões genérico. Nossa IA cria exercícios do seu próprio conteúdo, adaptados ao seu nível e objetivo." },
                { title: "Tutora por voz proativa", desc: "A Professor Tiagão é a única professor de IA no Brasil que fala primeiro — te chamando quando você precisa estudar, sem você precisar perguntar nada." },
                { title: "Sem mensalidade absurda", desc: "Cursinho presencial cobra R$200–800/mês pelo mesmo conteúdo para todos. O StudyAI é pessoal, ilimitado e custa R$29,90/mês — ou gratuito no básico." },
                { title: "Tecnologia de ponta", desc: "Nossa IA é treinada para o contexto educacional brasileiro, não é IA genérica de prateleira: é estado da arte aplicado ao ENEM e vestibulares." },
                { title: "Funciona no celular", desc: "Estude no ônibus, no intervalo do trabalho, ou em qualquer lugar. Sem instalar aplicativo — só acesse study.ia.br no navegador." },
                { title: "Feito para o Brasil", desc: "Conteúdo alinhado ao currículo nacional, às bancas dos principais vestibulares e aos editais dos maiores concursos públicos do país." },
              ].map((item, i) => (
                <div key={i} className="flex gap-2">
                  <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-800">{item.title}</p>
                    <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
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
              A Tiagão está esperando por você
            </h2>
            <p className="text-gray-500 text-lg mb-8 max-w-lg mx-auto">
              Crie seu plano, ouça o Tiagão e comece a evoluir agora. Grátis para sempre no básico.
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
          <p className="text-gray-400 text-sm">© 2025 StudyAI · IA exclusiva para estudantes brasileiros</p>
          <div className="flex gap-4 text-sm text-gray-400">
            <a href="#faq" className="hover:text-gray-700 transition-colors">FAQ</a>
            <button onClick={() => navigate("/professor")} className="hover:text-indigo-600 transition-colors">Área do Professor</button>
            <button onClick={() => navigate("/governo")} className="hover:text-emerald-700 transition-colors">Área do Governo</button>
            <a href="/privacidade" className="hover:text-gray-700 transition-colors">Privacidade & LGPD</a>
            <button onClick={handleStart} className="hover:text-gray-700 transition-colors">Entrar</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
