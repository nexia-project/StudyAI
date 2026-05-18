import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Brain, Zap, Trophy, Clock, BarChart2, Star,
  ArrowRight, BookOpen, Sparkles, Users, GraduationCap,
  PenLine, Map, Target, CheckCircle, ChevronDown, Mic,
  Radio, Cpu, Layers, Shield, Building2, Globe, MessageSquare,
  TrendingUp, Bell, Play, Menu, X, MessageCircle, AlertTriangle,
  Video, Film, Quote, Volume2, ArrowUpRight,
  Hammer,
} from "lucide-react";
import { startCheckout } from "@/hooks/useSubscription";
import { useStudyAuth } from "@/hooks/useStudyAuth";
import { Logo } from "@/components/Logo";
import {
  StudyBooksIllustration,
} from "@/components/landing/StudyFlatIllustrations";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const pricingHref = `${BASE}/pricing`.replace(/([^:]\/)\/+/g, "$1");

/** A/B hero (crescimento): nota ENEM vs. tempo economizado — 50/50 por sessão. */
const HERO_AB_STORAGE = "studyia_hero_ab_v1";
export type HeroAbVariant = "enem_nota" | "tempo_economia";

function initHeroAbVariant(): HeroAbVariant {
  if (typeof window === "undefined") return "enem_nota";
  try {
    const s = sessionStorage.getItem(HERO_AB_STORAGE);
    if (s === "enem_nota" || s === "tempo_economia") return s;
    const v: HeroAbVariant = Math.random() < 0.5 ? "enem_nota" : "tempo_economia";
    sessionStorage.setItem(HERO_AB_STORAGE, v);
    return v;
  } catch {
    return "enem_nota";
  }
}

/** Capturas de produto (public/landing) — mesma convenção de BASE_URL que o restante do app. */
const LANDING_IMG = {
  professorTiagao: `${BASE}/landing/professor-tiagao-feature.png`.replace(/([^:]\/)\/+/g, "$1"),
  notebookRag: `${BASE}/landing/notebook-rag-feature.png`.replace(/([^:]\/)\/+/g, "$1"),
  // Banner de destaque do Simulado ENEM e ilustração colorida do módulo Cronograma.
  enemFeatured: `${BASE}/landing/landing-enem-featured.png`.replace(/([^:]\/)\/+/g, "$1"),
  cronogramaBanner: `${BASE}/landing/landing-cronograma-banner.png`.replace(/([^:]\/)\/+/g, "$1"),
  // Fotos educacionais (Unsplash, uso comercial liberado, sem necessidade de atribuição).
  comoFuncionaFoto: `${BASE}/landing/landing-como-funciona.jpg`.replace(/([^:]\/)\/+/g, "$1"),
  professorSalaFoto: `${BASE}/landing/landing-professor-sala.jpg`.replace(/([^:]\/)\/+/g, "$1"),
  escolaColaboracaoFoto: `${BASE}/landing/landing-escola-colaboracao.jpg`.replace(/([^:]\/)\/+/g, "$1"),
} as const;

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
    desc: "Tutor por voz e texto que usa seu plano para sugerir a próxima sessão e abrir caminhos no app.",
    path: "/app",
    icon: Mic,
    img: LANDING_IMG.professorTiagao,
  },
  {
    title: "Simulado ENEM",
    desc: "Treino com questões oficiais, correção e leitura de desempenho para transformar erro em revisão.",
    path: "/simulado-enem",
    icon: Target,
    img: UNSPLASH.focus,
  },
  {
    title: "Notebook RAG",
    desc: "PDFs, links e materiais viram uma biblioteca consultável para resumos, questões e respostas com contexto.",
    path: "/notebook",
    icon: Layers,
    img: LANDING_IMG.notebookRag,
  },
  {
    title: "Tutor IA (GPT e Claude)",
    desc: "Use chats de apoio para dúvidas longas, comparações de explicação e aprofundamento dentro da rotina.",
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
    desc: "Transforme plano em sessão: foco, Pomodoro, revisão e ritmo semanal no mesmo ecossistema.",
    path: "/cronograma",
    icon: Clock,
    img: LANDING_IMG.cronogramaBanner,
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
  { v: "ENEM", l: "simulado, treino e revisão no mesmo fluxo" },
  { v: "RAG", l: "respostas ancoradas no seu material" },
  { v: "Tiagão", l: "voz e texto para orientar o próximo passo" },
  { v: "B2B", l: "professor e gestor com revisão humana" },
];

