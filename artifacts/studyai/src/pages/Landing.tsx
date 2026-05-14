import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Brain, Zap, Trophy, Clock, BarChart2, Star,
  ArrowRight, BookOpen, Sparkles, Users, GraduationCap,
  PenLine, Map, Target, CheckCircle, ChevronDown, Mic,
  Radio, Cpu, Layers, Shield, Building2, Globe, MessageSquare,
  TrendingUp, Bell, Play, Menu, X, MessageCircle, AlertTriangle,
  Video, Film, Award, Quote, Volume2, ArrowUpRight,
  Hammer,
} from "lucide-react";
import { startCheckout } from "@/hooks/useSubscription";
import { useStudyAuth } from "@/hooks/useStudyAuth";
import { Logo } from "@/components/Logo";
import {
  StudyBooksIllustration,
  StudyHeroIllustration,
  StudySparkIllustration,
} from "@/components/landing/StudyFlatIllustrations";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const pricingHref = `${BASE}/pricing`.replace(/([^:]\/)\/+/g, "$1");

/** Capturas de produto (public/landing) — mesma convenção de BASE_URL que o restante do app. */
const LANDING_IMG = {
  professorTiagao: `${BASE}/landing/professor-tiagao-feature.png`.replace(/([^:]\/)\/+/g, "$1"),
  notebookRag: `${BASE}/landing/notebook-rag-feature.png`.replace(/([^:]\/)\/+/g, "$1"),
  // Fotos educacionais (Unsplash, uso comercial liberado, sem necessidade de atribuição).
  comoFuncionaFoto: `${BASE}/landing/landing-como-funciona.jpg`.replace(/([^:]\/)\/+/g, "$1"),
  professorSalaFoto: `${BASE}/landing/landing-professor-sala.jpg`.replace(/([^:]\/)\/+/g, "$1"),
  escolaColaboracaoFoto: `${BASE}/landing/landing-escola-colaboracao.jpg`.replace(/([^:]\/)\/+/g, "$1"),
} as const;

/** Mídia estável (CC0 / CDN público) + posters Unsplash com largura fixa. */
const MAIN_DEMO_VIDEO = {
  src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  poster:
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1920&q=82",
};

const UNSPLASH = {
  studyDesk:
    "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1000&q=82",
  library:
    "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1000&q=82",
  writing:
    "https://images.unsplash.com/photo-1456513080510-7fe3d7a3362f?auto=format&fit=crop&w=1000&q=82",
  classroom:
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=82",
  laptop:
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=82",
  focus:
    "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1000&q=82",
};

const APP_SHOWCASE = [
  {
    title: "Professor Tiagão",
    desc: "Tutor por voz proativa no app: chama você, conhece o plano e age nos fluxos — a partir do hub.",
    path: "/app",
    icon: Mic,
    img: LANDING_IMG.professorTiagao,
  },
  {
    title: "Simulado ENEM",
    desc: "Simulado completo com foco no vestibular brasileiro, integrado ao plano e ao radar de desempenho.",
    path: "/simulado-enem",
    icon: Target,
    img: UNSPLASH.focus,
  },
  {
    title: "Notebook RAG",
    desc: "Transforme PDFs, links e materiais em aula interativa: resumos, questões e respostas ancoradas na sua biblioteca.",
    path: "/notebook",
    icon: Layers,
    img: LANDING_IMG.notebookRag,
  },
  {
    title: "Tutor IA (GPT e Claude)",
    desc: "Converse com modelos de ponta, com contexto do seu estudo — complementa o Tiagão por voz no app.",
    path: "/tutor-ia",
    icon: Brain,
    img: UNSPLASH.laptop,
  },
  {
    title: "Lousa Imersiva",
    desc: "Quadro, narração e materiais em tela cheia para aulas profundas sem distrações.",
    path: "/lousa-imersiva",
    icon: Video,
    img: UNSPLASH.classroom,
  },
  {
    title: "Fazedores",
    desc: "Desafios guiados para consertar rotina, organizar conteúdo, criar e estudar com passos claros.",
    path: "/aluno/fazedores",
    icon: Hammer,
    img: UNSPLASH.studyDesk,
  },
  {
    title: "Cronograma e Sala de Estudos",
    desc: "Organize a semana com a IA e entre na sala para foco, Pomodoro e revisão no mesmo ecossistema.",
    path: "/cronograma",
    icon: Clock,
    img: UNSPLASH.writing,
    extraPath: "/sala-estudos",
    extraLabel: "Sala de Estudos",
  },
] as const;

/** Primeira dobra: destaque explícito das novidades (rotas reais). */
const NOVIDADES_BAND = [
  {
    title: "Fazedores",
    accent: "Novo",
    desc: "Microdesafios: consertar, organizar, criar e estudar com método.",
    path: "/aluno/fazedores",
    img: UNSPLASH.studyDesk,
  },
  {
    title: "Notebook RAG",
    accent: "Material seu",
    desc: "PDFs e links viram aula, resumo e questões ancoradas no texto.",
    path: "/notebook",
    img: LANDING_IMG.notebookRag,
  },
  {
    title: "Lousa Imersiva",
    accent: "Imersivo",
    desc: "Quadro em tela cheia com narração para aprofundar sem distração.",
    path: "/lousa-imersiva",
    img: UNSPLASH.classroom,
  },
  {
    title: "Tutor IA (GPT e Claude)",
    accent: "Chat",
    desc: "Compare respostas e mergulhe em dúvidas longas com contexto.",
    path: "/tutor-ia",
    img: UNSPLASH.laptop,
  },
] as const;

const fadeUp: any = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

const STATS = [
  { v: "100 mil+", l: "estudantes impactados no ecossistema*" },
  { v: "Feedback muito positivo", l: "em testes com grupos focados*" },
  { v: "4.8★", l: "média em pesquisas com usuários piloto*" },
  { v: "24/7", l: "IA por texto e voz no app" },
];

