/**
 * Home — tela principal do app (/app)
 *
 * Tiagão como co-pilot central conversacional. Input grande + chips de intenção,
 * trilho secundário de 5 ferramentas, "continue de onde parou" + stats no rodapé.
 *
 * Comportamento do hero (independente do Tiagão — regra do fundador):
 *   - Hero input "Pesquisar" / Enter: busca INLINE via `/api/inline-search`.
 *     Resposta com fontes aparece em painel logo abaixo do hero. NÃO abre o
 *     Tiagão. O aluno encaminha explicitamente com botão "Levar pro Tiagão".
 *   - Botão paperclip: abre file-picker NATIVO; upload + análise INLINE via
 *     `/api/files/analyze` (PDF/DOCX/imagem etc). Texto extraído e resumo
 *     aparecem no mesmo painel inline, com botões separados "Salvar no
 *     Notebook" e "Pedir análise pro Tiagão".
 *   - Mic e botão flutuante: continuam abrindo o Tiagão (metáfora natural de
 *     voz). Veja eventos `studyai:open-voice` / `studyai:ask-tiagao` em
 *     VoiceProfessor.tsx.
 *   - Chips e cards do trilho disparam intents reais (criar_plano, navegação).
 *   - "Continue de onde parou" lê /api/history e reabre o plano via
 *     localStorage `studyai_restore_plan` (mesmo contrato do HomeLegacy).
 *   - Streak/XP vêm de /api/streak e /api/ranking.
 *   - Versão anterior do dashboard permanece disponível em /app/legacy.
 */

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  ArrowUp,
  Sparkles,
  CalendarDays,
  BookOpen,
  GraduationCap,
  NotebookPen,
  ListChecks,
  Flame,
  Trophy,
  Clock,
  ChevronRight,
  MessageCircle,
  Paperclip,
  Plus,
  Headphones,
  History,
  PlayCircle,
  Search,
  FileText,
  Loader2,
  X,
  AlertCircle,
  Send,
  Save,
} from "lucide-react";
import { TiagaoCharacter } from "@/components/TiagaoCharacter";
import { UserMenu } from "@/components/UserMenu";
import { MainMenuDrawer } from "@/components/MainMenuDrawer";
import { Logo } from "@/components/Logo";
import { VideoStrip, type VideoStripVideo } from "@/components/VideoStrip";
import {
  CitationListItem,
  CitationDetail,
  renderTextWithCitations,
  type Citation,
} from "@/components/CitationChip";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { triggerProfessorAction } from "@/lib/professor-events";

// Reconstrói o texto-conteúdo do plano (mesma rotina de HomeLegacy/History) —
// usada pra alimentar o passo "result" quando reabrimos um plano salvo.
function buildConteudoTextoFromPlan(plan: unknown): string {
  const p = (plan ?? {}) as {
    resumoDoConteudo?: string;
    dias?: Array<{
      titulo?: string;
      numero?: number;
      topicos?: Array<{
        nome?: string;
        explicacao?: string;
        exercicio?: { pergunta?: string; resposta?: string };
      }>;
    }>;
  };
  const parts: string[] = [];
  if (p.resumoDoConteudo) parts.push(p.resumoDoConteudo);
  if (Array.isArray(p.dias)) {
    for (const dia of p.dias) {
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

// ─── Dispatch helpers ─────────────────────────────────────────────────────────
// `openTiagao` e `askTiagao` continuam aqui — mas, no fluxo do hero do Home,
// SÓ rodam por ação explícita do aluno ("Levar pro Tiagão", chip de dúvida,
// mic, botão flutuante). Pesquisa de texto e upload de arquivo agora são
// independentes — vão por `/api/inline-search` e `/api/files/analyze` e
// renderizam neste mesmo Home.
function openTiagao() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("studyai:open-voice"));
}

function askTiagao(text: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("studyai:ask-tiagao", { detail: { text } }),
  );
}

// ─── Inline-search / file-analyze tipos ──────────────────────────────────────
type RagProvider =
  | "semantic-scholar" | "scielo" | "wikipedia"
  | "wikidata" | "ibge" | "arxiv" | "crossref";

// Citation com metadados extra do backend (ragProvider real). Compatível com
// `Citation` do CitationChip porque `ragProvider` é opcional e ignorado lá.
type InlineCitation = Citation & { ragProvider?: RagProvider };

type SearchResult = {
  query: string;
  answer: string;
  citations: InlineCitation[];
  providers: RagProvider[];
};

type FileAnalysis = {
  filename: string;
  mimeType: string;
  kind: string;
  sizeKb: number;
  chars: number;
  extractedText: string;
  summary: string;
};

const ACCEPTED_FILE_TYPES = [
  ".pdf", ".doc", ".docx", ".pptx", ".xlsx", ".csv", ".txt", ".epub",
  ".jpg", ".jpeg", ".png", ".webp",
].join(",");

