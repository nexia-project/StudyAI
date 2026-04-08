import { useState, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Brain,
  Zap,
  Trophy,
  Clock,
  FileText,
  BarChart2,
  CheckCircle,
  CheckCircle2,
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
  Stethoscope,
  FlameKindling,
  CalendarDays,
  ChevronLeft,
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
    color: "",
    border: "",
    iconBg: "bg-[#FFF2EA]",
    iconColor: "text-[#F26207]",
  },
  {
    icon: Zap,
    title: "Simulado Inteligente",
    desc: "10 questões geradas diretamente do seu material — múltipla escolha, lacuna, verdadeiro/falso — com correção e gabarito comentado.",
    color: "",
    border: "",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
  },
  {
    icon: BookOpen,
    title: "Flashcards (Método Anki)",
    desc: "Pratique com repetição espaçada. A IA cria os cards a partir do seu plano e ajusta o ritmo conforme seu desempenho.",
    color: "",
    border: "",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: Clock,
    title: "Pomodoro Gamificado",
    desc: "Timer de foco integrado ao plano de estudos. Estude por ciclos e ganhe XP a cada sessão concluída.",
    color: "",
    border: "",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    icon: Trophy,
    title: "Ranking Global",
    desc: "Compare seu desempenho com estudantes do Brasil. Suba na classificação e conquiste badges de Bronze ao Diamante.",
    color: "",
    border: "",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    icon: BarChart2,
    title: "Dashboard de Progresso",
    desc: "Acompanhe simulados, taxa de acerto, flashcards e planos gerados. Veja sua evolução ao longo do tempo.",
    color: "",
    border: "",
    iconBg: "bg-pink-50",
    iconColor: "text-pink-500",
  },
  {
    icon: PenLine,
    title: "Corretor de Redação ENEM",
    desc: "Cole sua redação e receba nota de 0 a 1000, avaliação nas 5 competências e feedback detalhado gerado pelo GPT-4o.",
    color: "",
    border: "",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    icon: Map,
    title: "Mapa de Calor de Desempenho",
    desc: "Visualize pontos fortes e fracos por matéria. O mapa atualiza automaticamente com base em todos os seus simulados e flashcards.",
    color: "",
    border: "",
    iconBg: "bg-[#FFF2EA]",
    iconColor: "text-[#F26207]",
  },
  {
    icon: Target,
    title: "Simulado Adaptativo IA",
    desc: "A IA analisa seu histórico, detecta suas lacunas e gera 10 questões cirúrgicas focadas no que você mais precisa revisar. Quanto mais usa, mais preciso fica.",
    color: "",
    border: "",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
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
    desc: "Experimente tudo com limites",
    highlight: false,
    features: [
      "1 plano de estudos por mês",
      "2 simulados por mês",
      "5 flashcards por semana",
      "5 mensagens/dia com o tutor IA",
      "1 correção de redação por mês",
      "1 resumão estratégico por mês",
      "Dashboard de desempenho",
      "Timer Pomodoro",
      "Acesso ao ranking",
    ],
    cta: "Começar Grátis",
    ctaVariant: "outline" as const,
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
      "Tutor IA ilimitado no chat",
      "Correções de redação ilimitadas",
      "Resumões estratégicos ilimitados",
      "Dashboard completo + mapa de calor",
      "Histórico de sessões",
      "Ranking prioritário",
    ],
    cta: "Assinar Pro",
    ctaVariant: "default" as const,
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
    ctaVariant: "outline" as const,
  },
];

const stats = [
  { value: "+2.400", label: "Estudantes ativos", icon: Users, color: "text-[#F26207]" },
  { value: "14.800+", label: "Planos gerados", icon: BookOpen, color: "text-blue-400" },
  { value: "89%", label: "Taxa de acerto média", icon: TrendingUp, color: "text-[#F26207]" },
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
    gradient: "from-[#F26207]/10 to-[#F5803A]/5",
    border: "border-[#F26207]/25",
    iconBg: "bg-[#F26207]/20",
    iconColor: "text-[#F26207]",
    badgeBg: "bg-[#F26207]/20 text-[#F5A07A] border-[#F26207]/30",
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
    role: "ENEM 2024 — aprovada em Medicina",
    text: "Tirava 580. Depois de 2 meses com o StudyAI, fui para 724. Meu plano atacou exatamente as matérias que eu mais perdia ponto. Os simulados pareciam questões reais da prova.",
    stars: 5,
    before: "580 pts",
    after: "724 pts",
    emoji: "🎓",
  },
  {
    name: "Carlos M.",
    role: "Aprovado no concurso — TRF",
    text: "Tentei 3 anos sem aprovação. Com o Simulado Adaptativo, o sistema detectou meus pontos cegos e eu finalmente passei. Nunca entendi meus erros tão bem.",
    stars: 5,
    before: "3 reprovações",
    after: "Aprovado!",
    emoji: "📋",
  },
  {
    name: "Juliana R.",
    role: "Vestibular FUVEST — Direito",
    text: "Fotografava minha apostila no ônibus e em 30 segundos tinha exercícios sobre o que ia cair na prova. Nunca estudei tão pouco e aprendi tanto.",
    stars: 5,
    before: "Sem foco",
    after: "Aprovada!",
    emoji: "⚡",
  },
  {
    name: "Rafael T.",
    role: "Estudante Ensino Médio — 3ª série",
    text: "Minha nota de redação foi de 640 para 880. O corretor do StudyAI identificou que eu não desenvolvia proposta de intervenção. Professor nenhum tinha me dito isso.",
    stars: 5,
    before: "Redação 640",
    after: "Redação 880",
    emoji: "✍️",
  },
  {
    name: "Ana P.",
    role: "Concurso Polícia Federal",
    text: "Enviei o edital completo e o sistema montou um plano de 90 dias priorizando os tópicos com maior peso. Economizei meses de tentativa e erro.",
    stars: 5,
    before: "Sem direção",
    after: "Aprovada 1ª fase",
    emoji: "🏆",
  },
  {
    name: "Lucas M.",
    role: "ENEM 2025 — 2° ano Médio",
    text: "Antes ficava relendo o mesmo capítulo sem absorver nada. Agora faço flashcards do meu próprio material e fixo de verdade. Minha nota em Matemática subiu 3 pontos por disciplina.",
    stars: 5,
    before: "Relendo sem fixar",
    after: "Notas dispararam",
    emoji: "🔢",
  },
];

type DiagOption = { value: string; label: string; emoji: string; desc: string };
type DiagStep = { key: string; question: string; icon: ComponentType<{ className?: string }>; options: DiagOption[] };

