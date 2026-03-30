import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  GraduationCap, 
  BookOpen, 
  Clock, 
  AlertTriangle,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Trophy,
  ChevronDown,
  Star,
  Target,
  Zap,
  Rocket,
  Eye,
  EyeOff,
  Brain,
  Dumbbell,
  Save,
  BarChart2,
  Home as HomeIcon,
  PenLine,
  Map,
  Layers,
  XCircle,
} from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { TutorChat } from "@/components/TutorChat";
import { SimuladoButton, SimuladoAdaptativoButton } from "@/components/Simulado";
import { FlashcardsButton } from "@/components/Flashcards";
import { PomodoroWidget } from "@/components/Pomodoro";
import { UserMenu } from "@/components/UserMenu";
import { useGenerateStudyPlan, StudyPlan, StudyPlanTopic } from "@/hooks/use-study-plan";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

const GRADES = [
  "1º Ano - Fundamental",
  "2º Ano - Fundamental",
  "3º Ano - Fundamental",
  "4º Ano - Fundamental",
  "5º Ano - Fundamental",
  "6º Ano - Fundamental",
  "7º Ano - Fundamental",
  "8º Ano - Fundamental",
  "9º Ano - Fundamental",
  "1º Ano - Médio",
  "2º Ano - Médio",
  "3º Ano - Médio",
  "Faculdade / Ensino Superior",
  "Outro / Concurso / Idiomas"
];

const LOADING_MESSAGES = [
  "Analisando seu conteúdo... 🔍",
  "Mapeando conhecimentos... 🗺️",
  "Criando missões épicas... 🎮",
  "Preparando suas conquistas... 🏆",
  "Quase lá, ajustando a magia... ✨"
];

function triggerConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#8B5CF6', '#D946EF', '#F59E0B', '#10B981']
  });
}

function TopicAnswerReveal({ answer, color }: { answer: string; color: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="border-t border-primary/10">
      {revealed ? (
        <div className="px-4 py-3 space-y-2">
          <p className="text-sm text-foreground leading-relaxed">{answer}</p>
          <button
            onClick={() => setRevealed(false)}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <EyeOff className="w-3 h-3" /> Ocultar resposta
          </button>
        </div>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="w-full px-4 py-2.5 flex items-center gap-2 text-sm font-semibold transition-colors hover:bg-primary/5"
          style={{ color }}
        >
          <Eye className="w-4 h-4" /> Ver resposta
        </button>
      )}
    </div>
  );
}

function ExerciseCard({ exercise, color, index }: { exercise: { numero: number; pergunta: string; gabarito: string }; color: string; index: number }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-2xl border-2 border-border bg-white overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {index + 1}
        </div>
        <p className="text-base font-medium text-foreground pt-0.5">{exercise.pergunta}</p>
      </div>
      <div className="border-t border-border">
        {revealed ? (
          <div className="p-4 bg-emerald-50 space-y-2">
            <p className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Gabarito
            </p>
            <p className="text-sm text-emerald-900 leading-relaxed">{exercise.gabarito}</p>
            <button
              onClick={() => setRevealed(false)}
              className="text-xs text-emerald-600 flex items-center gap-1 hover:text-emerald-800 transition-colors"
            >
              <EyeOff className="w-3 h-3" /> Ocultar gabarito
            </button>
          </div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="w-full px-4 py-3 flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            <Eye className="w-4 h-4" /> Ver gabarito
          </button>
        )}
      </div>
    </div>
  );
}