const CREDIBILITY_ITEMS = [
  {
    icon: Target,
    title: "Próximo passo, não lista solta",
    desc: "Objetivo, prazo e matéria viram uma rotina curta: diagnosticar, estudar, treinar e revisar.",
  },
  {
    icon: Layers,
    title: "Seu material continua sendo fonte",
    desc: "PDFs, links e caderno entram no Notebook RAG para respostas e exercícios com contexto.",
  },
  {
    icon: Shield,
    title: "IA com limites claros",
    desc: "Sem promessa de aprovação: o StudyAI organiza a jornada e preserva controle humano em usos sensíveis.",
  },
] as const;

const PAIN_OUTCOMES = [
  {
    audience: "Aluno",
    pain: "Muito conteúdo, pouco critério para decidir o que estudar agora.",
    outcome: "Próxima sessão clara, erros virando revisão e material sempre à mão.",
  },
  {
    audience: "Professor",
    pain: "Lacunas aparecem tarde demais quando tudo fica espalhado em tarefa, planilha e conversa.",
    outcome: "Visão de dificuldade por turma para orientar melhor, preparar reforço e reaproveitar material.",
  },
  {
    audience: "Instituição",
    pain: "É difícil acompanhar progresso e qualidade sem transformar gestão em retrabalho manual.",
    outcome: "Relatórios, sinais de atenção e acompanhamento com espaço para revisão humana.",
  },
  {
    audience: "Equipe StudyAI",
    pain: "Uma experiência premium precisa evoluir com clareza, consistência e cuidado pedagógico.",
    outcome: "Revisão de conteúdo, limites de IA e feedback ajudam a manter qualidade em cada etapa.",
  },
] as const;

const HERO_PREVIEW_CARDS = [
  {
    icon: Target,
    label: "Diagnóstico",
    title: "Objetivo ENEM em foco",
    desc: "prioridade da semana definida",
  },
  {
    icon: Layers,
    label: "Notebook RAG",
    title: "Material virou treino",
    desc: "resumos e questões ancoradas",
  },
  {
    icon: Mic,
    label: "Tiagão",
    title: "Próxima sessão guiada",
    desc: "voz, texto e lembrete no fluxo",
  },
] as const;