function getDiagSteps(answers: Record<string, string>): DiagStep[] {
  const obj = answers.objetivo ?? "";
  const nivel = answers.nivel ?? "";

  const step1: DiagStep = {
    key: "objetivo",
    question: "Qual é o seu objetivo?",
    icon: Target,
    options: [
      { value: "enem", label: "ENEM / Vestibular", emoji: "🎓", desc: "Passar no ENEM ou vestibular" },
      { value: "concurso", label: "Concurso Público", emoji: "📋", desc: "Aprovação em concurso federal, estadual ou municipal" },
      { value: "reforco", label: "Reforço Escolar", emoji: "📚", desc: "Melhorar notas e entender melhor as aulas" },
      { value: "faculdade", label: "Faculdade / Pós", emoji: "🏛️", desc: "Provas, trabalhos e residências" },
    ],
  };

  let step2: DiagStep;
  if (obj === "enem") {
    step2 = {
      key: "nivel",
      question: "Qual é o seu nível atual no ENEM?",
      icon: GraduationCap,
      options: [
        { value: "iniciante", label: "Iniciante", emoji: "🌱", desc: "Nunca fiz simulado, preciso do básico" },
        { value: "intermediario", label: "Intermediário", emoji: "📗", desc: "Notas entre 500–650, quero subir mais" },
        { value: "avancado", label: "Avançado", emoji: "🔥", desc: "Acima de 650, quero top 10%" },
        { value: "veterano", label: "2ª tentativa", emoji: "🎯", desc: "Já fiz antes e preciso aumentar a nota" },
      ],
    };
  } else if (obj === "concurso") {
    step2 = {
      key: "nivel",
      question: "Qual tipo de concurso?",
      icon: GraduationCap,
      options: [
        { value: "policial", label: "Policial / Militar", emoji: "👮", desc: "PRF, PC, PM, Bombeiro, PCDF" },
        { value: "fiscal", label: "Fiscal / Tributário", emoji: "📊", desc: "Receita Federal, SEFAZ, TCU, TCE" },
        { value: "saude", label: "Saúde / Residência", emoji: "🏥", desc: "Residência médica, enfermagem, farmácia" },
        { value: "geral", label: "Concurso Geral", emoji: "🏛️", desc: "INSS, Correios, Banco do Brasil, outros" },
      ],
    };
  } else if (obj === "reforco") {
    step2 = {
      key: "nivel",
      question: "Qual é a sua série?",
      icon: GraduationCap,
      options: [
        { value: "fund1", label: "Fundamental I", emoji: "🌱", desc: "1° ao 5° ano" },
        { value: "fund2", label: "Fundamental II", emoji: "📗", desc: "6° ao 9° ano" },
        { value: "medio", label: "Ensino Médio", emoji: "📘", desc: "1° ao 3° ano" },
        { value: "eja", label: "EJA / Adulto", emoji: "🎯", desc: "Educação de jovens e adultos" },
      ],
    };
  } else {
    step2 = {
      key: "nivel",
      question: "Qual área da faculdade?",
      icon: GraduationCap,
      options: [
        { value: "exatas", label: "Exatas / Engenharia", emoji: "⚙️", desc: "Cálculo, física, programação" },
        { value: "saude", label: "Saúde / Biológicas", emoji: "🔬", desc: "Medicina, enfermagem, farmácia" },
        { value: "humanas", label: "Humanas / Sociais", emoji: "📚", desc: "Direito, psicologia, pedagogia" },
        { value: "ti", label: "TI / Tecnologia", emoji: "💻", desc: "Sistemas, ADS, redes, dados" },
      ],
    };
  }

  let matOpts: DiagOption[];
  if (obj === "enem") {
    matOpts = [
      { value: "Matemática", label: "Matemática", emoji: "🔢", desc: "Funções, geometria, probabilidade" },
      { value: "Redação ENEM", label: "Redação", emoji: "✍️", desc: "Nota 1000 nas 5 competências" },
      { value: "Ciências da Natureza", label: "Ciências da Natureza", emoji: "🔬", desc: "Biologia, Química, Física" },
      { value: "Ciências Humanas", label: "Ciências Humanas", emoji: "🌍", desc: "História, Geografia, Filosofia, Sociologia" },
      { value: "Linguagens", label: "Linguagens e Códigos", emoji: "📖", desc: "Português, Inglês, Artes, Ed. Física" },
    ];
  } else if (obj === "concurso" && nivel === "policial") {
    matOpts = [
      { value: "Raciocínio Lógico", label: "Raciocínio Lógico", emoji: "🧠", desc: "Item mais pesado em provas policiais" },
      { value: "Língua Portuguesa", label: "Língua Portuguesa", emoji: "✍️", desc: "Interpretação de texto, gramática" },
      { value: "Legislação Penal", label: "Legislação", emoji: "⚖️", desc: "Constituição, CPP, CP, ECA, LGPD" },
      { value: "Informática", label: "Informática", emoji: "💻", desc: "Pacote Office, segurança, redes" },
    ];
  } else if (obj === "concurso" && nivel === "fiscal") {
    matOpts = [
      { value: "Matemática Financeira", label: "Matemática Financeira", emoji: "💰", desc: "Juros, porcentagem, análise" },
      { value: "Direito Tributário", label: "Direito Tributário", emoji: "⚖️", desc: "CTN, impostos, obrigações fiscais" },
      { value: "Contabilidade", label: "Contabilidade", emoji: "📊", desc: "Balanços, DRE, escrituração" },
      { value: "Língua Portuguesa", label: "Língua Portuguesa", emoji: "✍️", desc: "Redação oficial, interpretação" },
    ];
  } else if (obj === "concurso" && nivel === "saude") {
    matOpts = [
      { value: "Fisiologia e Anatomia", label: "Fisiologia / Anatomia", emoji: "🫀", desc: "Sistemas e funções do corpo" },
      { value: "Farmacologia", label: "Farmacologia", emoji: "💊", desc: "Medicamentos, doses, interações" },
      { value: "Saúde Pública", label: "Saúde Pública", emoji: "🏥", desc: "SUS, protocolos, epidemiologia" },
      { value: "Bioquímica", label: "Bioquímica", emoji: "🔬", desc: "Metabolismo, enzimas, bioquímica" },
    ];
  } else if (obj === "concurso") {
    matOpts = [
      { value: "Raciocínio Lógico", label: "Raciocínio Lógico", emoji: "🧠", desc: "Lógica, sequências, análise" },
      { value: "Língua Portuguesa", label: "Língua Portuguesa", emoji: "✍️", desc: "Gramática, interpretação" },
      { value: "Matemática", label: "Matemática", emoji: "🔢", desc: "Aritmética, porcentagem, álgebra" },
      { value: "Atualidades", label: "Atualidades", emoji: "🌍", desc: "Política, economia, notícias" },
    ];
  } else if (obj === "faculdade" && nivel === "exatas") {
    matOpts = [
      { value: "Cálculo", label: "Cálculo", emoji: "📐", desc: "Limites, derivadas, integrais" },
      { value: "Física", label: "Física", emoji: "⚡", desc: "Mecânica, termodinâmica, eletricidade" },
      { value: "Álgebra Linear", label: "Álgebra Linear", emoji: "🔢", desc: "Matrizes, vetores, sistemas" },
      { value: "Programação", label: "Programação", emoji: "💻", desc: "Algoritmos, lógica, linguagens" },
    ];
  } else if (obj === "faculdade" && nivel === "ti") {
    matOpts = [
      { value: "Programação", label: "Programação", emoji: "💻", desc: "POO, algoritmos, estruturas" },
      { value: "Banco de Dados", label: "Banco de Dados", emoji: "🗄️", desc: "SQL, modelagem, normalização" },
      { value: "Redes", label: "Redes e Segurança", emoji: "🌐", desc: "TCP/IP, protocolos, firewalls" },
      { value: "Matemática Discreta", label: "Matemática Discreta", emoji: "🔢", desc: "Lógica, grafos, combinatória" },
    ];
  } else {
    matOpts = [
      { value: "Matemática", label: "Matemática", emoji: "🔢", desc: "Álgebra, geometria, funções" },
      { value: "Português e Redação", label: "Português / Redação", emoji: "✍️", desc: "Gramática, texto, redação" },
      { value: "Ciências e Biologia", label: "Ciências / Biologia", emoji: "🔬", desc: "Biologia, química, física" },
      { value: "História e Geografia", label: "História / Geografia", emoji: "🌍", desc: "Humanas, geopolítica" },
      { value: "Inglês", label: "Inglês", emoji: "🌐", desc: "Vocabulário, gramática, conversação" },
    ];
  }

  const step3: DiagStep = {
    key: "materia",
    question: obj === "enem" ? "Qual área é sua maior fraqueza?"
      : obj === "concurso" ? "Onde você precisa mais atenção?"
      : "Qual matéria você mais precisa?",
    icon: BookOpen,
    options: matOpts,
  };

  let diasOpts: DiagOption[];
  if (obj === "concurso") {
    diasOpts = [
      { value: "30", label: "Prova em menos de 1 mês", emoji: "🔥", desc: "Foco urgente no edital" },
      { value: "90", label: "Edital aberto, prova em 3 meses", emoji: "⚡", desc: "Estudo por blocos de matéria" },
      { value: "180", label: "Ainda sem edital aberto", emoji: "📈", desc: "Construção de base sólida" },
      { value: "365", label: "Pensando a longo prazo", emoji: "🌟", desc: "Ciclo completo de preparação" },
    ];
  } else {
    diasOpts = [
      { value: "7", label: "Em 1 semana", emoji: "🔥", desc: "Modo intensivo, foco total" },
      { value: "30", label: "Em 1 mês", emoji: "⚡", desc: "Ritmo acelerado mas sustentável" },
      { value: "90", label: "Em 3 meses", emoji: "📈", desc: "Progressão sólida com revisões" },
      { value: "180", label: "Mais de 6 meses", emoji: "🌟", desc: "Aprendizado profundo e duradouro" },
    ];
  }

  const step4: DiagStep = {
    key: "dias",
    question: obj === "concurso" ? "Qual é a sua situação com o edital?" : "Quando é a sua prova?",
    icon: CalendarDays,
    options: diasOpts,
  };

  return [step1, step2, step3, step4];
}

