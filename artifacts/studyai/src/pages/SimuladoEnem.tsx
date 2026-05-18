import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Clock, CheckCircle2, XCircle, ChevronRight, ChevronLeft,
  Trophy, BookOpen, AlertCircle, Loader2, RefreshCw, Share2, Lock,
  Target, Brain, CalendarCheck, BarChart3, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppMissionPanel, AppStatusBadge, ContentArea, Layout, PageHeader } from "@/components/Layout";
import { useSubscription, startCheckout } from "@/hooks/useSubscription";
import {
  SIMULADO_ERROR_REVIEW_DRAFT_KEY,
  buildTiagaoErrorReviewPrompt,
  emitHermesLearningSignal,
  saveErrorReviewMission,
  type ErrorReviewDraft,
} from "@/lib/error-review";
import { completeSimuladoRecoveryMission, saveSimuladoRecoveryMission, type SimuladoRecoveryMission } from "@/lib/next-best-action";

const DIAS_INFO = [
  { dia: 1, nome: "Linguagens", areaOficial: "Linguagens, Códigos e suas Tecnologias", cor: "from-violet-500 to-violet-600", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", emoji: "📝", materias: "Língua Portuguesa, Literatura, Inglês, Arte, Educação Física" },
  { dia: 2, nome: "Ciências Humanas", areaOficial: "Ciências Humanas e suas Tecnologias", cor: "from-amber-500 to-orange-600", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", emoji: "🌍", materias: "História, Geografia, Filosofia, Sociologia" },
  { dia: 3, nome: "Ciências Naturais", areaOficial: "Ciências da Natureza e suas Tecnologias", cor: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", emoji: "🔬", materias: "Física, Química, Biologia" },
  { dia: 4, nome: "Matemática", areaOficial: "Matemática e suas Tecnologias", cor: "from-violet-500 to-violet-600", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", emoji: "📐", materias: "Matemática — 45 questões" },
];

interface Questao {
  numero: number;
  materia: string;
  area?: string;
  areaConhecimento?: string;
  competencia?: string;
  competenciaCodigo?: string;
  habilidade?: string;
  habilidadeCodigo?: string;
  objetoConhecimento?: string;
  enunciado: string;
  pergunta: string;
  alternativas: Record<string, string>;
  gabarito: string;
  explicacao: string;
  dificuldade: string;
}

type Fase = "selecionar" | "gerando" | "respondendo" | "resultado";

interface SubjectAnalysis {
  materia: string;
  total: number;
  acertos: number;
  erros: number;
  pct: number;
  habilidade: string;
  foco: string;
}

interface SkillPerformance {
  key: string;
  label: string;
  kind: "area" | "competencia" | "habilidade";
  total: number;
  acertos: number;
  erros: number;
  pct: number;
  focus: string;
  metadataSource: "question-bank" | "fallback";
}

interface ErrorPattern {
  key: string;
  label: string;
  count: number;
  severity: "alta" | "media" | "baixa";
  insight: string;
  action: string;
}

interface RecoveryMission {
  title: string;
  estimatedTime: string;
  objective: string;
  steps: string[];
  evidence: string;
  check: string;
}

const HABILIDADES_POR_MATERIA: Record<string, string> = {
  "Língua Portuguesa": "Interpretação, coesão e efeito de sentido",
  Literatura: "Repertório cultural e leitura de textos literários",
  Inglês: "Leitura instrumental e inferência de vocabulário",
  Arte: "Linguagens artísticas e contexto cultural",
  "Educação Física": "Práticas corporais e cidadania",
  História: "Processos históricos e relações de poder",
  Geografia: "Espaço geográfico, mapas e sociedade",
  Filosofia: "Argumentação, ética e pensamento crítico",
  Sociologia: "Cultura, trabalho, cidadania e instituições",
  Física: "Modelagem de fenômenos e leitura de grandezas",
  Química: "Transformações, matéria e análise de evidências",
  Biologia: "Sistemas vivos, ecologia e saúde",
  Matemática: "Resolução de problemas e leitura de funções",
};

function difficultyLabel(value: string) {
  if (value === "facil") return "fácil";
  if (value === "dificil") return "difícil";
  return "média";
}

function normalizeOptional(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length ? trimmed : null;
}

function getQuestionArea(q: Questao, diaInfo?: typeof DIAS_INFO[number]) {
  return normalizeOptional(q.areaConhecimento) ?? normalizeOptional(q.area) ?? diaInfo?.areaOficial ?? diaInfo?.nome ?? "Área ENEM";
}

function getQuestionCompetency(q: Questao) {
  const label = normalizeOptional(q.competencia);
  const code = normalizeOptional(q.competenciaCodigo);
  if (!label && !code) return null;
  return code && label ? `${code} — ${label}` : label ?? code;
}

function getQuestionSkill(q: Questao) {
  const explicit = normalizeOptional(q.habilidade);
  const code = normalizeOptional(q.habilidadeCodigo);
  if (explicit && code) return `${code} — ${explicit}`;
  if (explicit || code) return explicit ?? code;
  return null;
}

function getSkillFocus(pct: number, erros: number) {
  if (erros === 0) return "manter como ponto forte";
  if (pct >= 70) return "lapidar consistência";
  if (pct >= 50) return "revisar fundamento e comando";
  return "recuperação prioritária";
}

function buildSubjectAnalysis(questoes: Questao[], respostas: Record<number, string>): SubjectAnalysis[] {
  const grouped = new Map<string, { total: number; acertos: number; erros: number }>();

  for (const q of questoes) {
    const current = grouped.get(q.materia) ?? { total: 0, acertos: 0, erros: 0 };
    current.total += 1;
    if (respostas[q.numero] === q.gabarito) current.acertos += 1;
    else current.erros += 1;
    grouped.set(q.materia, current);
  }

  return Array.from(grouped.entries())
    .map(([materia, stats]) => {
      const pct = stats.total ? Math.round((stats.acertos / stats.total) * 100) : 0;
      return {
        materia,
        ...stats,
        pct,
        habilidade: HABILIDADES_POR_MATERIA[materia] ?? "Habilidade ENEM associada ao tema da questão",
        foco: pct >= 80 ? "Manter com revisão espaçada" : pct >= 60 ? "Reforçar pontos de atenção" : "Prioridade de reparo nesta semana",
      };
    })
    .sort((a, b) => b.erros - a.erros || a.pct - b.pct || b.total - a.total);
}

function buildSkillPerformance(
  questoes: Questao[],
  respostas: Record<number, string>,
  diaInfo?: typeof DIAS_INFO[number],
): SkillPerformance[] {
  const grouped = new Map<string, Omit<SkillPerformance, "pct" | "focus">>();

  const add = (kind: SkillPerformance["kind"], label: string, q: Questao, metadataSource: SkillPerformance["metadataSource"]) => {
    const key = `${kind}:${label}`;
    const current = grouped.get(key) ?? {
      key,
      label,
      kind,
      total: 0,
      acertos: 0,
      erros: 0,
      metadataSource,
    };
    current.total += 1;
    if (respostas[q.numero] === q.gabarito) current.acertos += 1;
    else current.erros += 1;
    grouped.set(key, current);
  };

  for (const q of questoes) {
    add("area", getQuestionArea(q, diaInfo), q, normalizeOptional(q.area) || normalizeOptional(q.areaConhecimento) ? "question-bank" : "fallback");

    const competency = getQuestionCompetency(q);
    if (competency) add("competencia", competency, q, "question-bank");

    const skill = getQuestionSkill(q);
    if (skill) add("habilidade", skill, q, "question-bank");
  }

  return Array.from(grouped.values())
    .map(item => {
      const pct = item.total ? Math.round((item.acertos / item.total) * 100) : 0;
      return {
        ...item,
        pct,
        focus: getSkillFocus(pct, item.erros),
      };
    })
    .sort((a, b) => {
      const kindOrder = { area: 0, competencia: 1, habilidade: 2 };
      return kindOrder[a.kind] - kindOrder[b.kind] || b.erros - a.erros || a.pct - b.pct;
    });
}

function getProbableCause(q: Questao, selected?: string) {
  if (!selected) {
    return {
      key: "sem_resposta",
      label: "Questões sem resposta",
      insight: "o problema pode estar no ritmo de prova, gerenciamento do tempo ou travamento no comando.",
      action: "treinar blocos cronometrados e pular questões longas na primeira passagem.",
    };
  }
  if (q.dificuldade === "facil") {
    return {
      key: "base_atencao",
      label: "Erro em questão fácil",
      insight: "sinal de atenção, leitura apressada ou conceito básico instável.",
      action: "refazer sem pressa, destacando comando, dados e alternativa eliminada.",
    };
  }
  if (q.dificuldade === "dificil") {
    return {
      key: "encadeamento_avancado",
      label: "Encadeamento avançado",
      insight: "a questão exige combinar repertório, interpretação e escolha de estratégia.",
      action: "quebrar a resolução em passos e resolver uma questão similar com consulta.",
    };
  }
  return {
    key: "interpretacao_lacuna",
    label: "Interpretação ou lacuna conceitual",
    insight: "há indício de conceito parcialmente conhecido ou comando mal interpretado.",
    action: "revisar a habilidade associada e explicar por que a alternativa correta vence.",
  };
}

function buildErrorPatterns(erros: Questao[], respostas: Record<number, string>): ErrorPattern[] {
  const grouped = new Map<string, ErrorPattern>();

  for (const q of erros) {
    const cause = getProbableCause(q, respostas[q.numero]);
    const current: ErrorPattern = grouped.get(cause.key) ?? {
      key: cause.key,
      label: cause.label,
      count: 0,
      severity: "baixa",
      insight: cause.insight,
      action: cause.action,
    };
    current.count += 1;
    grouped.set(cause.key, current);
  }

  return Array.from(grouped.values())
    .map<ErrorPattern>(pattern => {
      const severity: ErrorPattern["severity"] = pattern.count >= 3 ? "alta" : pattern.count === 2 ? "media" : "baixa";
      return { ...pattern, severity };
    })
    .sort((a, b) => b.count - a.count);
}

function buildRecoveryMission(args: {
  erros: Questao[];
  subjects: SubjectAnalysis[];
  skillPerformance: SkillPerformance[];
  errorPatterns: ErrorPattern[];
  pct: number;
}): RecoveryMission {
  const weakestSkill = args.skillPerformance.find(item => item.metadataSource === "question-bank" && item.erros > 0)
    ?? args.skillPerformance.find(item => item.erros > 0);
  const weakestSubject = args.subjects.find(subject => subject.erros > 0);
  const mainPattern = args.errorPatterns[0];
  const focus = weakestSkill?.label ?? weakestSubject?.materia ?? "manutenção dos acertos";
  const estimatedTime = args.erros.length >= 8 ? "35 min" : args.erros.length >= 4 ? "25 min" : "15 min";

  if (!args.erros.length) {
    return {
      title: "Missão de consolidação",
      estimatedTime: "15 min",
      objective: "transformar os acertos em repertório estável antes de subir o nível.",
      evidence: `${args.pct}% de acerto no simulado.`,
      steps: [
        "Escolha 2 questões que pareciam difíceis e explique a lógica em voz alta.",
        "Revise rapidamente a área para não perder retenção em 48 horas.",
        "No próximo simulado, aumente a quantidade ou a dificuldade.",
      ],
      check: "Você consegue justificar a alternativa correta sem olhar a explicação.",
    };
  }

  return {
    title: `Missão de recuperação: ${focus}`,
    estimatedTime,
    objective: `corrigir o padrão dominante (${mainPattern?.label ?? "erro de simulado"}) antes de fazer outro bloco.`,
    evidence: `${args.erros.length} erro(s); ${weakestSubject ? `${weakestSubject.materia} concentra ${weakestSubject.erros}` : "prioridade definida pelo resultado"} erro(s).`,
    steps: [
      "Refaça até 3 erros sem consultar o gabarito, começando pelo comando da questão.",
      `Revise ${focus} com uma explicação curta e um exemplo resolvido.`,
      "Resolva uma questão parecida cronometrada para confirmar que a lacuna foi reparada.",
    ],
    check: "A missão termina quando você acerta a questão parecida e consegue explicar o erro anterior.",
  };
}

function buildSimuladoRecommendation(args: {
  pct: number;
  erros: Questao[];
  subjects: SubjectAnalysis[];
  skillPerformance: SkillPerformance[];
  errorPatterns: ErrorPattern[];
  recoveryMission: RecoveryMission;
}) {
  const weakest = args.skillPerformance.find(item => item.erros > 0) ?? args.subjects.find(item => item.erros > 0);
  return {
    area: "simulado_enem",
    targetSurface: "resultado_simulado",
    observedState: args.erros.length
      ? `${args.erros.length} erro(s), padrão principal: ${args.errorPatterns[0]?.label ?? "não classificado"}.`
      : "Sem erros nesta tentativa.",
    problemOpportunity: "Resultado de simulado precisa virar decisão de estudo imediata, não apenas gabarito.",
    recommendedChange: args.recoveryMission.title,
    expectedImpact: "Aumentar conclusão de missões de recuperação antes do próximo simulado.",
    confidence: "medium",
    successMetric: "simulado_missao_recuperacao_iniciada",
    weakestFocus: weakest ? {
      label: "label" in weakest ? weakest.label : weakest.materia,
      errors: weakest.erros,
      accuracy: weakest.pct,
    } : null,
    patterns: args.errorPatterns.map(pattern => ({
      key: pattern.key,
      count: pattern.count,
      severity: pattern.severity,
    })),
  };
}

function estimatePedagogicalTri(pct: number, questoes: Questao[], erros: Questao[]) {
  const total = Math.max(questoes.length, 1);
  const hardHits = questoes.filter(q => q.dificuldade === "dificil" && !erros.some(e => e.numero === q.numero)).length;
  const easyMisses = erros.filter(q => q.dificuldade === "facil").length;
  const consistency = Math.round((hardHits / total) * 45) - Math.round((easyMisses / total) * 60);
  const score = Math.max(280, Math.min(820, Math.round(330 + pct * 4.2 + consistency)));
  const label = pct >= 80 ? "desempenho forte" : pct >= 60 ? "base boa com lacunas" : pct >= 40 ? "base instável" : "reconstrução guiada";
  return { score, label, consistency };
}

function buildActionPlan(erros: Questao[], subjects: SubjectAnalysis[]) {
  const weakest = subjects.find(s => s.erros > 0);
  const firstError = erros[0];
  const primarySkill = weakest?.habilidade ?? "revisão espaçada dos conteúdos do simulado";
  const cause = !firstError
    ? "sem erro registrado nesta tentativa"
    : firstError.dificuldade === "facil"
      ? "possível distração, leitura apressada ou conceito básico instável"
      : firstError.dificuldade === "dificil"
        ? "questão de alta complexidade; exige repertório e encadeamento"
        : "lacuna de conceito ou interpretação do comando";

  return {
    primarySkill,
    cause,
    nextBestAction: firstError
      ? `Revisar ${weakest?.materia ?? firstError.materia} por 25 minutos e refazer ${Math.min(erros.length, 5)} erro${Math.min(erros.length, 5) !== 1 ? "s" : ""} comentado${Math.min(erros.length, 5) !== 1 ? "s" : ""}.`
      : "Fazer um simulado maior ou avançar para questões mais difíceis mantendo revisão espaçada.",
    steps: firstError
      ? [
          "Ler o comando e grifar o que a questão realmente pede.",
          "Reescrever a explicação correta com suas palavras.",
          "Resolver uma questão parecida antes de iniciar novo simulado.",
        ]
      : [
          "Registrar os acertos fortes no caderno.",
          "Aumentar a quantidade de questões no próximo treino.",
          "Manter revisão curta em 48 horas.",
        ],
  };
}

function buildErrorReviewDraft(args: {
  diaNome: string;
  pct: number;
  acertos: number;
  total: number;
  erros: Questao[];
  respostas: Record<number, string>;
  subjects: SubjectAnalysis[];
  actionPlan: ReturnType<typeof buildActionPlan>;
  nextBestAction: string;
}): ErrorReviewDraft {
  const linhasErro = args.erros.slice(0, 8).map((q) => {
    const minha = args.respostas[q.numero] || "sem resposta";
    return [
      `Q${q.numero} - ${q.materia} (${difficultyLabel(q.dificuldade)})`,
      `Minha resposta: ${minha}. Correta: ${q.gabarito}.`,
      `Causa provável: ${q.dificuldade === "facil" ? "atenção/conceito base" : q.dificuldade === "dificil" ? "encadeamento avançado" : "interpretação ou lacuna conceitual"}.`,
      `Correção: ${q.explicacao}`,
    ].join("\n");
  });

  const focos = args.subjects
    .filter(s => s.erros > 0)
    .slice(0, 3)
    .map(s => `- ${s.materia}: ${s.erros} erro(s), foco em ${s.habilidade}.`);

  const primarySubject = args.subjects.find(s => s.erros > 0) ?? args.subjects[0];
  const errorType = args.erros.some(q => q.dificuldade === "facil")
    ? "atenção/conceito base"
    : args.erros.some(q => q.dificuldade === "dificil")
      ? "encadeamento avançado"
      : args.erros.length
        ? "interpretação ou lacuna conceitual"
        : "manutenção de acertos";
  const subject = primarySubject?.materia ?? args.erros[0]?.materia ?? "revisão ENEM";
  const now = new Date();
  const nextReviewAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const reason = args.erros.length
    ? `${args.erros.length} erro(s) em ${subject}; padrão principal: ${errorType}.`
    : "Nenhum erro registrado; manter revisão espaçada e subir dificuldade.";
  const errors = args.erros.slice(0, 8).map((q) => ({
    questionNumber: q.numero,
    materia: q.materia,
    difficulty: difficultyLabel(q.dificuldade),
    selectedAnswer: args.respostas[q.numero] || "sem resposta",
    correctAnswer: q.gabarito,
    probableCause: q.dificuldade === "facil"
      ? "atenção/conceito base"
      : q.dificuldade === "dificil"
        ? "encadeamento avançado"
        : "interpretação ou lacuna conceitual",
    correction: q.explicacao,
    skill: HABILIDADES_POR_MATERIA[q.materia] ?? "habilidade ENEM associada ao tema",
    reviewAction: "Refazer a questão explicando o comando antes de olhar o gabarito.",
  }));

  return {
    title: `Caderno de erros - ENEM ${args.diaNome}`,
    materia: subject,
    content: [
      `Resultado: ${args.acertos}/${args.total} (${args.pct}%).`,
      `Próxima melhor ação: ${args.nextBestAction}`,
      "",
      "Focos por habilidade:",
      ...(focos.length ? focos : ["- Sem erros nesta tentativa. Manter revisão espaçada."]),
      "",
      "Erros comentados:",
      ...(linhasErro.length ? linhasErro : ["Nenhum erro registrado. Use este espaço para consolidar os acertos difíceis."]),
    ].join("\n"),
    createdAt: now.toISOString(),
    source: "simulado-enem",
    errorType,
    probableCause: args.actionPlan.cause,
    nextMission: args.nextBestAction,
    errors,
    subjectFocus: args.subjects
      .filter(s => s.erros > 0)
      .slice(0, 4)
      .map(s => ({
        materia: s.materia,
        errors: s.erros,
        accuracy: s.pct,
        skill: s.habilidade,
        focus: s.foco,
      })),
    telemetry: {
      surface: "simulado_enem",
      event: "error_review_draft_created",
      source: "simulado-enem",
      accuracy: args.pct,
      errors: args.erros.length,
      total: args.total,
      primarySubject: subject,
      nextReviewAt,
    },
    recommendation: {
      area: "sucesso_aluno",
      targetSurface: "caderno_erros",
      observedState: reason,
      problemOpportunity: "Erros de simulado precisam virar revisão curta e acionável, não apenas gabarito consultado uma vez.",
      recommendedChange: "Priorizar uma missão de reparo no Caderno e na Home com causa provável, habilidade e checagem.",
      expectedImpact: "Aumentar retorno ao caderno de erros e reduzir repetição do mesmo padrão de erro.",
      confidence: "medium",
      successMetric: "missao_revisao_erro_iniciada e revisao_erro_concluida",
      acceptanceCriteria: [
        "Caderno mostra tipo de erro e causa provável",
        "Home oferece revisão como próxima melhor ação",
        "Tiagão recebe prompt de revisão com matéria e padrão de erro",
      ],
    },
  };
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SimuladoEnemPage() {
  const [, navigate] = useLocation();
  const { isPremium } = useSubscription();
  const [fase, setFase] = useState<Fase>("selecionar");
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [qtd, setQtd] = useState(20);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [atual, setAtual] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tempoRestante, setTempoRestante] = useState(0);
  const [mostrarGabarito, setMostrarGabarito] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [recoveryMarkedDone, setRecoveryMarkedDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  async function gerarSimulado() {
    if (!diaSelecionado) return;
    setFase("gerando");
    setError(null);
    try {
      const res = await fetch("/api/simulado-enem/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dia: diaSelecionado, quantidade: qtd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao gerar");
      setQuestoes(data.questoes || []);
      setRespostas({});
      setAtual(0);
      setMostrarGabarito(false);
      setRecoveryMarkedDone(false);
      // Timer: qtd * 3.5 min por questão (ENEM tem ~7.3min/questão mas usamos menos por ser simulado)
      setTempoRestante(Math.round(qtd * 4 * 60));
      setFase("respondendo");
      timerRef.current = setInterval(() => {
        setTempoRestante(t => {
          if (t <= 1) { clearInterval(timerRef.current!); finalizarSimulado(); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch (e: any) {
      setError(e.message || "Erro desconhecido");
      setFase("selecionar");
    }
  }

  const finalizarSimulado = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const total = questoes.length;
    const erros = questoes.filter(q => respostas[q.numero] !== q.gabarito);
    const accuracy = total ? Math.round(((total - erros.length) / total) * 100) : 0;
    const diaInfo = DIAS_INFO.find(d => d.dia === diaSelecionado);
    const subjects = buildSubjectAnalysis(questoes, respostas);
    const skillPerformance = buildSkillPerformance(questoes, respostas, diaInfo);
    const errorPatterns = buildErrorPatterns(erros, respostas);
    const recoveryMission = buildRecoveryMission({ erros, subjects, skillPerformance, errorPatterns, pct: accuracy });
    const weakestSubject = subjects.find(subject => subject.erros > 0);
    const weakestSkill = skillPerformance.find(item => item.erros > 0);
    if (total > 0) {
      saveSimuladoRecoveryMission({
        title: recoveryMission.title,
        subject: weakestSkill?.label ?? weakestSubject?.materia ?? diaInfo?.nome ?? "ENEM",
        estimate: recoveryMission.estimatedTime,
        reason: recoveryMission.objective,
        evidence: recoveryMission.evidence,
        successCriterion: recoveryMission.check,
        primaryLabel: erros.length ? "Treinar recuperação" : "Consolidar acertos",
        tiagaoPrompt: [
          `Tiagão, entra no modo treinador e me ajuda com a recuperação do meu último simulado ENEM.`,
          `Resultado: ${accuracy}% de acerto, ${erros.length} erro(s).`,
          `Foco: ${weakestSkill?.label ?? weakestSubject?.materia ?? diaInfo?.nome ?? "revisão ENEM"}.`,
          `Missão: ${recoveryMission.title}.`,
          `Critério de sucesso: ${recoveryMission.check}`,
        ].join("\n"),
        createdAt: new Date().toISOString(),
        errorsCount: erros.length,
        accuracy,
        weakArea: weakestSubject?.materia ?? weakestSkill?.label ?? null,
      });
    }
    emitHermesLearningSignal({
      surface: "simulado_enem",
      event: "simulado_finalizado",
      dia: diaSelecionado,
      total,
      answered: Object.keys(respostas).length,
      errors: erros.length,
      accuracy,
      primarySubject: erros[0]?.materia ?? null,
      primaryPattern: errorPatterns[0]?.key ?? null,
      recoveryMission: {
        title: recoveryMission.title,
        estimatedTime: recoveryMission.estimatedTime,
        objective: recoveryMission.objective,
      },
      recommendation: buildSimuladoRecommendation({
        pct: accuracy,
        erros,
        subjects,
        skillPerformance,
        errorPatterns,
        recoveryMission,
      }),
    });
    setFase("resultado");
  }, [diaSelecionado, questoes, respostas]);

  function responder(alt: string) {
    setRespostas(r => ({ ...r, [questoes[atual].numero]: alt }));
  }

  function calcularResultado() {
    let acertos = 0;
    const erros: Questao[] = [];
    for (const q of questoes) {
      if (respostas[q.numero] === q.gabarito) acertos++;
      else erros.push(q);
    }
    const pct = Math.round((acertos / questoes.length) * 100);
    return { acertos, erros, pct, total: questoes.length };
  }

  if (!isPremium) {
    return (
      <Layout className="pt-0">
        <PageHeader
          icon={<GraduationCap />}
          title="Simulado ENEM Completo"
          subtitle="Fluxo premium com prova, diagnóstico e missão de recuperação."
          meta={<AppStatusBadge tone="amber">Recurso Premium</AppStatusBadge>}
          actions={
            <button onClick={() => navigate("/pricing")} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-700">
              Ver planos
            </button>
          }
        />

        <ContentArea maxWidth="6xl" className="py-8 lg:py-10">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              Recurso Premium
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight">
              Simulado ENEM Completo
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Simule os 4 dias do ENEM no mesmo padrão oficial — com cronômetro, gabarito comentado e análise de desempenho por área de conhecimento.
            </p>
          </div>

          {/* Preview Cards — 4 dias do ENEM */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {DIAS_INFO.map((d) => (
              <div key={d.dia} className={`rounded-2xl p-5 ${d.bg} border ${d.border} relative overflow-hidden`}>
                <div className="absolute top-3 right-3 opacity-20 text-4xl">{d.emoji}</div>
                <div className={`text-xs font-black uppercase tracking-wider mb-2 ${d.text}`}>Dia {d.dia}</div>
                <div className="text-base font-black text-slate-800 mb-1">{d.nome}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{d.materias}</div>
              </div>
            ))}
          </div>

          {/* Features list + CTA */}
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-800 mb-6">O que está incluso</h2>
              {[
                { icon: BookOpen, title: "Questões no padrão ENEM", desc: "Até 45 questões por área, geradas com contextos e linguagem oficial INEP" },
                { icon: Clock, title: "Cronômetro por sessão", desc: "Simule as condições reais — tempo controlado por área de conhecimento" },
                { icon: CheckCircle2, title: "Gabarito comentado", desc: "Cada alternativa explicada com justificativa detalhada após a submissão" },
                { icon: Trophy, title: "Análise de desempenho", desc: "Pontuação por matéria, taxa de acerto e identificação de pontos fracos" },
                { icon: RefreshCw, title: "Simulados ilimitados", desc: "Refaça quantas vezes quiser com novas questões geradas pela IA" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{title}</p>
                    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing card */}
            <div className="bg-white rounded-3xl border border-violet-100 shadow-xl shadow-violet-100/50 p-8 sticky top-24">
              <div className="text-center mb-6">
                <p className="text-sm font-bold text-violet-600 uppercase tracking-wider mb-2">StudyAI Premium</p>
                <div className="flex items-end justify-center gap-1 mb-1">
                  <span className="text-5xl font-black text-slate-800">R$29</span>
                  <span className="text-2xl font-black text-slate-800">,90</span>
                  <span className="text-slate-400 text-sm font-medium mb-1.5">/mês</span>
                </div>
                <p className="text-xs text-slate-400">ou R$249/ano — economize 30%</p>
              </div>

              <div className="space-y-2.5 mb-8">
                {[
                  "Simulados ENEM completos (4 dias)",
                  "Professor Tiagão por voz ilimitado",
                  "Caderno com RAG e busca semântica",
                  "Flashcards com repetição espaçada",
                  "Correção de redação ENEM (5 competências)",
                  "Aula com Professor na lousa interativa",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={async () => { setCheckoutLoading(true); try { await startCheckout(); } catch { navigate("/pricing"); } finally { setCheckoutLoading(false); } }}
                disabled={checkoutLoading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black text-base shadow-lg shadow-violet-200 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {checkoutLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Aguarde...</>
                ) : (
                  <>Assinar Premium — R$59,90/mês</>
                )}
              </button>

              <p className="text-center text-xs text-slate-400 mt-4">
                Cancele quando quiser. Sem fidelidade.
              </p>
            </div>
          </div>
        </ContentArea>
      </Layout>
    );
  }

  // ── SELEÇÃO DE DIA ────────────────────────────────────────────────────────
  if (fase === "selecionar") {
    return (
      <Layout className="pt-0">
        <PageHeader
          icon={<GraduationCap />}
          title="Simulado ENEM Completo"
          subtitle="Escolha a área, defina o tamanho e comece com critério claro."
          meta={
            <>
              <AppStatusBadge tone="violet">4 dias oficiais</AppStatusBadge>
              <AppStatusBadge tone="slate">{qtd} questões</AppStatusBadge>
            </>
          }
        />
        <ContentArea maxWidth="2xl" className="py-8">
          <AppMissionPanel
            title="Sua missão é simular uma área e sair com um plano de reparo."
            description="Ao finalizar, o resultado mostra status, padrões de erro, próxima ação e envio seguro para o Caderno."
            evidence="a tela de prova fica focada; o shell volta no resultado para orientar continuidade."
            status={<AppStatusBadge tone="emerald" className="border-white/25 bg-white/15 text-white">Fluxo guiado</AppStatusBadge>}
          />
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-800 mb-2">Escolha o Dia do ENEM</h1>
            <p className="text-slate-500">Selecione a área de conhecimento e simule o dia do exame</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {DIAS_INFO.map((d) => (
              <motion.button
                key={d.dia}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDiaSelecionado(d.dia)}
                className={cn(
                  "p-5 rounded-2xl border-2 text-left transition-all",
                  diaSelecionado === d.dia
                    ? `bg-gradient-to-br ${d.cor} text-white border-transparent shadow-lg`
                    : `bg-white ${d.border} hover:shadow-md`
                )}
              >
                <div className="text-3xl mb-2">{d.emoji}</div>
                <div className={cn("font-black text-lg", diaSelecionado === d.dia ? "text-white" : "text-slate-800")}>
                  Dia {d.dia} — {d.nome}
                </div>
                <div className={cn("text-xs mt-1 leading-relaxed", diaSelecionado === d.dia ? "text-white/80" : "text-slate-400")}>
                  {d.materias}
                </div>
              </motion.button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
            <h3 className="font-bold text-slate-700 mb-3">Número de questões</h3>
            <div className="flex gap-3 flex-wrap">
              {[10, 20, 30, 45].map(n => (
                <button
                  key={n}
                  onClick={() => setQtd(n)}
                  className={cn(
                    "px-4 py-2 rounded-xl font-bold text-sm transition-all",
                    qtd === n
                      ? "bg-violet-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {n} questões {n === 45 && "(ENEM real)"}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              ⏱️ Tempo estimado: {Math.round(qtd * 4)} minutos
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            onClick={gerarSimulado}
            disabled={!diaSelecionado}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black text-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🚀 Iniciar Simulado
          </button>
        </ContentArea>
      </Layout>
    );
  }

  // ── GERANDO ───────────────────────────────────────────────────────────────
  if (fase === "gerando") {
    const diaInfo = DIAS_INFO.find(d => d.dia === diaSelecionado)!;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-violet-50">
        <div className="text-center">
          <div className={cn("w-20 h-20 rounded-3xl bg-gradient-to-br mx-auto mb-6 flex items-center justify-center shadow-xl text-4xl", diaInfo.cor)}>
            {diaInfo.emoji}
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-800 mb-2">Gerando seu simulado...</h2>
          <p className="text-slate-500">Criando {qtd} questões de {diaInfo.nome}</p>
        </div>
      </div>
    );
  }

  // ── RESPONDENDO ───────────────────────────────────────────────────────────
  if (fase === "respondendo" && questoes.length > 0) {
    const q = questoes[atual];
    const respondida = respostas[q.numero];
    const respondidas = Object.keys(respostas).length;
    const diaInfo = DIAS_INFO.find(d => d.dia === diaSelecionado)!;

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold", diaInfo.bg, diaInfo.text)}>
                <span>{diaInfo.emoji}</span>
                <span className="hidden sm:inline">Dia {diaSelecionado} — {diaInfo.nome}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-sm tabular-nums",
                  tempoRestante < 300 ? "bg-red-100 text-red-700 animate-pulse" : "bg-slate-100 text-slate-700"
                )}>
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(tempoRestante)}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {respondidas}/{questoes.length}
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r transition-all", diaInfo.cor)}
                style={{ width: `${(respondidas / questoes.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={atual}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Question header */}
              <div className="flex items-center justify-between mb-4">
                <span className={cn("px-3 py-1 rounded-lg text-xs font-bold", diaInfo.bg, diaInfo.text)}>
                  {q.materia}
                </span>
                <span className={cn(
                  "px-2 py-1 rounded-lg text-xs font-bold",
                  q.dificuldade === "facil" ? "bg-green-50 text-green-700" :
                  q.dificuldade === "dificil" ? "bg-red-50 text-red-700" :
                  "bg-amber-50 text-amber-700"
                )}>
                  {q.dificuldade === "facil" ? "Fácil" : q.dificuldade === "dificil" ? "Difícil" : "Médio"}
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
                <p className="text-sm text-slate-500 font-semibold mb-2">Questão {q.numero} de {questoes.length}</p>
                {q.enunciado && (
                  <div className="bg-slate-50 rounded-xl p-4 mb-4 text-slate-700 text-sm leading-relaxed border border-slate-100">
                    {q.enunciado}
                  </div>
                )}
                <p className="font-semibold text-slate-800 leading-relaxed">{q.pergunta}</p>
              </div>

              {/* Alternativas */}
              <div className="space-y-2.5 mb-6">
                {Object.entries(q.alternativas).map(([letra, texto]) => (
                  <button
                    key={letra}
                    onClick={() => responder(letra)}
                    className={cn(
                      "w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                      respondida === letra
                        ? "border-violet-500 bg-violet-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/30"
                    )}
                  >
                    <span className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black",
                      respondida === letra ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      {letra}
                    </span>
                    <span className="text-sm text-slate-700 leading-relaxed pt-0.5">{texto}</span>
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setAtual(a => Math.max(0, a - 1))}
                  disabled={atual === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-40 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                {atual < questoes.length - 1 ? (
                  <button
                    onClick={() => setAtual(a => a + 1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-all"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={finalizarSimulado}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm shadow-md hover:opacity-90 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Finalizar ({respondidas}/{questoes.length})
                  </button>
                )}
              </div>

              {/* Mini map */}
              <div className="mt-6 p-4 bg-white rounded-2xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-2">Gabarito rápido</p>
                <div className="flex flex-wrap gap-1.5">
                  {questoes.map((q2, i) => (
                    <button
                      key={q2.numero}
                      onClick={() => setAtual(i)}
                      className={cn(
                        "w-7 h-7 rounded-lg text-xs font-bold transition-all",
                        i === atual ? "ring-2 ring-violet-500 ring-offset-1" : "",
                        respostas[q2.numero] ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {q2.numero}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── RESULTADO ─────────────────────────────────────────────────────────────
  if (fase === "resultado") {
    const { acertos, erros, pct, total } = calcularResultado();
    const diaInfo = DIAS_INFO.find(d => d.dia === diaSelecionado)!;
    const subjects = buildSubjectAnalysis(questoes, respostas);
    const skillPerformance = buildSkillPerformance(questoes, respostas, diaInfo);
    const explicitSkillPerformance = skillPerformance.filter(item => item.metadataSource === "question-bank");
    const errorPatterns = buildErrorPatterns(erros, respostas);
    const recoveryMission = buildRecoveryMission({ erros, subjects, skillPerformance, errorPatterns, pct });
    const weakestSubject = subjects.find(subject => subject.erros > 0);
    const weakestSkill = skillPerformance.find(item => item.erros > 0);
    const currentRecoverySignal: SimuladoRecoveryMission = {
      title: recoveryMission.title,
      subject: weakestSkill?.label ?? weakestSubject?.materia ?? diaInfo.nome,
      estimate: recoveryMission.estimatedTime,
      reason: recoveryMission.objective,
      evidence: recoveryMission.evidence,
      successCriterion: recoveryMission.check,
      primaryLabel: erros.length ? "Treinar recuperação" : "Consolidar acertos",
      tiagaoPrompt: [
        `Tiagão, entra no modo treinador e me ajuda com a recuperação do meu último simulado ENEM.`,
        `Resultado: ${pct}% de acerto, ${erros.length} erro(s).`,
        `Foco: ${weakestSkill?.label ?? weakestSubject?.materia ?? diaInfo.nome}.`,
        `Missão: ${recoveryMission.title}.`,
        `Critério de sucesso: ${recoveryMission.check}`,
      ].join("\n"),
      createdAt: new Date().toISOString(),
      errorsCount: erros.length,
      accuracy: pct,
      weakArea: weakestSubject?.materia ?? weakestSkill?.label ?? null,
    };
    const tri = estimatePedagogicalTri(pct, questoes, erros);
    const actionPlan = buildActionPlan(erros, subjects);
    const nivel = pct >= 80 ? { label: "Excelente! 🏆", cor: "text-emerald-700", bg: "bg-emerald-50" }
      : pct >= 60 ? { label: "Bom! 📈", cor: "text-violet-700", bg: "bg-violet-50" }
      : pct >= 40 ? { label: "Regular ✏️", cor: "text-amber-700", bg: "bg-amber-50" }
      : { label: "Precisa Melhorar 💪", cor: "text-rose-700", bg: "bg-rose-50" };

    return (
      <Layout className="pt-0">
        <PageHeader
          icon={<BarChart3 />}
          title="Resultado do Simulado"
          subtitle={`Dia ${diaSelecionado} — ${diaInfo.nome}. Diagnóstico, missão e continuidade.`}
          meta={
            <>
              <AppStatusBadge tone={pct >= 60 ? "emerald" : "amber"}>{pct}% de acerto</AppStatusBadge>
              <AppStatusBadge tone="rose">{erros.length} erro{erros.length !== 1 ? "s" : ""}</AppStatusBadge>
            </>
          }
          actions={
            <button onClick={() => setFase("selecionar")} className="flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-700">
              <RefreshCw className="w-3.5 h-3.5" />
              Novo Simulado
            </button>
          }
        />

        <ContentArea maxWidth="2xl" className="py-6">
          {/* Score card */}
          <div className={cn("rounded-3xl p-8 mb-6 text-center bg-gradient-to-br shadow-xl", diaInfo.cor)}>
            <div className="text-6xl font-black text-white mb-2">{pct}%</div>
            <div className="text-white/90 font-bold text-lg mb-1">{acertos} de {total} questões</div>
            <div className="text-white/70 text-sm">Dia {diaSelecionado} — {diaInfo.nome}</div>
          </div>

          <div className={cn("rounded-2xl p-4 mb-6 text-center border", nivel.bg)}>
            <span className={cn("font-black text-lg", nivel.cor)}>{nivel.label}</span>
          </div>

          {/* Premium analysis */}
          <div className="grid md:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-2xl border border-violet-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-violet-700 font-black text-sm mb-2">
                <BarChart3 className="w-4 h-4" />
                TRI pedagógico
              </div>
              <div className="text-3xl font-black text-slate-800">{tri.score}</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Estimativa interna: {tri.label}. Não substitui a TRI oficial do ENEM.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-amber-700 font-black text-sm mb-2">
                <Brain className="w-4 h-4" />
                Causa provável
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{actionPlan.cause}</p>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700 font-black text-sm mb-2">
                <Target className="w-4 h-4" />
                Próxima ação
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{actionPlan.nextBestAction}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-black text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-500" />
                Radiografia ENEM premium
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Desempenho por área e, quando o banco traz metadados, por competência e habilidade.
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Área do dia</p>
                    <p className="font-black text-slate-800">{diaInfo.areaOficial}</p>
                  </div>
                  <span className={cn(
                    "text-xs font-black px-2 py-1 rounded-lg",
                    pct >= 80 ? "bg-emerald-100 text-emerald-700" :
                      pct >= 60 ? "bg-violet-100 text-violet-700" :
                      "bg-rose-100 text-rose-700"
                  )}>
                    {pct}% na área
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {acertos}/{total} acertos. Use este diagnóstico para decidir se o próximo passo é consolidar a área ou reparar uma habilidade específica.
                </p>
              </div>

              {explicitSkillPerformance.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-3">
                  {explicitSkillPerformance.slice(0, 6).map(item => (
                    <div key={item.key} className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-[11px] font-black uppercase tracking-wide text-violet-700">
                          {item.kind === "competencia" ? "Competência" : item.kind === "habilidade" ? "Habilidade" : "Área"}
                        </span>
                        <span className="text-xs font-black text-slate-700">{item.pct}%</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 leading-snug">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.acertos}/{item.total} acertos · {item.focus}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                  <p className="text-sm font-bold text-amber-800">Banco sem competência/habilidade explícita nesta tentativa.</p>
                  <p className="text-xs text-amber-700 leading-relaxed mt-1">
                    Mantive a análise por matéria e área. Quando as questões vierem com campos de competência ou habilidade, esta seção passa a detalhar esses cortes automaticamente.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-[0.95fr_1.05fr] gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <h2 className="font-black text-slate-800 flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Padrões de erro
              </h2>
              {errorPatterns.length ? (
                <div className="space-y-3">
                  {errorPatterns.map(pattern => (
                    <div key={pattern.key} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="font-bold text-sm text-slate-800">{pattern.label}</p>
                        <span className={cn(
                          "text-[11px] font-black px-2 py-1 rounded-lg uppercase",
                          pattern.severity === "alta" ? "bg-rose-100 text-rose-700" :
                            pattern.severity === "media" ? "bg-amber-100 text-amber-700" :
                            "bg-violet-100 text-violet-700"
                        )}>
                          {pattern.count}x · {pattern.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{pattern.insight}</p>
                      <p className="text-xs font-semibold text-slate-700 mt-2">{pattern.action}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600 leading-relaxed">
                  Nenhum erro detectado. O padrão agora é manter consistência e aumentar a dificuldade no próximo bloco.
                </p>
              )}
            </div>

            <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl shadow-xl shadow-violet-100 p-5 text-white">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-white/70 mb-1">O que fazer agora</p>
                  <h2 className="text-xl font-black leading-tight">{recoveryMission.title}</h2>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-white/15 text-xs font-black whitespace-nowrap">
                  {recoveryMission.estimatedTime}
                </span>
              </div>
              <p className="text-sm text-white/85 leading-relaxed mb-3">{recoveryMission.objective}</p>
              <p className="text-xs text-white/70 mb-4">Evidência: {recoveryMission.evidence}</p>
              <ol className="space-y-2 mb-4">
                {recoveryMission.steps.map((step, index) => (
                  <li key={step} className="flex gap-2 text-sm leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="rounded-xl bg-white/10 border border-white/15 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-white/70 mb-1">Critério de conclusão</p>
                <p className="text-sm text-white/90 leading-relaxed">{recoveryMission.check}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  completeSimuladoRecoveryMission(currentRecoverySignal, "marked_done");
                  setRecoveryMarkedDone(true);
                  emitHermesLearningSignal({
                    surface: "simulado_enem",
                    event: "recovery_mission_marked_done",
                    subject: currentRecoverySignal.subject,
                    errors: currentRecoverySignal.errorsCount,
                    accuracy: currentRecoverySignal.accuracy,
                    successCriterion: currentRecoverySignal.successCriterion,
                  });
                }}
                disabled={recoveryMarkedDone}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-black text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/70"
              >
                <CheckCircle2 className="h-4 w-4" />
                {recoveryMarkedDone ? "Missão marcada como concluída" : "Marcar recuperação como feita"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-black text-slate-800 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-violet-500" />
                Plano de reparo premium
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Tiagão priorizou habilidades, erros e revisão para transformar o simulado em estudo guiado.
              </p>
            </div>
            <div className="p-4 grid md:grid-cols-[1.1fr_0.9fr] gap-4">
              <div className="space-y-2">
                {subjects.slice(0, 4).map(subject => (
                  <div key={subject.materia} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="font-bold text-sm text-slate-800">{subject.materia}</span>
                      <span className={cn(
                        "text-xs font-black px-2 py-1 rounded-lg",
                        subject.pct >= 80 ? "bg-emerald-100 text-emerald-700" :
                          subject.pct >= 60 ? "bg-violet-100 text-violet-700" :
                          "bg-rose-100 text-rose-700"
                      )}>
                        {subject.pct}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{subject.habilidade}</p>
                    <p className="text-xs font-semibold text-slate-600 mt-1">
                      {subject.acertos}/{subject.total} acertos · {subject.foco}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-violet-700 mb-2">Loop de caderno de erros</p>
                <ul className="space-y-2 mb-4">
                  {actionPlan.steps.map(step => (
                    <li key={step} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    const draft = buildErrorReviewDraft({
                      diaNome: diaInfo.nome,
                      pct,
                      acertos,
                      total,
                      erros,
                      respostas,
                      subjects,
                      actionPlan,
                      nextBestAction: actionPlan.nextBestAction,
                    });
                    const primarySubject = draft.materia || subjects.find(s => s.erros > 0)?.materia || diaInfo.nome;
                    const mission = {
                      title: `Revisar erros de ${primarySubject}`,
                      subject: primarySubject,
                      estimate: erros.length > 4 ? "25 min" : "15 min",
                      reason: draft.probableCause || actionPlan.cause,
                      primaryLabel: "Abrir caderno de erros",
                      tiagaoPrompt: buildTiagaoErrorReviewPrompt({
                        subject: primarySubject,
                        errorsCount: erros.length,
                        errorType: draft.errorType || "revisão ENEM",
                        reason: draft.probableCause || actionPlan.cause,
                      }),
                      source: "simulado-enem" as const,
                      createdAt: draft.createdAt || new Date().toISOString(),
                      errorsCount: erros.length,
                      accuracy: pct,
                      errorType: draft.errorType || "revisão ENEM",
                      nextReviewAt: String(draft.telemetry?.nextReviewAt || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()),
                    };
                    localStorage.setItem(SIMULADO_ERROR_REVIEW_DRAFT_KEY, JSON.stringify(draft));
                    saveErrorReviewMission(mission);
                    emitHermesLearningSignal({
                      ...draft.telemetry,
                      event: "error_review_sent_to_caderno",
                      recommendation: draft.recommendation,
                    });
                    navigate("/caderno");
                  }}
                  className="w-full py-3 rounded-xl bg-violet-600 text-white font-black text-sm hover:bg-violet-700 transition-all"
                >
                  Enviar erros para o caderno
                </button>
              </div>
            </div>
          </div>

          {/* Gabarito */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
            <button
              onClick={() => setMostrarGabarito(!mostrarGabarito)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-violet-500" />
                Ver gabarito e explicações ({erros.length} erro{erros.length !== 1 ? "s" : ""})
              </span>
              <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform", mostrarGabarito && "rotate-90")} />
            </button>
            <AnimatePresence>
              {mostrarGabarito && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {questoes.map(q => {
                      const minha = respostas[q.numero];
                      const certa = q.gabarito;
                      const acertou = minha === certa;
                      return (
                        <div key={q.numero} className={cn("p-4", acertou ? "bg-green-50/40" : "bg-red-50/40")}>
                          <div className="flex items-start gap-3">
                            {acertou
                              ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            }
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-700 mb-1">
                                Q{q.numero} — {q.materia}
                                {!acertou && <span className="ml-2 text-xs font-normal text-slate-500">
                                  Sua resposta: <span className="font-bold text-red-600">{minha || "—"}</span> · Correta: <span className="font-bold text-emerald-600">{certa}</span>
                                </span>}
                              </p>
                              {!acertou && (
                                <p className="text-xs text-slate-600 leading-relaxed mt-1">{q.explicacao}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setFase("selecionar")}
              className="flex-1 py-3 rounded-2xl bg-violet-600 text-white font-black hover:bg-violet-700 transition-all"
            >
              Fazer outro simulado
            </button>
            <button
              onClick={() => {
                const text = `📝 Simulado ENEM — Dia ${diaSelecionado} (${diaInfo.nome})\n✅ ${acertos}/${total} questões (${pct}%)\n\nPraticar em: study.ia.br`;
                if (navigator.share) navigator.share({ text }).catch(() => {});
                else navigator.clipboard.writeText(text);
              }}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </ContentArea>
      </Layout>
    );
  }

  return null;
}