const FEATURES = [
  { icon: Target,    label: "Diagnóstico e plano",       desc: "Objetivo, tempo disponível e dificuldade viram prioridades semanais.", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200/80" },
  { icon: Layers,    label: "Material com contexto",      desc: "Notebook RAG consulta PDFs e links para estudar a partir das suas fontes.", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200/80" },
  { icon: Zap,       label: "Treino guiado",              desc: "Simulado ENEM, questões e revisões conectam erro, habilidade e próxima tarefa.", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200/80" },
  { icon: Mic,       label: "Tutor no fluxo",             desc: "Tiagão orienta por voz e texto sem tirar você do app.", color: "text-fuchsia-700", bg: "bg-fuchsia-50/90", border: "border-fuchsia-200/80" },
  { icon: PenLine,   label: "Redação com critérios",      desc: "Correção por competências para revisar argumento, coesão e proposta.", color: "text-violet-800", bg: "bg-violet-50", border: "border-violet-200/80" },
  { icon: BookOpen,  label: "Caderno e rotina",           desc: "Anotações, anexos, cronograma e sala de estudos ficam no mesmo login.", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200/80" },
  { icon: Video,     label: "Aprofundamento visual",      desc: "Lousa Imersiva e Professor IA ajudam quando o tema pede aula guiada.", color: "text-violet-800", bg: "bg-violet-50", border: "border-violet-200/80" },
  { icon: Users,     label: "Camada institucional",       desc: "Professores e gestores acompanham turmas com revisão humana e contexto.", color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200/80" },
];

const STEPS = [
  { num: "01", title: "Declare a missão", desc: "Informe prova, prazo, matérias e tempo real. O app entende onde você está antes de sugerir o caminho.", icon: "🎯" },
  { num: "02", title: "Monte o centro de estudo", desc: "Plano, materiais, simulado e caderno entram no mesmo hub para evitar troca de ferramenta.", icon: "📅" },
  { num: "03", title: "Execute e ajuste", desc: "Tiagão orienta a sessão, o Notebook aprofunda o material e os erros voltam como revisão.", icon: "🤖" },
];

const TESTIMONIALS = [
  { name: "Aluno ENEM", role: "Rotina individual", text: "Quando o estudo espalha em PDF, caderno e vídeo, o StudyAI junta tudo em uma próxima ação clara: revisar, treinar ou pedir explicação.", before: "Dor", after: "Próximo passo", emoji: "🎓" },
  { name: "Concurseiro", role: "Revisão de longo prazo", text: "O valor está em voltar ao erro certo. Simulado, mapa de desempenho e revisão ajudam a não repetir a mesma lacuna toda semana.", before: "Dor", after: "Revisão guiada", emoji: "📋" },
  { name: "Professor", role: "Material da turma", text: "O Notebook RAG permite transformar o material já usado em sala em perguntas, resumos e apoio para estudo sem perder a fonte original.", before: "Dor", after: "Material reaproveitado", emoji: "📚" },
  { name: "Gestor escolar", role: "Acompanhamento", text: "Para instituições, a promessa é visibilidade: acompanhar turmas, priorizar casos de atenção e manter intervenção com revisão humana.", before: "Dor", after: "Acompanhamento", emoji: "🏫" },
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
    price: "R$ 59,90",
    period: "/mês",
    desc: "Para rotina intensa",
    highlight: true,
    color: "border-violet-500",
    features: [
      "Planos, simulados e revisões ampliados",
      "Flashcards e treino com IA",
      "Tiagão com voz e texto",
      "Correções de redação ampliadas",
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
      "Gestão de alunos e turmas",
      "Dashboard de gestão institucional",
      "Relatórios e sinais de atenção",
      "Orquestrador de comunicação",
      "White label disponível",
      "Suporte dedicado",
    ],
    cta: "Falar com vendas",
    ctaStyle: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
];

const FAQS = [
  { q: "O StudyAI é gratuito?", a: "Sim. O plano gratuito permite começar com plano de estudos, simulados, revisões com IA no app, redação e acesso limitado ao Tiagão. O Pro amplia limites e recursos para quem estuda com frequência." },
  { q: "O que é a Professor Tiagão?", a: "Tiagão é o tutor por voz e texto do StudyAI. Ele usa contexto do seu plano para orientar a próxima sessão, lembrar pontos de atenção e ajudar você a navegar pelo app." },
  { q: "Como o plano de estudos é gerado?", a: "Você informa matéria, nível, tempo disponível e objetivo. Pode enviar PDF, DOCX ou foto do caderno. Nossa IA cria um cronograma personalizado dia a dia com tópicos, exercícios e revisão no app." },
  { q: "Funciona para ENEM, vestibular e concursos?", a: "Sim. A landing destaca ENEM porque há fluxo dedicado de simulado, mas o mesmo hub pode organizar estudo para vestibulares, concursos e rotina escolar quando você informa objetivo e material." },
  { q: "Como funciona a correção de redação ENEM?", a: "Você envia a redação e recebe uma análise estruturada por competências, com pontos de revisão. A correção por IA deve ser usada como apoio de estudo, não como substituto de avaliação humana oficial." },
  { q: "O que é o Notebook RAG?", a: "É a área em que você adiciona materiais e conversa com IA usando esse contexto. A proposta é responder, resumir e gerar exercícios a partir das fontes que você trouxe." },
  { q: "Substitui cursinho ou professor?", a: "Não é essa a promessa. O StudyAI organiza rotina, treino e revisão com IA; professores, cursinhos e orientação humana continuam valiosos, principalmente para feedback sensível e decisões pedagógicas." },
];

const VIDEO_BRIEFS = [
  {
    id: "intro",
    title: "Do caos ao próximo passo",
    objective: "Quando o aluno não sabe por onde começar, o hub transforma objetivo, material e prazo em uma sessão clara de estudo.",
    duration: "1:32",
    tag: "Hub de estudos",
    tagColor: "bg-violet-50 text-violet-700 border-violet-200",
    gradient: "from-violet-500 via-violet-500 to-purple-600",
    icon: Sparkles,
    scenes: [
      "Aluno abre materiais espalhados e perde tempo decidindo por onde começar.",
      "StudyAI recebe objetivo, material e prazo; o hub sugere a próxima sessão.",
      "Tiagão orienta, Notebook aprofunda e simulado devolve erro como revisão.",
    ],
    cta: "Começar pelo hub",
    path: "/app",
  },
  {
    id: "tiagao",
    title: "Tiagão: sessão curta, foco imediato",
    objective: "O tutor ajuda a retomar o ritmo, identifica uma lacuna provável e conecta revisão, treino e material de apoio.",
    duration: "2:18",
    tag: "Tutor Tiagão",
    tagColor: "bg-orange-50 text-orange-700 border-orange-200",
    gradient: "from-orange-400 via-rose-500 to-fuchsia-500",
    icon: Mic,
    scenes: [
      "Tiagão mostra que matemática ficou para trás no plano.",
      "Aluno escolhe uma sessão curta e recebe revisão objetiva.",
      "O app abre treino e deixa Notebook como apoio para dúvida.",
    ],
    cta: "Conhecer o Tiagão",
    path: "/app",
  },
  {
    id: "escolas",
    title: "Instituição: progresso e qualidade em uma visão",
    objective: "Professores e gestores acompanham lacunas, progresso e sinais de atenção sem perder espaço para revisão humana.",
    duration: "2:45",
    tag: "Para instituições",
    tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    icon: Building2,
    scenes: [
      "Professor enxerga lacunas recorrentes antes de preparar intervenção.",
      "Gestor acompanha progresso, qualidade e sinais de atenção por turma.",
      "Feedback e revisão ajudam a manter recomendações consistentes ao longo do ciclo.",
    ],
    cta: "Falar com equipe",
    path: "#institucional",
  },
];

const B2B_TYPES = ["Escola privada", "Cursinho pré-vestibular", "Universidade / Faculdade", "Secretaria de Educação", "ONG / Terceiro Setor", "Empresa (RH / T&D)", "Outro"];
const B2B_STUDENTS = ["Até 100 alunos", "101 – 500 alunos", "501 – 2.000 alunos", "2.001 – 10.000 alunos", "Mais de 10.000 alunos"];

export default function Landing() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useStudyAuth();
  const [heroAbVariant] = useState<HeroAbVariant>(initHeroAbVariant);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTest, setActiveTest] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [b2bForm, setB2bForm] = useState({ name: "", email: "", institution: "", type: "", students: "", message: "" });
  const [b2bLeadConsent, setB2bLeadConsent] = useState(false);
  const [b2bLoading, setB2bLoading] = useState(false);
  const [b2bDone, setB2bDone] = useState(false);
  const [b2bError, setB2bError] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setActiveTest(v => (v + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    try {
      window.dispatchEvent(
        new CustomEvent("studyia_landing_cta", {
          detail: { variant: heroAbVariant, action: "start_app", surface: "landing" },
        }),
      );
    } catch {
      /* ignore */
    }
    navigate("/app");
  };
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
            <Logo variant="horizontal" className="h-9 md:h-12 lg:h-14 w-auto" />
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
                Novos módulos para organizar, aprofundar e executar a rotina sem sair do app.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <button type="button" onClick={handleStart} className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white px-4 py-2 text-xs font-bold text-gray-900 hover:bg-violet-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950">
                Criar conta grátis
              </button>
              <a href="#videos" className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/25 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950">
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
                className="snap-start shrink-0 w-[min(100%,190px)] md:w-auto text-left rounded-2xl overflow-hidden ring-1 ring-white/10 bg-gray-900/80 hover:ring-violet-400/60 hover:bg-gray-900 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
              >
                <div className="relative hidden min-h-[180px] w-full overflow-hidden bg-slate-900 md:block lg:min-h-[200px]">
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
      <section className="relative overflow-hidden bg-slate-950 px-6 pb-12 pt-14 text-white md:pb-20 md:pt-20">
        <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.35),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.24),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.16),transparent_36%)]" />
          <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="absolute -right-24 top-10 h-[420px] w-[420px] rounded-full bg-violet-500/25 blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-[360px] w-[360px] rounded-full bg-fuchsia-500/15 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-9 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
          <div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-white/10 px-4 py-2 text-xs font-bold text-violet-50 shadow-lg shadow-violet-950/20 backdrop-blur">
                <Radio className="h-3 w-3 shrink-0 animate-pulse text-violet-200" /> Novo: Tutor Tiagão — voz proativa em PT-BR
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-50 backdrop-blur">
                <Shield className="h-3 w-3 shrink-0" /> Fontes, revisão e controle humano
              </span>
            </motion.div>

            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={0.5}
              className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-violet-200">
              Centro de comando inteligente para estudar
            </motion.p>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
              data-hero-ab={heroAbVariant}
              className="mb-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight text-white text-balance sm:text-5xl lg:text-[4.1rem]"
            >
              {heroAbVariant === "enem_nota" ? (
                <>
                  No ENEM,{" "}
                  <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">
                    a semana rende mais quando o próximo passo fica claro
                  </span>
                  .
                </>
              ) : (
                <>
                  No estudo diário,{" "}
                  <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">
                    seu tempo rende mais quando cada sessão tem direção clara
                  </span>
                  .
                </>
              )}
            </motion.h1>

            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
              className="mb-3 max-w-2xl text-lg leading-relaxed text-slate-200 text-pretty sm:text-xl">
              Entre com seu objetivo, prova-alvo ou material. O StudyAI organiza a jornada em um hub de diagnóstico, plano, treino, revisão e tutor IA, sem você ficar pulando entre ferramentas.
            </motion.p>
            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
              className="mb-6 max-w-xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
              Feito para ENEM, vestibular, concursos e estudo cotidiano no Brasil. Comece sem cartão e avance do plano à sessão de estudo com Tiagão, Notebook RAG, simulado e sala de estudos no mesmo login.
            </motion.p>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}
              className="mb-8 flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <button type="button" onClick={handleStart}
                  className="group inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-2xl bg-white px-7 py-3.5 text-sm font-black text-slate-950 shadow-2xl shadow-violet-950/30 transition-all hover:scale-[1.02] hover:bg-violet-50 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:text-base">
                  Começar grátis — 2 minutos
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
                </button>
                <a
                  href="#videos"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  <Play className="h-4 w-4 shrink-0 text-violet-100" fill="currentColor" aria-hidden />
                  <span>Ver a experiência em vídeo</span>
                </a>
              </div>
              <p className="text-sm text-slate-300">
                <a
                  href={pricingHref}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-lg py-2 font-medium text-violet-100 underline-offset-4 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:min-h-0 sm:py-0"
                >
                  Ver preços e Pro
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </a>
              </p>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}
              className="grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/20 backdrop-blur sm:grid-cols-4">
              {STATS.map((s, i) => (
                <div key={i} className="min-w-0">
                  <p className="text-base font-black text-white tabular-nums sm:text-lg">{s.v}</p>
                  <p className="mt-1 text-xs leading-snug text-slate-300">{s.l}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="relative z-10 mx-auto w-full max-w-xl lg:mx-0 lg:justify-self-end">
            <div className="absolute -left-8 top-10 hidden h-28 w-28 rounded-full bg-cyan-300/20 blur-2xl md:block" aria-hidden />
            <div className="absolute -right-8 bottom-16 hidden h-36 w-36 rounded-full bg-fuchsia-400/20 blur-2xl md:block" aria-hidden />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
              <div className="rounded-[1.45rem] border border-slate-700/70 bg-slate-950/95 p-4">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-200">StudyAI Hub</p>
                    <p className="mt-1 text-sm font-bold text-white">Plano da semana em modo comando</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-300/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Ativo
                  </span>
                </div>

                <div className="grid gap-3">
                  {HERO_PREVIEW_CARDS.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className={`rounded-2xl border border-white/10 bg-white/[0.06] p-4 ${i === 1 ? "ml-4 sm:ml-10" : ""}`}>
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100 ring-1 ring-violet-300/20">
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                            <p className="mt-1 text-sm font-black leading-tight text-white">{item.title}</p>
                            <p className="mt-1 text-xs leading-snug text-slate-300">{item.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 p-[1px]">
                  <div className="rounded-2xl bg-slate-950/95 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-black text-white">Próxima ação sugerida</p>
                      <Sparkles className="h-4 w-4 text-fuchsia-200" aria-hidden />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm leading-snug text-slate-300">
                        Revisar matemática por 25 min e gerar 8 questões do seu material.
                      </p>
                      <button type="button" onClick={handleStart}
                        className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-950 transition-colors hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
                        Abrir hub <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-200">Rotas reais</p>
                <p className="mt-1 text-sm font-bold text-white">Fazedores, Notebook, Lousa e Tutor IA</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200">Mobile first</p>
                <p className="mt-1 text-sm font-bold text-white">Ação principal visível no primeiro scroll</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── DOR E RESULTADO ── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="mb-10 max-w-3xl">
            <p className="text-xs font-black uppercase tracking-widest text-violet-600">Por que existe</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
              O StudyAI não vende mais conteúdo. Ele organiza decisão.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              O desafio não é só falta de aula. É não saber o próximo passo, repetir os mesmos erros e perder contexto entre materiais, provas e conversas.
            </p>
          </motion.div>
          <div className="grid gap-4 md:grid-cols-2">
            {PAIN_OUTCOMES.map((item, i) => (
              <motion.article
                key={item.audience}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i * 0.06}
                className="rounded-3xl border border-gray-200 bg-gray-50/60 p-5 shadow-sm"
              >
                <p className="text-xs font-black uppercase tracking-widest text-violet-600">{item.audience}</p>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                  <span className="font-bold text-gray-900">{item.pain}</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  {item.outcome}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CREDIBILIDADE ── */}
      <section className="border-y border-violet-100/70 bg-gradient-to-b from-white via-violet-50/60 to-white px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-600">Prova operacional</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 md:text-3xl">
                Antes de prometer resultado, o produto deixa o caminho visível.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-gray-600">
              A prova aqui é operacional: fonte clara, próxima ação e limites explícitos para a IA.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {CREDIBILITY_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-3xl border border-violet-100 bg-white/85 p-5 shadow-xl shadow-violet-900/5 ring-1 ring-white backdrop-blur">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/20">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h2 className="text-base font-black tracking-tight text-gray-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ENEM FEATURED BANNER ── */}
      <section id="enem-destaque" className="relative my-16 md:my-24 px-4 sm:px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mx-auto max-w-6xl"
        >
          <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-violet-900/15 ring-1 ring-violet-200">
            <img
              src={LANDING_IMG.enemFeatured}
              alt="Simulado ENEM no Study.IA — pratique, foque, acredite, conquiste"
              width={1920}
              height={900}
              loading="lazy"
              decoding="async"
              className="w-full h-auto object-cover object-center aspect-[16/9] md:aspect-[21/9]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-slate-950/55 via-slate-950/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 md:p-10 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
              <div className="text-white max-w-2xl">
                <p className="text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-[0.2em] text-amber-300 mb-2">
                  Treine pro ENEM
                </p>
                <h2 className="text-2xl sm:text-3xl md:text-5xl font-black leading-[1.05] tracking-tight drop-shadow-sm">
                  Simulado ENEM no fluxo<br className="hidden md:block" />
                  <span className="text-amber-300">treino, erro e revisão conectados</span>
                </h2>
                <p className="mt-3 text-sm sm:text-base md:text-lg text-slate-100 leading-snug max-w-xl">
                  Questões, correção e leitura de desempenho ajudam a transformar cada erro em tarefa de revisão.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStart}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-amber-400 hover:bg-amber-300 px-6 md:px-7 py-3 md:py-3.5 text-sm md:text-base font-black text-slate-950 shadow-xl shadow-amber-900/20 transition-all hover:scale-[1.03] active:scale-[0.98]"
              >
                Começar simulado grátis
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── RECURSOS NO APP (rotas reais) ── */}
      <section id="recursos-app" className="py-20 md:py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="max-w-3xl mb-12 md:mb-14">
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3">Do plano à prática</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 mb-4">
              Um estudo premium não é uma lista de recursos. É uma sequência.
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              Primeiro você define o alvo. Depois traz material, treina, revisa e recebe orientação no mesmo lugar. Os módulos abaixo são rotas reais do app, apresentados como etapas da jornada.
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
            Também disponíveis: Aula com Professor IA, Caderno digital, Trilha Mestre, radar de desempenho e recursos para turmas —{" "}
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
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 mb-3">Orientação e fonte: os dois pilares</h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              O hub orienta o que fazer agora. O Notebook mantém o estudo conectado ao material que você trouxe. Juntos, reduzem a sensação de estudar no escuro.
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
                  Tutor por voz e texto no app: usa o plano para orientar a sessão, lembrar pontos de atenção e abrir caminhos no fluxo.
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
                  PDFs e links viram aula, resumo e questões com contexto do seu conteúdo, para estudar sem perder a referência.
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
            <h2 className="text-4xl font-black tracking-tight text-gray-900">3 passos para tirar o estudo do improviso</h2>
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
                Do primeiro objetivo à próxima sessão — em poucos minutos.
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

      {/* ── VÍDEOS / ROTEIROS DE MARCA ── */}
      <section id="videos" className="relative py-24 px-6 bg-gradient-to-b from-white via-gray-50/40 to-white overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[420px] rounded-full bg-violet-100/40 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-10 md:mb-12">
            <p className="inline-flex items-center gap-1.5 text-xs font-black text-violet-600 uppercase tracking-widest mb-3">
              <Film className="w-3 h-3" /> Experiência em vídeo
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900">A história já está pronta para virar vídeo.</h2>
            <p className="text-gray-600 mt-3 max-w-2xl mx-auto text-lg">
              Veja como o StudyAI aparece na rotina real de estudo: menos dispersão, mais direção e próximos passos claros para cada perfil.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="mb-12 md:mb-14 overflow-hidden rounded-3xl border border-violet-100 bg-slate-950 shadow-2xl shadow-violet-900/10 ring-1 ring-black/5">
            <div className="grid lg:grid-cols-5">
              <div className="relative min-h-[280px] overflow-hidden bg-gradient-to-br from-violet-700 via-slate-950 to-fuchsia-700 lg:col-span-3">
                <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:36px_36px]" />
                <div className="absolute -left-16 top-10 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />
                <div className="absolute -right-16 bottom-4 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-3xl" />
                <div className="relative flex h-full min-h-[280px] flex-col justify-between p-6 md:p-8 text-white">
                  <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest ring-1 ring-white/20 backdrop-blur">
                    Demonstração guiada
                  </span>
                  <div className="max-w-xl">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-100">Jornada StudyAI</p>
                    <h3 className="mt-3 text-2xl font-black leading-tight md:text-4xl">
                      Quando há muito conteúdo e pouca direção.
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-slate-200 md:text-base">
                      A experiência mostra a passagem de materiais soltos para uma sessão guiada. O produto aparece como uma decisão clara, não como uma vitrine de botões.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-4 bg-gradient-to-br from-gray-900 to-gray-950 p-6 text-left md:p-8 lg:col-span-2">
                <p className="text-xs font-black uppercase tracking-widest text-violet-300/90">Experiência do produto</p>
                <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
                  Premium porque educa antes de vender.
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Cada fluxo conecta uma necessidade concreta a uma capacidade real: o aluno sabe o que estudar agora, o professor enxerga lacunas e a instituição acompanha qualidade com mais clareza.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={handleStart}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-gray-900 hover:bg-violet-50 transition-colors">
                    Abrir o app <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <a href="#institucional"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors">
                    Planejar institucional <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            {VIDEO_BRIEFS.map((video, i) => {
              const Icon = video.icon;
              return (
                <motion.article
                  key={video.id}
                  variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1}
                  className="group overflow-hidden rounded-3xl border border-gray-200 bg-white text-left shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-violet-300 hover:shadow-2xl hover:shadow-violet-500/10"
                >
                  <div className={`relative overflow-hidden bg-gradient-to-br ${video.gradient} p-5 text-white`}>
                    <div className="absolute inset-0 opacity-20"
                      style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
                    <div className="relative flex items-start justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider border border-white/30">
                        <Icon className="w-3 h-3" /> {video.tag}
                      </span>
                      <span className="px-2 py-1 rounded-md bg-black/30 backdrop-blur-md text-[10px] font-bold tabular-nums">
                        {video.duration}
                      </span>
                    </div>
                    <div className="relative mt-12">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">O que você acompanha</p>
                      <h3 className="mt-2 text-lg font-black leading-tight">{video.title}</h3>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm leading-relaxed text-gray-600">{video.objective}</p>
                    <ol className="mt-4 space-y-2">
                      {video.scenes.map((scene, j) => (
                        <li key={scene} className="flex gap-2 text-xs leading-snug text-gray-600">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[10px] font-black text-violet-700">
                            {j + 1}
                          </span>
                          <span>{scene}</span>
                        </li>
                      ))}
                    </ol>
                    <button
                      type="button"
                      onClick={() => video.path.startsWith("#") ? document.querySelector(video.path)?.scrollIntoView({ behavior: "smooth" }) : navigate(video.path)}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-violet-500"
                    >
                      {video.cta} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.article>
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
                Conheça o Professor Tiagão
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                O tutor por voz e texto que entra na rotina de estudo. Ele não é mais uma aba: usa seu plano para sugerir o que fazer agora.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Radio,  title: "Orienta a próxima sessão",          desc: "Ajuda a retomar quando a rotina perde ritmo.", color: "text-orange-500" },
                  { icon: Cpu,    title: "Usa o contexto do plano",           desc: "Considera objetivo, matérias e histórico disponíveis no app.", color: "text-violet-600" },
                  { icon: Layers, title: "Conecta módulos",                   desc: "Aponta para plano, treino, revisão e Notebook sem quebrar o fluxo.", color: "text-violet-600" },
                  { icon: Shield, title: "Apoio, não promessa mágica",        desc: "Organiza decisões de estudo e mantém espaço para revisão humana.", color: "text-emerald-500" },
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
                    { role: "tiagao", msg: "Vi que matemática ficou parada no seu plano. Quer uma sessão curta agora?" },
                    { role: "user",   msg: "Tenho só 20 minutos hoje." },
                    { role: "tiagao", msg: "Então vamos revisar funções e fechar com 5 questões do seu material." },
                    { role: "user",   msg: "Pode abrir." },
                    { role: "tiagao", msg: "Abrindo o treino e deixando o Notebook como apoio se pintar dúvida." },
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
                    <span className="text-xs text-gray-400">Perguntar ao Tiagão...</span>
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
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3">Mapa de capacidades</p>
            <h2 className="text-4xl font-black tracking-tight text-gray-900">O suficiente para avançar, sem catálogo infinito.</h2>
            <p className="text-gray-600 mt-3 max-w-2xl mx-auto">A landing agora prioriza as capacidades que sustentam a história: diagnosticar, estudar com fonte, treinar, revisar e acompanhar. O menu completo continua dentro do app.</p>
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
                Mais clareza para preparar, acompanhar e intervir.
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
                    { icon: Users,        label: "Turmas acompanhadas",        sub: "Visão por grupo e estudante", color: "text-violet-600" },
                    { icon: AlertTriangle, label: "Alunos em atenção",         sub: "Sinais para priorizar intervenção", color: "text-amber-500" },
                    { icon: MessageSquare, label: "Comunicação organizada",    sub: "Mensagens e combinados em contexto", color: "text-green-500" },
                    { icon: Brain,        label: "Plano de aula assistido",    sub: "Sequências e atividades para revisar", color: "text-violet-600" },
                    { icon: TrendingUp,   label: "Leitura de desempenho",      sub: "Evolução sem depender só de planilha", color: "text-emerald-500" },
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
                Mais preparo, menos retrabalho.
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                Ferramentas para transformar material da turma em plano, atividade e acompanhamento, com revisão humana quando a decisão pedagógica pede cuidado.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Plano de aula assistido por IA",
                  "Revisão estruturada antes de usar em sala",
                  "Sinais de atenção por engajamento e desempenho",
                  "Comunicação organizada com alunos e responsáveis",
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
                Gestão com IA para enxergar sinais antes que virem crise.
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
                Dashboard para gestores, relatórios e sinais de atenção para priorizar acompanhamento com responsabilidade.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Dashboard de gestão de turmas e professores",
                  "Relatórios automáticos de desempenho",
                  "Sinais de risco e queda de engajamento",
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
              <p className="text-xs font-black text-gray-500 uppercase mb-4">Alunos em atenção</p>
              {[
                { nome: "Maria S.", prob: 70, motivo: "5 dias sem acessar, queda em Matemática", acao: "Sugerir reforço" },
                { nome: "João P.",  prob: 45, motivo: "Dificuldade em tópicos correlacionados", acao: "Revisar plano" },
                { nome: "Lucas M.", prob: 38, motivo: "Meta semanal não atingida por 2 semanas", acao: "Agendar conversa" },
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
            <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-3">Casos de uso</p>
            <h2 className="text-4xl font-black tracking-tight text-gray-900">Cenários reais de uso, sem prometer milagre</h2>
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
                      <span className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-bold">{TESTIMONIALS[activeTest].before}</span>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">{TESTIMONIALS[activeTest].after}</span>
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
            <p className="text-gray-600 mt-3">Comece leve, avance quando a rotina pedir mais limites e use o plano institucional quando houver turmas.</p>
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
              <p className="text-5xl mb-4">✦</p>
              <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Seu próximo estudo já pode nascer com direção.</h2>
              <p className="text-violet-200 text-lg mb-8">Comece sem cartão, crie o hub e veja se a rotina fica mais clara antes de assinar.</p>
              <button onClick={handleStart}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-black text-violet-600 bg-white hover:bg-violet-50 transition-all hover:scale-[1.03] active:scale-[0.97] text-base shadow-xl">
                Começar grátis agora <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

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
