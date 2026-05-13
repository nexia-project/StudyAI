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
  PlayCircle,
  Download,
  Wand2,
  ImageIcon,
  Link,
  UserCircle,
  Pencil,
  Medal,
  History,
  Database,
  ChevronLeft,
} from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { TutorChat } from "@/components/TutorChat";
import { SimuladoButton, SimuladoAdaptativoButton } from "@/components/Simulado";
import { FlashcardsButton } from "@/components/Flashcards";
import { PomodoroWidget } from "@/components/Pomodoro";
import { UserMenu } from "@/components/UserMenu";
import { AppNav } from "@/components/AppNav";
import { PremiumGate } from "@/components/PremiumGate";
import { streamStudyPlan, StudyPlan, StudyPlanDay, StudyPlanTopic } from "@/hooks/use-study-plan";
import { exportStudyPlanPDF } from "@/hooks/use-pdf-export";
import { Onboarding, hasOnboarded } from "@/components/Onboarding";
import { triggerProfessor } from "@/lib/professor-events";
import { useSubscription } from "@/hooks/useSubscription";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import {
  IllStudyPlan,
  IllTargetExam,
  IllCalendar,
  IllNotebookStack,
  IllTeacherBoard,
} from "@/components/nav/NavIllustrations";

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

const LOADING_PHASES = [
  { until: 8,  msg: "Analisando o conteúdo..." },
  { until: 25, msg: "Identificando os tópicos principais..." },
  { until: 45, msg: "Estruturando os dias de estudo..." },
  { until: 65, msg: "Criando exercícios e atividades..." },
  { until: 82, msg: "Gerando gabaritos comentados..." },
  { until: 95, msg: "Finalizando seu plano..." },
  { until: 100, msg: "Quase pronto..." },
];

function buildConteudoTextoFromPlan(plan: any): string {
  const parts: string[] = [];
  if (plan?.resumoDoConteudo) parts.push(plan.resumoDoConteudo);
  if (Array.isArray(plan?.dias)) {
    for (const dia of plan.dias) {
      let s = `=== ${dia.titulo || `Dia ${dia.numero}`} ===`;
      if (Array.isArray(dia.topicos)) {
        for (const t of dia.topicos) {
          if (t?.nome) s += `\n- ${t.nome}`;
          if (t?.explicacao) s += `\n  ${t.explicacao}`;
          if (t?.exercicio?.pergunta) s += `\n  Q: ${t.exercicio.pergunta}`;
          if (t?.exercicio?.resposta) s += `\n  R: ${t.exercicio.resposta}`;
        }
      }
      parts.push(s);
    }
  }
  return parts.join("\n\n").slice(0, 8000);
}

function triggerConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#7c3aed", "#a855f7", "#c084fc", "#e879f9", "#ddd6fe"]
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

/** XP awarded once per plan topic after quiz pass; keep in sync with /api/xp/award single-call cap. */
const TOPIC_XP = 100;

type PlanTopicQuizItem = { question: string; choices: string[]; correctIndex: number };