function getDiagResult(answers: Record<string, string>) {
  const { objetivo, nivel, materia, dias } = answers;
  const d = parseInt(dias ?? "90");

  const urgencyLabel =
    d <= 7 ? "intensivo de 7 dias" :
    d <= 30 ? "acelerado de 30 dias" :
    d <= 90 ? "de 90 dias" :
    d <= 180 ? "de 6 meses" : "anual";

  const alertColor = d <= 7 ? "red" : d <= 30 ? "yellow" : "green";
  const alertMsg =
    d <= 7 ? `⚠️ Menos de 7 dias: modo emergência. Vamos focar apenas no essencial de ${materia ?? "sua matéria"}.` :
    d <= 30 ? `⚡ 30 dias é suficiente para cobrir os pontos críticos de ${materia ?? "sua matéria"} — se o plano for certo.` :
    `✅ Você tem tempo de sobra. Vamos construir uma base sólida e ir revisando com simulados.`;

  let title = "";
  let bullets: string[] = [];
  let includes: string[] = [];

  if (objetivo === "enem") {
    const nivelLabel = nivel === "iniciante" ? "do zero" : nivel === "intermediario" ? "intermediário" : nivel === "avancado" ? "avançado" : "veterano";
    title = `Plano ENEM ${nivelLabel} — ${materia ?? "sua matéria"} — ${urgencyLabel}`;
    bullets = [
      `Conteúdo priorizado pelo peso histórico do ENEM${nivel === "avancado" ? " — questões nível 3 e 4" : ""}`,
      `Simulado adaptativo focado nos padrões de questão do ENEM${materia?.includes("Redação") ? " + correção de redação com nota" : ""}`,
      nivel === "veterano" ? "Análise do que te fez perder pontos na tentativa anterior" : "Flashcards de memorização dos tópicos mais cobrados",
    ];
    includes = ["Plano dia a dia", "Simulado ENEM", "Flashcards", materia?.includes("Redação") ? "Correção de Redação" : "Resumão Estratégico", "Tutor IA 24h"];
  } else if (objetivo === "concurso") {
    const tipoLabel = nivel === "policial" ? "Policial/Militar" : nivel === "fiscal" ? "Fiscal/Tributário" : nivel === "saude" ? "Residência/Saúde" : "Geral";
    title = `Plano Concurso ${tipoLabel} — ${materia ?? "sua matéria"} — ${urgencyLabel}`;
    bullets = [
      `Conteúdo alinhado ao perfil do concurso ${tipoLabel} — nada fora do edital`,
      `Questões de provas anteriores (FGV, CESPE, VUNESP, FCC) no estilo da banca`,
      nivel === "policial" ? "Raciocínio Lógico com cronômetro — treino de velocidade e precisão" : "Análise das bancas mais usadas para sua área",
    ];
    includes = ["Plano por edital", "Simulado de banca", "Flashcards de legislação", "Resumão por disciplina", "Tutor IA 24h"];
  } else if (objetivo === "reforco") {
    const serieLabel = nivel === "fund1" ? "Fundamental I" : nivel === "fund2" ? "Fundamental II" : nivel === "medio" ? "Ensino Médio" : "EJA";
    title = `Plano de Reforço — ${materia ?? "sua matéria"} — ${serieLabel}`;
    bullets = [
      `Revisão dos pré-requisitos que costumam travar alunos do ${serieLabel}`,
      `Exercícios progressivos: do básico ao avançado, sem pular etapas`,
      `Diagnóstico semanal para saber exatamente onde você ainda erra`,
    ];
    includes = ["Plano por semana", "Exercícios graduais", "Flashcards", "Resumão", "Tutor IA 24h"];
  } else {
    const areaLabel = nivel === "exatas" ? "Exatas/Engenharia" : nivel === "saude" ? "Saúde" : nivel === "humanas" ? "Humanas" : "TI";
    title = `Plano Faculdade ${areaLabel} — ${materia ?? "sua matéria"} — ${urgencyLabel}`;
    bullets = [
      `Foco nos tópicos mais cobrados em provas e trabalhos de ${areaLabel}`,
      `Resumões e flashcards do conteúdo semestral — ideal para véspera de prova`,
      `Tutor IA explica qualquer dúvida do seu professor com exemplos práticos`,
    ];
    includes = ["Plano por semana", "Simulado temático", "Flashcards", "Resumão Estratégico", "Tutor IA 24h"];
  }

  return { title, bullets, includes, alertMsg, alertColor };
}