function ChallengeCard({ desafio, color }: { desafio: { enunciado: string; gabarito: string } | string; color: string }) {
  const [revealed, setRevealed] = useState(false);
  const isObj = typeof desafio === "object" && desafio !== null;
  const enunciado = isObj ? (desafio as { enunciado: string; gabarito: string }).enunciado : (desafio as string);
  const gabarito = isObj ? (desafio as { enunciado: string; gabarito: string }).gabarito : null;

  return (
    <div className="bg-gray-900 text-white rounded-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 blur-[50px] rounded-full pointer-events-none"></div>
      <div className="p-6 relative z-10">
        <h4 className="font-black text-red-400 mb-3 uppercase tracking-widest text-sm flex items-center gap-2">
          <Zap className="w-4 h-4" /> Desafio Bônus
        </h4>
        <p className="font-bold text-lg mb-4">{enunciado}</p>
        {gabarito && (
          <>
            {revealed ? (
              <div className="bg-white/10 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-yellow-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Solução
                </p>
                <p className="text-sm text-gray-200 leading-relaxed">{gabarito}</p>
                <button
                  onClick={() => setRevealed(false)}
                  className="text-xs text-gray-400 flex items-center gap-1 hover:text-white transition-colors"
                >
                  <EyeOff className="w-3 h-3" /> Ocultar solução
                </button>
              </div>
            ) : (
              <button
                onClick={() => setRevealed(true)}
                className="flex items-center gap-2 text-sm font-semibold text-yellow-300 hover:text-yellow-100 transition-colors"
              >
                <Eye className="w-4 h-4" /> Ver solução do desafio
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, login } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"form" | "loading" | "result">("form");
  const [formData, setFormData] = useState({
    nome: "",
    serie: "",
    tempo: "",
    dificuldades: "",
    texto: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [planResult, setPlanResult] = useState<StudyPlan | null>(null);
  const [conteudoTexto, setConteudoTexto] = useState<string>("");
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Gamification State
  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>({});
  const [earnedXp, setEarnedXp] = useState(0);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [resumaoExpanded, setResumaExpanded] = useState(true);
  const [resumaoData, setResumaData] = useState<any>(null);
  const [resumaoLoading, setResumaLoading] = useState(false);
  const exerciciosRef = useRef<HTMLDivElement>(null);

  const mutation = useGenerateStudyPlan();

  // Save plan to DB for authenticated users
  const savePlanToDB = async (plan: StudyPlan) => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch("/api/history/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          materia: plan.materia || formData.texto?.slice(0, 80) || "Matéria",
          serie: formData.serie || null,
          diasProva: plan.dias?.length || null,
          plan,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedPlanId(data.id);
      }
    } catch {
      // silent fail — saving history is non-critical
    }
  };

  useEffect(() => {
    let interval: any;
    if (step === "loading") {
      setLoadingProgress(0);
      setLoadingMsgIdx(0);
      
      interval = setInterval(() => {
        setLoadingProgress(p => {
          if (p >= 95) return 95;
          return p + Math.random() * 10;
        });
        
        setLoadingMsgIdx(idx => (idx + 1) % LOADING_MESSAGES.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [step]);

  // Load progress from local storage when plan loads
  useEffect(() => {
    if (planResult && planResult.aluno) {
      const saved = localStorage.getItem(`studyai_${planResult.aluno}_topics`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCompletedTopics(parsed);
          // calculate xp
          let xp = 0;
          planResult.dias.forEach(d => {
            d.topicos.forEach((t, i) => {
              if (parsed[`${d.numero}-${i}`]) xp += 100; // assuming 100 xp per topic
            });
          });
          setEarnedXp(xp);
        } catch (e) { }
      }
    }
  }, [planResult]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrorMsg(null);
  };

  const handleSubmit = async () => {
    if (files.length === 0 && !formData.texto.trim()) {
      setErrorMsg("Por favor, envie uma imagem do material ou digite o conteúdo.");
      return;
    }

    setStep("loading");
    setErrorMsg(null);

    const submitData = new FormData();
    if (formData.nome) submitData.append("nome", formData.nome);
    if (formData.serie) submitData.append("serie", formData.serie);
    if (formData.tempo) submitData.append("tempo", formData.tempo);
    if (formData.dificuldades) submitData.append("dificuldades", formData.dificuldades);
    if (formData.texto) submitData.append("texto", formData.texto);
    files.forEach((f) => submitData.append("files", f));

    mutation.mutate(submitData, {
      onSuccess: (data) => {
        if (data.plano) {
          setPlanResult(data.plano);
          setConteudoTexto(data.conteudoTexto || "");
          setStep("result");
          setExpandedDay(data.plano.dias?.[0]?.numero || 1);
          setCompletedTopics({});
          setEarnedXp(0);
          savePlanToDB(data.plano);
          generateResumo(data.plano, data.conteudoTexto || "");
        } else {
          setErrorMsg("Não foi possível gerar o plano. Tente novamente.");
          setStep("form");
        }
      },
      onError: (err) => {
        setErrorMsg(err.message || "Erro de conexão. Tente novamente.");
        setStep("form");
      }
    });
  };

  const handleReset = () => {
    setFiles([]);
    setFormData(prev => ({ ...prev, texto: "" }));
    setPlanResult(null);
    setConteudoTexto("");
    setSavedPlanId(null);
    setErrorMsg(null);
    setStep("form");
    setCompletedTopics({});
    setEarnedXp(0);
    setResumaExpanded(true);
    setResumaData(null);
    setResumaLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generateResumo = async (plan: StudyPlan, conteudo: string) => {
    setResumaLoading(true);
    setResumaData(null);
    try {
      const planoResumo = [
        plan.resumoDoConteudo,
        ...plan.dias.map(d =>
          `Dia ${d.numero} – ${d.titulo}: ` +
          d.topicos.map(t => typeof t === "object" ? (t as any).nome : t).join(", ")
        ),
        ...(plan.dicasGerais ?? []),
      ].join("\n");

      const res = await fetch("/api/resumao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materia: plan.materia,
          serie: formData.serie || undefined,
          conteudoTexto: conteudo,
          planoResumo,
        }),
      });
      if (!res.ok) throw new Error("Erro na API");
      const data = await res.json();
      setResumaData(data.resumao);
    } catch {
      setResumaData(null);
    } finally {
      setResumaLoading(false);
    }
  };

  const toggleTopic = (dayNum: number, topicIdx: number) => {
    const key = `${dayNum}-${topicIdx}`;
    setCompletedTopics(prev => {
      const isCompleted = !prev[key];
      const next = { ...prev, [key]: isCompleted };
      
      if (planResult) {
        localStorage.setItem(`studyai_${planResult.aluno}_topics`, JSON.stringify(next));
      }

      if (isCompleted) {
        setEarnedXp(x => x + 100);
        triggerConfetti();
      } else {
        setEarnedXp(x => Math.max(0, x - 100));
      }

      return next;
    });
  };

  const totalTopics = planResult?.dias.reduce((acc, d) => acc + d.topicos.length, 0) || 1;
  const completedCount = Object.values(completedTopics).filter(Boolean).length;
  const progressPercent = Math.min(100, Math.round((completedCount / totalTopics) * 100));
  const isAllComplete = progressPercent === 100;

  useEffect(() => {
    if (isAllComplete && progressPercent > 0) {
      setTimeout(() => {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.3 } });
      }, 500);
    }
  }, [isAllComplete, progressPercent]);

  return (
    <div className="min-h-screen pb-20 pt-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center overflow-x-hidden relative">
      {/* Background Animated Elements */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Floating top-right user menu */}
      <div className="fixed top-3 right-3 z-40 flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-2xl bg-white border-2 border-gray-200 hover:border-gray-400 text-gray-600 font-bold text-sm shadow-sm hover:shadow-md transition-all"
          title="Início"
        >
          <HomeIcon className="w-4 h-4 text-gray-500" />
          <span className="hidden sm:inline">Início</span>
        </button>
        <button
          onClick={() => navigate("/mapa")}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-2xl bg-white border-2 border-emerald-200 hover:border-emerald-400 text-emerald-600 font-bold text-sm shadow-sm hover:shadow-md transition-all"
          title="Mapa de Desempenho"
        >
          <Map className="w-4 h-4 text-emerald-500" />
          <span className="hidden sm:inline">Mapa</span>
        </button>
        <button
          onClick={() => navigate("/redacao")}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-2xl bg-white border-2 border-indigo-200 hover:border-indigo-400 text-indigo-600 font-bold text-sm shadow-sm hover:shadow-md transition-all"
          title="Corretor de Redação"
        >
          <PenLine className="w-4 h-4 text-indigo-500" />
          <span className="hidden sm:inline">Redação</span>
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-2xl bg-white border-2 border-violet-200 hover:border-violet-400 text-violet-600 font-bold text-sm shadow-sm hover:shadow-md transition-all"
          title="Dashboard"
        >
          <BarChart2 className="w-4 h-4 text-violet-500" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        <button
          onClick={() => navigate("/ranking")}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-2xl bg-white border-2 border-amber-200 hover:border-amber-400 text-amber-600 font-bold text-sm shadow-sm hover:shadow-md transition-all"
          title="Ranking"
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="hidden sm:inline">Ranking</span>
        </button>
        <UserMenu />
      </div>

      {/* Login banner after plan is generated (unauthenticated) */}
      <AnimatePresence>
        {step === "result" && !isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-30 bg-white border border-primary/20 shadow-lg shadow-primary/10 rounded-2xl px-5 py-3 flex items-center gap-3 max-w-sm"
          >
            <Save className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-sm font-semibold text-foreground">
              Entre para salvar seu histórico de estudos
            </p>
            <button
              onClick={login}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Entrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved indicator */}
      <AnimatePresence>
        {savedPlanId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-30 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-emerald-700"
          >
            <CheckCircle2 className="w-4 h-4" />
            <p className="text-sm font-bold">Plano salvo no seu histórico!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      {step === "form" && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center justify-center p-4 bg-white shadow-xl shadow-primary/10 rounded-3xl mb-6 border border-primary/10 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-accent/10 rounded-3xl animate-spin-slow"></div>
            <GraduationCap className="w-12 h-12 text-primary relative z-10" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-foreground mb-4 tracking-tight">
            Crie seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-pink-500 animate-gradient-x">Plano Mágico</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium">
            Transforme estudos chatos em missões épicas com nossa IA gamificada.
          </p>
        </motion.div>
      )}

      {/* Main Content Area */}
      <div className={cn("w-full relative", step === "result" ? "max-w-5xl" : "max-w-3xl")}>
        <AnimatePresence mode="wait">
          
          {/* STEP 1: FORM */}
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
              className="bg-white/90 backdrop-blur-2xl border border-white rounded-[2.5rem] p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(139,92,246,0.15)]"
            >
              
              {errorMsg && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3 text-destructive">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold">{errorMsg}</p>
                </div>
              )}

              <div className="space-y-10">
                {/* Section: Profile */}
                <section>
                  <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-foreground font-display">
                    <span className="bg-primary/10 text-primary p-2.5 rounded-2xl"><Sparkles className="w-6 h-6" /></span>
                    Quem é o aventureiro?
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground ml-1">Nickname / Nome</label>
                      <input
                        type="text"
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        placeholder="Ex: João Silva"
                        className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-2 border-transparent focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(139,92,246,0.1)] transition-all outline-none font-medium"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground ml-1">Nível atual (Série)</label>
                      <select
                        name="serie"
                        value={formData.serie}
                        onChange={handleInputChange}
                        className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-2 border-transparent focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(139,92,246,0.1)] transition-all outline-none text-foreground appearance-none font-medium cursor-pointer"
                      >
                        <option value="">Escolha seu nível...</option>
                        {GRADES.map(grade => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground flex items-center gap-2 ml-1">
                        <Clock className="w-4 h-4 text-primary" /> Tempo por dia
                      </label>
                      <select
                        name="tempo"
                        value={formData.tempo}
                        onChange={handleInputChange}
                        className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-2 border-transparent focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(139,92,246,0.1)] transition-all outline-none text-foreground appearance-none font-medium cursor-pointer"
                      >
                        <option value="">Quanto tempo você tem?</option>
                        <option value="30 minutos por dia">30 min/dia — plano rápido (3 dias)</option>
                        <option value="1 hora por dia">1 hora/dia — plano compacto (4 dias)</option>
                        <option value="1 hora e meia por dia">1h30/dia — plano padrão (5 dias)</option>
                        <option value="2 horas por dia">2 horas/dia — plano completo (6 dias)</option>
                        <option value="3 ou mais horas por dia">3h+/dia — plano intensivo (7 dias)</option>
                      </select>
                      <p className="text-xs text-muted-foreground ml-1">Define quantos dias terá seu plano</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground flex items-center gap-2 ml-1">
                        <AlertTriangle className="w-4 h-4 text-destructive" /> Dificuldades
                      </label>
                      <input
                        type="text"
                        name="dificuldades"
                        value={formData.dificuldades}
                        onChange={handleInputChange}
                        placeholder="Ex: Matemática, concentração..."
                        className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-2 border-transparent focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(139,92,246,0.1)] transition-all outline-none font-medium"
                      />
                      <p className="text-xs text-muted-foreground ml-1">O plano vai reforçar esses pontos fracos</p>
                    </div>
                  </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Section: Content */}
                <section>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground font-display">
                      <span className="bg-accent/10 text-accent p-2.5 rounded-2xl"><BookOpen className="w-6 h-6" /></span>
                      O que vamos dominar?
                    </h2>
                    <p className="text-sm text-muted-foreground mt-3 ml-1 leading-relaxed">
                      Você tem duas formas de alimentar a IA — escolha a que faz mais sentido para você:
                    </p>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3">
                        <span className="text-2xl mt-0.5">📎</span>
                        <div>
                          <p className="text-sm font-bold text-violet-800">Suba seu material</p>
                          <p className="text-xs text-violet-600 leading-relaxed mt-0.5">PDF, DOCX ou foto do caderno. A IA lê tudo e monta o plano em cima exatamente do que você vai cair na prova. <strong>Quanto mais detalhado o material, mais preciso e cirúrgico será o plano.</strong></p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 bg-pink-50 border border-pink-200 rounded-2xl px-4 py-3">
                        <span className="text-2xl mt-0.5">✍️</span>
                        <div>
                          <p className="text-sm font-bold text-pink-800">Digite o tema ou assunto</p>
                          <p className="text-xs text-pink-600 leading-relaxed mt-0.5">Sem material em mãos? Sem problema. Digite o tema, matéria ou assunto. <strong>Quanto mais específico, mais focado o plano. Quanto mais genérico, mais amplo e exploratório.</strong></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <ImageUpload 
                      selectedFiles={files} 
                      onFilesSelect={setFiles} 
                    />

                    <div className="flex items-center gap-4">
                      <div className="h-px bg-border flex-1"></div>
                      <span className="text-xs font-black text-muted-foreground uppercase tracking-widest bg-secondary px-4 py-1 rounded-full">ou escreva o tema / assunto</span>
                      <div className="h-px bg-border flex-1"></div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground flex items-center gap-2 ml-1">
                        <FileText className="w-4 h-4 text-accent" /> Tema ou Assunto
                      </label>
                      <textarea
                        name="texto"
                        value={formData.texto}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder="Ex: Funções do 2º grau para o ENEM&#10;Ex: Revolução Francesa — causas, fases e consequências&#10;Ex: Toda a matéria de química orgânica do 3º ano"
                        className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-2 border-transparent focus:border-accent focus:bg-white focus:shadow-[0_0_0_4px_rgba(217,70,239,0.1)] transition-all outline-none resize-y font-medium text-base leading-relaxed"
                      />
                      <p className="text-xs text-muted-foreground ml-1">Dica: quanto mais detalhado você descrever, mais cirúrgico e personalizado será o plano gerado</p>
                    </div>
                  </div>
                </section>

                <button
                  onClick={handleSubmit}
                  className="w-full relative overflow-hidden group px-8 py-5 rounded-2xl font-black text-white bg-gradient-to-r from-primary via-accent to-pink-500 shadow-[0_10px_40px_-10px_rgba(139,92,246,0.5)] hover:shadow-[0_20px_50px_-10px_rgba(139,92,246,0.6)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3 text-xl tracking-wide">
                    <Rocket className="w-6 h-6 group-hover:animate-bounce" />
                    INICIAR AVENTURA
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: LOADING */}
          {step === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white/80 backdrop-blur-xl border border-white rounded-[3rem] p-12 flex flex-col items-center justify-center min-h-[500px] text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay"></div>
              
              <motion.div 
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 mb-12"
              >
                <div className="text-8xl filter drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]">🚀</div>
              </motion.div>

              <h3 className="text-3xl font-black text-foreground mb-4 font-display z-10">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={loadingMsgIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent"
                  >
                    {LOADING_MESSAGES[loadingMsgIdx]}
                  </motion.span>
                </AnimatePresence>
              </h3>
              
              <div className="w-full max-w-md bg-secondary rounded-full h-4 mb-2 overflow-hidden z-10 border border-black/5 p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-primary via-accent to-pink-500 rounded-full transition-all duration-300 ease-out relative"
                  style={{ width: `${loadingProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
              <p className="text-sm font-bold text-muted-foreground z-10">{Math.round(loadingProgress)}% processando magia</p>
            </motion.div>
          )}

          {/* STEP 3: RESULT */}
          {step === "result" && planResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full space-y-8"
              style={{ '--theme-color': planResult.cor || '#8B5CF6' } as React.CSSProperties}
            >
              {/* Header Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border-2 border-transparent hover:border-border shadow-sm hover:shadow-md text-foreground font-bold transition-all w-full sm:w-auto justify-center"
                >
                  <RotateCcw className="w-5 h-5" />
                  Nova Missão
                </button>
                <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-2xl shadow-sm font-black text-lg w-full sm:w-auto justify-center border-b-4" style={{ borderColor: planResult.cor }}>
                  <Zap className="w-6 h-6" style={{ color: planResult.cor }} />
                  XP Total: {earnedXp} / {planResult.xpTotal || (totalTopics * 100)}
                </div>
              </div>

              {/* EPIC HERO SECTION */}
              <div 
                className="relative overflow-hidden rounded-[3rem] p-8 sm:p-12 text-white shadow-2xl"
                style={{ 
                  background: `linear-gradient(135deg, ${planResult.cor}, #000000)`,
                  boxShadow: `0 20px 50px -10px ${planResult.cor}60`
                }}
              >
                <div className="absolute top-0 right-0 opacity-10 text-[250px] leading-none -mt-10 -mr-10 select-none">
                  {planResult.emoji}
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                  <div className="bg-white/20 backdrop-blur-md p-6 rounded-3xl text-7xl shadow-xl border border-white/20">
                    {planResult.emoji}
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-bold tracking-widest uppercase mb-4 border border-white/20">
                      Nível {planResult.nivel} • {planResult.materia}
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-display mb-4 leading-tight">
                      Missão de {planResult.aluno || "Aventureiro"}
                    </h1>
                    <p className="text-xl sm:text-2xl font-medium text-white/90 italic mb-6">
                      "{planResult.mensagemMotivacional}"
                    </p>
                    <div className="bg-black/30 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
                      <h3 className="font-bold text-white/80 uppercase tracking-wider text-sm mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" /> Resumo do Alvo
                      </h3>
                      <p className="text-lg">{planResult.resumoDoConteudo}</p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar Hero */}
                <div className="mt-10 bg-black/40 p-5 rounded-3xl border border-white/10">
                  <div className="flex justify-between items-end mb-3">
                    <span className="font-bold text-white/80">Progresso da Aventura</span>
                    <span className="font-black text-2xl">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-white rounded-full shadow-[0_0_15px_white] transition-all duration-1000 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {isAllComplete && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 text-center font-bold text-emerald-400 bg-emerald-400/10 py-2 rounded-xl"
                    >
                      🎉 MISSÃO CONCLUÍDA! VOCÊ ALCANÇOU O PRÓXIMO NÍVEL! 🎉
                    </motion.div>
                  )}
                </div>
              </div>

              {/* RESUMÃO ESTRATÉGICO */}
              <div className="bg-white rounded-[2rem] border-2 overflow-hidden shadow-xl" style={{ borderColor: planResult.cor }}>
                {/* Header */}
                <button
                  onClick={() => setResumaExpanded(v => !v)}
                  className="w-full flex items-center justify-between p-6 sm:p-8 text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-inner" style={{ backgroundColor: `${planResult.cor}18` }}>
                      🧠
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-black text-foreground font-display">Resumão Estratégico</h2>
                        <span className="text-[10px] font-black px-2 py-1 rounded-full text-white uppercase tracking-wider" style={{ backgroundColor: planResult.cor }}>IA</span>
                      </div>
                      <p className="text-sm text-muted-foreground font-medium mt-0.5">
                        {resumaoLoading ? "Gerando análise estratégica..." : resumaoData ? "Leia antes de começar — feito especialmente para este conteúdo" : "Clique para expandir"}
                      </p>
                    </div>
                  </div>
                  <div className={`transition-transform duration-300 flex-shrink-0 ${resumaoExpanded ? "rotate-180" : ""}`}>
                    <ChevronDown className="w-6 h-6 text-muted-foreground" />
                  </div>
                </button>

                {resumaoExpanded && (
                  <div className="px-6 sm:px-8 pb-8 space-y-6">

                    {/* Loading state */}
                    {resumaoLoading && (
                      <div className="flex flex-col items-center gap-4 py-10">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${planResult.cor}, #000)` }}>
                            <Brain className="w-8 h-8 text-white animate-pulse" />
                          </div>
                        </div>
                        <div className="text-center space-y-1">
                          <p className="font-black text-foreground">Analisando o conteúdo...</p>
                          <p className="text-sm text-muted-foreground">O GPT-4o está mapeando o que mais cai na prova</p>
                        </div>
                      </div>
                    )}

                    {/* Strategic content */}
                    {!resumaoLoading && resumaoData && (
                      <>
                        {/* Visão geral */}
                        <div className="p-5 rounded-2xl text-sm font-medium leading-relaxed border-l-4" style={{ backgroundColor: `${planResult.cor}10`, borderColor: planResult.cor, color: "#1e293b" }}>
                          <p className="font-black mb-1 text-base" style={{ color: planResult.cor }}>🎯 Visão Geral Estratégica</p>
                          <p>{resumaoData.visaoGeral}</p>
                        </div>

                        {/* Conceitos-chave */}
                        {resumaoData.conceitosChave?.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-black text-foreground flex items-center gap-2 text-base uppercase tracking-wide">
                              <BookOpen className="w-5 h-5" style={{ color: planResult.cor }} /> Conceitos-Chave para Dominar
                            </h4>
                            <div className="space-y-3">
                              {resumaoData.conceitosChave.map((c: any, i: number) => (
                                <div key={i} className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
                                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-border">
                                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ backgroundColor: planResult.cor }}>{i + 1}</span>
                                    <span className="font-black text-foreground">{c.titulo}</span>
                                    {c.nivelImportancia === "alto" && (
                                      <span className="ml-auto text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">Alta prioridade</span>
                                    )}
                                  </div>
                                  <div className="p-4 space-y-3">
                                    <p className="text-sm text-slate-700 leading-relaxed">{c.explicacao}</p>
                                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                      <span className="text-base flex-shrink-0">💡</span>
                                      <div>
                                        <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide mb-0.5">Como memorizar</p>
                                        <p className="text-xs text-amber-900 leading-relaxed">{c.comoMemorizar}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* O que mais cai / Armadilhas - lado a lado */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {resumaoData.oQueMAisCai?.length > 0 && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
                              <h4 className="font-black text-emerald-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Target className="w-4 h-4 text-emerald-600" /> O que mais cai
                              </h4>
                              <ul className="space-y-2">
                                {resumaoData.oQueMAisCai.map((item: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {resumaoData.armadilhas?.length > 0 && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3">
                              <h4 className="font-black text-red-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <AlertCircle className="w-4 h-4 text-red-600" /> Armadilhas clássicas
                              </h4>
                              <ul className="space-y-2">
                                {resumaoData.armadilhas.map((item: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-red-900">
                                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Conexões + Estratégia */}
                        {resumaoData.conexoes && (
                          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 space-y-2">
                            <h4 className="font-black text-violet-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                              <Zap className="w-4 h-4 text-violet-600" /> Conexões entre os tópicos
                            </h4>
                            <p className="text-sm text-violet-900 leading-relaxed">{resumaoData.conexoes}</p>
                          </div>
                        )}

                        {resumaoData.estrategiaRevisao && (
                          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-2">
                            <h4 className="font-black text-blue-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                              <Dumbbell className="w-4 h-4 text-blue-600" /> Estratégia de estudo
                            </h4>
                            <p className="text-sm text-blue-900 leading-relaxed">{resumaoData.estrategiaRevisao}</p>
                          </div>
                        )}

                        {/* Dica final destacada */}
                        {resumaoData.dicaFinal && (
                          <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${planResult.cor}, #1e1b4b)` }}>
                            <div className="absolute top-0 right-0 text-[100px] leading-none opacity-10 -mt-4 -mr-4 select-none">⭐</div>
                            <p className="text-xs font-black uppercase tracking-widest mb-2 text-white/70">Dica que separa nota 8 de nota 10</p>
                            <p className="font-bold text-lg leading-snug relative z-10">{resumaoData.dicaFinal}</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Fallback: show basic plan summary if AI not loaded yet */}
                    {!resumaoLoading && !resumaoData && (
                      <div className="p-4 rounded-2xl text-sm font-medium leading-relaxed" style={{ backgroundColor: `${planResult.cor}10`, color: "#1e293b" }}>
                        <span className="font-black" style={{ color: planResult.cor }}>🎯 Resumo do conteúdo: </span>{planResult.resumoDoConteudo}
                      </div>
                    )}

                    {/* CTA */}
                    {!resumaoLoading && (
                      <button
                        onClick={() => {
                          setResumaExpanded(false);
                          setTimeout(() => exerciciosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                        }}
                        className="w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 text-lg transition-all hover:-translate-y-0.5 shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${planResult.cor}, #000)` }}
                      >
                        <Rocket className="w-5 h-5" /> Pronto! Ir para os Exercícios ↓
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ACHIEVEMENTS */}
              {planResult.conquistas && planResult.conquistas.length > 0 && (
                <div>
                  <h2 className="text-2xl font-black font-display mb-6 flex items-center gap-3 text-foreground">
                    <Trophy className="w-7 h-7 text-yellow-500" />
                    Conquistas a Desbloquear
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {planResult.conquistas.map((conq, idx) => {
                      // Fake unlock logic based on progress
                      const isUnlocked = progressPercent >= ((idx + 1) * (100 / planResult.conquistas.length));
                      return (
                        <div 
                          key={idx} 
                          className={cn(
                            "p-5 rounded-3xl border-2 transition-all duration-300 relative overflow-hidden flex gap-4 items-center",
                            isUnlocked 
                              ? "bg-white border-yellow-400 shadow-[0_10px_30px_-10px_rgba(250,204,21,0.4)]" 
                              : "bg-secondary border-transparent opacity-70 grayscale"
                          )}
                        >
                          {isUnlocked && <div className="absolute -right-4 -top-4 w-16 h-16 bg-yellow-400/20 blur-xl rounded-full"></div>}
                          <div className={cn("text-4xl", isUnlocked && "drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]")}>
                            {conq.emoji}
                          </div>
                          <div>
                            <h3 className="font-black text-lg leading-tight mb-1">{conq.nome}</h3>
                            <p className="text-xs font-semibold text-muted-foreground">{conq.descricao}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* DAYS TIMELINE */}
              <div ref={exerciciosRef}>
                <h2 className="text-3xl font-black font-display mb-8 text-center text-foreground uppercase tracking-widest">
                  Roteiro de Batalha
                </h2>
                <div className="space-y-6">
                  {planResult.dias?.map((dia) => {
                    const isExpanded = expandedDay === dia.numero;
                    const diaColor = dia.cor || planResult.cor;
                    
                    // calculate day progress
                    const dayTopicsCompleted = dia.topicos.filter((_, i) => completedTopics[`${dia.numero}-${i}`]).length;
                    const dayProgress = Math.round((dayTopicsCompleted / dia.topicos.length) * 100);
                    const isDayDone = dayProgress === 100;

                    return (
                      <div 
                        key={dia.numero}
                        className={cn(
                          "rounded-[2rem] overflow-hidden transition-all duration-300 border-2",
                          isExpanded ? "shadow-2xl scale-[1.02]" : "shadow-md hover:shadow-lg",
                          isDayDone ? "bg-white" : "bg-white"
                        )}
                        style={{ 
                          borderColor: isExpanded ? diaColor : 'transparent',
                          boxShadow: isExpanded ? `0 20px 50px -15px ${diaColor}40` : ''
                        }}
                      >
                        {/* Day Header */}
                        <div 
                          className="p-6 cursor-pointer flex items-center gap-4 select-none group"
                          onClick={() => setExpandedDay(isExpanded ? null : dia.numero)}
                        >
                          <div 
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner flex-shrink-0 relative overflow-hidden"
                            style={{ backgroundColor: `${diaColor}20` }}
                          >
                            <span className="relative z-10">{dia.emoji}</span>
                            {isDayDone && <div className="absolute inset-0 bg-emerald-500/20 z-0"></div>}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-black uppercase tracking-wider text-sm" style={{ color: diaColor }}>
                                Dia {dia.numero}
                              </span>
                              {isDayDone && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            </div>
                            <h3 className="text-xl sm:text-2xl font-black truncate">{dia.titulo}</h3>
                          </div>
                          
                          <div className="hidden sm:flex flex-col items-end mr-4">
                            <span className="text-sm font-bold text-muted-foreground flex items-center gap-1">
                              <Clock className="w-4 h-4" /> {dia.tempoEstimado}
                            </span>
                            <span className="text-sm font-black flex items-center gap-1" style={{ color: diaColor }}>
                              <Zap className="w-4 h-4" /> {dia.xp} XP
                            </span>
                          </div>

                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-secondary transition-transform duration-300", isExpanded && "rotate-180")} style={{ color: diaColor }}>
                            <ChevronDown className="w-6 h-6" />
                          </div>
                        </div>

                        {/* Day Progress Bar Mini */}
                        <div className="w-full h-1.5 bg-secondary">
                          <div 
                            className="h-full transition-all duration-500" 
                            style={{ width: `${dayProgress}%`, backgroundColor: isDayDone ? '#10B981' : diaColor }} 
                          />
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-border bg-[#fafafa]"
                            >
                              <div className="p-6 sm:p-8 space-y-8">

                                {/* Flashcards Highlight */}
                                <div>
                                  <h4 className="font-black text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <Layers className="w-4 h-4" /> Fixar com Flashcards
                                  </h4>
                                  <FlashcardsButton
                                    materia={planResult.materia || "Conteúdo"}
                                    serie={formData.serie || "Não informado"}
                                    resumo={planResult.resumoDoConteudo || ""}
                                    diaNumero={dia.numero}
                                    diaTopicos={dia.topicos.map((t) => typeof t === "object" ? (t as any).nome : t).join(", ")}
                                  />
                                </div>

                                {/* Mission */}
                                <div className="p-5 rounded-2xl border-l-4" style={{ backgroundColor: `${diaColor}10`, borderColor: diaColor }}>
                                  <h4 className="font-black uppercase text-sm mb-2 flex items-center gap-2" style={{ color: diaColor }}>
                                    <Target className="w-5 h-5" /> Missão Principal
                                  </h4>
                                  <p className="text-lg font-medium">{dia.missao}</p>
                                </div>

                                {/* Topics with explanations */}
                                <div>
                                  <h4 className="font-black text-xl mb-4 text-foreground flex items-center gap-2">
                                    <Brain className="w-6 h-6" style={{ color: diaColor }} /> Tópicos para Dominar
                                  </h4>
                                  <div className="space-y-4">
                                    {dia.topicos.map((topico, idx) => {
                                      const isObj = typeof topico === "object" && topico !== null;
                                      const topicoObj = isObj ? (topico as StudyPlanTopic) : null;
                                      const nome = isObj ? topicoObj!.nome : (topico as string);
                                      const isChecked = !!completedTopics[`${dia.numero}-${idx}`];

                                      return (
                                        <div
                                          key={idx}
                                          className={cn(
                                            "rounded-2xl border-2 overflow-hidden transition-all",
                                            isChecked ? "border-emerald-300 bg-emerald-50/50" : "border-border bg-white"
                                          )}
                                        >
                                          {/* Topic header - checkbox */}
                                          <label className="flex items-start gap-4 p-4 cursor-pointer">
                                            <div className="relative flex items-center justify-center pt-0.5 flex-shrink-0">
                                              <input
                                                type="checkbox"
                                                className="peer sr-only"
                                                checked={isChecked}
                                                onChange={() => toggleTopic(dia.numero, idx)}
                                              />
                                              <div className={cn(
                                                "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors",
                                                isChecked ? "bg-emerald-500 border-emerald-500" : "bg-white border-muted-foreground/30"
                                              )}>
                                                <CheckCircle2 className={cn("w-4 h-4 text-white transition-transform scale-0", isChecked && "scale-100")} strokeWidth={4} />
                                              </div>
                                            </div>
                                            <span className={cn(
                                              "text-lg font-bold transition-colors pt-0.5 flex-1",
                                              isChecked ? "text-muted-foreground line-through" : "text-foreground"
                                            )}>
                                              {nome}
                                            </span>
                                          </label>

                                          {/* Explanation */}
                                          {topicoObj?.explicacao && (
                                            <div className="px-4 pb-4 space-y-3">
                                              <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/50 rounded-xl p-3">
                                                {topicoObj.explicacao}
                                              </p>

                                              {/* Memory trigger */}
                                              {topicoObj.gatilho && (
                                                <div className="rounded-xl bg-gradient-to-r from-yellow-400/15 to-orange-400/15 border border-yellow-400/30 px-4 py-3 flex items-start gap-3">
                                                  <span className="text-xl flex-shrink-0">⚡</span>
                                                  <div>
                                                    <p className="text-xs font-black uppercase tracking-wider text-yellow-600 mb-0.5">Gatilho de Memória</p>
                                                    <p className="text-sm font-semibold text-yellow-900">{topicoObj.gatilho}</p>
                                                  </div>
                                                </div>
                                              )}

                                              {/* Mini exercise */}
                                              {topicoObj.exercicio && (
                                                <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
                                                  <div className="px-4 py-3 flex items-start gap-3">
                                                    <Dumbbell className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: diaColor }} />
                                                    <div>
                                                      <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: diaColor }}>Questão Estratégica</p>
                                                      <p className="text-sm font-semibold text-foreground">{topicoObj.exercicio.pergunta}</p>
                                                    </div>
                                                  </div>
                                                  <TopicAnswerReveal answer={topicoObj.exercicio.resposta} color={diaColor} />
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Exercises of the day */}
                                {dia.exerciciosDoDia && dia.exerciciosDoDia.length > 0 && (
                                  <div>
                                    <h4 className="font-black text-xl mb-4 text-foreground flex items-center gap-2">
                                      <Dumbbell className="w-6 h-6" style={{ color: diaColor }} /> Exercícios do Dia
                                    </h4>
                                    <div className="space-y-4">
                                      {dia.exerciciosDoDia.map((ex, idx) => (
                                        <ExerciseCard key={idx} exercise={ex} color={diaColor} index={idx} />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Action / Practical */}
                                  <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
                                    <h4 className="font-black text-sm uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                      <Rocket className="w-4 h-4" /> Mão na Massa
                                    </h4>
                                    <p className="font-medium">{dia.atividade}</p>
                                  </div>

                                  {/* Golden Tip */}
                                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-5 rounded-2xl border border-yellow-200 shadow-sm">
                                    <h4 className="font-black text-sm uppercase text-yellow-600 mb-3 flex items-center gap-2">
                                      <Star className="w-4 h-4" /> Dica de Ouro
                                    </h4>
                                    <p className="font-medium text-yellow-900">{dia.dica}</p>
                                  </div>
                                </div>

                                {/* Bonus Challenge */}
                                {dia.desafio && (
                                  <ChallengeCard desafio={dia.desafio} color={diaColor} />
                                )}

                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GENERAL TIPS */}
              {planResult.dicasGerais && planResult.dicasGerais.length > 0 && (
                <div className="pt-8">
                  <h2 className="text-2xl font-black font-display mb-6 text-foreground">Regras de Sobrevivência</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {planResult.dicasGerais.map((dica, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-2xl border border-border flex items-start gap-4 shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black flex-shrink-0">
                          {idx + 1}
                        </div>
                        <p className="font-medium">{dica}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NEXT LEVEL */}
              {planResult.proximoNivel && (
                <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 sm:p-10 rounded-[3rem] text-white text-center shadow-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold uppercase tracking-widest text-blue-200 mb-2">Próximo Nível</h3>
                    <h2 className="text-3xl sm:text-4xl font-black font-display mb-4">O que vem depois?</h2>
                    <p className="text-xl font-medium max-w-2xl mx-auto opacity-90">{planResult.proximoNivel}</p>
                  </div>
                </div>
              )}

              {/* SIMULADO CTA */}
              <div className="mt-10 rounded-[2.5rem] bg-gradient-to-br from-gray-900 to-gray-800 p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/20 blur-[80px] rounded-full pointer-events-none" />
                <div className="relative z-10 flex-1 text-center sm:text-left">
                  <p className="text-sm font-black uppercase tracking-widest text-red-400 mb-2">🎯 Hora da Verdade</p>
                  <h3 className="text-2xl sm:text-3xl font-black mb-2">Teste seu conhecimento</h3>
                  <p className="text-gray-400 text-sm max-w-md">
                    10 questões cronometradas. O Adaptativo analisa seu histórico e foca nas suas fraquezas.
                  </p>
                </div>
                <div className="relative z-10 flex-shrink-0 flex flex-col sm:flex-row gap-2">
                  <SimuladoButton plan={planResult} serie={formData.serie || "Não informado"} conteudoTexto={conteudoTexto} />
                  <SimuladoAdaptativoButton plan={planResult} serie={formData.serie || "Não informado"} conteudoTexto={conteudoTexto} />
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Floating Pomodoro Timer — appears when plan is ready */}
      {planResult && <PomodoroWidget />}

      {/* Floating AI Tutor — appears when plan is ready */}
      {planResult && (
        <TutorChat
          plan={planResult}
          serie={formData.serie || "Não informado"}
          diaAtual={expandedDay ?? undefined}
          topicosCompletos={completedCount}
          totalTopicos={totalTopics}
          topicosAtual={
            expandedDay
              ? (() => {
                  const dia = planResult.dias.find((d) => d.numero === expandedDay);
                  if (!dia) return [];
                  return dia.topicos.map((t) =>
                    typeof t === "object" ? (t as any).nome : (t as string)
                  );
                })()
              : []
          }
        />
      )}
    </div>
  );
}