const FEATURES = [
  { icon: Target,    label: "Plano de Estudos IA",      desc: "Plano personalizado dia a dia com IA. PDF, foto ou tema digitado.", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200/80" },
  { icon: Mic,       label: "Tutor Tiagão 24h",         desc: "Primeiro tutor de voz proativo do Brasil. Chama você, age no app.", color: "text-fuchsia-700", bg: "bg-fuchsia-50/90",  border: "border-fuchsia-200/80" },
  { icon: Layers,    label: "Notebook RAG",              desc: "Transforme qualquer material em aula interativa com IA.", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200/80" },
  { icon: PenLine,   label: "Corretor de Redação",       desc: "Nota 0–1000 em 30s nas 5 competências ENEM.", color: "text-violet-800",   bg: "bg-violet-50",   border: "border-violet-200/80"   },
  { icon: Zap,       label: "Simulado e treino no app",  desc: "Simulado ENEM e treinos guiados a partir do hub (`/app`) — sem página legada separada.", color: "text-purple-700",   bg: "bg-purple-50",   border: "border-purple-200/80"   },
  { icon: Users,     label: "Aula ao Vivo 2.0",         desc: "Sala virtual com quadro colaborativo, quiz e gravação automática.", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200/80" },
  { icon: BarChart2, label: "Análise Preditiva",         desc: "IA prevê risco de evasão e sugere intervenção em tempo real.", color: "text-fuchsia-700",   bg: "bg-fuchsia-50/80",   border: "border-fuchsia-200/70"   },
  { icon: Trophy,    label: "Gamificação Natural",       desc: "Streaks, conquistas, ranking e desafios semanais por turma.", color: "text-purple-800", bg: "bg-purple-50",  border: "border-purple-200/80"  },
  { icon: GraduationCap, label: "Aula com Professor IA", desc: "Aulas estruturadas com IA, materiais e ritmo de sala — integrado ao seu plano.", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200/80" },
  { icon: Map,       label: "Trilha Mestre",             desc: "Percursos por nível com checkpoints, reforço e revisão espaçada.", color: "text-fuchsia-700", bg: "bg-fuchsia-50/80", border: "border-fuchsia-200/70" },
  { icon: BookOpen,  label: "Caderno Digital",           desc: "Organize anotações, anexos e leituras com busca e links para o Notebook RAG.", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200/80" },
  { icon: Video,     label: "Lousa Imersiva",            desc: "Experiência imersiva de quadro e narração para aprofundar tópicos difíceis.", color: "text-violet-800", bg: "bg-violet-50", border: "border-violet-200/80" },
  { icon: Hammer,    label: "Fazedores",                 desc: "Microdesafios práticos para destravar hábitos, organizar estudo e criar conteúdo.", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200/80" },
  { icon: Sparkles,  label: "Tutor IA (GPT e Claude)",   desc: "Chat com modelos de ponta para tirar dúvidas longas e comparar abordagens.", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200/80" },
  { icon: Globe,     label: "Base de Conhecimento",      desc: "Centralize fontes e documentos para consulta rápida e uso em turmas.", color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200/80" },
];

const STEPS = [
  { num: "01", title: "Conte seus objetivos", desc: "IA analisa seu perfil em 2 minutos — nível, matérias, tempo disponível e data do ENEM.", icon: "🎯" },
  { num: "02", title: "Receba seu plano personalizado", desc: "Estudo diário, revisões, simulados e reforço com IA — tudo calculado para a sua realidade, acessível pelo app.", icon: "📅" },
  { num: "03", title: "Estude com tutor IA 24h", desc: "Dúvidas? O Tiagão explica por voz. Quer aprofundar? O Notebook transforma qualquer material em aula.", icon: "🤖" },
];

const TESTIMONIALS = [
  { name: "Mariana S.", role: "Medicina — USP 2024", text: "Tirava 580. Depois de 2 meses com o StudyAI, fui para 724. A Tiagão me chamava quando ficava dias sem estudar. Era como ter uma tutora particular.", before: "580 pts", after: "724 pts", emoji: "🎓" },
  { name: "Carlos M.", role: "Aprovado no TRF — 3ª tentativa", text: "Os simulados e o plano no app mostraram onde eu errava. Finalmente passei após 3 anos tentando — a IA apontou lacunas que eu não via.", before: "3 reprovações", after: "✅ Aprovado", emoji: "📋" },
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
    color: "border-gray-200",
    features: [
      "1 plano de estudos por mês",
      "2 simulados por mês",
      "5 flashcards por semana",
      "5 mensagens/dia com Tiagão",
      "1 correção de redação/mês",
      "Dashboard de desempenho",
    ],
    cta: "Começar Grátis",
    ctaStyle: "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200",
  },
  {
    name: "Pro",
    price: "R$ 29,90",
    period: "/mês",
    desc: "Para estudantes sérios",
    highlight: true,
    color: "border-violet-500",
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
    ctaStyle: "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/30",
  },
  {
    name: "Escola",
    price: "Sob consulta",
    period: "",
    desc: "Para instituições de ensino",
    highlight: false,
    color: "border-violet-300",
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
  { q: "O StudyAI é gratuito?", a: "Sim! O plano gratuito inclui plano de estudos, simulados, revisões com IA no app, redação e acesso ao Tiagão (5 mensagens/dia). O Pro (R$29,90/mês) libera tudo ilimitado." },
  { q: "O que é a Professor Tiagão?", a: "Tiagão é o primeiro tutor por voz com IA do Brasil. Age de forma proativa — chama você quando percebe que está dias sem estudar, sabe seu plano e pontos fracos. É como ter um tutor particular 24h." },
  { q: "Como o plano de estudos é gerado?", a: "Você informa matéria, nível, tempo disponível e objetivo. Pode enviar PDF, DOCX ou foto do caderno. Nossa IA cria um cronograma personalizado dia a dia com tópicos, exercícios e revisão no app." },
  { q: "Funciona para ENEM, vestibular e concursos?", a: "Sim! O StudyAI foi criado para estudantes brasileiros. A IA adapta conteúdo para ENEM, FUVEST, UNICAMP, OAB, Receita Federal, PRF, concursos militares e qualquer outra prova." },
  { q: "Como funciona a correção de redação ENEM?", a: "Envie sua redação (texto ou foto). A IA avalia nas 5 competências oficiais: domínio da norma culta, compreensão do tema, argumentos, coesão e proposta de intervenção. Resultado em menos de 30 segundos." },
  { q: "O que é o Notebook RAG?", a: "É o diferencial competitivo do StudyAI. Você sobe qualquer material (PDF, vídeo, site) e nossa IA responde com base exatamente naquele conteúdo — gerando resumos, flashcards, questões e planos de aula diretamente do seu material." },
  { q: "Vale mais do que um cursinho?", a: "Cursinhos tradicionais custam R$200–800/mês com conteúdo igual para todos. O StudyAI oferece plano 100% personalizado, simulados ilimitados e tutor IA 24h por R$29,90/mês — ou gratuitamente no plano básico." },
];

// ─── Vídeos demonstrativos (MP4 estáveis + poster Unsplash) ───────────────
const VIDEOS = [
  {
    id: "intro",
    title: "Conheça o Study.IA em 90 segundos",
    subtitle: "Visão geral da plataforma",
    duration: "1:32",
    tag: "Institucional",
    tagColor: "bg-violet-50 text-violet-700 border-violet-200",
    gradient: "from-violet-500 via-violet-500 to-purple-600",
    icon: Sparkles,
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: MAIN_DEMO_VIDEO.poster,
  },
  {
    id: "tiagao",
    title: "Tiagão na prática — caso real",
    subtitle: "Como o tutor IA por voz transforma a rotina de estudos",
    duration: "2:18",
    tag: "Estudante",
    tagColor: "bg-orange-50 text-orange-700 border-orange-200",
    gradient: "from-orange-400 via-rose-500 to-fuchsia-500",
    icon: Mic,
    src: "https://www.w3schools.com/html/mov_bbb.mp4",
    poster:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1280&q=82",
  },
  {
    id: "escolas",
    title: "Para gestores escolares",
    subtitle: "Dashboard institucional + análise preditiva de evasão",
    duration: "2:45",
    tag: "Escola",
    tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    icon: Building2,
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    poster:
      "https://images.unsplash.com/photo-1580582932707-52087e40d367?auto=format&fit=crop&w=1280&q=82",
  },
];

const PRESS = [
  { name: "Estadão Educação", color: "text-slate-700" },
  { name: "Folha — Tec", color: "text-slate-700" },
  { name: "Valor Econômico", color: "text-slate-700" },
  { name: "Exame", color: "text-slate-700" },
  { name: "Globo Educação", color: "text-slate-700" },
  { name: "Brasil Escola", color: "text-slate-700" },
];

const B2B_TYPES = ["Escola privada", "Cursinho pré-vestibular", "Universidade / Faculdade", "Secretaria de Educação", "ONG / Terceiro Setor", "Empresa (RH / T&D)", "Outro"];
const B2B_STUDENTS = ["Até 100 alunos", "101 – 500 alunos", "501 – 2.000 alunos", "2.001 – 10.000 alunos", "Mais de 10.000 alunos"];

export default function Landing() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useStudyAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTest, setActiveTest] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [b2bForm, setB2bForm] = useState({ name: "", email: "", institution: "", type: "", students: "", message: "" });
  const [b2bLeadConsent, setB2bLeadConsent] = useState(false);
  const [b2bLoading, setB2bLoading] = useState(false);
  const [b2bDone, setB2bDone] = useState(false);
  const [b2bError, setB2bError] = useState("");
  const [activeVideo, setActiveVideo] = useState<typeof VIDEOS[number] | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Captura o elemento que abriu o modal para devolver o foco depois
  const openVideo = (v: typeof VIDEOS[number], e?: React.MouseEvent) => {
    lastTriggerRef.current = (e?.currentTarget as HTMLElement) ?? (document.activeElement as HTMLElement);
    setActiveVideo(v);
  };

  // Fecha modal: ESC, scroll-lock, focus trap, focus restore
  useEffect(() => {
    if (!activeVideo) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setActiveVideo(null); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      // Focus trap: mantém foco dentro do diálogo
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), video, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Foca no botão de fechar logo que o modal abre
    const t = setTimeout(() => closeBtnRef.current?.focus(), 50);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      clearTimeout(t);
      // Devolve o foco para o disparador
      lastTriggerRef.current?.focus?.();
    };
  }, [activeVideo]);

  useEffect(() => {
    const interval = setInterval(() => setActiveTest(v => (v + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => navigate("/app");
  const handleSignIn = () => navigate("/sign-in");
  const handlePro = async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      try { sessionStorage.setItem("auth_return_to", "/pricing"); } catch { /* private mode */ }
      navigate("/sign-in");
      return;
    }
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
    if (!b2bLeadConsent) {
      setB2bError("Confirme que concorda em enviar estes dados para que possamos retornar o contato.");
      return;
    }
    setB2bLoading(true);
    try {
      const res = await fetch(`${BASE}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(b2bForm),
      });
      if (!res.ok) throw new Error("erro");
      setB2bDone(true);
    } catch { setB2bError("Erro ao enviar. Tente novamente ou mande email para contato@study.ia.br."); }
    finally { setB2bLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
          <a href="/" className="flex items-center flex-shrink-0" aria-label="Study.IA — início">
            <Logo variant="horizontal" className="h-8 w-auto" />
          </a>

          <div className="hidden md:flex items-center gap-5 flex-1 flex-wrap justify-end">
            <a href="#novidades" className="text-sm font-semibold text-violet-700 hover:text-violet-800 transition-colors">Novidades</a>
            <a href="#recursos-app" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">Recursos no app</a>
            <a href="#videos" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">Vídeos</a>
            <a href="#para-alunos" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">Para alunos</a>
            <a href="#para-professores" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">Para professores</a>
            <a href="#para-escolas" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">Para escolas</a>
            <a href={pricingHref} className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">Preços</a>
            <a href="#precos" className="text-sm text-violet-600 hover:text-violet-700 font-semibold transition-colors">Tabela de planos</a>
          </div>

          <div className="md:hidden flex-1" />

          <div className="flex items-center gap-2.5">
            <button type="button" onClick={handleSignIn} className="hidden sm:block text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium px-2">Entrar</button>
            <button onClick={handleStart}
              className="text-sm font-bold px-5 py-2 rounded-xl text-white bg-violet-600 hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98]">
              Começar grátis
            </button>
            <button onClick={() => setMobileMenuOpen(v => !v)} className="md:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
              className="overflow-hidden border-t border-gray-200 bg-white md:hidden">
              <div className="px-6 py-4 flex flex-col gap-4">
                {[
                  ["#novidades", "Novidades"],
                  ["#recursos-app", "Recursos no app"],
                  ["#videos", "Vídeos"],
                  ["#para-alunos", "Para alunos"],
                  ["#para-professores", "Para professores"],
                  ["#para-escolas", "Para escolas"],
                  [pricingHref, "Preços (página)"],
                  ["#precos", "Tabela de planos"],
                ].map(([href, label]) => (
                  <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                    className="text-gray-700 hover:text-gray-900 font-medium transition-colors">
                    {label}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── NOVIDADES (primeira dobra, impossível não notar) ── */}
      <section id="novidades" className="relative overflow-hidden border-b border-violet-900/20 bg-gray-950 text-white">
        <div className="pointer-events-none absolute -right-8 bottom-0 hidden md:block w-56 opacity-[0.14]">
          <StudyBooksIllustration className="w-full h-auto" />
        </div>
        <div className="max-w-6xl mx-auto px-6 py-4 md:py-5 relative">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-4">
            <div className="flex-shrink-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">Lançamentos no app</p>
              <p className="text-sm md:text-base font-bold text-white mt-0.5">
                Fazedores, Notebook RAG, Lousa Imersiva e Tutor multi-modelo — já no ar para alunos.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <button type="button" onClick={handleStart} className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-gray-900 hover:bg-violet-100 transition-colors">
                Criar conta grátis
              </button>
              <a href="#videos" className="rounded-xl border border-white/25 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors inline-flex items-center justify-center">
                Ver vídeo na página
              </a>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-visible">
            {NOVIDADES_BAND.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => navigate(item.path)}
                className="snap-start shrink-0 w-[min(100%,220px)] md:w-auto text-left rounded-2xl overflow-hidden ring-1 ring-white/10 bg-gray-900/80 hover:ring-violet-400/60 hover:bg-gray-900 transition-all group"
              >
                <div className="relative min-h-[180px] sm:min-h-[200px] w-full overflow-hidden bg-slate-900">
                  <img src={item.img} alt={`${item.title}: ${item.desc}`} width={400} height={240} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />
                  <span className="absolute top-2 left-2 rounded-md bg-violet-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                    {item.accent}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-black text-white leading-tight">{item.title}</p>
                  <p className="text-[11px] text-gray-400 mt-1 leading-snug line-clamp-2">{item.desc}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-violet-300 group-hover:text-violet-200">
                    Abrir <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── HERO ── */}
      <section className="relative pt-20 pb-16 md:pt-24 md:pb-20 px-6 overflow-hidden bg-slate-50">
        <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 right-0 h-[420px] w-[420px] rounded-full bg-violet-100/50 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[320px] w-[320px] rounded-full bg-emerald-50/60 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="flex flex-wrap items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-violet-50 text-violet-800 border border-violet-200/90 shadow-sm">
                <Radio className="w-3 h-3 animate-pulse text-violet-600 shrink-0" /> Novo: Tutor Tiagão — Voz proativa em PT-BR
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Award className="w-3 h-3 shrink-0" /> Top 10 EdTech Brasil 2025
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
              className="text-4xl sm:text-5xl lg:text-[3.35rem] font-black tracking-tight leading-[1.08] mb-5 text-gray-900">
              Plano, voz, materiais e{" "}
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                desafios reais
              </span>
              {" "}— no mesmo lugar
            </motion.h1>

            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
              className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-3 max-w-xl">
              StudyAI é a plataforma brasileira que une plano inteligente, Tiagão por voz, Notebook RAG, Lousa Imersiva, Tutor com GPT e Claude, Simulado ENEM e o módulo <span className="font-semibold text-gray-900">Fazedores</span> para destravar hábitos e rotina.
            </motion.p>
            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
              className="text-base text-gray-700 font-medium leading-relaxed mb-2 max-w-xl">
              Feito para o ENEM, vestibular e concursos brasileiros.
            </motion.p>
            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
              className="text-sm text-gray-500 leading-relaxed mb-6 max-w-xl">
              No mesmo login você acessa Simulado ENEM, Notebook RAG, Lousa Imersiva, Tutor IA (GPT e Claude), Fazedores, ranking, cronograma e sala de estudos — com ou sem cartão no plano gratuito.
            </motion.p>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2}
              className="flex flex-wrap items-end gap-4 sm:gap-6 mb-8">
              <StudyHeroIllustration className="w-[min(100%,300px)] h-auto shrink-0" />
              <div className="hidden sm:flex items-center justify-center shrink-0 pb-2">
                <StudySparkIllustration className="w-20 h-20 sm:w-24 sm:h-24" />
              </div>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}
              className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mb-10">
              <button type="button" onClick={handleStart}
                className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl font-bold text-white bg-violet-600 hover:bg-violet-500 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-violet-500/25 text-sm sm:text-base">
                Começar grátis — 2 minutos
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button type="button" onClick={(e) => openVideo(VIDEOS[0], e)}
                className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl font-medium text-gray-800 bg-white hover:bg-gray-50 border border-gray-200 transition-all text-sm sm:text-base shadow-sm">
                <span className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
                </span>
                Ver demonstração — 1:32
              </button>
              <a href={pricingHref}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-semibold text-violet-700 hover:text-violet-800 hover:bg-violet-50/80 border border-transparent hover:border-violet-200 transition-all">
                  Ver preços e Pro <ArrowUpRight className="w-4 h-4" />
              </a>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-sm border-t border-gray-100 pt-8">
              {STATS.map((s, i) => (
                <div key={i} className="min-w-0">
                  <p className="font-black text-violet-600 text-lg sm:text-xl tabular-nums">{s.v}</p>
                  <p className="text-gray-500 text-xs sm:text-sm leading-snug mt-0.5">{s.l}</p>
                </div>
              ))}
              <p className="col-span-full text-center text-[10px] text-gray-400 leading-snug mt-4 max-w-2xl mx-auto">
                * Valores ilustrativos para comunicar escala e ritmo; números consolidados variam por canal e não substituem métricas auditadas publicamente.
              </p>
            </motion.div>
          </div>

          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="relative z-10 lg:justify-self-end w-full max-w-lg mx-auto lg:mx-0">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-violet-900/15 ring-1 ring-gray-900/10 bg-black">
              <span className="absolute top-3 right-3 z-20 inline-flex items-center rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white ring-1 ring-white/25 backdrop-blur-sm">
                Demonstração em breve
              </span>
              <video
                src={MAIN_DEMO_VIDEO.src}
                poster={MAIN_DEMO_VIDEO.poster}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="w-full aspect-[4/3] sm:aspect-video object-cover"
                aria-label="Prévia em vídeo da experiência StudyAI (demonstração CC0)"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-950/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 rounded-xl bg-black/55 px-3 py-2 text-[11px] text-white backdrop-blur-sm ring-1 ring-white/10">
                <span className="font-semibold">Prévia em vídeo · substitua pelo tour oficial quando gravar</span>
                <button type="button" onClick={(e) => openVideo(VIDEOS[0], e)} className="shrink-0 rounded-lg bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-gray-900 hover:bg-violet-100">
                  Tela cheia
                </button>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 sm:absolute sm:-bottom-4 sm:-left-2 sm:left-4 max-w-[min(100%,300px)] rounded-2xl bg-white/95 backdrop-blur-md border border-gray-200 shadow-lg p-4 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-1">Destaques ativos</p>
              <p className="text-sm font-bold text-gray-900 leading-snug">
                Fazedores + Notebook RAG + Lousa + Tutor multi-modelo — rotas reais, um login.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SOCIAL PROOF + IMPRENSA ── */}
      <section className="border-y border-gray-100 py-10 px-6 bg-gray-50/70">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-4">Confiado por estudantes das melhores escolas</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-3">
                {["USP", "UNICAMP", "PUC", "FUVEST", "Cursinho Popular", "Objetivo"].map(name => (
                  <span key={name} className="text-sm font-black text-gray-400 tracking-tight hover:text-gray-700 transition-colors">{name}</span>
                ))}
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-4">Imprensa</p>
              <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-5 gap-y-3">
                {PRESS.map(p => (
                  <span key={p.name} className={`text-xs font-bold tracking-tight ${p.color} opacity-50 hover:opacity-100 transition-opacity`}>{p.name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RECURSOS NO APP (rotas reais) ── */}
      <section id="recursos-app" className="py-20 md:py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="max-w-3xl mb-12 md:mb-14">
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3">Recursos no app</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 mb-4">
              Tudo o que você vê no menu do aluno — em destaque para conversão
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              Estas são rotas vivas do StudyAI: entre com sua conta (ou crie em segundos) e abra cada módulo. Abaixo, os mesmos fluxos que aparecem na navegação lateral — Simulado ENEM, Notebook RAG, Tutor IA, Lousa Imersiva, Fazedores, cronograma e sala de estudos.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {APP_SHOWCASE.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.path + item.title}
                  variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.06}
                  className="group flex flex-col rounded-3xl border border-gray-200 bg-gray-50/40 hover:bg-white hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/5 transition-all overflow-hidden"
                >
                  <div className="relative w-full min-h-[220px] sm:min-h-[260px] lg:min-h-[280px] overflow-hidden bg-slate-100">
                    <img
                      src={item.img}
                      alt={`Captura ou ilustração do módulo ${item.title} no StudyAI`}
                      width={1000}
                      height={625}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/55 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-white">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
                        <Icon className="h-4 w-4" />
                      </span>
                      <h3 className="font-black text-sm sm:text-base leading-tight drop-shadow-sm">{item.title}</h3>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-4">{item.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => navigate(item.path)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-violet-500 transition-colors">
                        Abrir no app <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      {"extraPath" in item && item.extraPath && (
                        <button type="button" onClick={() => navigate(item.extraPath)}
                          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-800 hover:border-violet-200 transition-colors">
                          {item.extraLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="mt-10 text-center text-sm text-gray-500 max-w-2xl mx-auto">
            Também disponíveis: Aula com Professor IA, Caderno digital, Trilha Mestre, Radar de desempenho, ranking, conquistas e comunicação para turmas —{" "}
            <button type="button" onClick={handleStart} className="font-semibold text-violet-600 hover:text-violet-700 underline-offset-2 hover:underline">
              entrar no app
            </button>
            {" "}e explorar o menu completo.
          </motion.p>
        </div>
      </section>

      {/* ── DOIS PILARES (capturas reais: Tiagão + Notebook RAG) ── */}
      <section id="dois-pilares" className="py-16 md:py-20 px-6 bg-gradient-to-b from-violet-50/50 via-white to-white border-t border-violet-100/80">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="max-w-2xl mb-10 md:mb-12"
          >
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3">Experiência no produto</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 mb-3">Dois pilares do StudyAI</h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              O hub com a Tiagão no seu ritmo e o Notebook com respostas ancoradas no seu material — rotas vivas: <span className="font-semibold text-gray-800">/app</span> e <span className="font-semibold text-gray-800">/notebook</span>.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <motion.article
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={0.06}
              className="flex flex-col overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-xl shadow-violet-500/10 ring-1 ring-violet-500/10"
            >
              <div className="relative w-full min-h-[240px] sm:min-h-[280px] overflow-hidden bg-slate-100">
                <img
                  src={LANDING_IMG.professorTiagao}
                  alt="Professor Tiagão no app StudyAI"
                  width={1200}
                  height={750}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </div>
              <div className="flex flex-1 flex-col p-5 sm:p-6 border-t border-violet-100/80">
                <h3 className="font-black text-gray-900 text-lg sm:text-xl tracking-tight mb-2">Professor Tiagão</h3>
                <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-5">
                  Tutora por voz proativa no app: integra ao plano, lembra você de estudar e executa ações no fluxo.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/app")}
                  className="inline-flex w-fit items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-colors hover:bg-violet-500"
                >
                  Abrir o app <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.article>

            <motion.article
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={0.12}
              className="flex flex-col overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-xl shadow-violet-500/10 ring-1 ring-violet-500/10"
            >
              <div className="relative w-full min-h-[240px] sm:min-h-[280px] overflow-hidden bg-slate-100">
                <img
                  src={LANDING_IMG.notebookRag}
                  alt="Notebook RAG no StudyAI"
                  width={1200}
                  height={750}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </div>
              <div className="flex flex-1 flex-col p-5 sm:p-6 border-t border-violet-100/80">
                <h3 className="font-black text-gray-900 text-lg sm:text-xl tracking-tight mb-2">Notebook RAG</h3>
                <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-5">
                  PDFs e links viram aula, resumo e questões com citações no seu conteúdo — sem alucinar fora do material.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/notebook")}
                  className="inline-flex w-fit items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-colors hover:bg-violet-500"
                >
                  Abrir o Notebook RAG <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.article>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-10 md:mb-12">
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3">Como funciona</p>
            <h2 className="text-4xl font-black tracking-tight text-gray-900">3 passos para transformar seus estudos</h2>
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.05}
            className="relative mb-10 md:mb-12 overflow-hidden rounded-3xl ring-1 ring-gray-200 shadow-lg shadow-violet-500/5"
          >
            <img
              src={LANDING_IMG.comoFuncionaFoto}
              alt="Estudante concentrada estudando com caderno e notebook, organizando rotina de estudos"
              width={1600}
              height={900}
              loading="lazy"
              decoding="async"
              className="w-full aspect-[4/3] md:aspect-[21/9] object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-violet-950/35 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-8 md:right-auto md:max-w-md">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-violet-200 mb-1">
                <Sparkles className="w-3 h-3" /> Rotina viva, não planilha
              </p>
              <p className="text-white font-black text-base md:text-xl leading-tight drop-shadow">
                Do primeiro objetivo ao tutor 24h — em poucos minutos.
              </p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1}
                className="relative p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-violet-300 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-xl mb-4">
                  {step.icon}
                </div>
                <span className="absolute top-5 right-5 text-5xl font-black text-gray-100 group-hover:text-gray-200 transition-all">{step.num}</span>
                <h3 className="font-black text-gray-900 text-lg mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VÍDEOS INSTITUCIONAIS ── */}
      <section id="videos" className="relative py-24 px-6 bg-gradient-to-b from-white via-gray-50/40 to-white overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[420px] rounded-full bg-violet-100/40 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-10 md:mb-12">
            <p className="inline-flex items-center gap-1.5 text-xs font-black text-violet-600 uppercase tracking-widest mb-3">
              <Film className="w-3 h-3" /> Em ação
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900">Veja o Study.IA por dentro</h2>
            <p className="text-gray-600 mt-3 max-w-2xl mx-auto text-lg">
              Vídeo em destaque com mídia CC0 estável (substitua por tour gravado no app quando estiver pronto). Abaixo, três cortes demonstrativos e atalhos para explorar os módulos reais.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="mb-12 md:mb-14 rounded-3xl overflow-hidden border border-gray-200 bg-gray-950 shadow-2xl shadow-violet-900/10 ring-1 ring-black/5">
            <div className="grid lg:grid-cols-5 gap-0">
              <div className="lg:col-span-3 aspect-video bg-black relative">
                <span className="absolute top-3 left-3 z-20 inline-flex items-center rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white ring-1 ring-white/25 backdrop-blur-sm">
                  Demonstração em breve
                </span>
                <video
                  src={MAIN_DEMO_VIDEO.src}
                  poster={MAIN_DEMO_VIDEO.poster}
                  controls
                  playsInline
                  muted
                  loop
                  preload="metadata"
                  className="h-full w-full object-cover"
                  aria-label="Demonstração de vídeo em alta definição (conteúdo CC0)"
                />
              </div>
              <div className="lg:col-span-2 flex flex-col justify-center gap-4 p-6 md:p-8 bg-gradient-to-br from-gray-900 to-gray-950 text-left">
                <p className="text-xs font-black uppercase tracking-widest text-violet-300/90">Demonstração imediata</p>
                <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
                  Experiência fluida de streaming no app
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Este trecho usa arquivo público hospedado pela Mozilla (CC0) para provar carregamento rápido e controles acessíveis. Quando sua gravação institucional estiver pronta, basta trocar a URL no código — a estrutura de poster + legenda já está preparada.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={handleStart}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-gray-900 hover:bg-violet-50 transition-colors">
                    Abrir o app <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={(e) => openVideo(VIDEOS[1], e)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors">
                    Ver outro exemplo (MP4) <Play className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            {VIDEOS.map((video, i) => {
              const Icon = video.icon;
              return (
                <motion.button
                  key={video.id}
                  onClick={(e) => openVideo(video, e)}
                  variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1}
                  className="group text-left rounded-3xl bg-white border border-gray-200 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1 hover:border-violet-300 transition-all duration-500"
                >
                  {/* Thumbnail */}
                  <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${video.gradient}`}>
                    {video.poster ? (
                      <img src={video.poster} alt="" width={1280} height={720} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" aria-hidden />
                    {video.src.includes("flower") && (
                      <span className="absolute top-14 left-4 z-10 inline-flex items-center rounded-full bg-black/65 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white ring-1 ring-white/20 backdrop-blur-sm">
                        Demonstração em breve
                      </span>
                    )}
                    {/* Ruído sutil + grid */}
                    <div className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
                      style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5), transparent 40%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.3), transparent 40%)" }} />
                    <div className="absolute inset-0 opacity-20"
                      style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

                    {/* Marca d'água com ícone */}
                    <div className="absolute top-4 left-4 right-4 flex items-start justify-between text-white">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider border border-white/30">
                        <Icon className="w-3 h-3" /> {video.tag}
                      </span>
                      <span className="px-2 py-1 rounded-md bg-black/30 backdrop-blur-md text-[10px] font-bold tabular-nums">
                        {video.duration}
                      </span>
                    </div>

                    {/* Botão play central */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="relative">
                        <span className="absolute inset-0 rounded-full bg-white/40 blur-xl group-hover:bg-white/60 transition-all" />
                        <span className="relative w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                          <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
                        </span>
                      </span>
                    </div>

                    {/* Logo Study.IA inferior */}
                    <div className="absolute bottom-3 right-3 text-white/80 text-[10px] font-black tracking-wider uppercase">
                      Study<span className="text-white">.IA</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <h3 className="font-black text-gray-900 text-base leading-tight group-hover:text-violet-600 transition-colors">
                        {video.title}
                      </h3>
                      <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-violet-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0 mt-0.5" />
                    </div>
                    <p className="text-gray-500 text-sm leading-snug">{video.subtitle}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* CTA secundário */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="mt-12 text-center">
            <a href="#recursos-app"
              className="inline-flex items-center gap-2 text-sm font-bold text-violet-600 hover:text-violet-500 transition-colors">
              Ver recursos com rotas do app <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── TUTOR TIAGÃO FEATURE ── */}
      <section id="para-alunos" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 uppercase tracking-wide mb-4">
                <Radio className="w-3 h-3 animate-pulse" /> Exclusivo Study.IA
              </span>
              <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-4">
                Conheça a Professor Tiagão
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                O primeiro tutor por voz com IA que age de forma proativa. Não espera você perguntar — <strong className="text-gray-900">ela chama você</strong>.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Radio,  title: "Fala primeiro, sem você pedir",    desc: "Percebe quando você ficou dias sem estudar e chama por voz.", color: "text-orange-500" },
                  { icon: Cpu,    title: "Sabe tudo sobre seu progresso",     desc: "Acesso ao seu plano, XP, matérias e histórico completo.", color: "text-violet-600" },
                  { icon: Layers, title: "Age no app por você",              desc: "Peça para criar um plano ou navegar — ela executa.", color: "text-violet-600" },
                  { icon: Shield, title: "Voz natural, zero robótica",        desc: "Voz calorosa e fluida, 100% exclusiva do Study.IA.", color: "text-emerald-500" },
                ].map((b, i) => (
                  <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1}
                    className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                      <b.icon className={`w-4 h-4 ${b.color}`} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{b.title}</p>
                      <p className="text-gray-600 text-sm leading-snug">{b.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <button onClick={handleStart}
                className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-500 transition-all text-sm shadow-lg shadow-violet-500/30">
                Conhecer o Tiagão <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            {/* Captura real do app + prévia de conversa */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }} className="space-y-5">
              <div className="rounded-3xl border border-violet-100 bg-white p-2 sm:p-3 shadow-xl shadow-violet-500/10 ring-1 ring-violet-500/10 overflow-hidden">
                <div className="relative w-full min-h-[240px] sm:min-h-[280px] rounded-2xl overflow-hidden bg-slate-100">
                  <img
                    src={LANDING_IMG.professorTiagao}
                    alt="Interface da Professor Tiagão no StudyAI"
                    width={1200}
                    height={750}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                </div>
                <div className="px-2 pt-3 pb-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Captura do produto</p>
                  <button
                    type="button"
                    onClick={() => navigate("/app")}
                    className="text-xs font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
                  >
                    Ir para o app <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="relative rounded-2xl bg-white border border-gray-200 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-violet-600 flex items-center justify-center font-black text-white text-sm">T</div>
                  <div>
                    <p className="font-black text-gray-900 text-sm">Professor Tiagão</p>
                    <p className="text-xs text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Online agora</p>
                  </div>
                  <Mic className="w-4 h-4 text-orange-500 ml-auto animate-pulse" />
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
                        m.role === "tiagao" ? "bg-violet-50 text-gray-800 rounded-tl-sm" : "bg-gray-100 text-gray-700 rounded-tr-sm"
                      }`}>{m.msg}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <Mic className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                    <span className="text-xs text-gray-400">Falar com o Tiagão...</span>
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
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3">Diferenciais</p>
            <h2 className="text-4xl font-black tracking-tight text-gray-900">Tudo integrado. Uma única plataforma.</h2>
            <p className="text-gray-600 mt-3 max-w-2xl mx-auto">Cada módulo conversa com os outros no mesmo login: simulado, plano, Notebook RAG, revisões e Tutor IA — tudo a partir do hub (`/app`) e das rotas reais (Simulado ENEM, Notebook RAG, Lousa Imersiva, Fazedores e mais).</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.06}
                className={`p-5 rounded-2xl ${f.bg} border ${f.border} hover:scale-[1.02] transition-all cursor-pointer group`}>
                <div className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <f.icon className={`w-4.5 h-4.5 ${f.color}`} />
                </div>
                <p className="font-black text-gray-900 text-sm mb-1.5">{f.label}</p>
                <p className="text-gray-600 text-xs leading-snug">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROFESSOR SECTION ── */}
      <section id="para-professores" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="relative mb-12 md:mb-14 overflow-hidden rounded-3xl ring-1 ring-gray-200 shadow-lg"
          >
            <img
              src={LANDING_IMG.professorSalaFoto}
              alt="Professora orientando aluna em sala de aula, exemplificando o uso do StudyAI no apoio ao ensino"
              width={1600}
              height={900}
              loading="lazy"
              decoding="async"
              className="w-full aspect-[4/3] md:aspect-[16/9] object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-violet-950/45 via-violet-900/10 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 md:bottom-8 md:left-10 md:right-auto md:max-w-lg">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-violet-200 mb-1">
                <BookOpen className="w-3 h-3" /> Para professores
              </p>
              <p className="text-white font-black text-lg md:text-2xl leading-tight drop-shadow">
                Mais tempo com a turma, menos tempo em planilhas.
              </p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.6 }}>
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-lg">
                <p className="text-xs font-black text-gray-500 uppercase mb-4">Portal do Professor</p>
                <div className="space-y-2">
                  {[
                    { icon: Users,        label: "3 Turmas ativas",           sub: "90 alunos monitorados",    color: "text-violet-600" },
                    { icon: AlertTriangle, label: "2 alunos em atenção",       sub: "Risco de abandono detectado", color: "text-amber-500" },
                    { icon: MessageSquare, label: "Comunicação automatizada",  sub: "12 mensagens enviadas hoje", color: "text-green-500" },
                    { icon: Brain,        label: "Plano de Aula IA gerado",   sub: "Funções Logarítmicas — 9º B", color: "text-violet-600" },
                    { icon: TrendingUp,   label: "Desempenho da turma",       sub: "+8% vs semana anterior",  color: "text-emerald-500" },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                        <Icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-xs">{item.label}</p>
                          <p className="text-gray-500 text-[11px]">{item.sub}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 uppercase tracking-wide mb-4">
                <BookOpen className="w-3 h-3" /> Para Professores
              </span>
              <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-4">
                Ensine mais. Administre menos.
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
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
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
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
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="relative mb-12 md:mb-14 overflow-hidden rounded-3xl ring-1 ring-gray-200 shadow-lg"
          >
            <img
              src={LANDING_IMG.escolaColaboracaoFoto}
              alt="Equipe diversa em reunião colaborativa, simbolizando a gestão escolar apoiada pelo StudyAI"
              width={1600}
              height={900}
              loading="lazy"
              decoding="async"
              className="w-full aspect-[4/3] md:aspect-[16/9] object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-emerald-950/45 via-emerald-900/10 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 md:bottom-8 md:left-10 md:right-auto md:max-w-lg">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-1">
                <Building2 className="w-3 h-3" /> Para escolas
              </p>
              <p className="text-white font-black text-lg md:text-2xl leading-tight drop-shadow">
                Gestão com IA: dados, alertas e ação — para zero aluno perdido.
              </p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 uppercase tracking-wide mb-4">
                <Building2 className="w-3 h-3" /> Para Escolas
              </span>
              <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-4">
                Gestão institucional com IA
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
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
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
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
              transition={{ duration: 0.6 }} className="rounded-2xl bg-white border border-gray-200 p-6 shadow-lg">
              <p className="text-xs font-black text-gray-500 uppercase mb-4">⚠️ Alunos em Atenção</p>
              {[
                { nome: "Maria S.", prob: 70, motivo: "5 dias sem acessar, queda em Matemática", acao: "Enviar convite para aula de reforço" },
                { nome: "João P.",  prob: 45, motivo: "Dificuldade em 3 tópicos correlacionados", acao: "Gerar plano de recuperação" },
                { nome: "Lucas M.", prob: 38, motivo: "Meta semanal não atingida por 2 semanas", acao: "Agendar conversa com responsável" },
              ].map((aluno, i) => (
                <div key={i} className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-bold text-gray-900 text-sm">{aluno.nome}</p>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${aluno.prob >= 60 ? "bg-red-500/20 text-red-500" : "bg-amber-500/20 text-amber-600"}`}>
                      {aluno.prob}% risco
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2">{aluno.motivo}</p>
                  <div className="flex gap-2">
                    <button className="text-[11px] font-bold px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors">
                      Enviar msg
                    </button>
                    <button className="text-[11px] font-bold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
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
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-12">
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3">Depoimentos</p>
            <h2 className="text-4xl font-black tracking-tight text-gray-900">Resultados reais</h2>
          </motion.div>
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div key={activeTest}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="bg-white border border-gray-200 shadow-sm rounded-3xl p-8 md:p-10">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-2xl flex-shrink-0">
                    {TESTIMONIALS[activeTest].emoji}
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-lg">{TESTIMONIALS[activeTest].name}</p>
                    <p className="text-gray-500 text-sm">{TESTIMONIALS[activeTest].role}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2.5 py-1 bg-red-500/20 text-red-500 rounded-lg text-xs font-bold">Antes: {TESTIMONIALS[activeTest].before}</span>
                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-600 rounded-lg text-xs font-bold">Depois: {TESTIMONIALS[activeTest].after}</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed italic">"{TESTIMONIALS[activeTest].text}"</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center justify-center gap-2 mt-6">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setActiveTest(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === activeTest ? "bg-violet-500 w-6" : "bg-gray-300 hover:bg-gray-400"}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PREÇOS ── */}
      <section id="precos" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14">
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3">Preços</p>
            <h2 className="text-4xl font-black tracking-tight text-gray-900">Planos claros. Sem surpresas.</h2>
            <p className="text-gray-600 mt-3">Enquanto cursinhos tradicionais custam R$200–800/mês, o Study.IA cabe no seu bolso.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1}
                className={`relative rounded-3xl bg-white border-2 ${plan.color} p-8 flex flex-col ${plan.highlight ? "ring-2 ring-violet-500/40 ring-offset-2 ring-offset-white shadow-lg shadow-violet-100" : ""}`}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 bg-violet-600 text-white text-xs font-black rounded-full shadow-lg shadow-violet-500/30">MAIS POPULAR</span>
                  </div>
                )}
                <div className="mb-6">
                  <p className="font-black text-gray-900 text-lg">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">{plan.desc}</p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
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
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-12">
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3">Dúvidas frequentes</p>
            <h2 className="text-4xl font-black tracking-tight text-gray-900">FAQ</h2>
          </motion.div>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.05}
                className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left group">
                  <span className="font-bold text-gray-900 text-sm pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <p className="px-6 pb-5 text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORMULÁRIO B2B ── */}
      <section id="institucional" className="py-24 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-10">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">Para instituições</p>
            <h2 className="text-4xl font-black tracking-tight text-gray-900">Falar com nossa equipe</h2>
            <p className="text-gray-600 mt-3">Descubra como o Study.IA pode ser implementado na sua escola ou cursinho.</p>
          </motion.div>

          {b2bDone ? (
            <div className="text-center py-12 bg-emerald-50 rounded-3xl border border-emerald-200">
              <div className="text-4xl mb-4">✅</div>
              <p className="font-black text-gray-900 text-xl">Recebemos seu contato!</p>
              <p className="text-gray-600 mt-2">Nossa equipe entrará em contato em até 24h úteis.</p>
            </div>
          ) : (
            <form onSubmit={handleB2bSubmit} className="bg-white border border-gray-200 shadow-sm rounded-3xl p-8 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-gray-700 uppercase block mb-1.5">Nome *</label>
                  <input value={b2bForm.name} onChange={e => setB2bForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Seu nome"
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-700 uppercase block mb-1.5">Email *</label>
                  <input type="email" value={b2bForm.email} onChange={e => setB2bForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@instituicao.com"
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-gray-700 uppercase block mb-1.5">Nome da Instituição *</label>
                <input value={b2bForm.institution} onChange={e => setB2bForm(p => ({ ...p, institution: e.target.value }))}
                  placeholder="Colégio / Cursinho / Universidade"
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 transition-colors" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-gray-700 uppercase block mb-1.5">Tipo *</label>
                  <select value={b2bForm.type} onChange={e => setB2bForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-violet-500 transition-colors">
                    <option value="">Selecione...</option>
                    {B2B_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-700 uppercase block mb-1.5">Nº de alunos</label>
                  <select value={b2bForm.students} onChange={e => setB2bForm(p => ({ ...p, students: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-violet-500 transition-colors">
                    <option value="">Selecione...</option>
                    {B2B_STUDENTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-gray-700 uppercase block mb-1.5">Mensagem</label>
                <textarea value={b2bForm.message} onChange={e => setB2bForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Como podemos ajudar sua instituição?"
                  rows={3}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 transition-colors resize-none" />
              </div>
              <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={b2bLeadConsent}
                  onChange={e => setB2bLeadConsent(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span>
                  Concordo em enviar estes dados para a StudyAI entrar em contato comercial sobre produtos e serviços,
                  conforme a{" "}
                  <a href="/privacidade" className="text-violet-600 underline font-medium">Política de Privacidade</a>.
                </span>
              </label>
              {b2bError && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{b2bError}</p>}
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
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-violet-600 to-purple-700" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiA2djZoNnYtNmgtNnptLTEyIDB2NmgtNnY2aDZ2Nmg2di02aC02di02aC02em0tNiA2SDEydjZoNnYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
            <div className="relative px-8 py-16">
              <p className="text-5xl mb-4">🚀</p>
              <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Pronto para transformar seus estudos?</h2>
              <p className="text-violet-200 text-lg mb-8">Não precisa de cartão. Começa em 2 minutos. Cancela quando quiser.</p>
              <button onClick={handleStart}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-black text-violet-600 bg-white hover:bg-violet-50 transition-all hover:scale-[1.03] active:scale-[0.97] text-base shadow-xl">
                Começar grátis agora <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MODAL DE VÍDEO ── */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setActiveVideo(null)}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
            role="dialog" aria-modal="true"
            aria-labelledby="video-modal-title"
            aria-describedby="video-modal-desc"
          >
            <motion.div
              ref={dialogRef}
              initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl bg-gray-950 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10"
            >
              <button
                ref={closeBtnRef}
                onClick={() => setActiveVideo(null)}
                aria-label="Fechar vídeo"
                className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="aspect-video bg-black">
                <video
                  key={activeVideo.id}
                  src={activeVideo.src}
                  poster={activeVideo.poster}
                  controls
                  autoPlay
                  playsInline
                  aria-label={activeVideo.title}
                  className="w-full h-full"
                />
              </div>

              <div className="p-5 sm:p-6 bg-gradient-to-b from-gray-950 to-gray-900 border-t border-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${activeVideo.tagColor} mb-2`}>
                      <activeVideo.icon className="w-3 h-3" /> {activeVideo.tag}
                    </p>
                    <h3 id="video-modal-title" className="font-black text-white text-lg leading-tight">{activeVideo.title}</h3>
                    <p id="video-modal-desc" className="text-gray-400 text-sm mt-1">{activeVideo.subtitle}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-white/10 text-white text-[11px] font-bold tabular-nums flex-shrink-0">
                    {activeVideo.duration}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 border-t border-white/10 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center mb-4">
                <Logo variant="horizontal" tone="white" className="h-7 w-auto" />
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">A IA que entende como você aprende. Feito com 💜 no Brasil.</p>
            </div>
            <div>
              <p className="font-black text-gray-400 text-xs uppercase tracking-widest mb-3">Produto</p>
              <ul className="space-y-2">
                {[["Recursos no app", "#recursos-app"], ["Funcionalidades", "#funcoes"], ["Para alunos", "#para-alunos"], ["Para professores", "#para-professores"], ["Para escolas", "#para-escolas"]].map(([label, href]) => (
                  <li key={label}><a href={href} className="text-sm text-gray-500 hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-black text-gray-400 text-xs uppercase tracking-widest mb-3">Plataforma</p>
              <ul className="space-y-2">
                {[["Preços (página)", pricingHref], ["Tabela de planos", "#precos"], ["FAQ", "#faq"], ["Blog", "#"], ["Carreiras", "#"]].map(([label, href]) => (
                  <li key={label}><a href={href} className="text-sm text-gray-500 hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-black text-gray-400 text-xs uppercase tracking-widest mb-3">Legal</p>
              <ul className="space-y-2">
                {[["Privacidade", "/privacidade"], ["Termos", "/privacidade"], ["LGPD", "/privacidade"], ["Suporte", "mailto:suporte@study.ia.br"]].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-gray-500 hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-xs">© 2026 Study.IA — Feito com 💜 no Brasil</p>
            <div className="flex items-center gap-4">
              <a href="mailto:contato@study.ia.br" className="text-xs text-gray-500 hover:text-white transition-colors">contato@study.ia.br</a>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <a href="https://study.ia.br" className="text-xs text-gray-500 hover:text-white transition-colors">study.ia.br</a>
            </div>
          </div>
          <p className="mt-4 text-center text-[10px] text-gray-600 leading-snug">
            Fotos educacionais: Unsplash / Pexels (uso comercial liberado). Capturas de produto: StudyAI.
          </p>
        </div>
      </footer>
    </div>
  );
}