export default function Landing() {
  const [, navigate] = useLocation();
  const [wlEmail, setWlEmail] = useState("");
  const [wlName, setWlName] = useState("");
  const [wlStatus, setWlStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [wlMessage, setWlMessage] = useState("");

  const [diagStep, setDiagStep] = useState(0);
  const [diagAnswers, setDiagAnswers] = useState<Record<string, string>>({});
  const [diagDone, setDiagDone] = useState(false);

  const currentSteps = getDiagSteps(diagAnswers);
  const diagResult = diagDone ? getDiagResult(diagAnswers) : null;

  function handleDiagOption(value: string) {
    const stepKey = currentSteps[diagStep].key;
    const newAnswers = { ...diagAnswers, [stepKey]: value };
    setDiagAnswers(newAnswers);
    if (diagStep < currentSteps.length - 1) {
      setDiagStep(diagStep + 1);
    } else {
      setDiagDone(true);
    }
  }

  function handleDiagStart() {
    const params = new URLSearchParams();
    if (diagAnswers.materia) params.set("materia", diagAnswers.materia);
    if (diagAnswers.nivel) params.set("serie", diagAnswers.nivel);
    if (diagAnswers.objetivo) params.set("objetivo", diagAnswers.objetivo);
    if (diagAnswers.dias) params.set("dias", diagAnswers.dias);
    navigate(`/app?${params.toString()}`);
  }

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
    <div className="min-h-screen bg-[#F5EFE9] text-[#0D0D0D] overflow-x-hidden">
      {/* ── NAVBAR ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#E5D5C8] bg-[#F5EFE9]/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F26207] flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">StudyAI</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-500">
            <a href="#diagnostico" className="hover:text-gray-900 transition-colors text-[#F26207] font-semibold">Diagnóstico</a>
            <a href="#recursos" className="hover:text-gray-900 transition-colors">Recursos</a>
            <a href="#como-funciona" className="hover:text-gray-900 transition-colors">Como funciona</a>
            <a href="#precos" className="hover:text-gray-900 transition-colors">Preços</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => navigate("/app")}
            >
              Entrar
            </Button>
            <Button
              size="sm"
              className="bg-[#F26207] hover:bg-[#D85507] text-white"
              onClick={() => navigate("/app")}
            >
              Começar Grátis
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden bg-gradient-to-b from-[#F5EFE9] to-[#EDE4DA]">
        {/* Organic blobs - Replit style */}
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-[#F5B088] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none opacity-60" />
        <div className="absolute bottom-10 left-0 w-[420px] h-[420px] bg-[#F26207] rounded-full -translate-x-1/2 pointer-events-none opacity-10" />

        <div className="relative max-w-4xl mx-auto">
          {/* Pain hook */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-2 mb-8"
          >
            {["Estudando horas sem resultado? 😰", "Prova chegando e sem direção? 📅", "Nota emperrada? 📉"].map((pain) => (
              <span key={pain} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#FAF5F0] border border-[#E8D9CC] text-[#7A6E66] shadow-sm">
                {pain}
              </span>
            ))}
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6 text-gray-900"
          >
            Chega de estudar<br />
            <span className="bg-gradient-to-r from-[#F26207] to-[#F5803A] bg-clip-text text-transparent">
              do jeito errado.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-4 leading-relaxed"
          >
            A IA monta um plano <strong className="text-gray-900">cirúrgico</strong> a partir do seu próprio material — com simulados, flashcards, correção de redação e um tutor que responde qualquer dúvida, 24h por dia.
          </motion.p>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2.5}
            className="text-base text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Enquanto você relê o mesmo capítulo pela terceira vez, outros já sabem <em>exatamente</em> o que vai cair — porque o sistema mostrou.
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
              className="bg-[#F26207] hover:bg-[#D85507] text-white text-base px-10 h-14 shadow-lg shadow-orange-200 font-black rounded-2xl text-lg"
              onClick={() => navigate("/app")}
            >
              Quero meu plano agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50 text-base px-8 h-14 rounded-2xl bg-[#F9F5F1]"
              onClick={() => {
                document.getElementById("diagnostico")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Fazer diagnóstico grátis
            </Button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-8 text-sm text-gray-400"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#F26207]" />
              Sem cartão de crédito
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#F26207]" />
              Plano pronto em 30 segundos
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#F26207]" />
              +2.400 estudantes aprovados
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
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-xl shadow-gray-200/80">
            <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-[#F26207]" />
              <div className="flex-1 mx-4 h-5 rounded bg-gray-100 flex items-center px-3">
                <span className="text-gray-400 text-xs">studyai.app</span>
              </div>
            </div>
            <div className="p-3 sm:p-6 grid grid-cols-3 gap-2 sm:gap-4 min-h-[160px] sm:min-h-[200px] bg-[#0f0f17]">
              {[
                { label: "Planos", val: "12", color: "text-violet-400" },
                { label: "Acerto", val: "87%", color: "text-[#F26207]" },
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
                    <p className="text-xs sm:text-sm font-medium text-white truncate">Matemática — Equações do 2º grau</p>
                    <p className="text-[10px] sm:text-xs text-white/40">3 tópicos · 2 exercícios · 1 desafio</p>
                  </div>
                  <ChevronRight className="ml-auto text-white/20 w-4 h-4 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="py-14 px-6 border-t border-b border-[#E5D5C8] bg-[#EDE4DA]">
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
                <div className="w-10 h-10 rounded-xl bg-[#FFF2EA] border border-[#F5C4A0] flex items-center justify-center mb-1">
                  <s.icon className="w-5 h-5 text-[#F26207]" />
                </div>
                <p className="text-3xl font-black tracking-tight text-gray-900">{s.value}</p>
                <p className="text-gray-400 text-sm font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANTES vs DEPOIS ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-rose-500 font-semibold text-sm uppercase tracking-widest mb-3">A realidade de quem não usa IA</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-gray-900">
              Reconhece essa situação?
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Antes e depois de estudar com o StudyAI. A diferença é brutal.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
            {/* ANTES */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="relative rounded-3xl border border-red-100 bg-red-50 p-8"
            >
              <div className="absolute top-5 right-5 text-xs font-black px-3 py-1 rounded-full bg-red-100 border border-red-200 text-red-500 uppercase tracking-widest">
                Antes
              </div>
              <div className="text-4xl mb-4">😰</div>
              <h3 className="text-xl font-black mb-6 text-gray-800">Estudante sem método</h3>
              <ul className="space-y-4">
                {[
                  { icon: "📚", text: "Relê o mesmo capítulo 3 vezes e ainda não fixa" },
                  { icon: "📅", text: "Véspera de prova em pânico, sem saber por onde começar" },
                  { icon: "❓", text: "Faz questões aleatórias mas não sabe onde erra mais" },
                  { icon: "✏️", text: "Redação entregue sem feedback, vai na esperança" },
                  { icon: "📉", text: "Nota sobe um ponto, cai dois — sem entender o porquê" },
                  { icon: "😴", text: "Motivação zero depois da 2ª hora de estudo" },
                  { icon: "🤷", text: "Não sabe o que vai cair, estuda tudo superficialmente" },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <span className="text-gray-500 text-sm leading-snug">{item.text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* DEPOIS */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={0.2}
              className="relative rounded-3xl border border-[#F5C4A0] bg-[#FFF2EA] p-8"
            >
              <div className="absolute top-5 right-5 text-xs font-black px-3 py-1 rounded-full bg-[#FFE0C8] border border-[#F5C4A0] text-[#F26207] uppercase tracking-widest">
                Com StudyAI
              </div>
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-black mb-6 text-gray-900">Estudante com IA trabalhando por você</h3>
              <ul className="space-y-4">
                {[
                  { icon: "🎯", text: "Plano cirúrgico em 30 segundos baseado no seu material real" },
                  { icon: "📋", text: "Sabe exatamente o que estudar amanhã, depois de amanhã e assim por diante" },
                  { icon: "⚡", text: "Simulado Adaptativo ataca suas lacunas específicas — nada de questão aleatória" },
                  { icon: "📝", text: "Redação com nota e feedback detalhado nas 5 competências em segundos" },
                  { icon: "📈", text: "Mapa de Calor mostra onde você melhora e onde ainda precisa focar" },
                  { icon: "🏆", text: "Gamificação, ranking e XP transformam estudo em competição saudável" },
                  { icon: "🤖", text: "Tutor IA tira qualquer dúvida instantaneamente — às 2h da manhã se precisar" },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <span className="text-gray-700 text-sm leading-snug">{item.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button
                  className="w-full bg-[#F26207] hover:bg-[#D85507] text-white font-black py-5 rounded-2xl text-base"
                  onClick={() => navigate("/app")}
                >
                  Quero estudar do jeito certo →
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── DEMO ANIMADA ── */}
      <section className="py-24 px-6 bg-[#F9F5F1] border-t border-[#E5D9CF]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-[#F26207] font-semibold text-sm uppercase tracking-widest mb-3">Veja na prática</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-gray-900">
              30 segundos. Plano pronto.
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              É assim que funciona: você digita (ou sobe o material) e a IA gera tudo.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            custom={0.2}
            className="relative rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-lg shadow-gray-100"
          >
            {/* Browser bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-[#F26207] flex-shrink-0" />
              <div className="flex-1 mx-4 h-6 rounded-lg bg-gray-100 flex items-center px-3 gap-2">
                <span className="text-gray-400 text-xs">meubetime.com.br/app</span>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {/* Input simulado */}
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">O que vamos dominar?</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                    <p className="text-white/70 text-sm font-medium">
                      Matemática — Funções, equações e geometria analítica para o ENEM
                      <span className="inline-block w-0.5 h-4 bg-[#F26207] ml-1 animate-pulse align-middle" />
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#F26207] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Resultado simulado */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F26207]/20 border border-[#F26207]/30 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-[#F26207]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">📐 Plano de Matemática para o ENEM</p>
                    <p className="text-xs text-white/40">5 dias · 3 tópicos/dia · Nível: Ensino Médio</p>
                  </div>
                  <span className="ml-auto text-xs font-black px-2 py-1 rounded-lg bg-[#F26207]/20 border border-[#F26207]/30 text-[#F5A07A]">✓ Gerado</span>
                </div>

                {[
                  {
                    dia: "Dia 1",
                    titulo: "Funções do 1º e 2º grau",
                    topicos: ["Definição e gráfico de função", "Zeros e vértice da parábola", "Aplicações práticas no ENEM"],
                    cor: "from-violet-500/20 to-purple-500/10",
                    border: "border-violet-500/20",
                    tag: "violet",
                  },
                  {
                    dia: "Dia 2",
                    titulo: "Geometria Analítica",
                    topicos: ["Distância entre pontos", "Equação da reta e coeficientes", "Circunferência e tangente"],
                    cor: "from-blue-500/20 to-cyan-500/10",
                    border: "border-blue-500/20",
                    tag: "blue",
                  },
                  {
                    dia: "Dia 3",
                    titulo: "Progressões e Sequências",
                    topicos: ["PA: fórmula do termo geral", "PG: razão e aplicações", "Exercícios estilo ENEM comentados"],
                    cor: "from-[#F26207]/10 to-[#F5803A]/5",
                    border: "border-[#F26207]/20",
                    tag: "emerald",
                  },
                ].map((day, i) => (
                  <motion.div
                    key={day.dia}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
                    className={`rounded-2xl border ${day.border} bg-gradient-to-br ${day.cor} p-4`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black text-white/40 uppercase tracking-widest">{day.dia}</p>
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400/50" />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400/20" />
                      </div>
                    </div>
                    <p className="text-sm font-black text-white mb-2">{day.titulo}</p>
                    <div className="space-y-1">
                      {day.topicos.map((t) => (
                        <div key={t} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/30 flex-shrink-0" />
                          <p className="text-xs text-white/55">{t}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}

                {/* Action row */}
                <div className="flex gap-3 pt-2">
                  <div className="flex-1 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-yellow-300 font-bold">Simulado gerado</span>
                  </div>
                  <div className="flex-1 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-blue-300 font-bold">30 flashcards</span>
                  </div>
                  <div className="flex-1 rounded-xl bg-[#F26207]/10 border border-[#F26207]/20 p-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#F26207]" />
                    <span className="text-xs text-[#F5A07A] font-bold">Resumão estratégico</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            custom={0.4}
            className="text-center mt-8"
          >
            <Button
              size="lg"
              className="bg-[#F26207] hover:bg-[#D85507] text-white font-black px-10 h-14 rounded-2xl text-base shadow-lg shadow-orange-100"
              onClick={() => navigate("/app")}
            >
              Gerar meu plano agora — é grátis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="text-gray-400 text-sm mt-3">Sem cadastro obrigatório. Plano em 30 segundos.</p>
          </motion.div>
        </div>
      </section>

      {/* ── DIAGNÓSTICO RÁPIDO ── */}
      <section id="diagnostico" className="py-24 px-6 bg-[#F2EBE4] border-t border-[#E5D9CF]">
        <div className="max-w-2xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <span className="inline-flex items-center gap-2 text-xs font-black px-3 py-1.5 rounded-full bg-[#FFE0C8] border border-[#F5C4A0] text-[#D85507] uppercase tracking-widest mb-4">
              <Stethoscope className="w-3 h-3" /> Diagnóstico Gratuito
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-3 text-gray-900">
              4 perguntas.<br />
              <span className="text-[#F26207]">Seu plano ideal.</span>
            </h2>
            <p className="text-gray-500 text-lg">
              Descubra exatamente o que estudar — sem cadastro, sem custo.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            custom={0.1}
            className="relative rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            {/* Progress bar */}
            {!diagDone && (
              <div className="h-1 bg-gray-100">
                <motion.div
                  className="h-full bg-[#F26207]"
                  animate={{ width: `${((diagStep) / currentSteps.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            )}

            <div className="p-8 md:p-10">
              <AnimatePresence mode="wait">
                {!diagDone ? (
                  <motion.div
                    key={`step-${diagStep}`}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Step header */}
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const StepIcon = currentSteps[diagStep].icon;
                          return (
                            <div className="w-10 h-10 rounded-xl bg-[#FFF2EA] border border-[#F5C4A0] flex items-center justify-center">
                              <StepIcon className="w-5 h-5 text-[#F26207]" />
                            </div>
                          );
                        })()}
                        <div>
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                            Pergunta {diagStep + 1} de {currentSteps.length}
                          </p>
                          <h3 className="text-xl font-black text-gray-900">{currentSteps[diagStep].question}</h3>
                        </div>
                      </div>
                      {diagStep > 0 && (
                        <button
                          onClick={() => setDiagStep(diagStep - 1)}
                          className="text-gray-300 hover:text-gray-600 transition-colors p-1"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {/* Options */}
                    <div className={`grid gap-3 ${currentSteps[diagStep].options.length > 4 ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}>
                      {currentSteps[diagStep].options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleDiagOption(opt.value)}
                          className="group text-left p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-[#FFF2EA] hover:border-[#F5A07A] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{opt.emoji}</span>
                            <div>
                              <p className="font-bold text-gray-900 group-hover:text-[#D85507] transition-colors">{opt.label}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#F26207] ml-auto transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : diagResult ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-[#F26207] flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#F26207] uppercase tracking-widest">Diagnóstico completo</p>
                        <h3 className="text-lg font-black leading-snug text-gray-900">{diagResult.title}</h3>
                      </div>
                    </div>

                    {/* Alert */}
                    <div className={`rounded-xl px-4 py-3 mb-5 text-sm font-semibold border ${
                      diagResult.alertColor === "red" ? "bg-red-50 border-red-200 text-red-700" :
                      diagResult.alertColor === "yellow" ? "bg-amber-50 border-amber-200 text-amber-700" :
                      "bg-[#FFF2EA] border-[#F5C4A0] text-[#D85507]"
                    }`}>
                      {diagResult.alertMsg}
                    </div>

                    {/* Strategy bullets */}
                    <div className="space-y-3 mb-6">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Estratégia personalizada</p>
                      {diagResult.bullets.map((b, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                          <div className="w-5 h-5 rounded-full bg-[#FFE0C8] border border-[#F5C4A0] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[#D85507] text-xs font-black">{i + 1}</span>
                          </div>
                          <p className="text-sm text-gray-600">{b}</p>
                        </div>
                      ))}
                    </div>

                    {/* What's included */}
                    <div className="flex flex-wrap gap-2 mb-8">
                      <p className="w-full text-xs font-black text-gray-400 uppercase tracking-widest mb-1">O que será gerado</p>
                      {diagResult.includes.map((inc) => (
                        <span key={inc} className="text-xs px-3 py-1.5 rounded-xl bg-[#FFF2EA] border border-[#F5C4A0] text-[#D85507] font-bold flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3" /> {inc}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        size="lg"
                        className="flex-1 bg-[#F26207] hover:bg-[#D85507] text-white font-black py-6 rounded-2xl text-base"
                        onClick={handleDiagStart}
                      >
                        <FlameKindling className="w-5 h-5 mr-2" />
                        Gerar Meu Plano Grátis →
                      </Button>
                      <button
                        onClick={() => { setDiagStep(0); setDiagAnswers({}); setDiagDone(false); }}
                        className="text-gray-400 hover:text-gray-700 text-sm font-medium transition-colors py-2 sm:px-4"
                      >
                        Refazer
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            custom={0.2}
            className="text-center text-gray-400 text-xs mt-4"
          >
            Sem cadastro obrigatório • Resultado imediato • 100% gratuito
          </motion.p>
        </div>
      </section>

      {/* ── PARA QUEM É ── */}
      <section className="py-24 px-6 bg-[#F9F5F1] border-t border-[#E5D9CF]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-[#F26207] font-semibold text-sm uppercase tracking-widest mb-3">Para quem é</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-gray-900">
              Feito para quem quer passar
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Independente do seu objetivo, o StudyAI se adapta ao seu conteúdo, ritmo e nível.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {personas.map((p, i) => {
              const accentColors = [
                { border: "border-[#F5C4A0]", light: "bg-[#FFF2EA]", icon: "text-[#F26207]", badge: "bg-[#FFE0C8] text-[#D85507] border-[#F5C4A0]", check: "text-[#F26207]" },
                { border: "border-blue-200", light: "bg-blue-50", icon: "text-blue-600", badge: "bg-blue-100 text-blue-700 border-blue-200", check: "text-blue-500" },
                { border: "border-[#F5C4A0]", light: "bg-[#FFF2EA]", icon: "text-[#F26207]", badge: "bg-[#FFD0B3] text-[#D85507] border-[#F5C4A0]", check: "text-[#F26207]" },
              ];
              const ac = accentColors[i];
              return (
                <motion.div
                  key={p.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  custom={i * 0.2}
                  className={`relative rounded-2xl border ${ac.border} bg-white p-7 flex flex-col gap-5 hover:shadow-md transition-all duration-200`}
                >
                  <div>
                    <span className={`inline-flex items-center text-[11px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest mb-4 ${ac.badge}`}>
                      {p.badge}
                    </span>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl ${ac.light} flex items-center justify-center`}>
                        <p.icon className={`w-5 h-5 ${ac.icon}`} />
                      </div>
                      <h3 className="font-black text-xl text-gray-900">{p.title}</h3>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed">{p.desc}</p>
                  </div>
                  <ul className="space-y-2 mt-auto">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${ac.check}`} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="recursos" className="py-24 px-6 bg-[#F2EBE4] border-t border-[#E5D9CF]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-[#F26207] font-semibold text-sm uppercase tracking-widest mb-3">Recursos</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-gray-900">
              Tudo que você precisa para passar
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
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
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESUMÃO ESTRATÉGICO SPOTLIGHT ── */}
      <section className="py-20 px-6 bg-[#F9F5F1] border-t border-[#E5D9CF]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden border border-[#F5C4A0] bg-[#FFF2EA] p-8 sm:p-14 flex flex-col md:flex-row items-center gap-10"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#FFE0C8] rounded-full pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#FFD0B3] rounded-full pointer-events-none" />

            {/* Left: content */}
            <div className="relative z-10 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFE0C8] border border-[#F5C4A0] text-[#D85507] text-xs font-bold uppercase tracking-widest mb-5">
                <span className="text-sm">🤖</span>
                IAs ensinando como seus melhores professores
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-5 leading-tight text-gray-900">
                Resumão Estratégico<br />
                <span className="text-[#F26207]">
                  que realmente faz diferença
                </span>
              </h2>
              <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6 max-w-lg">
                Antes de começar os exercícios, o GPT-4o analisa seu conteúdo e gera um guia cirúrgico: os conceitos mais cobrados, as armadilhas clássicas, técnicas de memorização personalizadas e a estratégia exata de estudo para <strong className="text-gray-900">aquela matéria específica</strong>.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Conceitos-chave com técnica de memorização para cada um",
                  "O que mais cai na prova + armadilhas que derrubam estudantes",
                  "Conexões entre os tópicos para entender, não decorar",
                  "Estratégia de estudo personalizada para a matéria",
                  "Dica final que separa nota 8 de nota 10",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-[#F26207] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => navigate("/app")}
                className="bg-[#F26207] hover:bg-[#D85507] text-white font-bold px-7 py-5 rounded-2xl shadow-lg shadow-orange-100 text-base"
              >
                <Brain className="w-4 h-4 mr-2" />
                Gerar meu resumão estratégico
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Right: mockup */}
            <div className="relative z-10 flex-shrink-0 w-full md:w-72 space-y-3">
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-[#FFF2EA] flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-[#F26207]" />
                  </div>
                  <div>
                    <p className="text-gray-800 text-xs font-black">Resumão Estratégico</p>
                    <p className="text-gray-400 text-[10px]">Gerado por GPT-4o</p>
                  </div>
                  <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#FFF2EA] text-[#D85507] border border-[#F5C4A0] uppercase">IA</span>
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
                      <p className="text-gray-700 text-[11px] font-bold">{item.label}</p>
                      <p className="text-gray-400 text-[10px] leading-snug">{item.preview}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── REDAÇÃO SPOTLIGHT ── */}
      <section className="py-20 px-6 bg-[#F2EBE4] border-t border-[#E5D9CF]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden border border-indigo-100 bg-indigo-50 p-8 sm:p-14 flex flex-col md:flex-row items-center gap-10"
          >
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-100 rounded-full pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-violet-100 rounded-full pointer-events-none" />

            {/* Left: content */}
            <div className="relative z-10 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-widest mb-5">
                <Sparkles className="w-3 h-3" />
                Novidade exclusiva
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-5 leading-tight text-gray-900">
                Corretor de Redação<br />
                <span className="text-indigo-600">
                  Nota 0–1000 em segundos
                </span>
              </h2>
              <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6 max-w-lg">
                Cole sua redação e o GPT-4o avalia <strong className="text-gray-900">todas as 5 competências ENEM</strong> com nota individual, feedback detalhado, pontos fortes e o que melhorar. Como ter um corretor especialista disponível 24h.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Avaliação nas 5 competências (C1 a C5)",
                  "Nota estimada de 0 a 1000 pontos",
                  "Feedback específico por parágrafo e competência",
                  "Sugestões concretas para aumentar a nota",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => navigate("/redacao")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-7 py-5 rounded-2xl shadow-lg shadow-indigo-100 text-base"
              >
                <PenLine className="w-4 h-4 mr-2" />
                Corrigir minha redação grátis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Right: score mockup */}
            <div className="relative z-10 flex-shrink-0 w-full md:w-72">
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 space-y-4">
                <div className="text-center">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Sua nota estimada</p>
                  <p className="text-6xl font-black text-gray-900">840</p>
                  <p className="text-gray-400 text-sm">de 1000 pontos</p>
                  <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200">
                    <Star className="w-3 h-3 text-indigo-500" />
                    <span className="text-indigo-600 text-xs font-bold">Muito Bom</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "C1 Norma Culta", nota: 160, color: "bg-indigo-500" },
                    { label: "C2 Repertório", nota: 160, color: "bg-blue-500" },
                    { label: "C3 Argumentação", nota: 200, color: "bg-[#F26207]" },
                    { label: "C4 Coesão", nota: 160, color: "bg-amber-500" },
                    { label: "C5 Proposta", nota: 160, color: "bg-rose-500" },
                  ].map((c) => (
                    <div key={c.label}>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>{c.label}</span>
                        <span className="font-bold text-gray-600">{c.nota}/200</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
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
      <section className="py-20 px-6 bg-[#F9F5F1] border-t border-[#E5D9CF]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden border border-[#F5C4A0] bg-[#FFF2EA] p-8 sm:p-14 flex flex-col md:flex-row-reverse items-center gap-10"
          >
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#FFE0C8] rounded-full pointer-events-none" />
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#FFD0B3] rounded-full pointer-events-none" />

            {/* Right: content */}
            <div className="relative z-10 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFE0C8] border border-[#F5C4A0] text-[#D85507] text-xs font-bold uppercase tracking-widest mb-5">
                <TrendingUp className="w-3 h-3" />
                Inteligência de aprendizado
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-5 leading-tight text-gray-900">
                Saiba exatamente<br />
                <span className="text-[#F26207]">
                  onde focar seu tempo
                </span>
              </h2>
              <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6 max-w-lg">
                O <strong className="text-gray-900">Mapa de Calor</strong> analisa toda a sua trajetória na plataforma — simulados, flashcards, frequência — e mostra em cores quais matérias estão fortes e quais precisam de atenção. Nada mais de estudar o que você já sabe.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Grade visual colorida por nível de domínio (verde = forte, vermelho = crítico)",
                  "Tendência de melhora ou queda por matéria",
                  "Resumo automático: pontos fortes × áreas para focar",
                  "Atualizado em tempo real a cada simulado ou flashcard",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-[#F26207] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => navigate("/mapa")}
                className="bg-[#F26207] hover:bg-[#D85507] text-white font-bold px-7 py-5 rounded-2xl shadow-lg shadow-orange-100 text-base"
              >
                <Map className="w-4 h-4 mr-2" />
                Ver meu mapa de desempenho
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Left: heat grid mockup */}
            <div className="relative z-10 flex-shrink-0 w-full md:w-64">
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-2.5">
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-3">Mapa de Calor</p>
                {[
                  { label: "Matemática", pct: 87, color: "bg-gradient-to-r from-[#F26207] to-[#F5803A]" },
                  { label: "Português", pct: 72, color: "bg-gradient-to-r from-[#F5803A] to-[#F26207]" },
                  { label: "História", pct: 55, color: "bg-gradient-to-r from-amber-400 to-yellow-400" },
                  { label: "Química", pct: 38, color: "bg-gradient-to-r from-orange-400 to-amber-500" },
                  { label: "Biologia", pct: 22, color: "bg-gradient-to-r from-red-500 to-rose-600" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-600 font-semibold">{item.label}</span>
                      <span className="text-gray-400 font-bold">{item.pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[10px] text-gray-400">Foco: Biologia, Química</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SIMULADO ADAPTATIVO SPOTLIGHT ── */}
      <section className="py-20 px-6 bg-[#F2EBE4] border-t border-[#E5D9CF]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden border border-purple-100 bg-purple-50 p-8 sm:p-14 flex flex-col md:flex-row items-center gap-10"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-100 rounded-full pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-100 rounded-full pointer-events-none" />

            {/* Left: content */}
            <div className="relative z-10 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold uppercase tracking-widest mb-5">
                <Zap className="w-3 h-3" />
                IA Adaptativa
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-5 leading-tight text-gray-900">
                O simulado que<br />
                <span className="text-purple-600">
                  aprende com você
                </span>
              </h2>
              <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6 max-w-lg">
                Diferente do simulado comum, o <strong className="text-gray-900">Simulado Adaptativo</strong> lê seu histórico de desempenho, identifica suas lacunas reais e gera questões cirúrgicas focadas exatamente no que você mais precisa revisar. Quanto mais você usa, mais certeiro ele fica.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Análise automática do seu histórico de acertos e erros",
                  "Questões geradas especificamente para suas fraquezas",
                  "Funciona mesmo sem histórico — cria sua linha de base",
                  "Painel de evolução: compare sua nota atual com a média anterior",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-purple-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => navigate("/app")}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-7 py-5 rounded-2xl shadow-lg shadow-purple-100 text-base"
              >
                <Target className="w-4 h-4 mr-2" />
                Experimentar simulado adaptativo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Right: diagnostic mockup */}
            <div className="relative z-10 flex-shrink-0 w-full md:w-72 space-y-3">
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-purple-600" />
                  </div>
                  <p className="text-gray-800 text-xs font-black">Análise Adaptativa</p>
                  <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 uppercase">⚡ Personalizado</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Média ant.", value: "54%", color: "text-gray-500" },
                    { label: "Agora", value: "73%", color: "text-[#F26207]" },
                    { label: "Tendência", value: "📈", color: "text-[#F26207]" },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
                      <p className={`font-black text-base ${s.color}`}>{s.value}</p>
                      <p className="text-gray-400 text-[9px] font-semibold leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[#F26207] text-[10px] font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +19pp acima da sua média! Continue assim 🎉
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4">
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2.5">Foco das questões</p>
                <div className="space-y-1.5">
                  {[
                    { label: "Equações de 2º grau", lacuna: "Alta" },
                    { label: "Progressão Geométrica", lacuna: "Média" },
                    { label: "Trigonometria básica", lacuna: "Alta" },
                  ].map((t) => (
                    <div key={t.label} className="flex items-center justify-between">
                      <span className="text-gray-500 text-[11px] font-medium">{t.label}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${t.lacuna === "Alta" ? "bg-red-50 text-red-500 border border-red-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}>
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
      <section className="py-24 px-6 bg-[#F9F5F1] border-t border-[#E5D9CF]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-[#F26207] font-semibold text-sm uppercase tracking-widest mb-3">Comparativo</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-gray-900">
              StudyAI vs método tradicional
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Veja por que estudar com IA é diferente de tudo que você já usou.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            custom={0.3}
            className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
          >
            {/* Header row */}
            <div className="grid grid-cols-[1fr_1fr_1fr] bg-gray-50 border-b border-gray-200 text-sm font-black uppercase tracking-wide">
              <div className="px-5 py-4 text-gray-400">Aspecto</div>
              <div className="px-5 py-4 text-gray-500 border-l border-gray-200 flex items-center gap-2">
                <X className="w-4 h-4 text-red-400" /> Método Tradicional
              </div>
              <div className="px-5 py-4 border-l border-gray-200 flex items-center gap-2 text-[#D85507]">
                <span className="w-2 h-2 rounded-full bg-[#F26207] inline-block" />
                StudyAI
              </div>
            </div>

            {comparativo.map((row, i) => (
              <div
                key={row.aspecto}
                className={`grid grid-cols-[1fr_1fr_1fr] text-sm border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-[#F9F5F1]" : "bg-[#F5EFE9]/50"}`}
              >
                <div className="px-5 py-4 font-semibold text-gray-700">{row.aspecto}</div>
                <div className="px-5 py-4 text-gray-400 border-l border-gray-100 flex items-start gap-2">
                  <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  {row.tradicional}
                </div>
                <div className="px-5 py-4 text-[#D85507] border-l border-gray-100 flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#F26207] shrink-0 mt-0.5" />
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
              className="bg-[#F26207] hover:bg-[#D85507] text-white text-base px-8 h-12 shadow-md shadow-orange-100"
              onClick={() => navigate("/app")}
            >
              Experimentar grátis
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" className="py-24 px-6 bg-[#F2EBE4] border-t border-[#E5D9CF]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-[#F26207] font-semibold text-sm uppercase tracking-widest mb-3">Como funciona</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-gray-900">
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
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-gray-200 to-transparent" />
                )}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFF2EA] border border-[#F5C4A0] mb-5">
                  <s.icon className="w-7 h-7 text-[#F26207]" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#F26207] text-white text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-bold text-xl mb-3 text-gray-900">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6 bg-[#F9F5F1] border-t border-[#E5D9CF]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-[#F26207] font-semibold text-sm uppercase tracking-widest mb-3">Resultados reais</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-gray-900">
              Quem usou, passou.
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Cada depoimento tem um antes e um depois. Esses são os números reais.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i * 0.15}
                className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col hover:shadow-md hover:border-[#F5C4A0] transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-red-400 font-bold line-through decoration-red-300">
                    {t.before}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-[#FFF2EA] border border-[#F5C4A0] text-[#D85507] font-black">
                    {t.after}
                  </span>
                  <span className="ml-auto text-xl">{t.emoji}</span>
                </div>

                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, si) => (
                    <Star key={si} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-5 flex-1">"{t.text}"</p>
                <div className="pt-4 border-t border-gray-100">
                  <p className="font-bold text-sm text-gray-900">{t.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precos" className="py-24 px-6 bg-[#F2EBE4] border-t border-[#E5D9CF]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-[#F26207] font-semibold text-sm uppercase tracking-widest mb-3">Preços</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-gray-900">
              Simples e transparente
            </h2>
            <p className="text-gray-500 text-lg">Comece grátis. Escale conforme evolui.</p>
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
                    ? "border-[#F5A07A] bg-white shadow-xl shadow-orange-100"
                    : "border-gray-200 bg-[#F9F5F1]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#F26207] text-white text-xs font-bold">
                    Mais popular
                  </div>
                )}
                <p className="text-gray-400 text-sm mb-1">{plan.desc}</p>
                <h3 className="font-black text-2xl mb-1 text-gray-900">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-[#F26207] shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.highlight
                      ? "bg-[#F26207] hover:bg-[#D85507] text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
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
      <section id="lista-espera" className="py-24 px-6 bg-[#F9F5F1] border-t border-[#E5D9CF]">
        <div className="max-w-2xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF2EA] border border-[#F5C4A0] text-[#D85507] text-sm font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Lançamento em breve
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-gray-900">
              Entre na lista de espera
            </h2>
            <p className="text-gray-500 text-lg">
              Seja um dos primeiros a saber quando o plano Pro for lançado. Quem entrar na lista ganha <span className="text-[#F26207] font-semibold">30 dias grátis</span>.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            custom={0.5}
            className="bg-[#EDE4DA] border border-[#E5D5C8] rounded-2xl p-6 sm:p-8"
          >
            {wlStatus === "success" ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FFF2EA] border border-[#F5C4A0] mb-4">
                  <CheckCircle className="w-8 h-8 text-[#F26207]" />
                </div>
                <h3 className="text-xl font-black mb-2 text-gray-900">Você está na lista! 🎉</h3>
                <p className="text-gray-500">{wlMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                      Seu nome
                    </label>
                    <input
                      type="text"
                      placeholder="João Silva"
                      value={wlName}
                      onChange={(e) => setWlName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF5F0] border border-[#E5D5C8] text-gray-900 placeholder-[#A89990] text-sm focus:outline-none focus:ring-2 focus:ring-[#F26207]/40 focus:border-[#F26207] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                      Seu email <span className="text-[#F26207]">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="joao@email.com"
                      value={wlEmail}
                      onChange={(e) => setWlEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF5F0] border border-[#E5D5C8] text-gray-900 placeholder-[#A89990] text-sm focus:outline-none focus:ring-2 focus:ring-[#F26207]/40 focus:border-[#F26207] transition-all"
                    />
                  </div>
                </div>

                {wlStatus === "error" && (
                  <p className="text-red-500 text-sm">{wlMessage}</p>
                )}

                <Button
                  type="submit"
                  disabled={wlStatus === "loading"}
                  className="w-full bg-[#F26207] hover:bg-[#D85507] text-white h-12 text-base font-bold disabled:opacity-60"
                >
                  {wlStatus === "loading" ? "Cadastrando..." : "Quero 30 dias grátis →"}
                </Button>

                <p className="text-center text-gray-400 text-xs">
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
            className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-gray-400"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#F26207]" />
              30 dias grátis ao entrar
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#F26207]" />
              Sem cartão de crédito
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#F26207]" />
              Cancele quando quiser
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-6 bg-[#111111] relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-[#F26207] rounded-full pointer-events-none opacity-20" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-[#F5A07A] rounded-full pointer-events-none opacity-15" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <div className="text-5xl mb-6">🎯</div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight text-white">
              Sua aprovação<br />
              começa agora.
            </h2>
            <p className="text-[#FFD8B8] text-lg mb-4 max-w-xl mx-auto">
              Cada dia que passa sem um método certo é um dia jogado fora. O plano cirúrgico está a 30 segundos de distância.
            </p>
            <p className="text-[#FFBD96] text-base mb-10 max-w-lg mx-auto">
              Sem cadastro obrigatório para começar. Sem cartão de crédito.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-[#D85507] hover:bg-[#FFF2EA] font-black text-lg px-12 h-16 rounded-2xl shadow-xl"
                onClick={() => navigate("/app")}
              >
                Quero meu plano agora →
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-[#F5A07A] text-white hover:bg-[#F26207] text-base px-8 h-16 rounded-2xl"
                onClick={() => document.getElementById("diagnostico")?.scrollIntoView({ behavior: "smooth" })}
              >
                Fazer diagnóstico grátis
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 justify-center mt-10">
              {[
                { icon: "⚡", text: "Plano em 30 segundos" },
                { icon: "🔒", text: "Sem cartão de crédito" },
                { icon: "📱", text: "Funciona no celular" },
                { icon: "🤖", text: "Tutor IA disponível 24h" },
                { icon: "🇧🇷", text: "Feito para o Brasil" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 text-[#FFD8B8] text-sm">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#E5D5C8] bg-[#F2EBE4] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#F26207] flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">StudyAI</span>
          </div>

          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} StudyAI · Todos os direitos reservados
          </p>

          <div className="flex items-center gap-5 text-sm text-gray-400">
            <a href="#" className="hover:text-gray-700 transition-colors">Termos</a>
            <a href="#" className="hover:text-gray-700 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-gray-700 transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