const MAX_INLINE_FILE_MB = 25;

function formatKb(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// Heurística leve para decidir se vale a pena buscar vídeos para essa query.
// Regras:
//  • Mínimo 8 chars (queries curtas, ex. "olá", costumam ser conversacionais).
//  • Não chama em perguntas yes/no (começo com "é/eh/tem/posso/pode/vai/vou…").
//  • Não chama quando a query parece pessoal/conversacional ("eu", "minha").
// É só um filtro de custo para não estourar a quota Google em buscas triviais
// e para não jogar uma strip de vídeos numa pergunta tipo "como vai?".
const VIDEO_QUERY_BLOCK_RE = /^(é|eh|tem|posso|pode|vai|vou|quero|consigo|sabe|sabia|conhece|conheces|me\s+|minha\s+|meu\s+|sou\s+|tô\s+|estou\s+)/i;
function shouldFetchVideos(query: string): boolean {
  const q = (query ?? "").trim();
  if (q.length < 8) return false;
  if (VIDEO_QUERY_BLOCK_RE.test(q)) return false;
  return true;
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────
type Suggestion = {
  key: string;
  label: string;
  icon: typeof Sparkles;
  tone: "violet" | "fuchsia" | "indigo" | "pink";
  /** Disparado quando o usuário clica no chip. */
  action: (nav: (to: string) => void) => void;
};

const TONE_CLASSES: Record<Suggestion["tone"], string> = {
  violet:
    "border-violet-200/70 bg-violet-50/60 text-violet-700 hover:bg-violet-100 hover:border-violet-300",
  fuchsia:
    "border-fuchsia-200/70 bg-fuchsia-50/60 text-fuchsia-700 hover:bg-fuchsia-100 hover:border-fuchsia-300",
  indigo:
    "border-indigo-200/70 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300",
  pink:
    "border-pink-200/70 bg-pink-50/60 text-pink-700 hover:bg-pink-100 hover:border-pink-300",
};

const SUGGESTIONS: Suggestion[] = [
  {
    key: "plano",
    label: "Criar plano de estudos",
    icon: ListChecks,
    tone: "violet",
    action: (nav) => {
      // Plan-builder UI vive no HomeLegacy — abrimos o Tiagão (que sabe gerar
      // planos por conversa) e, em paralelo, navegamos pro builder clássico via
      // deep-link `?criar=1` para quem prefere preencher o formulário.
      triggerProfessorAction("criar_plano", "");
      askTiagao(
        "Quero montar um plano de estudos. Pode me ajudar a definir o tema, os dias e o tempo disponível?",
      );
      nav("/app/legacy?criar=1");
    },
  },
  {
    key: "simulado",
    label: "Fazer um simulado ENEM",
    icon: GraduationCap,
    tone: "fuchsia",
    action: (nav) => nav("/simulado-enem"),
  },
  {
    key: "duvida-mat",
    label: "Tirar dúvida de matemática",
    icon: Sparkles,
    tone: "indigo",
    action: () =>
      askTiagao("Tô com uma dúvida de matemática, pode me ajudar?"),
  },
  {
    key: "redacao",
    label: "Corrigir minha redação",
    icon: NotebookPen,
    tone: "pink",
    action: (nav) => nav("/redacao"),
  },
];

// ─── Rail cards ───────────────────────────────────────────────────────────────
type RailCard = {
  key: string;
  title: string;
  subtitle: string;
  banner: string;
  accent: string;
  icon: typeof Sparkles;
  action: (nav: (to: string) => void) => void;
};

const RAIL: RailCard[] = [
  {
    key: "plano",
    title: "Criar Plano",
    subtitle: "A partir do seu material",
    banner: "/banners/plano-estudos-hero.png",
    accent: "from-violet-500 to-fuchsia-500",
    icon: ListChecks,
    action: (nav) => {
      // Mesma intent que o chip — abre Tiagão + builder clássico.
      triggerProfessorAction("criar_plano", "");
      nav("/app/legacy?criar=1");
    },
  },
  {
    key: "simulado",
    title: "Simulado ENEM",
    subtitle: "Treino oficial cronometrado",
    banner: "/banners/simulado-enem-hero.png",
    accent: "from-fuchsia-500 to-pink-500",
    icon: GraduationCap,
    action: (nav) => nav("/simulado-enem"),
  },
  {
    key: "cronograma",
    title: "Cronograma",
    subtitle: "Sua rotina semanal",
    banner: "/banners/cronograma-hero.png",
    accent: "from-indigo-500 to-violet-500",
    icon: CalendarDays,
    action: (nav) => nav("/cronograma"),
  },
  {
    key: "notebook",
    title: "Notebook RAG",
    subtitle: "Estude com seus PDFs",
    banner: "/banners/notebook-rag-hero.png",
    accent: "from-cyan-500 to-indigo-500",
    icon: BookOpen,
    action: (nav) => nav("/notebook"),
  },
  {
    key: "tiagao",
    title: "Professor Tiagão",
    subtitle: "Aula completa por voz",
    banner: "/banners/professor-tiagao-hero.png",
    accent: "from-pink-500 to-violet-600",
    icon: MessageCircle,
    action: () => openTiagao(),
  },
];

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────
type RecentPlan = {
  id: string;
  materia: string;
  plan: {
    aluno?: string;
    materia?: string;
    emoji?: string;
    cor?: string;
    dias?: unknown[];
    resumoDoConteudo?: string;
  } & Record<string, unknown>;
  createdAt: string;
};

type Stats = {
  streak: number | null;
  xp: number | null;
};

// ─── Página ───────────────────────────────────────────────────────────────────
export default function Home() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { profile } = useStudentProfile();

  const [draft, setDraft] = useState("");
  const [recentPlans, setRecentPlans] = useState<RecentPlan[]>([]);
  const [stats, setStats] = useState<Stats>({ streak: null, xp: null });
  const [tiagaoSize, setTiagaoSize] = useState<number>(160);

  // Estado do painel INLINE (busca + upload). Os dois canais coexistem — se o
  // aluno faz uma busca e depois sobe um arquivo, ambos ficam visíveis em
  // seções distintas do painel. Cada um tem seu botão "Limpar".
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  // Vídeos educacionais (YouTube embed-only) buscados em paralelo. Fire-and-
  // forget: a busca dispara junto com /api/inline-search mas não bloqueia o
  // pipeline da resposta principal. Se chegar tarde, aparece quando aparecer.
  const [searchVideos, setSearchVideos] = useState<VideoStripVideo[]>([]);
  const [searchVideosQuery, setSearchVideosQuery] = useState<string>("");

  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [savingToNotebook, setSavingToNotebook] = useState(false);
  const [savedDocId, setSavedDocId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inlineSectionRef = useRef<HTMLDivElement | null>(null);

  // Aborta requisições em vôo quando uma nova começa ou o componente desmonta.
  const searchAbortRef = useRef<AbortController | null>(null);
  const fileAbortRef = useRef<AbortController | null>(null);
  const videosAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => {
    searchAbortRef.current?.abort();
    fileAbortRef.current?.abort();
    videosAbortRef.current?.abort();
  }, []);

  // Mobile: avatar do Tiagão menor para não dominar a tela.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setTiagaoSize(mq.matches ? 120 : 160);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // ── Stats (streak + xp) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let aborted = false;
    (async () => {
      try {
        const [streakRes, rankRes] = await Promise.all([
          fetch("/api/streak", { credentials: "include" }),
          fetch("/api/ranking", { credentials: "include" }),
        ]);
        const streakJson = streakRes.ok ? await streakRes.json() : {};
        const rankJson = rankRes.ok ? await rankRes.json() : {};
        if (aborted) return;
        setStats({
          streak:
            typeof streakJson?.currentStreak === "number"
              ? streakJson.currentStreak
              : null,
          xp:
            typeof rankJson?.currentUser?.xp === "number"
              ? rankJson.currentUser.xp
              : null,
        });
      } catch {
        // silent — stats are best-effort
      }
    })();
    return () => { aborted = true; };
  }, [isAuthenticated, authLoading]);

  // ── Histórico recente para "Continue de onde parou" ─────────────────────────
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setRecentPlans([]);
      return;
    }
    let aborted = false;
    fetch("/api/history", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (aborted) return;
        if (Array.isArray(d?.plans)) {
          setRecentPlans(d.plans.slice(0, 3) as RecentPlan[]);
        }
      })
      .catch(() => {});
    return () => { aborted = true; };
  }, [isAuthenticated, authLoading]);

  // ── Greeting ────────────────────────────────────────────────────────────────
  const firstName = useMemo(() => {
    const raw = profile?.nome?.trim();
    if (raw && raw !== "Herói" && raw !== "Estudante") {
      return raw.split(" ")[0] || raw;
    }
    return "aluno";
  }, [profile?.nome]);

  const resumeTarget = recentPlans[0] ?? null;

  // ── Handlers ────────────────────────────────────────────────────────────────
  // Send / Enter → BUSCA INLINE. Não abre Tiagão. O aluno pode encaminhar
  // depois com botão "Levar pro Tiagão" no painel de resultado.
  const submitDraft = useCallback(async () => {
    const text = draft.trim();
    if (!text || searchLoading) return;

    searchAbortRef.current?.abort();
    const ctrl = new AbortController();
    searchAbortRef.current = ctrl;

    setSearchLoading(true);
    setSearchError(null);
    // Mantém o painel aberto com a query corrente — útil pro skeleton.
    setSearchResult((prev) => prev ? { ...prev, query: text } : null);

    // Vídeos: limpa o estado anterior e dispara em paralelo (fire-and-forget)
    // apenas quando a query "merece" um vídeo (ver `shouldFetchVideos`). Não
    // bloqueia o `/api/inline-search`; resolve depois se chegar.
    videosAbortRef.current?.abort();
    setSearchVideos([]);
    setSearchVideosQuery(text);
    if (shouldFetchVideos(text)) {
      const vctrl = new AbortController();
      videosAbortRef.current = vctrl;
      void (async () => {
        try {
          const vres = await fetch("/api/videos/search", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: text, limit: 3 }),
            signal: vctrl.signal,
          });
          if (!vres.ok) return;
          const vdata = (await vres.json().catch(() => null)) as
            | { videos?: VideoStripVideo[] }
            | null;
          if (vctrl.signal.aborted) return;
          const list = Array.isArray(vdata?.videos) ? vdata!.videos! : [];
          setSearchVideos(list.filter((v) => v?.videoId));
        } catch {
          // Silencioso por design — vídeos são "nice-to-have"; uma falha
          // aqui jamais derruba a busca principal.
        }
      })();
    }

    try {
      const r = await fetch("/api/inline-search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
        signal: ctrl.signal,
      });
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        throw new Error(errBody?.erro || `Erro HTTP ${r.status}`);
      }
      const data = await r.json() as SearchResult;
      if (ctrl.signal.aborted) return;
      setSearchResult({
        query: data.query ?? text,
        answer: data.answer ?? "",
        citations: Array.isArray(data.citations) ? data.citations : [],
        providers: Array.isArray(data.providers) ? data.providers : [],
      });
      setDraft("");
      // Rola até o painel inline pra dar feedback visual.
      requestAnimationFrame(() => {
        inlineSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setSearchError(msg);
    } finally {
      if (!ctrl.signal.aborted) setSearchLoading(false);
    }
  }, [draft, searchLoading]);

  const onHeroKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitDraft();
    }
  };

  // ── File upload + análise INLINE ────────────────────────────────────────────
  const openFilePicker = useCallback(() => {
    if (fileLoading) return;
    fileInputRef.current?.click();
  }, [fileLoading]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    // Reseta o input pra permitir re-upload do mesmo arquivo.
    e.target.value = "";
    if (!f) return;

    if (f.size > MAX_INLINE_FILE_MB * 1024 * 1024) {
      setFileError(`Arquivo muito grande (máx ${MAX_INLINE_FILE_MB} MB).`);
      return;
    }

    fileAbortRef.current?.abort();
    const ctrl = new AbortController();
    fileAbortRef.current = ctrl;

    setFileLoading(true);
    setFileError(null);
    setFileAnalysis(null);
    setSavedDocId(null);

    const fd = new FormData();
    fd.append("file", f);

    try {
      const r = await fetch("/api/files/analyze", {
        method: "POST",
        credentials: "include",
        body: fd,
        signal: ctrl.signal,
      });
      const data = await r.json().catch(() => null) as (FileAnalysis & { erro?: string }) | null;
      if (!r.ok || !data) {
        throw new Error(data?.erro || `Erro HTTP ${r.status}`);
      }
      if (ctrl.signal.aborted) return;
      setFileAnalysis(data);
      requestAnimationFrame(() => {
        inlineSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      if (ctrl.signal.aborted) return;
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setFileError(msg);
    } finally {
      if (!ctrl.signal.aborted) setFileLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    searchAbortRef.current?.abort();
    videosAbortRef.current?.abort();
    setSearchResult(null);
    setSearchError(null);
    setSearchLoading(false);
    setSearchVideos([]);
    setSearchVideosQuery("");
  }, []);

  const clearFile = useCallback(() => {
    fileAbortRef.current?.abort();
    setFileAnalysis(null);
    setFileError(null);
    setFileLoading(false);
    setSavedDocId(null);
  }, []);

  // Encaminhamento EXPLÍCITO ao Tiagão (única forma do Home enviar pra lá).
  const forwardSearchToTiagao = useCallback(() => {
    if (!searchResult) return;
    askTiagao(searchResult.query);
  }, [searchResult]);

  const forwardFileToTiagao = useCallback(() => {
    if (!fileAnalysis) return;
    const head = fileAnalysis.extractedText.slice(0, 4000);
    askTiagao(
      `Subi o arquivo "${fileAnalysis.filename}" aqui no Home. Pode analisar com mais profundidade pra mim?\n\n--- INÍCIO DO CONTEÚDO ---\n${head}\n--- FIM ---`,
    );
  }, [fileAnalysis]);

  const saveFileToNotebook = useCallback(async () => {
    if (!fileAnalysis || savingToNotebook) return;
    // Re-anexa o arquivo do input… mas o input já foi resetado. Pra evitar
    // pedir o arquivo de novo, salvamos via `upload-text` (que aceita o texto
    // já extraído). É mais barato e usa o mesmo pipeline RAG do Notebook.
    setSavingToNotebook(true);
    try {
      const r = await fetch("/api/notebook/upload-text", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fileAnalysis.filename,
          content: fileAnalysis.extractedText,
        }),
      });
      const data = await r.json().catch(() => ({})) as { id?: number; erro?: string };
      if (!r.ok) throw new Error(data?.erro || `Erro HTTP ${r.status}`);
      setSavedDocId(data.id ?? -1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setFileError(`Não foi possível salvar no Notebook: ${msg}`);
    } finally {
      setSavingToNotebook(false);
    }
  }, [fileAnalysis, savingToNotebook]);

  const handleResume = (plan: RecentPlan["plan"]) => {
    // Mesmo contrato usado pelo History.tsx → HomeLegacy.tsx restaura o plano
    // a partir desse storage e abre o passo "result" automaticamente.
    try {
      const conteudoTexto = buildConteudoTextoFromPlan(plan);
      localStorage.setItem(
        "studyai_restore_plan",
        JSON.stringify({ plano: plan, conteudoTexto }),
      );
    } catch {
      // ignore — quota / private mode
    }
    navigate("/app/legacy");
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-violet-50/70 via-white to-fuchsia-50/40">
      {/* ── Background decorativo ─────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-violet-300/30 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 h-[26rem] w-[26rem] rounded-full bg-fuchsia-300/25 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-indigo-200/30 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(rgba(0,0,0,0.7) 1px, transparent 1px)",
            backgroundSize: "3px 3px",
          }}
        />
      </div>

      {/* ── Top bar slim ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-14 border-b border-violet-100/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <MainMenuDrawer />
            <button
              type="button"
              onClick={() => navigate("/app")}
              className="flex items-center group"
              aria-label="Início"
            >
              <Logo variant="horizontal" className="h-8 w-auto" alt="Study.IA" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {typeof stats.streak === "number" && stats.streak > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1 text-xs font-bold text-amber-700">
                <Flame className="h-3.5 w-3.5" />
                {stats.streak} {stats.streak === 1 ? "dia" : "dias"}
              </span>
            )}
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-32 pt-6 sm:px-6 lg:gap-12 lg:pt-10">
        {/* ── Hero / Tiagão central ─────────────────────────────────────── */}
        <section className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[2rem] border border-violet-200/60 bg-white/70 p-6 shadow-xl shadow-violet-300/40 backdrop-blur-2xl sm:p-10 lg:p-14"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
              <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-400/20 blur-3xl" />
              <div className="absolute -bottom-20 right-1/4 h-60 w-60 rounded-full bg-fuchsia-400/20 blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-6 text-center lg:gap-8">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: "backOut" }}
              >
                <TiagaoCharacter state="idle" size={tiagaoSize} showLabel={false} />
              </motion.div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-500">
                  Seu co-pilot de estudos
                </p>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                  Oi, {firstName}!{" "}
                  <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-purple-700 bg-clip-text text-transparent">
                    O que vamos estudar hoje?
                  </span>
                </h1>
                <p className="mx-auto max-w-xl text-sm text-slate-500 sm:text-base">
                  Pesquise aqui ou suba um arquivo — a resposta aparece nesta
                  tela. Quando quiser uma aula completa, fale com o Tiagão pelo
                  microfone.
                </p>
              </div>

              {/* Input premium */}
              <div className="w-full max-w-3xl">
                <form
                  onSubmit={(e) => { e.preventDefault(); void submitDraft(); }}
                  className="group relative rounded-3xl border-2 border-violet-200/70 bg-white shadow-2xl shadow-violet-300/40 transition focus-within:border-violet-400 focus-within:shadow-violet-400/40"
                >
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onHeroKeyDown}
                    placeholder="Pesquise aqui… ex: 'o que é fotossíntese' ou 'lei de Ohm com exemplos'"
                    rows={2}
                    aria-label="Pesquisar"
                    className="block w-full resize-none rounded-3xl bg-transparent px-5 pt-5 pb-2 text-[15px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none sm:text-base"
                  />
                  <div className="flex items-center justify-between gap-2 px-3 pb-3">
                    <div className="flex items-center gap-1">
                      {/* Paperclip → file picker NATIVO. Upload e análise rolam
                          inline neste mesmo Home (não abre o Tiagão). Veja
                          handleFileChange / openFilePicker. */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_FILE_TYPES}
                        onChange={handleFileChange}
                        className="hidden"
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={openFilePicker}
                        disabled={fileLoading}
                        title="Subir PDF, Word, planilha ou imagem para analisar aqui"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-violet-50 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {fileLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/historico")}
                        title="Histórico de planos"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-violet-50 hover:text-violet-600"
                      >
                        <History className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openTiagao()}
                        title="Falar com o Tiagão"
                        className="group/mic relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 shadow-sm transition hover:scale-105 hover:from-violet-200 hover:to-fuchsia-200"
                      >
                        <span className="absolute inset-0 rounded-2xl border border-violet-300/50" />
                        <Mic className="h-4 w-4" />
                      </button>
                      <button
                        type="submit"
                        disabled={!draft.trim() || searchLoading}
                        title="Pesquisar — resposta com fontes aparece logo abaixo"
                        className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 font-bold text-white shadow-lg shadow-violet-500/40 transition hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/50 active:scale-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                      >
                        <span className="hidden text-sm sm:inline">
                          {searchLoading ? "Buscando" : "Pesquisar"}
                        </span>
                        {searchLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                        ) : (
                          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Chips */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <motion.button
                      key={s.key}
                      type="button"
                      onClick={() => s.action(navigate)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={`inline-flex items-center gap-2 rounded-full border bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur transition ${TONE_CLASSES[s.tone]}`}
                    >
                      <s.icon className="h-4 w-4" />
                      {s.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Inline results (busca + análise de arquivo) ───────────────── */}
        <InlineResultsSection
          ref={inlineSectionRef}
          searchResult={searchResult}
          searchLoading={searchLoading}
          searchError={searchError}
          onClearSearch={clearSearch}
          onForwardSearch={forwardSearchToTiagao}
          fileAnalysis={fileAnalysis}
          fileLoading={fileLoading}
          fileError={fileError}
          onClearFile={clearFile}
          onForwardFile={forwardFileToTiagao}
          onSaveFile={saveFileToNotebook}
          savingToNotebook={savingToNotebook}
          savedDocId={savedDocId}
        />

        {/* Vídeos educacionais (YouTube embed-only) — aparecem abaixo da
            resposta inline quando o fire-and-forget /api/videos/search retorna
            ao menos 1 vídeo. Não bloqueia a resposta principal. */}
        {searchResult && !searchLoading && searchVideos.length > 0 && (
          <section aria-label="Vídeos relacionados" className="-mt-1">
            <VideoStrip
              videos={searchVideos}
              title={
                searchVideosQuery
                  ? `Vídeos sobre ${searchVideosQuery}`
                  : "Vídeos recomendados"
              }
            />
          </section>
        )}

        {/* ── Secondary rail ────────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Acesso direto
              </p>
              <h2 className="text-lg font-black text-slate-800 sm:text-xl">
                Ou pule direto para uma ferramenta
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/historico")}
              className="hidden items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 sm:flex"
            >
              Ver histórico <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {RAIL.map((c, i) => (
              <motion.button
                key={c.key}
                type="button"
                onClick={() => c.action(navigate)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.35, ease: "easeOut" }}
                whileHover={{ y: -4 }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-violet-200/60 bg-white/80 p-3 text-left shadow-md shadow-violet-200/40 backdrop-blur transition hover:scale-[1.02] hover:border-violet-300 hover:shadow-xl hover:shadow-violet-300/40"
              >
                <div className="relative mb-2.5 h-20 w-full overflow-hidden rounded-xl bg-slate-100">
                  <img
                    src={c.banner}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  <div
                    className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${c.accent} text-white shadow-lg`}
                  >
                    <c.icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-black leading-tight text-slate-900">
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {c.subtitle}
                  </p>
                </div>
                <span className="pointer-events-none absolute inset-x-3 bottom-2 h-px origin-left scale-x-0 bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-transform duration-300 group-hover:scale-x-100" />
              </motion.button>
            ))}
          </div>
        </section>

        {/* ── Continue + stats ──────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
              De onde você parou
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr,1fr,1fr,1fr]">
            <ResumeCard plan={resumeTarget} onResume={handleResume} onNavigate={navigate} />

            <StatChip
              icon={Flame}
              label="Streak"
              value={
                stats.streak == null
                  ? "—"
                  : `${stats.streak} ${stats.streak === 1 ? "dia" : "dias"}`
              }
              tone="from-orange-400 to-rose-500"
            />
            <StatChip
              icon={Trophy}
              label="XP total"
              value={
                stats.xp == null ? "—" : stats.xp.toLocaleString("pt-BR")
              }
              tone="from-amber-400 to-yellow-500"
            />
            <StatChip
              icon={Clock}
              label="Próxima sessão"
              value={resumeTarget ? "Continuar agora" : "Quando quiser"}
              tone="from-violet-500 to-indigo-500"
            />
          </div>
        </section>
      </main>

      {/* ── Floating voice button ─────────────────────────────────────────── */}
      <FloatingVoiceButton onClick={() => openTiagao()} />
    </div>
  );
}