function stableShuffleStrings(seed: string, items: string[]): string[] {
  const arr = [...items];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  let state = h >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Two local self-check questions (MCQ). Not a substitute for professor review; blocks arbitrary checkbox XP.
 * Simulados / fluxo de simulado permanecem inalterados (outras telas).
 */
function buildTopicQuizQuestions(
  dia: StudyPlanDay,
  topicIdx: number,
  nome: string,
  topicoObj: StudyPlanTopic | null
): PlanTopicQuizItem[] {
  const safe = Array.isArray(dia.topicos) ? dia.topicos : [];
  const siblingNames = safe
    .map((t, i) => (i !== topicIdx ? (typeof t === "object" && t ? (t as StudyPlanTopic).nome : (t as string)) : null))
    .filter((x): x is string => !!x);

  const seedBase = `studyai-quiz|${dia.numero}|${topicIdx}|${nome}`;

  const wrongName1 = siblingNames[0] ?? "Um assunto paralelo não prioritário neste dia";
  const wrongName2 = siblingNames[1] ?? "Revisão superficial misturando vários temas";
  const c1choices = stableShuffleStrings(`${seedBase}|q1`, [nome, wrongName1, wrongName2]);
  const q1: PlanTopicQuizItem = {
    question: "Qual destes melhor descreve o foco principal deste tópico no plano?",
    choices: c1choices,
    correctIndex: Math.max(0, c1choices.indexOf(nome)),
  };

  const ex = topicoObj?.exercicio?.pergunta && topicoObj?.exercicio?.resposta ? topicoObj.exercicio : null;
  let q2: PlanTopicQuizItem;
  if (ex) {
    const ans = ex.resposta.trim().slice(0, 400);
    const distractorA = siblingNames[0]
      ? `Foco exclusivo em “${siblingNames[0]}” para a prova`
      : "Decorar fórmulas sem entender o contexto";
    const expl = topicoObj?.explicacao?.trim() ?? "";
    const distractorB = expl.length > 40
      ? `${expl.slice(0, 120)}… (trecho parcial, não é a resposta da questão)`
      : "Responder de memória sem alinhar ao enunciado";
    const c2choices = stableShuffleStrings(`${seedBase}|q2`, [ans, distractorA, distractorB]);
    q2 = {
      question: ex.pergunta,
      choices: c2choices,
      correctIndex: Math.max(0, c2choices.indexOf(ans)),
    };
  } else {
    const right = "Ler a explicação em tela e só pedir XP após responder ao autoquiz com honestidade.";
    const wrongA = "Marcar concluído sem ler o conteúdo, só para subir no ranking";
    const wrongB = "Pular o bloco e dizer que estudou por fora sem evidência no app";
    const c2choices = stableShuffleStrings(`${seedBase}|q2h`, [right, wrongA, wrongB]);
    q2 = {
      question: "O que o app exige para liberar XP neste tópico (política de honestidade)?",
      choices: c2choices,
      correctIndex: Math.max(0, c2choices.indexOf(right)),
    };
  }

  return [q1, q2];
}

function TopicValidationModal({
  open,
  onClose,
  onPassed,
  dia,
  topicIdx,
  nome,
  topicoObj,
}: {
  open: boolean;
  onClose: () => void;
  onPassed: () => void;
  dia: StudyPlanDay;
  topicIdx: number;
  nome: string;
  topicoObj: StudyPlanTopic | null;
}) {
  const [a0, setA0] = useState<number | null>(null);
  const [a1, setA1] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setA0(null);
      setA1(null);
      setError(null);
    }
  }, [open, dia.numero, topicIdx]);

  if (!open) return null;

  const quiz = buildTopicQuizQuestions(dia, topicIdx, nome, topicoObj);

  const submit = () => {
    if (a0 !== quiz[0].correctIndex || a1 !== quiz[1].correctIndex) {
      setError("Uma ou mais respostas estão incorretas. Releia o tópico e tente de novo.");
      return;
    }
    onPassed();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        className="fixed left-1/2 top-1/2 z-[61] w-[min(100%,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-black uppercase tracking-wider text-violet-600 mb-1">Validação do tópico</p>
        <h3 className="text-lg font-black text-foreground leading-snug mb-4">{nome}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Responda às duas perguntas. O XP só conta após acertar as duas — não dá para marcar &quot;concluído&quot; sem passar por aqui.
        </p>

        <div className="space-y-5 mb-4">
          {[0, 1].map((qi) => (
            <div key={qi} className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2">
              <p className="text-sm font-bold text-foreground">{quiz[qi].question}</p>
              <div className="space-y-2">
                {quiz[qi].choices.map((c, ci) => (
                  <label
                    key={ci}
                    className={cn(
                      "flex items-start gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-colors",
                      (qi === 0 ? a0 : a1) === ci ? "border-violet-500 bg-violet-50" : "border-transparent bg-white hover:bg-secondary/50"
                    )}
                  >
                    <input
                      type="radio"
                      className="mt-1"
                      name={qi === 0 ? "tq0" : "tq1"}
                      checked={(qi === 0 ? a0 : a1) === ci}
                      onChange={() => (qi === 0 ? setA0(ci) : setA1(ci))}
                    />
                    <span className="font-medium leading-snug">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm font-semibold text-red-600 mb-3">{error}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            disabled={a0 === null || a1 === null}
            onClick={submit}
            className="px-4 py-2.5 rounded-xl font-black bg-violet-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 transition-opacity"
          >
            Confirmar (+{TOPIC_XP} XP)
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function HomeLegacy() {
  const { isAuthenticated, login } = useAuth();
  const { isPremium } = useSubscription();
  const { profile: studentProfile, saveProfile } = useStudentProfile();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"hub" | "form" | "loading" | "result">("hub");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    serie: "",
    objetivo: "",
    concursoAlvo: "",
    tempo: "",
    dificuldades: "",
    texto: "",
    url: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [planResult, setPlanResult] = useState<StudyPlan | null>(null);
  const [conteudoTexto, setConteudoTexto] = useState<string>("");
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recentPlans, setRecentPlans] = useState<Array<{ id: string; materia: string; plan: any; createdAt: string }>>([]);
  
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [streamChars, setStreamChars] = useState(0);

  // Gamification State — XP idempotency: keys in xpAwardedKeys mirror localStorage `studyai_{aluno}_xp_awarded`
  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>({});
  const [earnedXp, setEarnedXp] = useState(0);
  const [xpAwardedKeys, setXpAwardedKeys] = useState<Record<string, boolean>>({});
  const [topicQuizTarget, setTopicQuizTarget] = useState<null | {
    dia: StudyPlanDay;
    topicIdx: number;
    nome: string;
    topicoObj: StudyPlanTopic | null;
  }>(null);
  const xpAwardedKeysRef = useRef<Record<string, boolean>>({});
  const topicXpInFlightRef = useRef<Set<string>>(new Set());
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [resumaoExpanded, setResumaExpanded] = useState(true);
  const [resumaoData, setResumaData] = useState<any>(null);
  const [resumaoLoading, setResumaLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [planBanner, setPlanBanner] = useState<string | null>(null);
  const [loadingPlanBanner, setLoadingPlanBanner] = useState(false);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [loadingWallpaper, setLoadingWallpaper] = useState(false);
  const exerciciosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    xpAwardedKeysRef.current = xpAwardedKeys;
  }, [xpAwardedKeys]);

  // Deep-link: /app?criar=1 abre o formulário do plano
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("criar") === "1") {
      setStep("form");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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

  // Fetch recent plans for quick-resume section on the form step
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/history", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d?.plans)) setRecentPlans(d.plans.slice(0, 3));
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Pre-fill form from URL params (coming from diagnóstico rápido on landing page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const materia = params.get("materia");
    const serie = params.get("serie");
    const dias = params.get("dias");
    const planMateria = params.get("planMateria"); // from mapa mental "Abrir plano"
    if (materia || serie || dias) {
      setStep("form");
      setFormData(prev => ({
        ...prev,
        ...(materia ? { nome: materia } : {}),
        ...(serie ? { serie } : {}),
      }));
      setTimeout(() => {
        document.getElementById("main-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
      window.history.replaceState({}, "", window.location.pathname);
    }
    // Auto-resume most recent plan for a subject (navigated from mapa mental)
    if (planMateria) {
      window.history.replaceState({}, "", window.location.pathname);
      fetch("/api/history", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d?.plans) return;
          const match = d.plans.find((p: any) =>
            p.materia?.toLowerCase() === planMateria.toLowerCase()
          );
          if (match?.plan) {
            handleResumePlan(match.plan);
          } else {
            setStep("form");
            // No plan found — pre-fill the form with the subject instead
            setFormData(prev => ({ ...prev, nome: planMateria }));
            setTimeout(() => {
              document.getElementById("main-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 400);
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show onboarding wizard on first visit (only when authenticated)
  useEffect(() => {
    if (isAuthenticated && !hasOnboarded()) {
      setShowOnboarding(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Pre-fill form when student profile is loaded (from DB or localStorage)
  useEffect(() => {
    if (!studentProfile) return;
    setFormData(prev => ({
      ...prev,
      ...(studentProfile.nome && studentProfile.nome !== "Herói" && studentProfile.nome !== "Estudante" ? { nome: studentProfile.nome } : {}),
      ...(studentProfile.serie ? { serie: studentProfile.serie } : {}),
      ...(studentProfile.objetivo ? { objetivo: studentProfile.objetivo } : {}),
      ...(studentProfile.concursoAlvo ? { concursoAlvo: studentProfile.concursoAlvo } : {}),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentProfile?.nome, studentProfile?.serie, studentProfile?.objetivo, studentProfile?.concursoAlvo]);

  // Fetch community feed
  const [feedEvents, setFeedEvents] = useState<Array<{
    id: string; type: string; displayName: string; profileImageUrl: string | null;
    materia: string; detail: string; emoji: string; color: string; timestamp: string;
  }>>([]);

  useEffect(() => {
    fetch("/api/feed")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d?.feed)) setFeedEvents(d.feed); })
      .catch(() => {});
  }, []);

  // Restore plan from history (set by History.tsx before navigating to /app)
  useEffect(() => {
    const restoreKey = "studyai_restore_plan";
    const saved = localStorage.getItem(restoreKey);
    if (!saved) return;
    try {
      localStorage.removeItem(restoreKey);
      const { plano, conteudoTexto: ct } = JSON.parse(saved);
      if (!plano) return;
      // Clear any stale completed-topics for this student
      try {
        localStorage.removeItem(`studyai_${plano.aluno}_topics`);
        localStorage.removeItem(`studyai_${plano.aluno}_xp_awarded`);
      } catch { /* ignore */ }
      setPlanResult(plano);
      setConteudoTexto(ct || "");
      setStep("result");
      setExpandedDay(plano.dias?.[0]?.numero || 1);
      setCompletedTopics({});
      setXpAwardedKeys({});
      xpAwardedKeysRef.current = {};
      setEarnedXp(0);
      setResumaData(null);
      setResumaLoading(false);
      setResumaExpanded(true);
      generateResumo(plano, ct || "");
    } catch { /* ignore malformed data */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write student context to localStorage so VoiceProfessor (Tiagão) can read it
  useEffect(() => {
    try {
      const completedCount = Object.values(completedTopics).filter(Boolean).length;
      const diasTotal = planResult?.dias?.length ?? 0;
      const ultimosTopicos: string[] = [];
      if (planResult?.dias) {
        for (const dia of planResult.dias) {
          for (const topico of dia.topicos || []) {
            if (ultimosTopicos.length < 5) ultimosTopicos.push((topico as any).titulo || (topico as any).nome || "");
          }
        }
      }
      const ctx = {
        nome: studentProfile?.nome,
        serie: studentProfile?.serie || formData.serie,
        objetivo: studentProfile?.objetivo,
        materia: planResult?.materia || formData.texto?.slice(0, 60),
        diasCompletos: completedCount,
        diasTotal: diasTotal || undefined,
        xp: earnedXp,
        ultimosTopicos: ultimosTopicos.filter(Boolean),
      };
      localStorage.setItem("studyai_current_context", JSON.stringify(ctx));
    } catch { /* ignore */ }
  }, [studentProfile, planResult, completedTopics, earnedXp, formData.serie, formData.texto]);

  // Listen for Tiagão's actions: criar_plano means pre-fill and auto-submit the form
  useEffect(() => {
    const handler = (e: Event) => {
      const { type, param } = (e as CustomEvent<{ type: string; param: string }>).detail;
      if (type === "criar_plano" && param) {
        setStep("form");
        setFormData(prev => ({ ...prev, texto: param }));
        // Auto-submit after a short delay so the user can see what's happening
        setTimeout(() => {
          document.getElementById("paula-auto-submit-btn")?.click();
        }, 1200);
      }
    };
    window.addEventListener("professor:action", handler);
    return () => window.removeEventListener("professor:action", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drive progress bar from real streaming chars (estimated ~4200 chars for full plan)
  useEffect(() => {
    if (step !== "loading") return;
    const ESTIMATED_TOTAL = 4200;
    const pct = Math.min(97, (streamChars / ESTIMATED_TOTAL) * 100);
    setLoadingProgress(pct);
    const phase = LOADING_PHASES.find(p => pct <= p.until) ?? LOADING_PHASES[LOADING_PHASES.length - 1];
    const idx = LOADING_PHASES.indexOf(phase);
    setLoadingMsgIdx(idx >= 0 ? idx : 0);
  }, [streamChars, step]);

  // Load topic progress + idempotent XP keys from localStorage when plan loads
  useEffect(() => {
    if (!planResult?.aluno) {
      setCompletedTopics({});
      setXpAwardedKeys({});
      xpAwardedKeysRef.current = {};
      return;
    }
    const LS_TOPICS = `studyai_${planResult.aluno}_topics`;
    const LS_AWARDED = `studyai_${planResult.aluno}_xp_awarded`;
    let parsed: Record<string, boolean> = {};
    let awarded: Record<string, boolean> = {};
    try {
      const savedTopics = localStorage.getItem(LS_TOPICS);
      if (savedTopics) parsed = JSON.parse(savedTopics);
    } catch { /* ignore */ }
    try {
      const savedAwarded = localStorage.getItem(LS_AWARDED);
      if (savedAwarded) awarded = JSON.parse(savedAwarded);
    } catch { /* ignore */ }

    // One-time migration: topics marked done before xp_awarded existed → seed keys (prevents double server XP on re-clicks)
    if (Object.keys(awarded).length === 0) {
      for (const [k, v] of Object.entries(parsed)) {
        if (v) awarded[k] = true;
      }
      if (Object.keys(awarded).length) {
        try {
          localStorage.setItem(LS_AWARDED, JSON.stringify(awarded));
        } catch { /* ignore */ }
      }
    }

    xpAwardedKeysRef.current = awarded;
    setXpAwardedKeys(awarded);
    setCompletedTopics(parsed);

    let xp = 0;
    for (const d of planResult.dias || []) {
      const len = Array.isArray(d.topicos) ? d.topicos.length : 0;
      for (let i = 0; i < len; i++) {
        if (awarded[`${d.numero}-${i}`]) xp += TOPIC_XP;
      }
    }
    setEarnedXp(xp);
  }, [planResult]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrorMsg(null);
  };

  const handleSubmit = async () => {
    if (files.length === 0 && !formData.texto.trim() && !formData.url.trim()) {
      setErrorMsg("Por favor, envie uma imagem, cole um link ou escreva o tema do estudo.");
      return;
    }

    setStep("loading");
    setErrorMsg(null);
    setStreamChars(0);

    const submitData = new FormData();
    if (formData.nome) submitData.append("nome", formData.nome);
    if (formData.serie) submitData.append("serie", formData.serie);
    if (formData.objetivo || studentProfile?.objetivo) submitData.append("objetivo", formData.objetivo || studentProfile?.objetivo || "");
    if (formData.concursoAlvo) submitData.append("concursoAlvo", formData.concursoAlvo);
    if (formData.tempo) submitData.append("tempo", formData.tempo);
    if (formData.dificuldades) submitData.append("dificuldades", formData.dificuldades);
    if (formData.texto) submitData.append("texto", formData.texto);
    if (formData.url) submitData.append("url", formData.url);
    files.forEach((f) => submitData.append("files", f));

    // Anti-repetition: include last 8 studied topics so the AI doesn't repeat them
    if (recentPlans.length > 0) {
      const topicsStudied = recentPlans
        .slice(0, 5)
        .map(p => p.materia)
        .filter(Boolean)
        .join(", ");
      if (topicsStudied) submitData.append("topicosAnteriores", topicsStudied);
    }

    await streamStudyPlan(submitData, {
      onProgress: (chars) => setStreamChars(chars),
      onStatus: () => {},
      onDone: (data) => {
        if (data.plano) {
          // Clear any saved progress for this student so the useEffect
          // doesn't restore old checkmarks from a previous plan
          try {
            localStorage.removeItem(`studyai_${data.plano.aluno}_topics`);
            localStorage.removeItem(`studyai_${data.plano.aluno}_xp_awarded`);
          } catch { /* ignore */ }
          setPlanResult(data.plano);
          setConteudoTexto(data.conteudoTexto || "");
          setStep("result");
          setExpandedDay(data.plano.dias?.[0]?.numero || 1);
          setCompletedTopics({});
          setXpAwardedKeys({});
          xpAwardedKeysRef.current = {};
          setEarnedXp(0);
          savePlanToDB(data.plano);
          generateResumo(data.plano, data.conteudoTexto || "");
          // Proactive professor: comment on the new plan
          setTimeout(() => {
            const materia = data.plano?.materia || "seus estudos";
            const dias = data.plano?.dias?.length || 0;
            const nomeAluno = studentProfile?.nome && studentProfile.nome !== "Herói" ? `, ${studentProfile.nome}` : "";
            triggerProfessor(
              `Perfeito${nomeAluno}! Seu plano de ${materia} ficou ótimo, com ${dias} dias bem distribuídos. Começa pelo primeiro tópico e me chama se tiver qualquer dúvida ao longo do caminho!`,
              "plan_generated"
            );
          }, 1200);
        } else {
          setErrorMsg("Não foi possível gerar o plano. Tente novamente.");
          setStep("form");
        }
      },
      onError: (msg) => {
        setErrorMsg(msg || "Erro de conexão. Tente novamente.");
        setStep("form");
      },
    });
  };

  const handleResumePlan = (plan: any) => {
    const ct = buildConteudoTextoFromPlan(plan);
    try {
      localStorage.removeItem(`studyai_${plan.aluno}_topics`);
      localStorage.removeItem(`studyai_${plan.aluno}_xp_awarded`);
    } catch { /* ignore */ }
    setPlanResult(plan);
    setConteudoTexto(ct);
    setStep("result");
    setExpandedDay(plan.dias?.[0]?.numero || 1);
    setCompletedTopics({});
    setXpAwardedKeys({});
    xpAwardedKeysRef.current = {};
    setEarnedXp(0);
    setResumaData(null);
    setResumaLoading(false);
    setResumaExpanded(true);
    generateResumo(plan, ct);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setFiles([]);
    setFormData(prev => ({ ...prev, texto: "" }));
    setPlanResult(null);
    setConteudoTexto("");
    setSavedPlanId(null);
    setErrorMsg(null);
    setStep("hub");
    setCompletedTopics({});
    setXpAwardedKeys({});
    xpAwardedKeysRef.current = {};
    setEarnedXp(0);
    setResumaExpanded(true);
    setResumaData(null);
    setResumaLoading(false);
    setPlanBanner(null);
    setWallpaperUrl(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!planResult?.materia) return;
    setPlanBanner(null);
    setWallpaperUrl(null);
    setLoadingPlanBanner(true);
    const topico = planResult.materia;
    const contexto = planResult.resumoDoConteudo?.slice(0, 300) ?? "";
    fetch("/api/openai/gerar-imagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ topico, contexto, estilo: "capa", size: "1536x1024" }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.b64_json) {
          setPlanBanner(`data:${data.mimeType};base64,${data.b64_json}`);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPlanBanner(false));
  }, [planResult?.materia]);

  async function gerarWallpaper() {
    if (!planResult || loadingWallpaper) return;
    setLoadingWallpaper(true);
    setWallpaperUrl(null);
    try {
      const sonho = planResult.mensagemMotivacional?.slice(0, 120) ?? planResult.materia;
      const res = await fetch("/api/openai/gerar-wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sonho,
          materia: planResult.materia,
          nome: planResult.aluno,
        }),
      });
      const data = await res.json();
      if (data.b64_json) {
        setWallpaperUrl(`data:${data.mimeType};base64,${data.b64_json}`);
      }
    } catch {
      // fail silently
    } finally {
      setLoadingWallpaper(false);
    }
  }

  const generateResumo = async (plan: StudyPlan, conteudo: string) => {
    setResumaLoading(true);
    setResumaData(null);
    try {
      const planoResumo = [
        plan.resumoDoConteudo,
        ...plan.dias.map(d =>
          `Dia ${d.numero} – ${d.titulo}: ` +
          (Array.isArray(d.topicos) ? d.topicos : []).map((t: any) => typeof t === "object" ? t?.nome : t).join(", ")
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

  const BASE_URL_API = import.meta.env.BASE_URL.replace(/\/$/, "");

  /** After mini-quiz pass: mark topic done, persist, award XP at most once per `${dia}-${idx}` (see xpAwardedKeysRef). */
  const commitTopicCompletionAfterQuiz = (dayNum: number, topicIdx: number) => {
    if (!planResult) return;
    const key = `${dayNum}-${topicIdx}`;
    if (topicXpInFlightRef.current.has(key)) return;
    if (xpAwardedKeysRef.current[key]) return;
    topicXpInFlightRef.current.add(key);
    try {
      const nextAwarded = { ...xpAwardedKeysRef.current, [key]: true };
      xpAwardedKeysRef.current = nextAwarded;
      setXpAwardedKeys(nextAwarded);
      try {
        localStorage.setItem(`studyai_${planResult.aluno}_xp_awarded`, JSON.stringify(nextAwarded));
      } catch { /* ignore */ }

      const diaRow = planResult.dias.find((d) => d.numero === dayNum);
      setCompletedTopics((prev) => {
        const next = { ...prev, [key]: true };
        try {
          localStorage.setItem(`studyai_${planResult.aluno}_topics`, JSON.stringify(next));
        } catch { /* ignore */ }
        if (diaRow && Array.isArray(diaRow.topicos)) {
          const allDayDone = diaRow.topicos.every((_, idx) => next[`${dayNum}-${idx}`]);
          if (allDayDone) {
            setTimeout(
              () =>
                triggerProfessor(
                  `Parabéns! Você concluiu o Dia ${dayNum} do seu plano. Isso é dedicação de verdade! Quando quiser começar o próximo dia é só me chamar que eu te ajudo.`,
                  "xp_gained"
                ),
              700
            );
          }
        }
        return next;
      });

      if (isAuthenticated) {
        fetch(`${BASE_URL_API}/api/xp/award`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount: TOPIC_XP }),
        }).catch(() => {});
      }

      setEarnedXp((x) => {
        const newXp = x + TOPIC_XP;
        if (newXp > 0 && newXp % 500 === 0) {
          const nomeAluno = studentProfile?.nome && studentProfile.nome !== "Herói" ? `, ${studentProfile.nome}` : "";
          setTimeout(
            () =>
              triggerProfessor(
                `Incrível${nomeAluno}! Você acabou de atingir ${newXp} pontos de XP! Está indo muito bem. Continue com esse ritmo e você vai fechar o plano antes do tempo!`,
                "xp_gained"
              ),
            450
          );
        }
        return newXp;
      });
      triggerConfetti();
    } finally {
      topicXpInFlightRef.current.delete(key);
    }
  };

  const totalTopics = Array.isArray(planResult?.dias) ? planResult!.dias.reduce((acc, d) => acc + (Array.isArray(d.topicos) ? d.topicos.length : 0), 0) || 1 : 1;
  const completedCount = Object.values(completedTopics).filter(Boolean).length;
  const progressPercent = Math.min(100, Math.round((completedCount / totalTopics) * 100));
  const isAllComplete = progressPercent === 100;

  useEffect(() => {
    if (isAllComplete && progressPercent > 0) {
      setTimeout(() => {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.3 } });
      }, 500);
      // Proactive professor: celebrate completing the full plan
      const nomeAluno = studentProfile?.nome && studentProfile.nome !== "Herói" ? `, ${studentProfile.nome}` : "";
      setTimeout(() => triggerProfessor(
        `UAU${nomeAluno}! Você concluiu 100% do plano! Isso é INCRÍVEL! Pouquíssimos alunos chegam até aqui. Que tal fazer um simulado agora pra testar tudo que você aprendeu?`,
        "xp_gained"
      ), 900);
    }
  }, [isAllComplete, progressPercent]);

  return (
    <>
    {showOnboarding && (
      <Onboarding
        onComplete={(data) => {
          setShowOnboarding(false);
          saveProfile(data);
          setFormData(prev => ({
            ...prev,
            ...(data.nome && data.nome !== "Herói" ? { nome: data.nome } : {}),
            ...(data.serie ? { serie: data.serie } : {}),
          }));
        }}
      />
    )}
    <div className="studyai-with-sidebar min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-14 md:pt-8 px-4 sm:px-6 lg:px-8 flex flex-col items-stretch sm:items-center overflow-x-hidden relative">

      {/* ── Shared App Navigation ── */}
      <AppNav onHome={() => { setStep("hub"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />

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
      {(step === "hub" || step === "form") && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center justify-center p-4 bg-white shadow-xl shadow-primary/10 rounded-3xl mb-6 border border-primary/10 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-accent/10 rounded-3xl animate-spin-slow"></div>
            <GraduationCap className="w-12 h-12 text-primary relative z-10" />
          </div>
          {studentProfile?.nome && studentProfile.nome !== "Herói" ? (
            <>
              <p className="text-base md:text-lg font-bold text-primary/70 mb-1 tracking-wide">
                Olá, {studentProfile.nome}!
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-foreground mb-4 tracking-tight">
                Seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-pink-500 animate-gradient-x">Plano de Estudos</span>
              </h1>
            </>
          ) : (
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-foreground mb-4 tracking-tight">
              Seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-pink-500 animate-gradient-x">Plano de Estudos</span>
            </h1>
          )}
          <p className="text-lg md:text-xl text-muted-foreground font-medium">
            {step === "hub"
              ? "Escolha um atalho ou monte um plano novo — tudo no ritmo do seu estudo."
              : "Diga o que vai estudar — a IA monta seu roteiro completo com exercícios e cronograma."}
          </p>
        </motion.div>
      )}

      {/* Quick Resume Section — shown on form step for authenticated users with history */}
      {(step === "hub" || step === "form") && isAuthenticated && recentPlans.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full max-w-3xl mx-auto mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="text-base">⚡</span> Continuar de onde parou
            </h2>
            <button
              onClick={() => navigate("/historico")}
              className="text-xs font-bold text-primary hover:underline"
            >
              Ver todos
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentPlans.map((p) => {
              const plan = p.plan;
              const emoji = plan?.emoji || "📚";
              const cor = plan?.cor || "#8B5CF6";
              const dias = Array.isArray(plan?.dias) ? plan.dias.length : null;
              return (
                <button
                  key={p.id}
                  onClick={() => handleResumePlan(plan)}
                  className="text-left bg-white rounded-2xl border border-border p-4 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group overflow-hidden relative"
                >
                  {/* Color accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: cor }} />
                  <div className="flex items-center gap-3 mb-3 pt-1">
                    <span
                      className="text-2xl w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${cor}20` }}
                    >
                      {emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-foreground truncate">{p.materia}</p>
                      {dias && (
                        <p className="text-xs text-muted-foreground">{dias} dia{dias !== 1 ? "s" : ""}</p>
                      )}
                    </div>
                  </div>
                  <div
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black text-white transition-opacity group-hover:opacity-90"
                    style={{ background: cor }}
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    Continuar Estudando
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Community Feed */}
      {(step === "hub" || step === "form") && feedEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-3xl mx-auto mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="text-base">🌐</span> Comunidade estudando agora
            </h2>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-white">
            <div className="divide-y divide-border">
              {feedEvents.slice(0, 5).map((ev) => {
                const timeAgo = (() => {
                  const diff = Date.now() - new Date(ev.timestamp).getTime();
                  const mins = Math.floor(diff / 60000);
                  const hrs = Math.floor(mins / 60);
                  if (mins < 2) return "agora";
                  if (mins < 60) return `há ${mins} min`;
                  if (hrs < 24) return `há ${hrs}h`;
                  return `há ${Math.floor(hrs / 24)}d`;
                })();
                return (
                  <div key={ev.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                      {ev.profileImageUrl
                        ? <img src={ev.profileImageUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                        : ev.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        <span>{ev.displayName}</span>
                        {" "}
                        <span className="font-normal text-muted-foreground">{ev.detail}</span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{ev.materia}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-lg">{ev.emoji}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content Area */}
      <div
        id="main-form"
        className={cn(
          "w-full relative mx-auto",
          step === "result" && "max-w-5xl",
          step === "hub" && "max-w-6xl",
          step === "form" && "max-w-3xl",
          step === "loading" && "max-w-3xl",
        )}
      >
        <AnimatePresence mode="wait">
          
          {/* STEP 0: HUB — atalhos rápidos */}
          {step === "hub" && (
            <motion.div
              key="hub"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-6xl mx-auto space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 justify-items-stretch">
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setTimeout(() => document.getElementById("main-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                  }}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-violet-200/70 bg-white/70 backdrop-blur-xl p-0 text-left shadow-lg shadow-violet-500/5 transition hover:border-primary/35 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div className="relative w-full min-h-[160px] sm:min-h-[180px] md:min-h-[200px] shrink-0 overflow-hidden bg-slate-100">
                    <img
                      src={`${import.meta.env.BASE_URL}banners/plano-estudos-hero.png`}
                      alt="Banner ilustrativo: criar plano de estudos personalizado com apoio de IA."
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="relative p-6 text-left">
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-primary/25 to-accent/15 blur-2xl opacity-80 pointer-events-none" />
                    <IllStudyPlan className="relative z-10 mb-4 size-14 text-primary" />
                    <h3 className="relative z-10 mb-1 font-black text-lg text-foreground">Criar plano de estudos</h3>
                    <p className="relative z-10 text-sm leading-snug text-muted-foreground">
                      Texto, PDF, foto do caderno ou tema — a IA monta o roteiro completo.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/simulado-enem")}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-violet-200/70 bg-white/70 backdrop-blur-xl p-0 text-left shadow-lg shadow-violet-500/5 transition hover:border-primary/35 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div className="relative w-full min-h-[160px] sm:min-h-[180px] md:min-h-[200px] shrink-0 overflow-hidden bg-slate-100">
                    <img
                      src={`${import.meta.env.BASE_URL}banners/simulado-enem-hero.png`}
                      alt="Banner ilustrativo: simulado ENEM no formato da prova com correção inteligente."
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      loading="lazy"
                    />
                  </div>
                  <div className="relative p-6 text-left">
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-cyan-400/20 to-primary/15 blur-2xl opacity-80 pointer-events-none" />
                    <IllTargetExam className="size-14 mb-4 text-primary relative z-10" />
                    <h3 className="font-black text-lg text-foreground mb-1 relative z-10">Simulado ENEM</h3>
                    <p className="text-sm text-muted-foreground leading-snug relative z-10">
                      Treine no formato da prova com correção inteligente.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/cronograma")}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-violet-200/70 bg-white/70 backdrop-blur-xl p-0 text-left shadow-lg shadow-violet-500/5 transition hover:border-primary/35 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div className="relative w-full min-h-[160px] sm:min-h-[180px] md:min-h-[200px] shrink-0 overflow-hidden bg-slate-100">
                    <img
                      src={`${import.meta.env.BASE_URL}banners/cronograma-hero.png`}
                      alt="Banner ilustrativo: cronograma de estudos para organizar semanas com clareza."
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="relative p-6 text-left">
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-fuchsia-400/15 to-violet-400/20 blur-2xl opacity-80 pointer-events-none" />
                    <IllCalendar className="relative z-10 mb-4 size-14 text-primary" />
                    <h3 className="relative z-10 mb-1 font-black text-lg text-foreground">Cronograma</h3>
                    <p className="relative z-10 text-sm leading-snug text-muted-foreground">
                      Organize semanas de estudo com clareza.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/notebook")}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-violet-200/70 bg-white/70 backdrop-blur-xl p-0 text-left shadow-lg shadow-violet-500/5 transition hover:border-primary/35 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div className="relative w-full min-h-[160px] sm:min-h-[180px] md:min-h-[200px] shrink-0 overflow-hidden bg-slate-100">
                    <img
                      src={`${import.meta.env.BASE_URL}banners/notebook-rag-hero.png`}
                      alt="Notebook RAG: assistente de pesquisa nos seus materiais."
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="relative p-6 text-left">
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-pink-400/15 to-violet-500/15 blur-2xl opacity-80 pointer-events-none" />
                    <IllNotebookStack className="relative z-10 mb-4 size-14 text-primary" />
                    <h3 className="relative z-10 mb-1 font-black text-lg text-foreground">Notebook RAG</h3>
                    <p className="relative z-10 text-sm leading-snug text-muted-foreground">
                      Pergunte aos seus materiais com IA.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/tutor-ia")}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-violet-200/70 bg-white/70 backdrop-blur-xl p-0 text-left shadow-lg shadow-violet-500/5 transition hover:border-primary/35 hover:shadow-xl hover:-translate-y-0.5 sm:col-span-2 xl:col-span-3"
                >
                  <div className="relative w-full min-h-[160px] sm:min-h-[180px] md:min-h-[200px] shrink-0 overflow-hidden bg-slate-100">
                    <img
                      src={`${import.meta.env.BASE_URL}banners/professor-tiagao-hero.png`}
                      alt="Professor Tiagão, tutor por voz."
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      loading="lazy"
                    />
                  </div>
                  <div className="relative p-6 text-left">
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-400/15 to-violet-500/20 blur-2xl opacity-80 pointer-events-none" />
                    <IllTeacherBoard className="size-14 mb-4 text-primary relative z-10" />
                    <h3 className="font-black text-lg text-foreground mb-1 relative z-10">Professor Tiagão</h3>
                    <p className="text-sm text-muted-foreground leading-snug relative z-10">
                      Tutor por voz e texto — peça explicações, upload de material e vamos juntos.
                    </p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 1: FORM */}
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
              className="bg-white/90 backdrop-blur-2xl border border-white rounded-[2.5rem] p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.1)] shadow-sm"
            >
              
              {errorMsg && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3 text-destructive">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold">{errorMsg}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setStep("hub");
                  setErrorMsg(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar aos atalhos
              </button>

              <div className="space-y-10">
                {/* Section: Profile Summary (compact) */}
                {(studentProfile?.nome || formData.nome) && (
                  <section>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-sm">
                          {(studentProfile?.nome || formData.nome || "E").slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">
                            {studentProfile?.nome || formData.nome}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {(studentProfile?.serie || formData.serie) && (
                              <span className="text-xs text-muted-foreground">{studentProfile?.serie || formData.serie}</span>
                            )}
                            {(studentProfile?.objetivo || formData.objetivo) && (
                              <>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-primary font-semibold capitalize">{studentProfile?.objetivo || formData.objetivo}</span>
                              </>
                            )}
                            {(studentProfile?.concursoAlvo || formData.concursoAlvo) && (
                              <>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-accent font-semibold">{studentProfile?.concursoAlvo || formData.concursoAlvo}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate("/perfil")}
                        className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-xl hover:bg-primary/10"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    </div>
                  </section>
                )}

                {/* Plan config: tempo + dificuldades */}
                <section>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground flex items-center gap-2 ml-1">
                        <Link className="w-4 h-4 text-accent" /> Cole um link (opcional)
                      </label>
                      <div className="relative">
                        <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="url"
                          name="url"
                          value={formData.url}
                          onChange={handleInputChange}
                          placeholder="https://... — artigo, Wikipedia, apostila online"
                          className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-secondary/50 border-2 border-transparent focus:border-accent focus:bg-white focus:shadow-[0_0_0_4px_rgba(217,70,239,0.1)] transition-all outline-none font-medium text-base"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground ml-1">O conteúdo da página será extraído e usado como base do plano</p>
                    </div>

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
                  id="paula-auto-submit-btn"
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

              <h3 className="text-3xl font-black text-foreground mb-2 font-display z-10">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={loadingMsgIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent"
                  >
                    {LOADING_PHASES[loadingMsgIdx]?.msg ?? LOADING_PHASES[0].msg}
                  </motion.span>
                </AnimatePresence>
              </h3>

              <p className="text-sm text-muted-foreground z-10 mb-6">
                {streamChars > 0 ? `${streamChars.toLocaleString()} caracteres gerados` : "Iniciando geração..."}
              </p>
              
              <div className="w-full max-w-md bg-secondary rounded-full h-4 mb-2 overflow-hidden z-10 border border-black/5 p-0.5">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary via-accent to-pink-500 rounded-full relative"
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                </motion.div>
              </div>
              <p className="text-sm font-bold text-muted-foreground z-10">{Math.round(loadingProgress)}% concluído</p>
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
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={async () => {
                      if (!planResult || pdfLoading) return;
                      setPdfLoading(true);
                      try { await exportStudyPlanPDF(planResult); } finally { setPdfLoading(false); }
                    }}
                    disabled={pdfLoading}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border-2 border-primary/30 hover:border-primary shadow-sm hover:shadow-md text-primary font-bold transition-all w-full sm:w-auto justify-center disabled:opacity-60"
                  >
                    <Download className={`w-4 h-4 ${pdfLoading ? "animate-bounce" : ""}`} />
                    {pdfLoading ? "Gerando..." : "Baixar PDF"}
                  </button>
                  <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-2xl shadow-sm font-black text-lg w-full sm:w-auto justify-center border-b-4" style={{ borderColor: planResult.cor }}>
                    <Zap className="w-6 h-6" style={{ color: planResult.cor }} />
                    XP Total: {earnedXp} / {planResult.xpTotal || (totalTopics * 100)}
                  </div>
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

              {/* AI VISUAL BANNER */}
              {(planBanner || loadingPlanBanner) && (
                <div className="rounded-[2rem] overflow-hidden shadow-xl border border-white/10 relative">
                  {loadingPlanBanner && !planBanner && (
                    <div className="flex items-center justify-center gap-3 py-16 bg-gradient-to-r from-slate-100 to-slate-50">
                      <div className="w-8 h-8 rounded-full border-4 border-violet-400 border-t-transparent animate-spin" />
                      <p className="text-sm font-bold text-slate-500">Gerando ilustração do seu plano...</p>
                    </div>
                  )}
                  {planBanner && (
                    <>
                      <img
                        src={planBanner}
                        alt={`Ilustração visual: ${planResult.materia}`}
                        className="w-full object-cover max-h-72"
                      />
                      <div className="px-5 py-3 flex items-center gap-2" style={{ background: `linear-gradient(90deg, ${planResult.cor}15, transparent)` }}>
                        <span className="text-lg">{planResult.emoji}</span>
                        <p className="text-sm font-bold text-slate-700">
                          Ilustração gerada por IA sobre <span style={{ color: planResult.cor }}>{planResult.materia}</span>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* WALLPAPER MOTIVACIONAL */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-lg overflow-hidden">
                <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${planResult.cor}18` }}>
                      🖼️
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900">Wallpaper Motivacional</h3>
                      <p className="text-xs text-gray-400 font-medium">Arte cinematic gerada por IA para deixar no fundo de tela</p>
                    </div>
                  </div>
                  {!wallpaperUrl && (
                    <button
                      onClick={gerarWallpaper}
                      disabled={loadingWallpaper}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white font-black text-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${planResult.cor}, #1e1b4b)` }}
                    >
                      {loadingWallpaper ? (
                        <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Gerando...</>
                      ) : (
                        <><Wand2 className="w-4 h-4" /> Criar Wallpaper</>
                      )}
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {wallpaperUrl && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <img
                        src={wallpaperUrl}
                        alt="Wallpaper motivacional"
                        className="w-full object-cover"
                        style={{ maxHeight: "300px" }}
                      />
                      <div className="px-6 py-3 flex items-center justify-between gap-3 bg-gray-50">
                        <p className="text-xs text-gray-500 font-medium">
                          Wallpaper 16:9 gerado por IA — salve como fundo de tela para manter o foco!
                        </p>
                        <div className="flex gap-2">
                          <a
                            href={wallpaperUrl}
                            download={`wallpaper-${planResult.materia.replace(/\s+/g, "-")}.png`}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs shadow transition-all hover:opacity-90"
                            style={{ background: `linear-gradient(135deg, ${planResult.cor}, #1e1b4b)` }}
                          >
                            <Download className="w-3.5 h-3.5" /> Baixar
                          </a>
                          <button
                            onClick={gerarWallpaper}
                            disabled={loadingWallpaper}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs transition-all"
                          >
                            <Wand2 className="w-3 h-3" /> Novo
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* RESUMÃO ESTRATÉGICO */}
              <div className="bg-white rounded-[2rem] border-2 overflow-hidden shadow-xl" style={{ borderColor: planResult.cor }}>
                {/* Header */}
                <button
                  onClick={() => {
                    if (!isPremium) { navigate("/pricing"); return; }
                    setResumaExpanded(v => !v);
                  }}
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
                          <p className="text-sm text-muted-foreground">Nossa IA está mapeando o que mais cai na prova</p>
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
                            <p className="text-sm text-gray-900 leading-relaxed">{resumaoData.conexoes}</p>
                          </div>
                        )}

                        {resumaoData.estrategiaRevisao && (
                          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 space-y-2">
                            <h4 className="font-black text-violet-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                              <Dumbbell className="w-4 h-4 text-violet-600" /> Estratégia de estudo
                            </h4>
                            <p className="text-sm text-violet-900 leading-relaxed">{resumaoData.estrategiaRevisao}</p>
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
                    const safeTopicos = Array.isArray(dia.topicos) ? dia.topicos : [];
                    const dayTopicsCompleted = safeTopicos.filter((_, i) => completedTopics[`${dia.numero}-${i}`]).length;
                    const dayProgress = safeTopicos.length > 0 ? Math.round((dayTopicsCompleted / safeTopicos.length) * 100) : 0;
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
                                  {isPremium ? (
                                    <FlashcardsButton
                                      materia={planResult.materia || "Conteúdo"}
                                      serie={formData.serie || "Não informado"}
                                      resumo={planResult.resumoDoConteudo || ""}
                                      diaNumero={dia.numero}
                                      diaTopicos={safeTopicos.map((t) => typeof t === "object" ? (t as any).nome : t).join(", ")}
                                    />
                                  ) : (
                                    <PremiumGate
                                      feature="Flashcards — Recurso Premium"
                                      description="Revise com cartões de memória inteligentes"
                                    >
                                      <FlashcardsButton
                                        materia={planResult.materia || "Conteúdo"}
                                        serie={formData.serie || "Não informado"}
                                        resumo={planResult.resumoDoConteudo || ""}
                                        diaNumero={dia.numero}
                                        diaTopicos={safeTopicos.map((t) => typeof t === "object" ? (t as any).nome : t).join(", ")}
                                      />
                                    </PremiumGate>
                                  )}
                                </div>

                                {/* Mission */}
                                <div className="p-5 rounded-2xl border-l-4" style={{ backgroundColor: `${diaColor}10`, borderColor: diaColor }}>
                                  <h4 className="font-black uppercase text-sm mb-2 flex items-center gap-2" style={{ color: diaColor }}>
                                    <Target className="w-5 h-5" /> Missão Principal
                                  </h4>
                                  <p className="text-lg font-medium">{dia.missao}</p>
                                </div>

                                {/* Topics with explanations */}
                                {/* POLÍTICA DE CONCLUSÃO (plano / Q&A): XP só após mini-quiz local (2 MCQs). Simulados seguem o fluxo da própria tela de simulado. */}
                                <div>
                                  <h4 className="font-black text-xl mb-4 text-foreground flex items-center gap-2">
                                    <Brain className="w-6 h-6" style={{ color: diaColor }} /> Tópicos para Dominar
                                  </h4>
                                  <div className="space-y-4">
                                    {safeTopicos.map((topico, idx) => {
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
                                          <div className="p-4 border-b border-border/60">
                                            {isChecked ? (
                                              <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                                                  <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={3} />
                                                </div>
                                                <div>
                                                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Tópico validado</p>
                                                  <p className="text-lg font-bold text-foreground">{nome}</p>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    +{TOPIC_XP} XP contabilizado no máximo uma vez por tópico neste plano.
                                                  </p>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <p className="text-lg font-bold text-foreground flex-1">{nome}</p>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setTopicQuizTarget({
                                                      dia,
                                                      topicIdx: idx,
                                                      nome,
                                                      topicoObj,
                                                    })
                                                  }
                                                  className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-white text-sm shadow-md hover:opacity-95 transition-opacity"
                                                  style={{ backgroundColor: diaColor }}
                                                >
                                                  <PenLine className="w-4 h-4" /> Validar conclusão (+{TOPIC_XP} XP)
                                                </button>
                                              </div>
                                            )}
                                          </div>

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
                <div className="mt-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 p-8 sm:p-10 rounded-[3rem] text-white text-center shadow-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold uppercase tracking-widest text-violet-200 mb-2">Próximo Nível</h3>
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
                  {isPremium ? (
                    <>
                      <SimuladoButton plan={planResult} serie={formData.serie || "Não informado"} conteudoTexto={conteudoTexto} />
                      <SimuladoAdaptativoButton plan={planResult} serie={formData.serie || "Não informado"} conteudoTexto={conteudoTexto} />
                    </>
                  ) : (
                    <PremiumGate
                      feature="Simulados — Recurso Premium"
                      description="10 questões cronometradas com correção por IA"
                      className="min-w-[280px]"
                    >
                      <div className="flex flex-col sm:flex-row gap-2">
                        <SimuladoButton plan={planResult} serie={formData.serie || "Não informado"} conteudoTexto={conteudoTexto} />
                        <SimuladoAdaptativoButton plan={planResult} serie={formData.serie || "Não informado"} conteudoTexto={conteudoTexto} />
                      </div>
                    </PremiumGate>
                  )}
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Floating Pomodoro Timer — Premium feature */}
      {planResult && isPremium && <PomodoroWidget />}

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
                  return Array.isArray(dia.topicos) ? dia.topicos.map((t) =>
                    typeof t === "object" ? (t as any).nome : (t as string)
                  ) : [];
                })()
              : []
          }
        />
      )}

      {topicQuizTarget && (
        <TopicValidationModal
          open
          onClose={() => setTopicQuizTarget(null)}
          onPassed={() => {
            commitTopicCompletionAfterQuiz(topicQuizTarget.dia.numero, topicQuizTarget.topicIdx);
            setTopicQuizTarget(null);
          }}
          dia={topicQuizTarget.dia}
          topicIdx={topicQuizTarget.topicIdx}
          nome={topicQuizTarget.nome}
          topicoObj={topicQuizTarget.topicoObj}
        />
      )}
    </div>
    </>
  );
}