// ─── Resume card ──────────────────────────────────────────────────────────────
function ResumeCard({
  plan,
  onResume,
  onNavigate,
}: {
  plan: RecentPlan | null;
  onResume: (plan: RecentPlan["plan"]) => void;
  onNavigate: (to: string) => void;
}) {
  if (!plan) {
    return (
      <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-violet-200 bg-white/60 p-4 text-left shadow-sm">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-400">
            Continue de onde parou
          </p>
          <p className="text-sm font-bold text-slate-700">
            Você ainda não começou nenhuma trilha
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Escolha um caminho acima ou peça um plano ao Tiagão.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("/app/legacy?criar=1")}
          className="hidden shrink-0 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700 sm:inline-flex"
        >
          Criar plano
        </button>
      </div>
    );
  }

  const dias = Array.isArray(plan.plan?.dias) ? plan.plan.dias.length : 0;
  const emoji = (plan.plan?.emoji as string) || "📚";
  const cor = (plan.plan?.cor as string) || "#8B5CF6";

  return (
    <motion.button
      type="button"
      onClick={() => onResume(plan.plan)}
      whileHover={{ y: -2 }}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-white to-violet-50/40 p-4 text-left shadow-md shadow-violet-200/30 transition hover:shadow-lg"
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl shadow-lg"
        style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
      >
        <span aria-hidden>{emoji}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-violet-500">
          Continue de onde parou
        </p>
        <p className="truncate text-sm font-black text-slate-900">
          {plan.materia || "Plano salvo"}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
          <PlayCircle className="h-3 w-3" />
          {dias > 0 ? `${dias} dia${dias !== 1 ? "s" : ""} no plano` : "Retomar agora"}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-violet-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
    </motion.button>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-violet-200/60 bg-white/70 p-4 shadow-sm shadow-violet-200/20 backdrop-blur transition hover:border-violet-300 hover:shadow-md">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-md`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
}

// ─── Inline results (busca + análise de arquivo) ─────────────────────────────
// Painel logo abaixo do hero. Aparece somente quando há resultado, loading ou
// erro em algum dos dois canais (busca textual / arquivo). Os dois canais são
// independentes — cada um com seu "Limpar" e seu "Levar pro Tiagão". Esse é
// o módulo "pesquisa/análise inline" que a regra do fundador exige.
type InlineResultsSectionProps = {
  searchResult: SearchResult | null;
  searchLoading: boolean;
  searchError: string | null;
  onClearSearch: () => void;
  onForwardSearch: () => void;
  fileAnalysis: FileAnalysis | null;
  fileLoading: boolean;
  fileError: string | null;
  onClearFile: () => void;
  onForwardFile: () => void;
  onSaveFile: () => void;
  savingToNotebook: boolean;
  savedDocId: number | null;
};

const InlineResultsSection = forwardRef<HTMLDivElement, InlineResultsSectionProps>(
  function InlineResultsSection(props, ref) {
    const {
      searchResult, searchLoading, searchError, onClearSearch, onForwardSearch,
      fileAnalysis, fileLoading, fileError, onClearFile, onForwardFile,
      onSaveFile, savingToNotebook, savedDocId,
    } = props;

    const hasSearch = searchLoading || !!searchResult || !!searchError;
    const hasFile = fileLoading || !!fileAnalysis || !!fileError;
    if (!hasSearch && !hasFile) return null;

    return (
      <section ref={ref} aria-label="Resultados inline" className="space-y-4">
        <AnimatePresence initial={false}>
          {hasSearch && (
            <motion.div
              key="search-card"
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 4, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <SearchResultCard
                result={searchResult}
                loading={searchLoading}
                error={searchError}
                onClear={onClearSearch}
                onForward={onForwardSearch}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {hasFile && (
            <motion.div
              key="file-card"
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 4, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <FileAnalysisCard
                analysis={fileAnalysis}
                loading={fileLoading}
                error={fileError}
                onClear={onClearFile}
                onForward={onForwardFile}
                onSave={onSaveFile}
                saving={savingToNotebook}
                savedDocId={savedDocId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    );
  },
);

function SearchResultCard({
  result, loading, error, onClear, onForward,
}: {
  result: SearchResult | null;
  loading: boolean;
  error: string | null;
  onClear: () => void;
  onForward: () => void;
}) {
  const [openCitNumero, setOpenCitNumero] = useState<number | null>(null);

  return (
    <article className="rounded-2xl border border-violet-200/70 bg-white/80 p-5 shadow-md shadow-violet-200/40 backdrop-blur-xl sm:p-6">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
            <Search className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
              Busca inline
            </p>
            <p className="truncate text-sm font-black text-slate-900">
              {result?.query || "Pesquisando…"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          title="Limpar busca"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Limpar busca"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {loading && (
        <div className="space-y-2">
          <div className="h-3 w-5/6 animate-pulse rounded bg-violet-100" />
          <div className="h-3 w-full animate-pulse rounded bg-violet-100" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-violet-100" />
          <div className="h-3 w-3/6 animate-pulse rounded bg-violet-100" />
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Buscando em fontes confiáveis…
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2.5 text-[12px] text-rose-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0 leading-snug">{error}</div>
        </div>
      )}

      {!loading && !error && result && (
        <>
          <div className="max-w-none whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-800 sm:text-sm">
            {renderTextWithCitations(result.answer || "Sem resposta.", result.citations, {
              openNumero: openCitNumero,
              onChipClick: (c) =>
                setOpenCitNumero((n) => (n === c.numero ? null : c.numero)),
            })}
          </div>

          {result.citations.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Fontes consultadas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.citations.map((c) => (
                  <CitationListItem
                    key={c.numero}
                    citation={c}
                    isOpen={openCitNumero === c.numero}
                    onClick={() =>
                      setOpenCitNumero((n) => (n === c.numero ? null : c.numero))
                    }
                  />
                ))}
              </div>
              <AnimatePresence>
                {openCitNumero !== null && (() => {
                  const c = result.citations.find((x) => x.numero === openCitNumero);
                  if (!c) return null;
                  return (
                    <CitationDetail
                      citation={c}
                      onClose={() => setOpenCitNumero(null)}
                    />
                  );
                })()}
              </AnimatePresence>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onForward}
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50/70 px-3 py-1.5 text-[12px] font-bold text-violet-700 transition hover:bg-violet-100 hover:border-violet-300"
              title="Encaminhar essa pergunta pro Tiagão"
            >
              <Send className="h-3.5 w-3.5" />
              Levar pro Tiagão
            </button>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Limpar
            </button>
          </div>
        </>
      )}
    </article>
  );
}

function FileAnalysisCard({
  analysis, loading, error, onClear, onForward, onSave, saving, savedDocId,
}: {
  analysis: FileAnalysis | null;
  loading: boolean;
  error: string | null;
  onClear: () => void;
  onForward: () => void;
  onSave: () => void;
  saving: boolean;
  savedDocId: number | null;
}) {
  const [showFull, setShowFull] = useState(false);

  return (
    <article className="rounded-2xl border border-indigo-200/70 bg-white/80 p-5 shadow-md shadow-indigo-200/40 backdrop-blur-xl sm:p-6">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
            <FileText className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
              Análise de arquivo
            </p>
            <p className="truncate text-sm font-black text-slate-900">
              {analysis?.filename || "Processando arquivo…"}
            </p>
            {analysis && (
              <p className="text-[11px] font-semibold text-slate-500">
                {analysis.kind.toUpperCase()} · {formatKb(analysis.sizeKb)} · {analysis.chars.toLocaleString("pt-BR")} caracteres
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          title="Limpar análise"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Limpar análise"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {loading && (
        <div className="space-y-2">
          <div className="h-3 w-4/6 animate-pulse rounded bg-indigo-100" />
          <div className="h-3 w-full animate-pulse rounded bg-indigo-100" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-indigo-100" />
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Extraindo texto e gerando resumo…
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2.5 text-[12px] text-rose-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0 leading-snug">{error}</div>
        </div>
      )}

      {!loading && !error && analysis && (
        <>
          {analysis.summary && (
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Resumo
              </p>
              <div className="whitespace-pre-wrap rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-2.5 text-[13px] leading-relaxed text-slate-800">
                {analysis.summary}
              </div>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowFull((v) => !v)}
              className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700"
            >
              {showFull ? "Ocultar" : "Ver"} texto extraído
            </button>
            {showFull && (
              <pre className="mt-2 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-[12px] leading-snug text-slate-700">
                {analysis.extractedText}
              </pre>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onSave}
              disabled={saving || savedDocId !== null}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-[12px] font-bold text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              title="Salvar este conteúdo no Notebook RAG"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {savedDocId !== null ? "Salvo no Notebook" : "Salvar no Notebook"}
            </button>
            <button
              type="button"
              onClick={onForward}
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50/70 px-3 py-1.5 text-[12px] font-bold text-violet-700 transition hover:bg-violet-100 hover:border-violet-300"
              title="Pedir uma análise mais profunda do Tiagão"
            >
              <Send className="h-3.5 w-3.5" />
              Pedir análise pro Tiagão
            </button>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Limpar
            </button>
          </div>
        </>
      )}
    </article>
  );
}

// ─── Floating voice CTA ───────────────────────────────────────────────────────
function FloatingVoiceButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.4, ease: "backOut" }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-4 shadow-2xl shadow-violet-500/50 sm:bottom-8 sm:right-8"
      title="Abrir chat por voz com o Tiagão"
      aria-label="Abrir Tiagão"
    >
      <motion.span
        animate={{ scale: [1, 1.4, 1], opacity: [0.55, 0, 0.55] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
        className="absolute inset-0 -z-10 rounded-full bg-violet-500"
      />
      <Headphones className="h-5 w-5 text-white" strokeWidth={2.5} />
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden whitespace-nowrap pr-1 text-sm font-bold text-white"
          >
            Falar com o Tiagão
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
