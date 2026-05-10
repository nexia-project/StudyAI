/**
 * StudyAI Notebook — melhor que o NotebookLM
 * Layout 3 painéis: [Fontes] | [Chat RAG] | [Ferramentas]
 * Features: RAG textual, Flashcards, Questões ENEM, Mapa Mental, Guia de Estudo,
 *           Podcast Educativo (exclusivo!), Tiagão na Lousa
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Upload, FileText, Link2, MessageSquare, Brain, BookOpen,
  Loader2, Trash2, Send, ChevronRight, ChevronLeft, X, Plus, Zap,
  ClipboardList, Layers, GraduationCap, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Star, StickyNote, HelpCircle,
  ExternalLink, ArrowLeft, RefreshCw, Mic, Play, Pause,
  Volume2, Users, Clock, Presentation, Lock, Unlock, Quote, Printer,
  Sparkles, Download, Youtube, Image as ImageIcon, Maximize2, Minimize2, Archive,
  Search, Pencil, Calendar, LayoutGrid, Tv, Music, Shuffle, Film,
  MoreVertical, Check, ChevronsUpDown,
} from "lucide-react";
import { TiagaoCharacter } from "@/components/TiagaoCharacter";
import { AppNav } from "@/components/AppNav";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ─────────────────────────────────────────────────────────────────
interface Caderno {
  id: number;
  title: string;
  persona: string;
  goals: string;
  color: string;
  emoji: string;
  is_default: boolean;
  docs_count?: number;
  created_at?: string;
  updated_at?: string;
}
interface Doc {
  id: number;
  title: string;
  source_file: string | null;
  file_size_kb: number | null;
  created_at: string;
  content_length: number;
  notebook_id?: number;
}
interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  fontes?: Array<{ numero: number; titulo: string; trecho: string; trechoCompleto?: string }>;
}
interface Timeline {
  titulo: string;
  tema: string;
  eventos: Array<{
    data: string;
    titulo: string;
    descricao: string;
    importancia?: "alta" | "media" | "baixa";
    categoria?: string;
    dicaEnem?: string;
  }>;
}
interface Slides {
  titulo: string;
  subtitulo?: string;
  autor?: string;
  tema?: "indigo" | "rose" | "emerald" | "amber";
  slides: Array<
    | { tipo: "capa"; titulo: string; subtitulo?: string }
    | { tipo: "agenda"; titulo: string; itens: string[] }
    | { tipo: "conteudo"; titulo: string; subtitulo?: string; bullets: string[]; destaque?: string }
    | { tipo: "comparacao"; titulo: string; esquerda: { titulo: string; itens: string[] }; direita: { titulo: string; itens: string[] } }
    | { tipo: "citacao"; texto: string; autor?: string }
    | { tipo: "encerramento"; titulo: string; mensagem: string; dicaEnem?: string }
    | { tipo: "destaque_numerico"; titulo: string; numeros: Array<{ valor: string; descricao: string }> }
    | { tipo: "timeline"; titulo: string; etapas: Array<{ ano: string; evento: string }> }
  >;
}
interface Overview {
  summary?: string;
  insightCentral?: string;
  contexto?: string;
  pilares?: Array<{ conceito: string; explicacao: string; conexaoEnem?: string }>;
  aplicacaoPratica?: string;
  questaoProvocadora?: string;
  proximosPassos?: string;
  keyTopics: string[];
  faq: Array<{ q: string; a: string }>;
}
interface Briefing {
  titulo: string;
  problema: string;
  pontosChave: Array<{ ponto: string; evidencia?: string }>;
  conclusoes: string;
  recomendacoes: Array<{ acao: string; justificativa?: string }>;
  proximosPassos: string;
  palavrasChave: string[];
  conexoesEnem: string;
}
interface PlanoAula {
  titulo: string;
  turma: string;
  duracao: string;
  perfilTurma?: string;
  prerequisitos: string | Array<{ conceito: string; status: string }>;
  dificuldadesPrevisíveis?: Array<{ dificuldade: string; prevencao: string }>;
  bncc?: { competencia: string; habilidade: string; objetosConhecimento: string[] };
  objetivos: string[] | {
    geral: string;
    especificos: string[];
    indicadores: string[];
  };
  desenvolvimento: Array<{
    tempo: string;
    etapa: string;
    nome?: string;
    atividade: string;
    recursos: string;
    estrategia?: string;
    perguntasNorteadoras?: string[];
    diferenciacão?: { comDificuldade: string; avancados: string };
  }>;
  avaliacao?: {
    instrumento: string;
    criterios?: string[];
    rubrica?: Array<{ criterio: string; insuficiente: string; regular: string; bom: string; excelente: string }>;
  };
  tarefaCasa: string;
  adaptacoes: { turmaRapida: string; turmaDificuldade: string };
  materialComplementar: string[];
  referencias?: { teoricas: string[]; didaticas: string[]; fontesCaderno: string };
  reflexao?: { oQueFuncionou: string; oQuePrecisaAjustar: string; adaptacoesProximaTurma: string };
}
interface Tarefa {
  titulo: string;
  tipo: string;
  nivel: string;
  tempoEstimado: string;
  paraAluno: {
    oQueVaiFazer: string;
    porQueImporta: string;
    doQuePreucisa: string[];
    passos: Array<{ numero: number; nome: string; duracao: string; instrucao: string; dica: string }>;
    comoSaberSeAcertou: string;
    seTravar: string[];
    querMaisDesafio: string;
  };
  paraProfessor: {
    objetivo: string;
    respostaEsperada: string;
    errosComuns: Array<{ erro: string; causa: string; estrategia: string }>;
    rubrica: Array<{ nivel: string; descricao: string; notaEquivalente: string }>;
    diferenciacao: { comDificuldade: string; avancados: string };
    tempoCorrecao: string;
    conexaoProximaAula: string;
  };
}
interface SequenciaDidade {
  titulo: string;
  nivel: string;
  duracaoTotal: string;
  produtoFinal: string;
  avaliacaoSomativa: string;
  objetivo: string;
  bncc?: { competencia: string; habilidades: string[] };
  mapaDaSequencia: Array<{ numero: number; tema: string; conceito: string; conexaoAnterior: string | null }>;
  aulas: Array<{
    numero: number;
    titulo: string;
    objetivos: string[];
    atividadePrincipal: string;
    recursos: string[];
    avaliacaoFormativa: string;
    conexaoProxima: string;
  }>;
  avaliacaoIntegrada: {
    instrumento: string;
    rubrica: Array<{ dimensao: string; peso: string; criterios: string }>;
  };
  recursos: {
    permanentes: string[];
    porAula: Array<{ aula: number; lista: string[] }>;
  };
}
interface DnaFontes {
  temaPrincipal: string;
  subtemas: string[];
  tipoFonte: string;
  dominio: string;
  nivelComplexidade: string;
  conceitosChave: Array<{ termo: string; importancia: number; definicao?: string; relacoes?: string[] }>;
  pessoasImportantes: string[];
  datasImportantes: string[];
  prerequisitosSugeridos: string[];
  lacunas: string[];
  sugestoesFontes: string[];
  relevanciaEnem: string;
  competenciasEnem: string[];
  aplicacoesPraticas: string[];
  controversias: string[];
}
interface MindMap {
  subject: string;
  color: string;
  topics: Array<{ name: string; color: string; subtopics: Array<{ name: string; detail: string }> }>;
}
interface Flashcard { frente: string; verso: string; materia: string; dificuldade: string; }
interface Questao {
  enunciado: string;
  alternativas: Record<string, string>;
  gabarito: string;
  explicacao: string;
  bloomLevel?: string;
  habilidade?: string;
  dicaResolutora?: string;
}
interface StudyGuide {
  titulo: string;
  introducao?: string;
  objetivoFinal?: string;
  checklistCompetencias?: string[];
  prerequisitos?: string;
  quizDiagnostico?: Array<{ pergunta: string; dica?: string }>;
  modulos?: Array<{
    numero: number;
    titulo: string;
    tempoBruto?: string;
    objetivo?: string;
    conceitoCentral?: string;
    aprofundamento?: string;
    exemploResolvido?: string;
    curiosidade?: string;
    errosComuns?: string[];
    checkpoint?: string[];
  }>;
  sintese?: string;
  aplicacaoPratica?: string;
  expansao?: { leituras?: string[]; conexoes?: string[] };
  questoes?: Array<{ tipo: string; pergunta: string; resposta: string; dicaEnem: string }>;
  cronogramaSugerido: string[];
}
interface PodcastRoteiro {
  titulo: string;
  subtitulo: string;
  duracao: string;
  gancho?: string;
  roteiro: Array<{ speaker: "ANA" | "MARCOS" | "PEDRO"; fala: string }>;
  destaques: string[];
  dicaEnem?: string;
}

type Tool = "overview" | "study-guide" | "flashcards" | "questoes" | "mapa-mental" | "podcast" | "tiagao" | "timeline" | "briefing" | "plano-aula" | "tarefa" | "sequencia-didatica" | "aula-viva" | "aula-viva-formato" | "micro-aulas" | "narrativa" | "remix-cultural" | "plano-aula-versoes" | "avaliacao-voz" | "making-of" | "simulador-aula" | "slides" | "infografico" | "tabela" | "relatorio";

const TOOL_CONFIG: Record<Tool, { label: string; icon: React.ElementType; color: string; desc: string; badge?: string }> = {
  overview:             { label: "Visão Geral",           icon: Star,          color: "indigo",   desc: "Insight central + pilares + FAQ" },
  "study-guide":        { label: "Guia de Estudo",        icon: ClipboardList, color: "violet",   desc: "Mapa de Jornada com módulos progressivos" },
  flashcards:           { label: "Flashcards",             icon: Layers,        color: "pink",     desc: "Flashcards com macetes + SM-2" },
  questoes:             { label: "Questões ENEM",          icon: GraduationCap, color: "amber",    desc: "Quiz com Taxonomia de Bloom" },
  "mapa-mental":        { label: "Mapa Mental",            icon: Brain,         color: "green",    desc: "Mapa hierárquico com conexões cruzadas" },
  podcast:              { label: "Podcast",                icon: Mic,           color: "rose",     desc: "Episódio estilo Nerdcast / Flow", badge: "IA" },
  briefing:             { label: "Briefing",               icon: FileText,      color: "slate",    desc: "Documento executivo compacto" },
  "plano-aula":         { label: "Plano de Aula",          icon: Presentation,  color: "violet",   desc: "Plano completo v2 com Personas + Validação IA", badge: "v2" },
  tarefa:               { label: "Tarefa / Atividade",     icon: ClipboardList, color: "emerald",  desc: "Tarefa para casa com gabarito e rúbrica" },
  "sequencia-didatica": { label: "Sequência Didática",     icon: Layers,        color: "blue",     desc: "Multi-aula com avaliação integrada" },
  "aula-viva":          { label: "Aula Viva",              icon: Tv,            color: "orange",   desc: "Roteiro de episódio TV/streaming para sua aula", badge: "PRO" },
  "aula-viva-formato":  { label: "Aula Viva Formatos",     icon: Tv,            color: "orange",   desc: "Jornal · Chef · Investigação · Talk Show", badge: "PRO" },
  "micro-aulas":        { label: "Micro-Aulas",            icon: Play,          color: "cyan",     desc: "Versões 15s / 60s / 3min / 10min — TikTok/Reels", badge: "PRO" },
  narrativa:            { label: "Narrativa Didática",     icon: BookOpen,      color: "fuchsia",  desc: "Transforma o conteúdo em história épica", badge: "PRO" },
  "remix-cultural":     { label: "Remix Cultural",         icon: Music,         color: "pink",     desc: "Conecta o tema com cultura pop e memes", badge: "PRO" },
  "plano-aula-versoes": { label: "5 Versões do Plano",     icon: Shuffle,       color: "violet",   desc: "Difícil / Avançada / Inclusiva / Remota / Híbrida", badge: "PRO" },
  "avaliacao-voz":      { label: "Avaliação por Voz",      icon: Mic,           color: "rose",     desc: "Podcast · Entrevista Simulada · Debate Estruturado", badge: "NOVO" },
  "making-of":          { label: "Making Of da Aula",      icon: Film,          color: "slate",    desc: "Bastidores pedagógicos — decisões, erros e segredos", badge: "NOVO" },
  "simulador-aula":     { label: "Simulador de Aula",      icon: Users,         color: "emerald",  desc: "Turma virtual com 5 alunos-tipo — ensaio completo", badge: "NOVO" },
  timeline:             { label: "Linha do Tempo",         icon: Clock,         color: "amber",    desc: "Cronologia didática com causas" },
  slides:               { label: "Apresentação",           icon: Presentation,  color: "violet",   desc: "Slides profissionais prontos" },
  infografico:          { label: "Infográfico",            icon: Sparkles,      color: "fuchsia",  desc: "Pôster visual gerado por IA" },
  tabela:               { label: "Tabela de Dados",        icon: LayoutGrid,    color: "indigo",   desc: "Comparativo estruturado em tabela" },
  relatorio:            { label: "Relatório",              icon: FileText,      color: "slate",    desc: "Documento acadêmico, blog ou aula" },
  tiagao:               { label: "Tiagão na Lousa",        icon: Zap,           color: "blue",     desc: "Aula animada na lousa" },
};

// Ferramentas que aparecem como cards grandes no Studio (estilo NotebookLM)
const FEATURED_STUDIO_TOOLS: Tool[] = ["mapa-mental", "study-guide", "podcast"];

const COLOR_MAP: Record<string, string> = {
  indigo:  "bg-violet-50/60  border-violet-200  text-violet-700",
  violet:  "bg-violet-50/60  border-violet-200  text-violet-700",
  pink:    "bg-pink-50/60    border-pink-200    text-pink-700",
  amber:   "bg-amber-50/60   border-amber-200   text-amber-700",
  green:   "bg-emerald-50/60 border-emerald-200 text-emerald-700",
  emerald: "bg-emerald-50/60 border-emerald-200 text-emerald-700",
  blue:    "bg-violet-50/60    border-violet-200    text-violet-700",
  rose:    "bg-rose-50/60    border-rose-200    text-rose-700",
  fuchsia: "bg-fuchsia-50/60 border-fuchsia-200 text-fuchsia-700",
  orange:  "bg-orange-50/60  border-orange-200  text-orange-700",
  cyan:    "bg-cyan-50/60    border-cyan-200    text-cyan-700",
  slate:   "bg-slate-50/60   border-slate-200   text-slate-700",
};

const ICON_TINT: Record<string, string> = {
  indigo:  "text-violet-500  bg-violet-100",
  violet:  "text-violet-500  bg-violet-100",
  pink:    "text-pink-500    bg-pink-100",
  amber:   "text-amber-600   bg-amber-100",
  green:   "text-emerald-500 bg-emerald-100",
  emerald: "text-emerald-500 bg-emerald-100",
  blue:    "text-violet-500    bg-violet-100",
  rose:    "text-rose-500    bg-rose-100",
  fuchsia: "text-fuchsia-500 bg-fuchsia-100",
  orange:  "text-orange-500  bg-orange-100",
  cyan:    "text-cyan-500    bg-cyan-100",
  slate:   "text-slate-500   bg-slate-100",
};

// ─── Mind Map Renderer ─────────────────────────────────────────────────────
function MindMapView({ map }: { map: MindMap }) {
  const mapAny = map as any;
  const categories: Array<{ name: string; icone?: string; cor?: string; topics: Array<{ name: string; subtopics: Array<{ name: string; detail: string }> }> }> =
    mapAny.categories ?? [];
  const flatTopics = map.topics ?? [];
  const conexoesCruzadas: Array<{ de: string; para: string; relacao: string }> = mapAny.conexoesCruzadas ?? [];
  const conceitosChave: string[] = mapAny.conceitosChave ?? [];
  const rootIcone: string = mapAny.icone ?? "🧠";

  // Decide whether to render with categories (new format) or flat topics (old format)
  const hasCategories = categories.length > 0;

  // All topic rows we'll render: each row = { topic, color, catName, catIcon }
  type TopicRow = { name: string; color: string; catName: string; catIcon: string; subtopics: Array<{ name: string; detail: string }> };
  const rows: TopicRow[] = hasCategories
    ? categories.flatMap(cat =>
        (cat.topics ?? []).map(t => ({
          name: t.name,
          color: cat.cor ?? "#6366f1",
          catName: cat.name,
          catIcon: cat.icone ?? "",
          subtopics: t.subtopics ?? [],
        }))
      )
    : flatTopics.map((t: any) => ({
        name: t.name,
        color: t.color ?? map.color ?? "#6366f1",
        catName: t.category ?? "",
        catIcon: t.categoryIcon ?? "",
        subtopics: t.subtopics ?? [],
      }));

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set(rows.map((_, i) => i)));
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  const toggleRow = (i: number) =>
    setExpandedRows(s => { const ns = new Set(s); ns.has(i) ? ns.delete(i) : ns.add(i); return ns; });

  const rootColor = (hasCategories ? categories[0]?.cor : map.color) ?? "#6366f1";

  // Group rows by catName for visual separators
  const grouped: Array<{ catName: string; catIcon: string; color: string; rowIndexes: number[] }> = [];
  if (hasCategories) {
    let cur = "";
    rows.forEach((r, i) => {
      if (r.catName !== cur) {
        cur = r.catName;
        grouped.push({ catName: r.catName, catIcon: r.catIcon, color: r.color, rowIndexes: [i] });
      } else {
        grouped[grouped.length - 1].rowIndexes.push(i);
      }
    });
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-white">
      {/* Conceitos-chave header */}
      {conceitosChave.length > 0 && (
        <div className="flex-shrink-0 flex flex-wrap gap-1.5 px-4 pt-3 pb-2 border-b border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider self-center mr-1">Conceitos:</span>
          {conceitosChave.map((c, i) => (
            <span key={i} className="text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full">{c}</span>
          ))}
        </div>
      )}

      {/* Horizontal tree */}
      <div className="flex-1 overflow-auto p-4">
        <div className="inline-flex items-start gap-0" style={{ minWidth: "max-content", minHeight: "100%" }}>

          {/* ── Root node ── */}
          <div className="flex flex-col items-center self-center">
            <div
              className="px-5 py-3.5 rounded-2xl font-black text-white text-sm shadow-2xl whitespace-nowrap select-none cursor-default text-center"
              style={{ background: `linear-gradient(135deg, ${rootColor}, ${rootColor}cc)` }}
            >
              <div className="text-2xl mb-1">{rootIcone}</div>
              <div className="leading-tight">{map.subject}</div>
            </div>
          </div>

          {/* Root → branches connector */}
          <div className="self-center w-8 h-0.5 flex-shrink-0" style={{ backgroundColor: rootColor + "60" }} />

          {/* ── Categories / Topics column ── */}
          <div className="flex flex-col gap-2 self-center">
            {hasCategories ? (
              // Render by category groups
              grouped.map((grp, gi) => (
                <div key={gi} className="flex items-start gap-0">
                  {/* Category node */}
                  <div className="flex flex-col items-center self-stretch justify-center">
                    <div
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs text-white shadow-lg whitespace-nowrap"
                      style={{ backgroundColor: grp.color }}
                    >
                      {grp.catIcon && <span className="text-base">{grp.catIcon}</span>}
                      {grp.catName}
                    </div>
                  </div>

                  {/* Category → topics connector */}
                  <div className="self-center w-5 h-0.5 flex-shrink-0" style={{ backgroundColor: grp.color + "60" }} />

                  {/* Topics of this category */}
                  <div className="flex flex-col gap-1.5">
                    {grp.rowIndexes.map(ri => {
                      const row = rows[ri];
                      const isOpen = expandedRows.has(ri);
                      return (
                        <div key={ri} className="flex items-center gap-0">
                          {/* Topic node */}
                          <button
                            onClick={() => toggleRow(ri)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs shadow-md whitespace-nowrap hover:opacity-90 active:scale-[0.97] transition-all border"
                            style={{ backgroundColor: row.color + "15", borderColor: row.color + "40", color: row.color }}
                          >
                            {row.name}
                            {row.subtopics.length > 0 && (
                              <span className="text-[9px] font-black opacity-60">{isOpen ? "−" : `+${row.subtopics.length}`}</span>
                            )}
                          </button>

                          {/* Topic → Subtopics */}
                          {isOpen && row.subtopics.length > 0 && (
                            <>
                              <div className="w-4 h-0.5 flex-shrink-0" style={{ backgroundColor: row.color + "50" }} />
                              <div className="flex flex-col gap-1">
                                {row.subtopics.map((sub, si) => {
                                  const key = `${ri}-${si}`;
                                  const isSubOpen = expandedSub === key;
                                  return (
                                    <div key={si} className="flex items-start gap-0">
                                      <div className="w-2 h-0.5 self-center flex-shrink-0" style={{ backgroundColor: row.color + "40" }} />
                                      <div
                                        className="rounded-lg border bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                        style={{ borderColor: row.color + "25", maxWidth: 260 }}
                                        onClick={() => setExpandedSub(isSubOpen ? null : key)}
                                      >
                                        <div className="px-2.5 py-1.5 flex items-center gap-1.5">
                                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                                          <p className="text-xs font-semibold text-slate-800 leading-tight">{sub.name}</p>
                                          {sub.detail && (
                                            <span className="text-[8px] ml-auto text-slate-400">{isSubOpen ? "▲" : "▼"}</span>
                                          )}
                                        </div>
                                        {isSubOpen && sub.detail && (
                                          <div className="px-2.5 pb-2 pt-0">
                                            <p className="text-[11px] text-slate-600 leading-relaxed">{sub.detail}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              // Flat topics (old format)
              rows.map((row, ri) => {
                const isOpen = expandedRows.has(ri);
                return (
                  <div key={ri} className="flex items-center gap-0">
                    <div className="w-2 h-0.5" style={{ backgroundColor: row.color + "60" }} />
                    <button
                      onClick={() => toggleRow(ri)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs text-white shadow-md whitespace-nowrap hover:opacity-90 transition-all"
                      style={{ backgroundColor: row.color }}
                    >
                      {row.name}
                      {row.subtopics.length > 0 && <span className="text-[9px] opacity-70">{isOpen ? "−" : `+${row.subtopics.length}`}</span>}
                    </button>
                    {isOpen && row.subtopics.length > 0 && (
                      <>
                        <div className="w-4 h-0.5" style={{ backgroundColor: row.color + "50" }} />
                        <div className="flex flex-col gap-1">
                          {row.subtopics.map((sub, si) => {
                            const key = `${ri}-${si}`;
                            const isSubOpen = expandedSub === key;
                            return (
                              <div key={si} className="flex items-start gap-0" onClick={() => setExpandedSub(isSubOpen ? null : key)}>
                                <div className="w-2 h-0.5 self-center" style={{ backgroundColor: row.color + "40" }} />
                                <div className="px-2.5 py-1.5 rounded-lg text-xs bg-white shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                                  style={{ borderColor: row.color + "30", maxWidth: 240 }}>
                                  <p className="font-semibold text-slate-800">{sub.name}</p>
                                  {isSubOpen && sub.detail && <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{sub.detail}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Conexões Cruzadas footer */}
      {conexoesCruzadas.length > 0 && (
        <div className="flex-shrink-0 border-t border-slate-100 px-4 py-2.5 bg-white">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">🔗 Conexões entre ramos</p>
          <div className="flex flex-wrap gap-2">
            {conexoesCruzadas.map((c, i) => (
              <div key={i} className="text-[10px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <span className="font-bold text-slate-700">{c.de}</span>
                <span className="text-slate-400 mx-1">→</span>
                <span className="font-bold text-slate-700">{c.para}</span>
                {c.relacao && <span className="text-slate-500">: {c.relacao}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Flashcard Viewer ────────────────────────────────────────────────────────
function FlashcardViewer({ cards }: { cards: Flashcard[] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[idx];
  const cardAny = card as any;
  const diffColors: Record<string, string> = {
    facil: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    medio: "bg-amber-100 text-amber-700 border border-amber-200",
    dificil: "bg-red-100 text-red-700 border border-red-200",
  };
  const typeLabels: Record<string, string> = {
    fato: "💡 Fato", conceito: "🔵 Conceito", comparacao: "⚖️ Comparação", aplicacao: "🎯 Aplicação"
  };
  const progress = ((idx + 1) / cards.length) * 100;

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Progress + meta */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-slate-500">{idx + 1} <span className="text-slate-300">/</span> {cards.length}</span>
          <div className="flex items-center gap-1.5">
            {card.dificuldade && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diffColors[card.dificuldade] ?? "bg-slate-100 text-slate-600"}`}>
                {card.dificuldade === "facil" ? "Fácil" : card.dificuldade === "medio" ? "Médio" : "Difícil"}
              </span>
            )}
            {(card as any).tipo && (
              <span className="text-[10px] font-semibold text-slate-500">{typeLabels[(card as any).tipo] ?? (card as any).tipo}</span>
            )}
          </div>
        </div>
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[10px] text-violet-600 font-semibold mt-0.5">{card.materia}</p>
      </div>

      {/* Flip card */}
      <motion.div
        className="relative cursor-pointer select-none"
        onClick={() => setFlipped(f => !f)}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, type: "spring", stiffness: 180, damping: 20 }}
        style={{ transformStyle: "preserve-3d", minHeight: 180 }}
      >
        {/* Front */}
        <div className="absolute inset-0 rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-violet-50 p-5 flex flex-col"
          style={{ backfaceVisibility: "hidden" }}>
          <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-3">❓ Pergunta</p>
          <p className="text-sm font-bold text-slate-800 leading-relaxed flex-1">{card.frente}</p>
          <p className="text-[11px] text-violet-300 text-center mt-3 flex items-center justify-center gap-1">
            <span className="text-base">👆</span> Toque para ver a resposta
          </p>
        </div>
        {/* Back */}
        <div className="absolute inset-0 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 flex flex-col"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">✅ Resposta</p>
          <p className="text-sm text-slate-800 leading-relaxed flex-1 overflow-y-auto">{card.verso}</p>
        </div>
      </motion.div>

      {/* Mnemônico */}
      {cardAny.mnemonico && !flipped && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
          <span className="text-lg flex-shrink-0">🔑</span>
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-0.5">Macete de memorização</p>
            <p className="text-xs text-amber-800 leading-relaxed">{cardAny.mnemonico}</p>
          </div>
        </div>
      )}

      {/* Dica ENEM — só quando virado */}
      {cardAny.dicaEnem && flipped && (
        <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 flex items-start gap-2">
          <GraduationCap className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-0.5">Como cai no ENEM</p>
            <p className="text-xs text-violet-800 leading-relaxed">{cardAny.dicaEnem}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        <button onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }}
          disabled={idx === 0}
          className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-25 hover:bg-slate-50 transition-colors">
          ← Anterior
        </button>
        <button onClick={() => { setIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
          disabled={idx === cards.length - 1}
          className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-25 hover:bg-violet-700 transition-colors">
          Próximo →
        </button>
      </div>
    </div>
  );
}

// ─── Questão ENEM Viewer ──────────────────────────────────────────────────────
function QuestaViewer({ questoes }: { questoes: Questao[] }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showExpl, setShowExpl] = useState(false);
  const q = questoes[idx];
  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-slate-500 font-medium">Questão {idx + 1} / {questoes.length}</span>
        {selected && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${selected === q.gabarito ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            {selected === q.gabarito ? "✓ Correto!" : "✗ Errado"}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-800 font-medium leading-snug mb-3">{q.enunciado}</p>
      <div className="space-y-1.5">
        {Object.entries(q.alternativas ?? {}).map(([key, text]) => {
          const correct = selected && key === q.gabarito;
          const wrong = selected && selected === key && key !== q.gabarito;
          return (
            <button key={key} onClick={() => { if (!selected) setSelected(key); }}
              className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-all flex items-start gap-2 ${
                correct ? "bg-emerald-50 border-emerald-400 text-emerald-800" :
                wrong   ? "bg-red-50 border-red-400 text-red-700" :
                selected ? "bg-slate-50 border-slate-200 text-slate-500" :
                "bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50"
              }`}>
              <span className="font-black flex-shrink-0 mt-0.5">{key})</span>
              <span className="leading-snug">{text}</span>
              {correct && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5 ml-auto" />}
              {wrong   && <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5 ml-auto" />}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="mt-2">
          <button onClick={() => setShowExpl(s => !s)}
            className="text-xs text-violet-600 font-bold flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            {showExpl ? "Ocultar explicação" : "Ver explicação completa"}
          </button>
          {showExpl && (
            <p className="text-xs text-slate-700 mt-1.5 p-2.5 bg-violet-50 rounded-xl leading-relaxed">{q.explicacao}</p>
          )}
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <button onClick={() => { setIdx(i => Math.max(0, i-1)); setSelected(null); setShowExpl(false); }}
          disabled={idx === 0} className="flex-1 py-1.5 rounded-xl border text-xs font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-50">
          ← Anterior
        </button>
        <button onClick={() => { setIdx(i => Math.min(questoes.length-1, i+1)); setSelected(null); setShowExpl(false); }}
          disabled={idx === questoes.length - 1} className="flex-1 py-1.5 rounded-xl border border-violet-200 text-xs font-bold text-violet-600 disabled:opacity-30 hover:bg-violet-50">
          Próxima →
        </button>
      </div>
    </div>
  );
}

// ─── Podcast Viewer (TTS REAL: ANA=nova, MARCOS=onyx) ────────────────────────
function PodcastViewer({ podcast }: { podcast: PodcastRoteiro }) {
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tokenRef = useRef(0);
  const roteiro = podcast.roteiro ?? [];

  const playFromIdx = useCallback(async (startIdx: number) => {
    const myToken = ++tokenRef.current;
    setPlaying(true);
    for (let i = startIdx; i < roteiro.length; i++) {
      if (myToken !== tokenRef.current) return;
      setCurrentIdx(i);
      setLoading(true);
      const linha = roteiro[i];
      const voice = linha.speaker === "ANA" ? "nova" : "onyx";
      try {
        const r = await fetch(`${BASE_URL}/api/voice-tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text: linha.fala, voice }),
        });
        if (myToken !== tokenRef.current) return;
        if (!r.ok) throw new Error("tts");
        const blob = await r.blob();
        if (myToken !== tokenRef.current) return;
        const url = URL.createObjectURL(blob);
        const audio = audioRef.current ?? new Audio();
        audioRef.current = audio;
        audio.src = url;
        setLoading(false);
        await new Promise<void>((resolve) => {
          const cleanup = () => {
            audio.removeEventListener("ended", onEnd);
            audio.removeEventListener("error", onEnd);
            URL.revokeObjectURL(url);
          };
          const onEnd = () => { cleanup(); resolve(); };
          audio.addEventListener("ended", onEnd, { once: true });
          audio.addEventListener("error", onEnd, { once: true });
          audio.play().catch(() => { cleanup(); resolve(); });
        });
        if (myToken !== tokenRef.current) return;
      } catch {
        // se falhar TTS, espera tempo proporcional ao texto e segue
        setLoading(false);
        const ms = Math.max(1500, linha.fala.split(" ").length * 220);
        await new Promise(res => setTimeout(res, ms));
        if (myToken !== tokenRef.current) return;
      }
    }
    setPlaying(false);
    setCurrentIdx(-1);
  }, [roteiro]);

  const startPlay = useCallback(() => { playFromIdx(0); }, [playFromIdx]);

  const stopPlay = useCallback(() => {
    tokenRef.current++; // invalida loop atual
    setPlaying(false);
    setLoading(false);
    setCurrentIdx(-1);
    if (audioRef.current) { try { audioRef.current.pause(); } catch {} }
  }, []);

  useEffect(() => () => {
    tokenRef.current++;
    if (audioRef.current) { try { audioRef.current.pause(); } catch {} }
  }, []);

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Mic className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">Podcast Educativo</span>
        </div>
        <p className="font-black text-sm leading-tight">{podcast.titulo}</p>
        <p className="text-[10px] text-rose-100 mt-0.5">{podcast.subtitulo}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-rose-200">⏱ {podcast.duracao}</span>
          <span className="text-[10px] text-rose-200">🎙 {podcast.roteiro.length} falas</span>
        </div>
      </div>

      {/* Speakers */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-1.5 p-2 bg-violet-50 rounded-xl border border-violet-100">
          <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-white text-[10px] font-black">A</div>
          <div>
            <p className="text-[10px] font-black text-violet-700">ANA</p>
            <p className="text-[9px] text-violet-400">Professora</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-1.5 p-2 bg-violet-50 rounded-xl border border-violet-100">
          <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-white text-[10px] font-black">M</div>
          <div>
            <p className="text-[10px] font-black text-violet-700">MARCOS</p>
            <p className="text-[9px] text-violet-400">Estudante ENEM</p>
          </div>
        </div>
      </div>

      {/* Play control */}
      <button
        onClick={playing ? stopPlay : startPlay}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
          playing ? "bg-rose-100 border-2 border-rose-300 text-rose-700" : "bg-rose-500 text-white hover:bg-rose-600"
        }`}>
        {playing
          ? <><Pause className="w-4 h-4" /> {loading ? "Carregando voz…" : "Pausar podcast"}</>
          : <><Play className="w-4 h-4" /> Ouvir podcast (vozes reais)</>}
      </button>

      {/* Roteiro */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {(podcast.roteiro ?? []).map((linha, i) => {
          const isAna = linha.speaker === "ANA";
          const isActive = currentIdx === i;
          return (
            <motion.div key={i}
              animate={{ scale: isActive ? 1.02 : 1, opacity: currentIdx >= 0 && currentIdx !== i ? 0.5 : 1 }}
              className={`flex gap-2 ${isAna ? "" : "flex-row-reverse"}`}>
              <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-black mt-0.5 ${isAna ? "bg-violet-500" : "bg-violet-500"}`}>
                {linha.speaker[0]}
              </div>
              <div className={`flex-1 px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                isActive
                  ? isAna ? "bg-violet-100 border-2 border-violet-300 text-gray-900" : "bg-violet-100 border-2 border-violet-300 text-violet-900"
                  : isAna ? "bg-violet-50 text-slate-700" : "bg-violet-50 text-slate-700"
              }`}>
                <span className={`text-[9px] font-black block mb-0.5 ${isAna ? "text-violet-500" : "text-violet-500"}`}>{linha.speaker}</span>
                {linha.fala}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Destaques */}
      {((podcast.destaques?.length ?? 0) > 0) && (
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Pontos-chave</p>
          <div className="space-y-1">
            {(podcast.destaques ?? []).map((d, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                <span className="text-rose-400 font-black flex-shrink-0">•</span>
                {d}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Timeline (linha do tempo) ────────────────────────────────────────────────
function TimelineView({ t }: { t: Timeline }) {
  const importanciaCor = { alta: "bg-rose-500", media: "bg-amber-500", baixa: "bg-slate-400" } as const;
  return (
    <div className="p-3 space-y-3">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">Linha do Tempo</span>
        </div>
        <p className="font-black text-sm leading-tight">{t.titulo}</p>
        {t.tema && <p className="text-[10px] text-amber-100 mt-0.5">{t.tema}</p>}
        <p className="text-[10px] text-amber-100 mt-2">{t.eventos.length} eventos cronológicos</p>
      </div>

      <div className="relative pl-5">
        <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gradient-to-b from-amber-300 via-orange-300 to-rose-300" />
        {(t.eventos ?? []).map((ev, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative mb-3"
          >
            <div className={`absolute -left-3.5 top-1 w-3 h-3 rounded-full ring-2 ring-white ${importanciaCor[ev.importancia ?? "media"]}`} />
            <div className="bg-white rounded-xl border border-slate-200 p-2.5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">{ev.data}</span>
                {ev.categoria && (
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{ev.categoria}</span>
                )}
              </div>
              <p className="text-xs font-black text-slate-800 leading-tight mb-1">{ev.titulo}</p>
              <p className="text-[11px] text-slate-600 leading-relaxed">{ev.descricao}</p>
              {ev.dicaEnem && (
                <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 bg-violet-50 rounded-lg border border-violet-100">
                  <GraduationCap className="w-3 h-3 text-violet-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-violet-700 leading-tight"><span className="font-black">ENEM:</span> {ev.dicaEnem}</p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Slides (apresentação profissional) ──────────────────────────────────────
const SLIDE_THEMES = {
  indigo:  { bg: "from-violet-600 to-violet-700",  accent: "text-violet-200", chip: "bg-violet-500", border: "border-violet-400" },
  rose:    { bg: "from-rose-600 to-pink-700",      accent: "text-rose-200",   chip: "bg-rose-500",   border: "border-rose-400" },
  emerald: { bg: "from-emerald-600 to-teal-700",   accent: "text-emerald-200",chip: "bg-emerald-500",border: "border-emerald-400" },
  amber:   { bg: "from-amber-500 to-orange-600",   accent: "text-amber-100",  chip: "bg-amber-500",  border: "border-amber-400" },
} as const;

function SlidesView({ deck, idx, setIdx }: { deck: Slides; idx: number; setIdx: (n: number) => void }) {
  const theme = SLIDE_THEMES[deck.tema ?? "indigo"];
  const slide = (deck.slides ?? [])[idx] ?? (deck.slides ?? [])[0];
  const total = (deck.slides ?? []).length;
  const capaImagem = (deck as any).capaImagem as string | undefined;

  const [slideImages, setSlideImages] = useState<Record<number, string>>({});
  const [imgLoading, setImgLoading] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const currentImg = idx === 0 && capaImagem ? capaImagem : slideImages[idx];

  // Atalhos no fullscreen: ←/→ navega, Esc sai
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
      else if (e.key === "ArrowRight" || e.key === " ") setIdx(Math.min(total - 1, idx + 1));
      else if (e.key === "ArrowLeft") setIdx(Math.max(0, idx - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, idx, total, setIdx]);

  // Exporta para PDF (text-based, sem dependências externas além do jsPDF já instalado)
  async function exportPDF() {
    if (exporting) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [960, 540] });
      const slides = deck.slides ?? [];
      const stripEmoji = (s: string) => (s ?? "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").replace(/[\u0080-\uFFFF]/g, m => m.charCodeAt(0) > 255 ? "" : m);
      const wrap = (text: string, maxW: number, fontSize: number) => {
        doc.setFontSize(fontSize);
        return doc.splitTextToSize(stripEmoji(text), maxW);
      };

      slides.forEach((s: any, i: number) => {
        if (i > 0) doc.addPage();
        // background
        doc.setFillColor(31, 41, 99);
        doc.rect(0, 0, 960, 540, "F");
        doc.setTextColor(255, 255, 255);

        if (s.tipo === "capa") {
          doc.setFont("helvetica", "bold"); doc.setFontSize(44);
          doc.text(wrap(s.titulo ?? deck.titulo, 800, 44), 80, 230);
          if (s.subtitulo) {
            doc.setFont("helvetica", "normal"); doc.setFontSize(20);
            doc.text(wrap(s.subtitulo, 800, 20), 80, 310);
          }
          if (deck.autor) {
            doc.setFontSize(14); doc.text(`por ${stripEmoji(deck.autor)}`, 80, 360);
          }
        } else if (s.tipo === "agenda") {
          doc.setFont("helvetica", "bold"); doc.setFontSize(32);
          doc.text(stripEmoji(s.titulo ?? "Agenda"), 80, 100);
          doc.setFontSize(20); doc.setFont("helvetica", "normal");
          (s.itens ?? []).forEach((it: string, j: number) => {
            doc.text(`${j + 1}. ${stripEmoji(it)}`, 80, 170 + j * 36);
          });
        } else if (s.tipo === "comparacao") {
          doc.setFont("helvetica", "bold"); doc.setFontSize(28);
          doc.text(stripEmoji(s.titulo ?? ""), 80, 90);
          [s.esquerda, s.direita].forEach((col: any, ci: number) => {
            if (!col) return;
            const x = 80 + ci * 420;
            doc.setFont("helvetica", "bold"); doc.setFontSize(18);
            doc.text(stripEmoji(col.titulo ?? ""), x, 150);
            doc.setFont("helvetica", "normal"); doc.setFontSize(14);
            (col.itens ?? []).forEach((it: string, j: number) => {
              const lines = wrap(`• ${it}`, 380, 14);
              doc.text(lines, x, 190 + j * 60);
            });
          });
        } else if (s.tipo === "citacao") {
          doc.setFont("helvetica", "italic"); doc.setFontSize(28);
          doc.text(wrap(`"${s.texto ?? ""}"`, 800, 28), 80, 240);
          if (s.autor) {
            doc.setFont("helvetica", "normal"); doc.setFontSize(16);
            doc.text(`— ${stripEmoji(s.autor)}`, 80, 360);
          }
        } else if (s.tipo === "encerramento") {
          doc.setFont("helvetica", "bold"); doc.setFontSize(36);
          doc.text(stripEmoji(s.titulo ?? "Conclusão"), 80, 180);
          if (s.mensagem) {
            doc.setFont("helvetica", "normal"); doc.setFontSize(20);
            doc.text(wrap(s.mensagem, 800, 20), 80, 250);
          }
          if (s.dicaEnem) {
            doc.setFontSize(14);
            doc.text(wrap(`ENEM: ${s.dicaEnem}`, 800, 14), 80, 380);
          }
        } else {
          // conteudo + fallback
          doc.setFont("helvetica", "bold"); doc.setFontSize(32);
          doc.text(wrap(s.titulo ?? "", 800, 32), 80, 100);
          if (s.subtitulo) {
            doc.setFont("helvetica", "normal"); doc.setFontSize(16);
            doc.text(wrap(s.subtitulo, 800, 16), 80, 145);
          }
          doc.setFont("helvetica", "normal"); doc.setFontSize(18);
          let y = s.subtitulo ? 200 : 170;
          (s.bullets ?? []).forEach((b: string) => {
            const lines = wrap(`• ${b}`, 800, 18);
            doc.text(lines, 80, y);
            y += lines.length * 26 + 8;
          });
          if (s.destaque) {
            doc.setFillColor(255, 255, 255, 0.15);
            doc.setFont("helvetica", "bold"); doc.setFontSize(16);
            doc.text(wrap(s.destaque, 800, 16), 80, Math.min(y + 20, 480));
          }
        }
        // Footer page number
        doc.setFont("helvetica", "normal"); doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(`${i + 1} / ${slides.length}`, 880, 520);
      });

      const fname = `${(deck.titulo ?? "apresentacao").replace(/\s+/g, "-").toLowerCase()}.pdf`;
      doc.save(fname);
    } finally {
      setExporting(false);
    }
  }

  async function generateSlideImage() {
    if (imgLoading !== null) return;
    setImgLoading(idx);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/slides/imagem`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          titulo: (slide as any).titulo ?? deck.titulo,
          bullets: (slide as any).bullets ?? (slide as any).itens ?? [],
          tema: deck.tema ?? "indigo",
        }),
      });
      const d = await r.json();
      if (d.imagem) setSlideImages(prev => ({ ...prev, [idx]: d.imagem }));
    } catch {}
    finally { setImgLoading(null); }
  }

  const handlePrint = () => window.print();

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Presentation className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Apresentação</span>
        </div>
        <div className="flex items-center gap-1">
          {!currentImg && slide.tipo !== "capa" && (
            <button onClick={generateSlideImage} disabled={imgLoading !== null}
                    className="flex items-center gap-1 text-[10px] font-bold text-fuchsia-600 hover:text-fuchsia-700 px-2 py-1 rounded-md hover:bg-fuchsia-50 disabled:opacity-50">
              {imgLoading === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {imgLoading === idx ? "Gerando..." : "Imagem IA"}
            </button>
          )}
          <button onClick={() => setFullscreen(true)} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-violet-600 px-2 py-1 rounded-md hover:bg-violet-50">
            <Maximize2 className="w-3 h-3" /> Tela cheia
          </button>
          <button onClick={exportPDF} disabled={exporting}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-rose-600 px-2 py-1 rounded-md hover:bg-rose-50 disabled:opacity-50">
            {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            {exporting ? "Gerando..." : "PDF"}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-violet-600 px-2 py-1 rounded-md hover:bg-violet-50">
            <Printer className="w-3 h-3" /> Imprimir
          </button>
        </div>
      </div>

      {/* Slide canvas — 16:9 */}
      <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className={`absolute inset-0 rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br ${theme.bg} text-white p-5 flex flex-col`}
          >
            {/* Background image overlay (cover or generated for slide) */}
            {currentImg && (
              <>
                <img src={currentImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity" />
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg} opacity-75`} />
              </>
            )}
            {slide.tipo === "capa" && (
              <div className="relative flex-1 flex flex-col justify-center items-center text-center">
                <div className={`w-10 h-10 rounded-full ${theme.chip} flex items-center justify-center mb-3 shadow-lg`}>
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <p className="text-lg font-black leading-tight mb-1 drop-shadow">{slide.titulo}</p>
                {slide.subtitulo && <p className={`text-xs ${theme.accent} drop-shadow`}>{slide.subtitulo}</p>}
                {deck.autor && <p className={`text-[10px] ${theme.accent} mt-3 drop-shadow`}>por {deck.autor}</p>}
              </div>
            )}

            {slide.tipo === "agenda" && (
              <div className="flex-1 flex flex-col">
                <p className={`text-[10px] font-black uppercase tracking-wider ${theme.accent} mb-1`}>Agenda</p>
                <p className="text-base font-black mb-3">{slide.titulo}</p>
                <div className="flex-1 space-y-1.5">
                  {(slide.itens ?? []).map((it, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full ${theme.chip} flex items-center justify-center text-[11px] font-black flex-shrink-0`}>{i + 1}</span>
                      <p className="text-xs font-semibold">{it}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slide.tipo === "conteudo" && (
              <div className="flex-1 flex flex-col">
                <p className="text-base font-black leading-tight">{slide.titulo}</p>
                {slide.subtitulo && <p className={`text-[11px] ${theme.accent} mb-2`}>{slide.subtitulo}</p>}
                <div className="flex-1 space-y-1.5 mt-2">
                  {(slide.bullets ?? []).map((b, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.chip} flex-shrink-0 mt-1.5`} />
                      <p className="text-xs leading-snug">{b}</p>
                    </div>
                  ))}
                </div>
                {slide.destaque && (
                  <div className={`mt-3 px-3 py-2 rounded-lg bg-white/15 backdrop-blur border ${theme.border}`}>
                    <p className="text-[11px] font-black">{slide.destaque}</p>
                  </div>
                )}
              </div>
            )}

            {slide.tipo === "comparacao" && (
              <div className="flex-1 flex flex-col">
                <p className="text-base font-black leading-tight mb-3">{slide.titulo}</p>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {[slide.esquerda, slide.direita].filter(Boolean).map((col, ci) => (
                    <div key={ci} className="rounded-lg bg-white/10 p-2.5 backdrop-blur">
                      <p className={`text-[10px] font-black ${theme.accent} uppercase tracking-wider mb-1.5`}>{col.titulo}</p>
                      <div className="space-y-1">
                        {(col?.itens ?? []).map((it, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-white flex-shrink-0 mt-1.5" />
                            <p className="text-[11px] leading-snug">{it}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slide.tipo === "citacao" && (
              <div className="flex-1 flex flex-col justify-center">
                <Quote className={`w-6 h-6 ${theme.accent} mb-2`} />
                <p className="text-sm font-bold italic leading-snug">"{slide.texto}"</p>
                {slide.autor && <p className={`text-[10px] ${theme.accent} mt-3`}>— {slide.autor}</p>}
              </div>
            )}

            {slide.tipo === "destaque_numerico" && (
              <div className="flex-1 flex flex-col">
                <p className="text-base font-black leading-tight mb-3">{slide.titulo}</p>
                <div className="flex-1 grid grid-cols-2 gap-2 content-center">
                  {(slide.numeros ?? []).map((n: any, i: number) => (
                    <div key={i} className={`rounded-xl bg-white/15 backdrop-blur border ${theme.border} p-3 flex flex-col items-center justify-center text-center`}>
                      <p className="text-2xl font-black drop-shadow">{n.valor}</p>
                      <p className={`text-[10px] ${theme.accent} mt-1 font-semibold`}>{n.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slide.tipo === "timeline" && (
              <div className="flex-1 flex flex-col">
                <p className="text-base font-black leading-tight mb-3">{slide.titulo}</p>
                <div className="flex-1 flex flex-col justify-center space-y-2">
                  {(slide.etapas ?? []).map((e: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`w-6 h-6 rounded-full ${theme.chip} flex items-center justify-center text-[10px] font-black flex-shrink-0 shadow`}>{e.numero}</span>
                      <div>
                        <p className="text-[11px] font-black leading-tight">{e.titulo}</p>
                        {e.descricao && <p className={`text-[10px] ${theme.accent} leading-snug`}>{e.descricao}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slide.tipo === "encerramento" && (
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                <p className={`text-[10px] font-black uppercase tracking-wider ${theme.accent}`}>Conclusão</p>
                <p className="text-base font-black mt-1 mb-2">{slide.titulo}</p>
                <p className="text-xs leading-snug max-w-[90%]">{slide.mensagem}</p>
                {slide.dicaEnem && (
                  <div className={`mt-3 px-3 py-1.5 rounded-lg bg-white/20 border ${theme.border}`}>
                    <p className="text-[10px] font-bold"><span className="font-black">📝 ENEM:</span> {slide.dicaEnem}</p>
                  </div>
                )}
              </div>
            )}

            <div className="absolute bottom-2 right-3 text-[9px] font-bold opacity-60">{idx + 1} / {total}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIdx(Math.max(0, idx - 1))}
          disabled={idx === 0}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 flex gap-0.5">
          {(deck.slides ?? []).map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${i === idx ? "bg-violet-500" : i < idx ? "bg-violet-200" : "bg-slate-200"}`}
            />
          ))}
        </div>
        <button
          onClick={() => setIdx(Math.min(total - 1, idx + 1))}
          disabled={idx >= total - 1}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Thumbnails / index */}
      <div className="grid grid-cols-3 gap-1.5 mt-1">
        {(deck.slides ?? []).map((s, i) => {
          const t = s.tipo === "capa" ? "Capa"
            : s.tipo === "agenda" ? "Agenda"
            : s.tipo === "comparacao" ? "Comparação"
            : s.tipo === "citacao" ? "Citação"
            : s.tipo === "encerramento" ? "Conclusão"
            : (s as { titulo?: string }).titulo ?? "Slide";
          return (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`text-left p-1.5 rounded-md border text-[9px] font-semibold truncate transition-all ${
                i === idx ? "bg-violet-50 border-violet-300 text-violet-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              <span className="font-black mr-1">{i + 1}.</span>{t}
            </button>
          );
        })}
      </div>

      {/* Fullscreen modal — projetor */}
      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col" role="dialog" aria-modal="true">
          {/* Topbar */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <span className="text-white/60 text-xs font-bold">{idx + 1} / {total}</span>
            <button onClick={exportPDF} disabled={exporting}
                    className="flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg disabled:opacity-50">
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              PDF
            </button>
            <button onClick={() => setFullscreen(false)}
                    className="flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg">
              <Minimize2 className="w-3.5 h-3.5" /> Sair (Esc)
            </button>
          </div>

          {/* Slide central, ocupando praticamente toda a tela */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-[1600px] aspect-[16/9] relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`fs-${idx}`}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className={`absolute inset-0 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br ${theme.bg} text-white p-16 flex flex-col`}
                >
                  {currentImg && (
                    <>
                      <img src={currentImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity" />
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg} opacity-75`} />
                    </>
                  )}
                  {slide.tipo === "capa" && (
                    <div className="relative flex-1 flex flex-col justify-center items-center text-center">
                      <div className={`w-20 h-20 rounded-full ${theme.chip} flex items-center justify-center mb-8 shadow-lg`}>
                        <BookOpen className="w-10 h-10 text-white" />
                      </div>
                      <p className="text-6xl font-black leading-tight mb-4 drop-shadow">{slide.titulo}</p>
                      {slide.subtitulo && <p className={`text-2xl ${theme.accent} drop-shadow`}>{slide.subtitulo}</p>}
                      {deck.autor && <p className={`text-lg ${theme.accent} mt-8 drop-shadow`}>por {deck.autor}</p>}
                    </div>
                  )}
                  {slide.tipo === "agenda" && (
                    <div className="relative flex-1 flex flex-col">
                      <p className={`text-xl font-black uppercase tracking-wider ${theme.accent} mb-3`}>Agenda</p>
                      <p className="text-5xl font-black mb-10">{slide.titulo}</p>
                      <div className="flex-1 space-y-5">
                        {(slide.itens ?? []).map((it, i) => (
                          <div key={i} className="flex items-center gap-5">
                            <span className={`w-14 h-14 rounded-full ${theme.chip} flex items-center justify-center text-2xl font-black flex-shrink-0`}>{i + 1}</span>
                            <p className="text-2xl font-semibold">{it}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {slide.tipo === "conteudo" && (
                    <div className="relative flex-1 flex flex-col">
                      <p className="text-5xl font-black leading-tight">{slide.titulo}</p>
                      {slide.subtitulo && <p className={`text-2xl ${theme.accent} mt-2 mb-6`}>{slide.subtitulo}</p>}
                      <div className="flex-1 space-y-4 mt-6">
                        {(slide.bullets ?? []).map((b, i) => (
                          <div key={i} className="flex items-start gap-4">
                            <span className={`w-3 h-3 rounded-full ${theme.chip} flex-shrink-0 mt-3`} />
                            <p className="text-2xl leading-snug">{b}</p>
                          </div>
                        ))}
                      </div>
                      {slide.destaque && (
                        <div className={`mt-6 px-6 py-4 rounded-xl bg-white/15 backdrop-blur border-2 ${theme.border}`}>
                          <p className="text-xl font-black">{slide.destaque}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {slide.tipo === "comparacao" && (
                    <div className="relative flex-1 flex flex-col">
                      <p className="text-5xl font-black leading-tight mb-8">{slide.titulo}</p>
                      <div className="flex-1 grid grid-cols-2 gap-6">
                        {[slide.esquerda, slide.direita].filter(Boolean).map((col, ci) => (
                          <div key={ci} className="rounded-xl bg-white/10 p-6 backdrop-blur">
                            <p className={`text-lg font-black ${theme.accent} uppercase tracking-wider mb-4`}>{col.titulo}</p>
                            <div className="space-y-3">
                              {(col?.itens ?? []).map((it, i) => (
                                <div key={i} className="flex items-start gap-3">
                                  <span className="w-2 h-2 rounded-full bg-white flex-shrink-0 mt-3" />
                                  <p className="text-lg leading-snug">{it}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {slide.tipo === "citacao" && (
                    <div className="relative flex-1 flex flex-col justify-center">
                      <Quote className={`w-16 h-16 ${theme.accent} mb-6`} />
                      <p className="text-4xl font-bold italic leading-snug">"{slide.texto}"</p>
                      {slide.autor && <p className={`text-xl ${theme.accent} mt-8`}>— {slide.autor}</p>}
                    </div>
                  )}
                  {slide.tipo === "destaque_numerico" && (
                    <div className="relative flex-1 flex flex-col">
                      <p className="text-5xl font-black leading-tight mb-10">{slide.titulo}</p>
                      <div className="flex-1 grid grid-cols-2 gap-6 content-center">
                        {(slide.numeros ?? []).map((n: any, i: number) => (
                          <div key={i} className={`rounded-2xl bg-white/15 backdrop-blur border-2 ${theme.border} p-8 flex flex-col items-center justify-center text-center`}>
                            <p className="text-7xl font-black drop-shadow">{n.valor}</p>
                            <p className={`text-xl ${theme.accent} mt-3 font-semibold`}>{n.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {slide.tipo === "timeline" && (
                    <div className="relative flex-1 flex flex-col">
                      <p className="text-5xl font-black leading-tight mb-8">{slide.titulo}</p>
                      <div className="flex-1 flex flex-col justify-center space-y-5">
                        {(slide.etapas ?? []).map((e: any, i: number) => (
                          <div key={i} className="flex items-start gap-6">
                            <span className={`w-16 h-16 rounded-full ${theme.chip} flex items-center justify-center text-2xl font-black flex-shrink-0 shadow-lg`}>{e.numero}</span>
                            <div>
                              <p className="text-2xl font-black leading-tight">{e.titulo}</p>
                              {e.descricao && <p className={`text-lg ${theme.accent} leading-snug mt-1`}>{e.descricao}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {slide.tipo === "encerramento" && (
                    <div className="relative flex-1 flex flex-col justify-center items-center text-center">
                      <p className={`text-xl font-black uppercase tracking-wider ${theme.accent}`}>Conclusão</p>
                      <p className="text-5xl font-black mt-3 mb-6">{slide.titulo}</p>
                      <p className="text-2xl leading-snug max-w-[80%]">{slide.mensagem}</p>
                      {slide.dicaEnem && (
                        <div className={`mt-8 px-6 py-3 rounded-xl bg-white/20 border-2 ${theme.border}`}>
                          <p className="text-lg font-bold"><span className="font-black">📝 ENEM:</span> {slide.dicaEnem}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="absolute bottom-4 right-6 text-sm font-bold opacity-60">{idx + 1} / {total}</div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Setas laterais grandes */}
          <button
            onClick={() => setIdx(Math.max(0, idx - 1))}
            disabled={idx === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-20"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIdx(Math.min(total - 1, idx + 1))}
            disabled={idx >= total - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-20"
            aria-label="Próximo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Caderno color palette ────────────────────────────────────────────────────
const CADERNO_PALETTE: Record<string, { gradient: string; light: string; text: string; dot: string }> = {
  indigo:  { gradient: "from-violet-500 to-violet-600",  light: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500" },
  violet:  { gradient: "from-violet-500 to-violet-600",  light: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500" },
  blue:    { gradient: "from-violet-500 to-violet-600",    light: "bg-violet-50",    text: "text-violet-700",    dot: "bg-violet-500" },
  emerald: { gradient: "from-emerald-500 to-teal-600",   light: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rose:    { gradient: "from-rose-500 to-pink-600",      light: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-500" },
  amber:   { gradient: "from-amber-500 to-orange-600",   light: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  slate:   { gradient: "from-slate-500 to-slate-700",    light: "bg-slate-100",  text: "text-slate-700",   dot: "bg-slate-500" },
};
const getCadernoStyle = (color?: string) => CADERNO_PALETTE[color ?? "indigo"] ?? CADERNO_PALETTE.indigo;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Notebook() {
  const [, navigate] = useLocation();

  // Cadernos
  const [cadernos, setCadernos] = useState<Caderno[]>([]);
  const [activeCaderno, setActiveCaderno] = useState<Caderno | null>(null);
  const [showCadernoModal, setShowCadernoModal] = useState<"new" | "edit" | null>(null);
  const [cadernoForm, setCadernoForm] = useState<{ title: string; persona: string; goals: string; emoji: string; color: string }>({
    title: "", persona: "", goals: "", emoji: "📘", color: "indigo",
  });

  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const [uploadMode, setUploadMode] = useState<"file" | "text" | "url" | "youtube" | "wikipedia" | "audio" | "image" | "xlsx" | "epub" | "gdocs" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadYtUrl, setUploadYtUrl] = useState("");
  const [uploadWiki, setUploadWiki] = useState("");
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [toolResult, setToolResult] = useState<unknown>(null);
  const [toolError, setToolError] = useState<string | null>(null);

  const [mobilePanel, setMobilePanel] = useState<"sources" | "chat" | "tools">("chat");

  // Citações clicáveis: msgIdx + numero da fonte → expandida
  const [openFonte, setOpenFonte] = useState<{ msgIdx: number; numero: number } | null>(null);
  const [openSourceList, setOpenSourceList] = useState<number | null>(null);
  // Resposta expandida em modal
  const [expandedMsg, setExpandedMsg] = useState<{ text: string; idx: number } | null>(null);
  const [expandedSize, setExpandedSize] = useState<"full" | "three-quarters" | "half">("three-quarters");
  // Toggle "perguntar só sobre os documentos selecionados"
  const [restrictToSelected, setRestrictToSelected] = useState(true);
  // Slides nav
  const [slideIdx, setSlideIdx] = useState(0);
  const [tarefaShowProfessor, setTarefaShowProfessor] = useState(false);
  const [seqActiveAula, setSeqActiveAula] = useState<number | null>(null);
  const [microTab, setMicroTab] = useState<"15s" | "60s" | "3min" | "10min" | "serie">("60s");
  const [narrTab, setNarrTab] = useState<"universo" | "ato1" | "ato2" | "ato3" | "ludico">("universo");
  const [verTab, setVerTab] = useState<"turmaDificil" | "turmaAvancada" | "turmaInclusiva" | "aulaRemota" | "aulaHibrida">("turmaDificil");

  // Home vs Workspace view
  const [notebookView, setNotebookView] = useState<"home" | "workspace">("home");
  const [homeSearch, setHomeSearch] = useState("");

  // Chat mode (Padrão, Estudo, Pesquisa, Revisão, Dúvidas)
  const [chatMode, setChatMode] = useState<"padrao" | "estudo" | "pesquisa" | "revisao" | "duvidas">("padrao");
  const CHAT_MODES = [
    { key: "padrao",   label: "Padrão",   color: "text-slate-600",  active: "bg-slate-700 text-white" },
    { key: "estudo",   label: "Estudo",   color: "text-violet-600", active: "bg-violet-600 text-white" },
    { key: "pesquisa", label: "Pesquisa", color: "text-violet-600", active: "bg-violet-600 text-white" },
    { key: "revisao",  label: "Revisão",  color: "text-amber-600",  active: "bg-amber-500 text-white" },
    { key: "duvidas",  label: "Dúvidas",  color: "text-rose-600",   active: "bg-rose-500 text-white" },
  ] as const;

  // DNA das Fontes
  const [dnaResult, setDnaResult] = useState<DnaFontes | null>(null);
  const [dnaLoading, setDnaLoading] = useState(false);
  const [showDna, setShowDna] = useState(false);

  // Artefatos salvos do doc atual
  type SavedArtifact = { id: number; kind: string; title: string; created_at: string };
  const [savedArtifacts, setSavedArtifacts] = useState<SavedArtifact[]>([]);
  // Artefatos criados diretamente pelo Tiagão (doc_id = 0)
  const [tiagaoArtifacts, setTiagaoArtifacts] = useState<SavedArtifact[]>([]);
  // Lightbox para ampliar infográfico
  const [infoFull, setInfoFull] = useState<string | null>(null);

  // Sugestões de perguntas
  const [suggestedQs, setSuggestedQs] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Fast Research
  const [showFastResearch, setShowFastResearch] = useState(false);
  const [fastResearchTopic, setFastResearchTopic] = useState("");
  const [fastResearchResults, setFastResearchResults] = useState<Array<{ titulo: string; url: string; snippet: string }>>([]);
  const [fastResearchLoading, setFastResearchLoading] = useState(false);
  const [addingUrl, setAddingUrl] = useState<string | null>(null);

  // Discover
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverResults, setDiscoverResults] = useState<Array<{ titulo: string; url: string; snippet: string; relevancia?: string }>>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  // Share
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Drag & drop
  const [dragOver, setDragOver] = useState(false);
  const xlsxRef = useRef<HTMLInputElement>(null);
  const epubRef = useRef<HTMLInputElement>(null);

  const [relatorioTemplate, setRelatorioTemplate] = useState<"academico" | "blog" | "executivo" | "aula">("academico");

  // Personas educacionais (/personas/*.py)
  const [selectedPersona, setSelectedPersona] = useState<string>("planejador");
  const PERSONAS_OPTIONS = [
    { key: "planejador",     label: "👨‍🏫 Planejador Experiente", desc: "Realista, BNCC, sem floreios" },
    { key: "mestre_yoda",   label: "🧙 Mestre Yoda",           desc: "Socrático — nunca entrega a resposta" },
    { key: "tia_marlene",   label: "👩‍🍳 Tia Marlene",          desc: "Analogias do cotidiano (cozinha, família)" },
    { key: "coach_energia", label: "⚡ Coach Energia",         desc: "Alta energia, esportes, gamificação" },
    { key: "cientista_maluco", label: "🧪 Cientista Maluco",  desc: "'E SE...?' — experimentos e surpresas" },
    { key: "narrador_epico",label: "🎬 Narrador Épico",        desc: "BBC/documentário — tudo é dramático" },
  ];

  // Aula Viva sub-formatos (/tools/aula_viva/*.py)
  const [aulaVivaFormato, setAulaVivaFormato] = useState<"jornal" | "chef" | "investigacao" | "talk-show">("jornal");

  // Notebook header menu + Studio "Mais ferramentas"
  const [notebookMenuOpen, setNotebookMenuOpen] = useState(false);
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [openArtifactMenu, setOpenArtifactMenu] = useState<number | null>(null);

  // Avaliação por Voz tab
  const [vozTab, setVozTab] = useState<"podcast" | "entrevista" | "debate">("podcast");

  const loadCadernos = useCallback(async () => {
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/cadernos`, { credentials: "include" });
      if (r.ok) {
        const raw = await r.json();
        const data: Caderno[] = Array.isArray(raw) ? raw : [];
        setCadernos(data);
        const firstCaderno = data[0] ?? null;
        setActiveCaderno(prev => prev ? (data.find(c => c.id === prev.id) ?? firstCaderno) : firstCaderno);
        // Auto-abre workspace se há apenas 1 caderno padrão — evita "página vazia"
        if (data.length === 1 && data[0].is_default) {
          setNotebookView("workspace");
        }
      }
    } catch { /* silent */ }
  }, []);

  const loadDocs = useCallback(async (cadernoId?: number) => {
    setLoadingDocs(true);
    try {
      const qs = cadernoId ? `?cadernoId=${cadernoId}` : "";
      const r = await fetch(`${BASE_URL}/api/notebook/docs${qs}`, { credentials: "include" });
      if (r.ok) {
        const raw = await r.json();
        const data: Doc[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.rows) ? raw.rows : []);
        setDocs(data);
        setSelectedDocIds(data.length ? [data[0].id] : []);
      }
    } catch { /* silent */ }
    finally { setLoadingDocs(false); }
  }, []);

  useEffect(() => { loadCadernos(); }, [loadCadernos]);
  useEffect(() => { loadDocs(activeCaderno?.id); }, [loadDocs, activeCaderno?.id]);

  // Carrega artefatos salvos do primeiro doc selecionado
  useEffect(() => {
    const docId = selectedDocIds[0];
    if (!docId) { setSavedArtifacts([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/notebook/docs/${docId}/artifacts`, { credentials: "include" });
        if (r.ok && !cancelled) {
          const raw = await r.json();
          const list: SavedArtifact[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.rows) ? raw.rows : []);
          setSavedArtifacts(list);
        } else if (!cancelled) {
          setSavedArtifacts([]);
        }
      } catch { if (!cancelled) setSavedArtifacts([]); }
    })();
    return () => { cancelled = true; };
  }, [selectedDocIds]);

  const openSavedArtifact = useCallback(async (a: SavedArtifact) => {
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/artifacts/${a.id}`, { credentials: "include" });
      if (!r.ok) return;
      const data = await r.json();
      const payload = data?.payload ?? data;
      const kindToTool: Record<string, Tool> = {
        slides: "slides", podcast: "podcast", timeline: "timeline",
        infografico: "infografico", "mapa-mental": "mapa-mental",
        mapa_mental: "mapa-mental",
        flashcards: "flashcards", questoes: "questoes", "study-guide": "study-guide",
        overview: "overview",
        prova: "questoes", plano_estudos: "study-guide",
        resumo: "study-guide", plano: "study-guide",
        briefing: "briefing", relatorio: "relatorio",
        tabela: "tabela", infografico_texto: "infografico",
        material_html: "slides",
        correcao_redacao: "study-guide",
      };
      const tool = kindToTool[a.kind];
      if (!tool) return;
      setActiveTool(tool);
      setToolResult(payload);
      setToolError(null);
      // Navigate to workspace and tools panel so the result is visible
      setNotebookView("workspace");
      setMobilePanel("tools");
      if (tool === "slides") setSlideIdx(0);
    } catch { /* silent */ }
  }, []); // eslint-disable-line

  const deleteSavedArtifact = useCallback(async (id: number) => {
    if (!confirm("Remover este artefato salvo?")) return;
    try {
      await fetch(`${BASE_URL}/api/notebook/artifacts/${id}`, { method: "DELETE", credentials: "include" });
      setSavedArtifacts(prev => prev.filter(a => a.id !== id));
      setTiagaoArtifacts(prev => prev.filter(a => a.id !== id));
    } catch { /* silent */ }
  }, []); // eslint-disable-line

  // ─── Helpers de download ──────────────────────────────────────────────────
  const extractTextFromPayload = (payload: unknown, depth = 0): string => {
    if (depth > 6) return "";
    if (typeof payload === "string") return payload;
    if (typeof payload === "number" || typeof payload === "boolean") return String(payload);
    if (Array.isArray(payload)) return payload.map(v => extractTextFromPayload(v, depth + 1)).filter(Boolean).join("\n");
    if (payload && typeof payload === "object") {
      const skipKeys = new Set(["icon", "color", "image", "emoji", "id", "url"]);
      return Object.entries(payload as Record<string, unknown>)
        .filter(([k]) => !skipKeys.has(k))
        .map(([, v]) => extractTextFromPayload(v, depth + 1))
        .filter(Boolean).join("\n");
    }
    return "";
  };

  const downloadArtifactAsPDF = useCallback(async (a: SavedArtifact) => {
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/artifacts/${a.id}`, { credentials: "include" });
      if (!r.ok) return;
      const data = await r.json();
      const payload = data?.payload ?? data;
      const cfg = TOOL_CONFIG[(a.kind as Tool)];
      const title = a.title || cfg?.label || a.kind;

      // Build printable HTML and open in new window
      const lines = extractTextFromPayload(payload)
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);
      const bodyHtml = lines.map(l => `<p style="margin:0 0 6px;font-size:13px;line-height:1.6">${l.replace(/</g,"&lt;")}</p>`).join("");

      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${title}</title>
        <style>
          body{font-family:system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 20px;color:#1e293b}
          h1{font-size:22px;font-weight:800;margin-bottom:24px;color:#312e81;border-bottom:2px solid #e2e8f0;padding-bottom:12px}
          p{margin:0 0 8px;font-size:13px;line-height:1.65}
          @media print{body{margin:20px}}
        </style>
      </head><body>
        <h1>${title}</h1>
        ${bodyHtml}
        <script>window.onload=function(){window.print();}<\/script>
      </body></html>`);
      win.document.close();
    } catch { /* silent */ }
  }, []);

  const downloadArtifactAsPPTX = useCallback(async (a: SavedArtifact) => {
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/artifacts/${a.id}`, { credentials: "include" });
      if (!r.ok) return;
      const data = await r.json();
      const payload = data?.payload ?? data;
      const cfg = TOOL_CONFIG[(a.kind as Tool)];
      const title = a.title || cfg?.label || a.kind;

      const pptxgen = (await import("pptxgenjs")).default;
      const prs = new pptxgen();
      prs.layout = "LAYOUT_WIDE";
      prs.title = title;

      // ── Title slide ──────────────────────────────────────────────────────
      const titleSlide = prs.addSlide();
      titleSlide.background = { color: "312e81" };
      titleSlide.addText(title, { x: 0.5, y: 2.2, w: "90%", h: 1.5, fontSize: 36, bold: true, color: "FFFFFF", align: "center" });
      titleSlide.addText("StudyAI · studyai.com.br", { x: 0.5, y: 4.2, w: "90%", h: 0.5, fontSize: 14, color: "a5b4fc", align: "center" });

      // ── Content slides ───────────────────────────────────────────────────
      // If payload is array of slides, render each; otherwise chunk lines
      const isSlideArray = Array.isArray(payload) && payload[0]?.titulo !== undefined;

      if (isSlideArray) {
        (payload as Array<{ titulo?: string; conteudo?: string; pontos?: string[]; texto?: string }>).forEach(s => {
          const slide = prs.addSlide();
          slide.background = { color: "FFFFFF" };
          if (s.titulo) {
            slide.addText(s.titulo, { x: 0.5, y: 0.4, w: "90%", h: 0.8, fontSize: 22, bold: true, color: "312e81" });
          }
          const body = s.pontos?.join("\n") ?? s.conteudo ?? s.texto ?? "";
          if (body) {
            slide.addText(body, { x: 0.5, y: 1.4, w: "90%", h: 4, fontSize: 14, color: "334155", valign: "top" });
          }
        });
      } else {
        const allLines = extractTextFromPayload(payload).split("\n").map(l => l.trim()).filter(Boolean);
        const chunkSize = 14;
        for (let i = 0; i < allLines.length; i += chunkSize) {
          const chunk = allLines.slice(i, i + chunkSize);
          const slide = prs.addSlide();
          slide.background = { color: "FFFFFF" };
          slide.addText(chunk.join("\n"), { x: 0.5, y: 0.5, w: "90%", h: 5.5, fontSize: 13, color: "334155", valign: "top" });
          slide.addText(title, { x: 0.5, y: 6.8, w: "90%", h: 0.35, fontSize: 9, color: "94a3b8", align: "right" });
        }
      }

      await prs.writeFile({ fileName: `${title.replace(/[^a-z0-9]/gi, "_")}.pptx` });
    } catch (e) { console.error("PPTX export:", e); }
  }, []);

  // ─── Load Tiagão-created artifacts (doc_id = 0) ──────────────────────────
  const loadTiagaoArtifacts = useCallback(async () => {
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/tiagao-artifacts`, { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        const list: SavedArtifact[] = Array.isArray(data?.artifacts) ? data.artifacts : [];
        setTiagaoArtifacts(list);
      }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { loadTiagaoArtifacts(); }, [loadTiagaoArtifacts]);

  // ─── Auto-open Tiagão-created artifacts from localStorage ────────────────
  useEffect(() => {
    function applyTiagaoArtifacts() {
      let opened = false;
      // Slides / Material HTML
      const slidesRaw = localStorage.getItem("tiagao_slides_criados");
      if (slidesRaw) {
        try {
          const slidesData = JSON.parse(slidesRaw);
          if (slidesData?.html || slidesData?.formato === "html_completo") {
            setActiveTool("slides");
            setToolResult(slidesData);
            setToolError(null);
            setNotebookView("workspace");
            setMobilePanel("tools");
            opened = true;
          } else if (slidesData?.slides?.length) {
            setActiveTool("slides");
            setToolResult({ apresentacao: slidesData });
            setToolError(null);
            setSlideIdx(0);
            setNotebookView("workspace");
            setMobilePanel("tools");
            opened = true;
          }
        } catch { /* ignore */ }
        localStorage.removeItem("tiagao_slides_criados");
      }
      // Prova
      if (!opened) {
        const provaRaw = localStorage.getItem("tiagao_prova_criada");
        if (provaRaw) {
          try {
            const provaData = JSON.parse(provaRaw);
            if (provaData?.questoes?.length) {
              const normalized = provaData.questoes.map((q: any) => ({
                enunciado: q.enunciado,
                alternativas: q.alternativas ?? {},
                gabarito: q.resposta_correta ?? q.gabarito ?? "A",
                explicacao: q.explicacao ?? q.criterios_avaliacao ?? "",
              }));
              setActiveTool("questoes");
              setToolResult({ questoes: normalized });
              setToolError(null);
              setNotebookView("workspace");
              setMobilePanel("tools");
              opened = true;
            }
          } catch { /* ignore */ }
          localStorage.removeItem("tiagao_prova_criada");
        }
      }
      // Mapa mental
      if (!opened) {
        const mapaRaw = localStorage.getItem("tiagao_mapa_mental");
        if (mapaRaw) {
          try {
            const mapaData = JSON.parse(mapaRaw);
            if (mapaData?.categories?.length || mapaData?.subject) {
              setActiveTool("mapa-mental");
              setToolResult(mapaData);
              setToolError(null);
              setNotebookView("workspace");
              setMobilePanel("tools");
              opened = true;
            }
          } catch { /* ignore */ }
          localStorage.removeItem("tiagao_mapa_mental");
        }
      }
      // Infográfico
      if (!opened) {
        const infoRaw = localStorage.getItem("tiagao_infografico");
        if (infoRaw) {
          try {
            const infoData = JSON.parse(infoRaw);
            if (infoData && typeof infoData === "object") {
              setActiveTool("infografico");
              setToolResult(infoData);
              setToolError(null);
              setNotebookView("workspace");
              setMobilePanel("tools");
              opened = true;
            }
          } catch { /* ignore */ }
          localStorage.removeItem("tiagao_infografico");
        }
      }
      // Resumo / Material HTML
      if (!opened) {
        const resumoRaw = localStorage.getItem("tiagao_resumo");
        if (resumoRaw) {
          try {
            const resumoData = JSON.parse(resumoRaw);
            if (resumoData && typeof resumoData === "object") {
              // HTML material (livro digital)
              if (resumoData?.html || resumoData?.formato === "html_completo") {
                setActiveTool("slides");
              } else {
                setActiveTool("study-guide");
              }
              setToolResult(resumoData);
              setToolError(null);
              setNotebookView("workspace");
              setMobilePanel("tools");
            }
          } catch { /* ignore */ }
          localStorage.removeItem("tiagao_resumo");
        }
      }
      // Refresh Tiagão artifacts list from DB
      loadTiagaoArtifacts();
    }

    applyTiagaoArtifacts();

    // cross-tab: storage event
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("tiagao_")) {
        setTimeout(applyTiagaoArtifacts, 50);
      }
    };
    // same-tab: custom event
    const onTiagaoArtifact = () => setTimeout(applyTiagaoArtifacts, 50);
    window.addEventListener("storage", onStorage);
    window.addEventListener("tiagao_artifact", onTiagaoArtifact);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tiagao_artifact", onTiagaoArtifact);
    };
  }, [loadTiagaoArtifacts]);

  // ─── Suggest questions ────────────────────────────────────────────────────
  useEffect(() => {
    if (!docs.length || messages.length > 0) { setSuggestedQs([]); return; }
    let cancelled = false;
    setLoadingSuggestions(true);
    (async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/notebook/suggest-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ docIds: selectedDocIds.length ? selectedDocIds : docs.map(d => d.id).slice(0, 5) }),
        });
        if (r.ok && !cancelled) {
          const data = await r.json();
          setSuggestedQs(Array.isArray(data.perguntas) ? data.perguntas : []);
        }
      } catch { /* silent */ }
      finally { if (!cancelled) setLoadingSuggestions(false); }
    })();
    return () => { cancelled = true; };
  }, [docs, messages.length]);

  // ─── XLSX upload ──────────────────────────────────────────────────────────
  const handleXlsxUpload = useCallback(async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", file.name.replace(/\.[^.]+$/, ""));
    if (activeCaderno?.id) fd.append("cadernoId", String(activeCaderno.id));
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/upload-file`, { method: "POST", body: fd, credentials: "include" });
      const d = await r.json();
      setUploadMsg(r.ok ? { ok: true, text: d.message ?? "✅ Planilha adicionada" } : { ok: false, text: d.erro ?? "Erro" });
      if (r.ok) { setUploadMode(null); loadDocs(activeCaderno?.id); }
    } catch { setUploadMsg({ ok: false, text: "Erro de rede" }); }
    finally { setUploading(false); }
  }, [activeCaderno, loadDocs]);

  // ─── EPUB upload ──────────────────────────────────────────────────────────
  const handleEpubUpload = useCallback(async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", file.name.replace(/\.[^.]+$/, ""));
    if (activeCaderno?.id) fd.append("cadernoId", String(activeCaderno.id));
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/upload-file`, { method: "POST", body: fd, credentials: "include" });
      const d = await r.json();
      setUploadMsg(r.ok ? { ok: true, text: d.message ?? "✅ E-book adicionado" } : { ok: false, text: d.erro ?? "Erro" });
      if (r.ok) { setUploadMode(null); loadDocs(activeCaderno?.id); }
    } catch { setUploadMsg({ ok: false, text: "Erro de rede" }); }
    finally { setUploading(false); }
  }, [activeCaderno, loadDocs]);

  // ─── Fast Research ─────────────────────────────────────────────────────────
  const runFastResearch = useCallback(async () => {
    if (!fastResearchTopic.trim()) return;
    setFastResearchLoading(true);
    setFastResearchResults([]);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/fast-research`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ topic: fastResearchTopic }),
      });
      if (r.ok) {
        const d = await r.json();
        setFastResearchResults(Array.isArray(d.resultados) ? d.resultados : []);
      }
    } catch { /* silent */ }
    finally { setFastResearchLoading(false); }
  }, [fastResearchTopic]);

  const addUrlToNotebook = useCallback(async (url: string, title: string) => {
    setAddingUrl(url);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/upload-url`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ url, title, cadernoId: activeCaderno?.id }),
      });
      if (r.ok) loadDocs(activeCaderno?.id);
    } catch { /* silent */ }
    finally { setAddingUrl(null); }
  }, [activeCaderno, loadDocs]);

  // ─── Discover ─────────────────────────────────────────────────────────────
  const runDiscover = useCallback(async () => {
    if (!docs.length) return;
    setDiscoverLoading(true);
    setDiscoverResults([]);
    setShowDiscover(true);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/discover`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ docIds: selectedDocIds.length ? selectedDocIds : docs.map(d => d.id) }),
      });
      if (r.ok) {
        const d = await r.json();
        setDiscoverResults(Array.isArray(d.sugestoes) ? d.sugestoes : []);
      }
    } catch { /* silent */ }
    finally { setDiscoverLoading(false); }
  }, [docs, selectedDocIds]);

  // ─── Share link ───────────────────────────────────────────────────────────
  const generateShareLink = useCallback(async () => {
    if (!activeCaderno) return;
    setShareLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/share-link`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ cadernoId: activeCaderno.id }),
      });
      if (r.ok) {
        const d = await r.json();
        setShareToken(d.token);
      }
    } catch { /* silent */ }
    finally { setShareLoading(false); }
  }, [activeCaderno]);

  // ─── Drag & drop handler ──────────────────────────────────────────────────
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files.slice(0, 10)) {
      const name = file.name.toLowerCase();
      if (name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".txt") || name.endsWith(".pptx")) {
        // Use existing handleFileUpload-like logic inline
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", file.name.replace(/\.[^.]+$/, ""));
        if (activeCaderno?.id) fd.append("cadernoId", String(activeCaderno.id));
        setUploading(true);
        try {
          const r = await fetch(`${BASE_URL}/api/notebook/upload-file`, { method: "POST", body: fd, credentials: "include" });
          const d = await r.json();
          if (r.ok) loadDocs(activeCaderno?.id);
          else setUploadMsg({ ok: false, text: d.erro ?? "Erro" });
        } catch { /* silent */ }
        finally { setUploading(false); }
      } else if (name.endsWith(".xlsx") || name.endsWith(".csv")) {
        await handleXlsxUpload(file);
      } else if (name.endsWith(".epub")) {
        await handleEpubUpload(file);
      }
    }
  }, [activeCaderno, loadDocs, handleXlsxUpload, handleEpubUpload]);

  const saveCaderno = useCallback(async () => {
    if (!cadernoForm.title.trim()) return;
    const isEdit = showCadernoModal === "edit" && activeCaderno;
    const url = isEdit
      ? `${BASE_URL}/api/notebook/cadernos/${activeCaderno!.id}`
      : `${BASE_URL}/api/notebook/cadernos`;
    const r = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(cadernoForm),
    });
    if (r.ok) {
      const saved = await r.json();
      setShowCadernoModal(null);
      await loadCadernos();
      if (!isEdit && saved?.id) { setActiveCaderno(saved); setNotebookView("workspace"); }
    }
  }, [cadernoForm, showCadernoModal, activeCaderno, loadCadernos]);

  const deleteCaderno = useCallback(async (id: number) => {
    if (!confirm("Excluir este caderno? Os documentos voltarão para o caderno padrão.")) return;
    await fetch(`${BASE_URL}/api/notebook/cadernos/${id}`, { method: "DELETE", credentials: "include" });
    await loadCadernos();
    setNotebookView("home");
  }, [loadCadernos]);

  const openEditCaderno = useCallback(() => {
    if (!activeCaderno) return;
    setCadernoForm({
      title: activeCaderno.title,
      persona: activeCaderno.persona ?? "",
      goals: activeCaderno.goals ?? "",
      emoji: activeCaderno.emoji ?? "📘",
      color: activeCaderno.color ?? "indigo",
    });
    setShowCadernoModal("edit");
  }, [activeCaderno]);

  const openNewCaderno = useCallback(() => {
    setCadernoForm({ title: "", persona: "", goals: "", emoji: "📘", color: "indigo" });
    setShowCadernoModal("new");
  }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadMsg(null);
    const form = new FormData();
    form.append("file", file);
    form.append("title", file.name.replace(/\.[^.]+$/, ""));
    if (activeCaderno?.id) form.append("cadernoId", String(activeCaderno.id));
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/upload-file`, { method: "POST", body: form, credentials: "include" });
      const data = await r.json();
      if (r.ok) {
        setUploadMsg({ ok: true, text: data.message ?? `✓ "${data.title}" adicionado` });
        await loadDocs();
        setUploadMode(null);
      } else {
        setUploadMsg({ ok: false, text: data.erro ?? "Erro ao enviar" });
      }
    } catch { setUploadMsg({ ok: false, text: "Erro de conexão" }); }
    finally { setUploading(false); }
  }, [loadDocs]);

  const handleTextUpload = useCallback(async () => {
    if (!uploadTitle.trim() || !uploadText.trim()) return;
    setUploading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/upload-text`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ title: uploadTitle, content: uploadText, cadernoId: activeCaderno?.id }),
      });
      const data = await r.json();
      if (r.ok) {
        setUploadMsg({ ok: true, text: data.message ?? `✓ "${data.title}" adicionado` });
        setUploadTitle(""); setUploadText(""); await loadDocs(); setUploadMode(null);
      } else { setUploadMsg({ ok: false, text: data.erro ?? "Erro" }); }
    } catch { setUploadMsg({ ok: false, text: "Erro de conexão" }); }
    finally { setUploading(false); }
  }, [uploadTitle, uploadText, loadDocs]);

  const handleUrlUpload = useCallback(async () => {
    if (!uploadUrl.trim()) return;
    setUploading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/upload-url`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ url: uploadUrl, title: uploadTitle || undefined, cadernoId: activeCaderno?.id }),
      });
      const data = await r.json();
      if (r.ok) {
        setUploadMsg({ ok: true, text: data.message ?? `✓ "${data.title}" importado` });
        setUploadUrl(""); setUploadTitle(""); await loadDocs(); setUploadMode(null);
      } else { setUploadMsg({ ok: false, text: data.erro ?? "Erro" }); }
    } catch { setUploadMsg({ ok: false, text: "Erro de conexão" }); }
    finally { setUploading(false); }
  }, [uploadUrl, uploadTitle, loadDocs]);

  const handleYoutubeUpload = useCallback(async () => {
    if (!uploadYtUrl.trim()) return;
    setUploading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/upload-youtube`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ url: uploadYtUrl, title: uploadTitle || undefined, cadernoId: activeCaderno?.id }),
      });
      const data = await r.json();
      if (r.ok) {
        setUploadMsg({ ok: true, text: data.message ?? "✓ Vídeo importado" });
        setUploadYtUrl(""); setUploadTitle(""); await loadDocs(); setUploadMode(null);
      } else { setUploadMsg({ ok: false, text: data.erro ?? "Erro" }); }
    } catch { setUploadMsg({ ok: false, text: "Erro de conexão" }); }
    finally { setUploading(false); }
  }, [uploadYtUrl, uploadTitle, loadDocs, activeCaderno]);

  const handleWikipediaUpload = useCallback(async () => {
    if (!uploadWiki.trim()) return;
    setUploading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/upload-wikipedia`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ titulo: uploadWiki, cadernoId: activeCaderno?.id }),
      });
      const data = await r.json();
      if (r.ok) {
        setUploadMsg({ ok: true, text: data.message ?? "✓ Artigo importado" });
        setUploadWiki(""); await loadDocs(); setUploadMode(null);
      } else { setUploadMsg({ ok: false, text: data.erro ?? "Erro" }); }
    } catch { setUploadMsg({ ok: false, text: "Erro de conexão" }); }
    finally { setUploading(false); }
  }, [uploadWiki, loadDocs, activeCaderno]);

  const handleAudioUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadMsg(null);
    const form = new FormData();
    form.append("audio", file);
    form.append("title", file.name.replace(/\.[^.]+$/, ""));
    if (activeCaderno?.id) form.append("cadernoId", String(activeCaderno.id));
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/upload-audio`, { method: "POST", body: form, credentials: "include" });
      const data = await r.json();
      if (r.ok) {
        setUploadMsg({ ok: true, text: data.message ?? "✓ Áudio transcrito" });
        await loadDocs(); setUploadMode(null);
      } else { setUploadMsg({ ok: false, text: data.erro ?? "Erro" }); }
    } catch { setUploadMsg({ ok: false, text: "Erro de conexão" }); }
    finally { setUploading(false); }
  }, [loadDocs, activeCaderno]);

  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadMsg(null);
    const form = new FormData();
    form.append("image", file);
    form.append("title", file.name.replace(/\.[^.]+$/, ""));
    if (activeCaderno?.id) form.append("cadernoId", String(activeCaderno.id));
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/upload-image`, { method: "POST", body: form, credentials: "include" });
      const data = await r.json();
      if (r.ok) {
        setUploadMsg({ ok: true, text: data.message ?? "✓ Imagem processada" });
        await loadDocs(); setUploadMode(null);
      } else { setUploadMsg({ ok: false, text: data.erro ?? "Erro" }); }
    } catch { setUploadMsg({ ok: false, text: "Erro de conexão" }); }
    finally { setUploading(false); }
  }, [loadDocs, activeCaderno]);

  const handleDelete = useCallback(async (id: number) => {
    await fetch(`${BASE_URL}/api/notebook/docs/${id}`, { method: "DELETE", credentials: "include" });
    setSelectedDocIds(ids => ids.filter(i => i !== id));
    await loadDocs();
  }, [loadDocs]);

  const toggleDoc = useCallback((id: number) => {
    setSelectedDocIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!inputMsg.trim() || chatLoading) return;
    const q = inputMsg.trim();
    setInputMsg("");
    setMessages(m => [...m, { role: "user", text: q }, { role: "assistant", text: "" }]);
    setChatLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/chat-stream`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          pergunta: q,
          docIds: restrictToSelected && selectedDocIds.length ? selectedDocIds : null,
          cadernoId: activeCaderno?.id,
          modo: chatMode,
        }),
      });
      if (!r.ok || !r.body) {
        const data = await r.json().catch(() => ({ erro: "Erro" }));
        setMessages(m => { const c = [...m]; c[c.length - 1] = { role: "assistant", text: `Erro: ${data.erro ?? "tente novamente"}` }; return c; });
        setChatLoading(false);
        return;
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let textAcc = "";
      let allSources: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() || "";
        for (const evt of events) {
          const lines = evt.split("\n");
          let event = "message", data = "";
          for (const ln of lines) {
            if (ln.startsWith("event:")) event = ln.slice(6).trim();
            else if (ln.startsWith("data:")) data += ln.slice(5).trim();
          }
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            if (event === "chunk") {
              textAcc += parsed.text || "";
              setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: textAcc, fontes: allSources }; return c; });
            } else if (event === "sources") {
              allSources = parsed;
              setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: textAcc, fontes: allSources }; return c; });
            } else if (event === "done") {
              if (parsed.fontes) {
                setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: textAcc, fontes: parsed.fontes }; return c; });
              }
            } else if (event === "error") {
              setMessages(m => { const c = [...m]; c[c.length - 1] = { role: "assistant", text: `Erro: ${parsed.erro ?? "stream"}` }; return c; });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setMessages(m => { const c = [...m]; c[c.length - 1] = { role: "assistant", text: "Erro de conexão. Tente novamente." }; return c; });
    } finally { setChatLoading(false); }
  }, [inputMsg, chatLoading, selectedDocIds, restrictToSelected, activeCaderno]);

  const runTool = useCallback(async (tool: Tool, docId?: number) => {
    const targetDocId = docId ?? selectedDocIds[0];
    if (!targetDocId) return;
    setToolError(null);

    if (tool === "tiagao") {
      setToolLoading(true);
      try {
        const r = await fetch(`${BASE_URL}/api/notebook/tiagao-explica`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ docId: targetDocId }),
        });
        const data = await r.json();
        if (r.ok) {
          localStorage.setItem("tiagao_aula_data", JSON.stringify(data.aula));
          localStorage.setItem("tiagao_aula_topico", data.titulo);
          navigate("/aula-ia");
        } else { setToolError(data.erro ?? "Erro ao gerar aula"); }
      } catch { setToolError("Erro de conexão"); }
      finally { setToolLoading(false); }
      return;
    }

    setActiveTool(tool);
    setToolResult(null);
    setToolLoading(true);
    setMobilePanel("tools");

    const endpoints: Partial<Record<Tool, string>> = {
      overview: "/api/notebook/overview",
      "study-guide": "/api/notebook/study-guide",
      flashcards: "/api/notebook/flashcards",
      questoes: "/api/notebook/questoes",
      "mapa-mental": "/api/notebook/mapa-mental",
      podcast: "/api/notebook/podcast",
      briefing: "/api/notebook/briefing",
      "plano-aula": "/api/notebook/plano-aula",
      tarefa: "/api/notebook/tarefa",
      "sequencia-didatica": "/api/notebook/sequencia-didatica",
      "aula-viva": "/api/notebook/aula-viva",
      "aula-viva-formato": "/api/notebook/aula-viva-formato",
      "micro-aulas": "/api/notebook/micro-aulas",
      narrativa: "/api/notebook/narrativa",
      "remix-cultural": "/api/notebook/remix-cultural",
      "plano-aula-versoes": "/api/notebook/plano-aula-versoes",
      "avaliacao-voz": "/api/notebook/avaliacao-voz",
      "making-of": "/api/notebook/making-of",
      "simulador-aula": "/api/notebook/simulador-aula",
      timeline: "/api/notebook/timeline",
      slides: "/api/notebook/slides",
      infografico: "/api/notebook/infografico",
      tabela: "/api/notebook/tabela",
      relatorio: "/api/notebook/relatorio",
    };
    if (tool === "slides") setSlideIdx(0);

    try {
      const body: any = { docId: targetDocId, docIds: selectedDocIds.length ? selectedDocIds : [targetDocId] };
      if (tool === "infografico") {
        body.estilo = (window as any).__infograficoEstilo ?? "profissional";
        body.orientacao = (window as any).__infograficoOrientacao ?? "quadrado";
      }
      if (tool === "relatorio") { body.template = relatorioTemplate; }
      // Persona injection (/core/orquestrador.py)
      if (["plano-aula", "aula-viva", "aula-viva-formato", "avaliacao-voz", "making-of", "simulador-aula"].includes(tool)) {
        body.persona = selectedPersona;
      }
      // Aula Viva sub-formatos (/tools/aula_viva/*.py)
      if (tool === "aula-viva-formato") { body.formato = aulaVivaFormato; }
      const r = await fetch(`${BASE_URL}${endpoints[tool]}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (r.ok) { setToolResult(data); }
      else { setToolError(data.erro ?? "Erro ao gerar conteúdo"); }
    } catch { setToolError("Erro de conexão. Tente novamente."); }
    finally { setToolLoading(false); }
  }, [selectedDocIds, navigate]);

  const selectedDocs = docs.filter(d => selectedDocIds.includes(d.id));

  // ─── DNA das Fontes ─────────────────────────────────────────────────────────
  const fetchDna = useCallback(async (docId: number) => {
    setDnaLoading(true);
    setDnaResult(null);
    setShowDna(true);
    try {
      const r = await fetch(`${BASE_URL}/api/notebook/dna`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ docId }),
      });
      const data = await r.json();
      if (r.ok) setDnaResult(data);
    } catch { /* silent */ }
    finally { setDnaLoading(false); }
  }, []);

  // ─── SOURCES PANEL ─────────────────────────────────────────────────────────
  const SourcesPanel = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Cadernos picker */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Caderno</p>
          <button onClick={openNewCaderno} title="Novo caderno"
            className="w-5 h-5 rounded-md bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700">
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-thin">
          {cadernos.map(c => (
            <button key={c.id} onClick={() => setActiveCaderno(c)}
              className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 border ${
                activeCaderno?.id === c.id
                  ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:border-violet-300"
              }`}>
              <span>{c.emoji ?? "📘"}</span>
              <span className="max-w-[90px] truncate">{c.title}</span>
            </button>
          ))}
        </div>
        {activeCaderno && (
          <button onClick={openEditCaderno}
            className="mt-1.5 w-full text-left text-[10px] text-slate-500 hover:text-violet-600 truncate flex items-center gap-1">
            <Sparkles className="w-3 h-3 flex-shrink-0" />
            {activeCaderno.persona ? activeCaderno.persona.slice(0, 50) + "…" : "Definir persona/objetivos…"}
          </button>
        )}
      </div>
      <div className="px-4 py-2.5 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Fontes</p>
          {docs.length > 0 && (
            <button
              onClick={() => {
                if (selectedDocIds.length === docs.length) {
                  setSelectedDocIds([]);
                } else {
                  setSelectedDocIds(docs.map(d => d.id));
                }
              }}
              className="flex items-center gap-1 text-[10px] font-bold text-violet-600 hover:text-violet-700 transition-colors"
            >
              {selectedDocIds.length === docs.length
                ? <><X className="w-3 h-3" /> Limpar</>
                : <><Check className="w-3 h-3" /> Todas</>
              }
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {docs.length > 0
            ? `${selectedDocIds.length} de ${docs.length} selecionada${docs.length !== 1 ? "s" : ""}`
            : "Adicione fontes para começar"}
        </p>
      </div>

      {/* Upload buttons */}
      <div className="p-3 border-b border-slate-100 flex-shrink-0"
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {dragOver && (
          <div className="mb-2 p-3 bg-violet-50 border-2 border-dashed border-violet-400 rounded-xl text-center text-xs text-violet-600 font-bold">
            <Upload className="w-4 h-4 mx-auto mb-1" />
            Solte os arquivos aqui
          </div>
        )}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { mode: "file" as const, icon: FileText, label: "PDF" },
            { mode: "text" as const, icon: StickyNote, label: "Texto" },
            { mode: "url"  as const, icon: Link2,    label: "URL" },
            { mode: "youtube" as const, icon: Youtube, label: "YouTube" },
            { mode: "wikipedia" as const, icon: BookOpen, label: "Wiki" },
            { mode: "audio" as const, icon: Mic, label: "Áudio" },
            { mode: "image" as const, icon: ImageIcon, label: "Imagem" },
            { mode: "xlsx" as const, icon: LayoutGrid, label: "Planilha" },
            { mode: "epub" as const, icon: BookOpen, label: "EPUB" },
            { mode: "gdocs" as const, icon: ExternalLink, label: "G.Docs" },
          ].map(({ mode, icon: Icon, label }) => (
            <button key={mode} onClick={() => setUploadMode(m => m === mode ? null : mode)}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                uploadMode === mode ? "bg-violet-600 border-violet-600 text-white" : "border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {uploadMode && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-3 space-y-2">
                {uploadMode === "file" && (
                  <>
                    <input type="file" ref={fileRef} className="hidden" multiple
                      accept=".pdf,.doc,.docx,.txt,.pptx"
                      onChange={e => { Array.from(e.target.files ?? []).forEach(f => handleFileUpload(f)); }} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="w-full border-2 border-dashed border-violet-300 rounded-xl p-4 text-xs text-violet-600 font-medium hover:bg-violet-50 flex flex-col items-center gap-2">
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                      {uploading ? "Processando... aguarde" : "Clique ou arraste PDF / DOC / PPTX / TXT"}
                      {!uploading && <span className="text-[10px] text-slate-400">Múltiplos arquivos — Máx. 50MB cada</span>}
                    </button>
                  </>
                )}
                {uploadMode === "xlsx" && (
                  <>
                    <input type="file" ref={xlsxRef} className="hidden"
                      accept=".xlsx,.xls,.csv"
                      onChange={e => e.target.files?.[0] && handleXlsxUpload(e.target.files[0])} />
                    <button onClick={() => xlsxRef.current?.click()} disabled={uploading}
                      className="w-full border-2 border-dashed border-emerald-300 rounded-xl p-4 text-xs text-emerald-700 font-medium hover:bg-emerald-50 flex flex-col items-center gap-2">
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LayoutGrid className="w-5 h-5" />}
                      {uploading ? "Processando planilha..." : "Clique para enviar XLSX / CSV"}
                      {!uploading && <span className="text-[10px] text-slate-400">Excel, Sheets exportado como XLSX</span>}
                    </button>
                  </>
                )}
                {uploadMode === "epub" && (
                  <>
                    <input type="file" ref={epubRef} className="hidden"
                      accept=".epub"
                      onChange={e => e.target.files?.[0] && handleEpubUpload(e.target.files[0])} />
                    <button onClick={() => epubRef.current?.click()} disabled={uploading}
                      className="w-full border-2 border-dashed border-amber-300 rounded-xl p-4 text-xs text-amber-700 font-medium hover:bg-amber-50 flex flex-col items-center gap-2">
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />}
                      {uploading ? "Extraindo e-book..." : "Clique para enviar EPUB"}
                      {!uploading && <span className="text-[10px] text-slate-400">E-books no formato .epub</span>}
                    </button>
                  </>
                )}
                {uploadMode === "gdocs" && (
                  <>
                    <input value={uploadUrl} onChange={e => setUploadUrl(e.target.value)}
                      placeholder="https://docs.google.com/document/d/... *"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-violet-400" />
                    <button onClick={() => {
                      if (!uploadUrl.trim()) return;
                      setUploading(true);
                      fetch(`${BASE_URL}/api/notebook/upload-gdocs`, {
                        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                        body: JSON.stringify({ url: uploadUrl, cadernoId: activeCaderno?.id }),
                      }).then(r => r.json()).then(d => {
                        setUploadMsg(d.erro ? { ok: false, text: d.erro } : { ok: true, text: d.message ?? "✅ Google Docs importado" });
                        if (!d.erro) { setUploadUrl(""); setUploadMode(null); loadDocs(activeCaderno?.id); }
                      }).finally(() => setUploading(false));
                    }} disabled={uploading || !uploadUrl.trim()}
                      className="w-full py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                      Importar Google Doc
                    </button>
                    <p className="text-[10px] text-slate-400">Compartilhe o doc como "qualquer pessoa com o link pode ver"</p>
                  </>
                )}
                {uploadMode === "text" && (
                  <>
                    <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                      placeholder="Título do conteúdo *"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-violet-400" />
                    <textarea value={uploadText} onChange={e => setUploadText(e.target.value)}
                      placeholder="Cole o texto aqui..."
                      rows={5}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-violet-400 resize-none" />
                    <button onClick={handleTextUpload} disabled={uploading || !uploadTitle.trim() || !uploadText.trim()}
                      className="w-full py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Adicionar
                    </button>
                  </>
                )}
                {uploadMode === "url" && (
                  <>
                    <input value={uploadUrl} onChange={e => setUploadUrl(e.target.value)}
                      placeholder="https://... *"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-violet-400" />
                    <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                      placeholder="Título (opcional)"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-violet-400" />
                    <button onClick={handleUrlUpload} disabled={uploading || !uploadUrl.trim()}
                      className="w-full py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                      Importar URL
                    </button>
                  </>
                )}
                {uploadMode === "youtube" && (
                  <>
                    <input value={uploadYtUrl} onChange={e => setUploadYtUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... *"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-violet-400" />
                    <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                      placeholder="Título (opcional)"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-violet-400" />
                    <button onClick={handleYoutubeUpload} disabled={uploading || !uploadYtUrl.trim()}
                      className="w-full py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Youtube className="w-3.5 h-3.5" />}
                      Importar transcrição
                    </button>
                    <p className="text-[10px] text-slate-400">Apenas vídeos com legendas em PT</p>
                  </>
                )}
                {uploadMode === "wikipedia" && (
                  <>
                    <input value={uploadWiki} onChange={e => setUploadWiki(e.target.value)}
                      placeholder="Ex: Revolução Industrial, Mitose, Romantismo *"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-violet-400" />
                    <button onClick={handleWikipediaUpload} disabled={uploading || !uploadWiki.trim()}
                      className="w-full py-1.5 rounded-xl bg-slate-700 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
                      Importar artigo
                    </button>
                    <p className="text-[10px] text-slate-400">Wikipedia em português</p>
                  </>
                )}
                {uploadMode === "audio" && (
                  <>
                    <input type="file" ref={audioRef} className="hidden"
                      accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm"
                      onChange={e => e.target.files?.[0] && handleAudioUpload(e.target.files[0])} />
                    <button onClick={() => audioRef.current?.click()} disabled={uploading}
                      className="w-full border-2 border-dashed border-violet-300 rounded-xl p-4 text-xs text-violet-600 font-medium hover:bg-violet-50 flex flex-col items-center gap-2">
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                      {uploading ? "Transcrevendo... aguarde" : "Clique para enviar áudio"}
                      {!uploading && <span className="text-[10px] text-slate-400">MP3, M4A, WAV — Whisper transcreve em PT</span>}
                    </button>
                  </>
                )}
                {uploadMode === "image" && (
                  <>
                    <input type="file" ref={imageRef} className="hidden"
                      accept="image/*"
                      onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                    <button onClick={() => imageRef.current?.click()} disabled={uploading}
                      className="w-full border-2 border-dashed border-amber-300 rounded-xl p-4 text-xs text-amber-700 font-medium hover:bg-amber-50 flex flex-col items-center gap-2">
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                      {uploading ? "Extraindo texto... aguarde" : "Clique para enviar foto / página"}
                      {!uploading && <span className="text-[10px] text-slate-400">JPG, PNG — Vision IA extrai texto e descreve</span>}
                    </button>
                  </>
                )}
                {uploadMsg && (
                  <div className={`flex items-start gap-1.5 text-[10px] font-medium px-2 py-1.5 rounded-lg ${uploadMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                    {uploadMsg.ok ? <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />}
                    {uploadMsg.text}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Doc list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loadingDocs ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>
        ) : docs.length === 0 ? (
          <div className="text-center py-8 px-4">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-semibold">Nenhuma fonte ainda</p>
            <p className="text-[10px] text-slate-400 mt-1">Adicione PDFs, textos ou URLs acima para começar</p>
          </div>
        ) : (
          docs.map(doc => {
            const isSelected = selectedDocIds.includes(doc.id);
            return (
              <div key={doc.id}
                className={`flex items-start gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                  isSelected ? "bg-violet-50 border-violet-200" : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                }`}
                onClick={() => toggleDoc(doc.id)}>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                  isSelected ? "border-violet-500 bg-violet-500" : "border-slate-300"
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">{doc.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {doc.file_size_kb ? `${doc.file_size_kb}KB · ` : ""}
                    {Math.round(doc.content_length / 1000)}K chars
                  </p>
                </div>
                <button onClick={e => { e.stopPropagation(); fetchDna(doc.id); }}
                  title="DNA das Fontes — análise IA profunda"
                  className="flex-shrink-0 p-1 rounded-lg text-slate-300 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                  <Sparkles className="w-3 h-3" />
                </button>
                <button onClick={e => { e.stopPropagation(); handleDelete(doc.id); }}
                  className="flex-shrink-0 p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* DNA das Fontes Panel */}
      {showDna && (
        <div className="border-t border-violet-100 flex-shrink-0">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <p className="text-[10px] font-black text-violet-700 uppercase tracking-wider">DNA das Fontes</p>
            </div>
            <button onClick={() => setShowDna(false)} className="text-slate-300 hover:text-slate-500">
              <X className="w-3 h-3" />
            </button>
          </div>
          {dnaLoading ? (
            <div className="px-3 pb-3 flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
              Analisando o DNA da fonte...
            </div>
          ) : dnaResult ? (
            <div className="px-3 pb-3 space-y-2.5 max-h-72 overflow-y-auto text-[10px]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-bold capitalize">{dnaResult.nivelComplexidade}</span>
                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-bold">{dnaResult.dominio?.replace(/_/g," ")}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${dnaResult.relevanciaEnem === "Alta" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  ENEM: {dnaResult.relevanciaEnem}
                </span>
              </div>
              <p className="text-slate-700 font-medium leading-snug">{dnaResult.temaPrincipal}</p>
              {((dnaResult.conceitosChave?.length ?? 0) > 0) && (
                <div>
                  <p className="font-black text-slate-500 uppercase tracking-wider mb-1">Conceitos-Chave</p>
                  <div className="space-y-1">
                    {dnaResult.conceitosChave.slice(0, 5).map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" style={{ opacity: 0.4 + c.importancia * 0.6 }} />
                        <span className="font-semibold text-slate-700">{c.termo}</span>
                        {c.definicao && <span className="text-slate-500 truncate">{c.definicao.slice(0,60)}…</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {((dnaResult.lacunas?.length ?? 0) > 0) && (
                <div>
                  <p className="font-black text-slate-500 uppercase tracking-wider mb-1">Lacunas Detectadas</p>
                  {dnaResult.lacunas.slice(0,2).map((l, i) => (
                    <p key={i} className="text-slate-600 flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />{l}
                    </p>
                  ))}
                </div>
              )}
              {((dnaResult.sugestoesFontes?.length ?? 0) > 0) && (
                <div>
                  <p className="font-black text-slate-500 uppercase tracking-wider mb-1">Fontes Sugeridas</p>
                  {dnaResult.sugestoesFontes.slice(0,2).map((s, i) => (
                    <p key={i} className="text-violet-600 flex items-start gap-1">
                      <BookOpen className="w-3 h-3 flex-shrink-0 mt-0.5" />{s}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Fast Research */}
      <div className="border-t border-slate-100 flex-shrink-0">
        <button
          onClick={() => setShowFastResearch(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
        >
          <span className="flex items-center gap-1.5"><Search className="w-3.5 h-3.5 text-violet-500" />Pesquisa Rápida</span>
          {showFastResearch ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <AnimatePresence>
          {showFastResearch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-3 pb-3 space-y-2">
                <div className="flex gap-1.5">
                  <input value={fastResearchTopic} onChange={e => setFastResearchTopic(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && runFastResearch()}
                    placeholder="Tema para pesquisar..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-violet-400" />
                  <button onClick={runFastResearch} disabled={fastResearchLoading || !fastResearchTopic.trim()}
                    className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1">
                    {fastResearchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {fastResearchResults.map((item, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-2 space-y-1">
                    <p className="text-[11px] font-bold text-slate-800 line-clamp-1">{item.titulo}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-2">{item.snippet}</p>
                    <div className="flex gap-1.5">
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 py-1 rounded-lg border border-slate-200 text-[10px] text-center text-slate-600 hover:bg-white font-semibold">
                        Abrir
                      </a>
                      <button onClick={() => addUrlToNotebook(item.url, item.titulo)}
                        disabled={addingUrl === item.url}
                        className="flex-1 py-1 rounded-lg bg-violet-600 text-white text-[10px] font-bold disabled:opacity-40 flex items-center justify-center gap-1">
                        {addingUrl === item.url ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Adicionar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Discover */}
      {docs.length > 0 && (
        <div className="border-t border-slate-100 flex-shrink-0">
          <button
            onClick={runDiscover}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-700"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            {discoverLoading ? "Buscando leituras..." : "Descobrir mais sobre este tema"}
            {discoverLoading && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
          </button>
          <AnimatePresence>
            {showDiscover && discoverResults.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-3 pb-3 space-y-2">
                  {discoverResults.map((item, i) => (
                    <div key={i} className="bg-violet-50 rounded-xl p-2 space-y-1">
                      <p className="text-[11px] font-bold text-gray-900 line-clamp-1">{item.titulo}</p>
                      {item.relevancia && <p className="text-[10px] text-violet-600 italic">{item.relevancia}</p>}
                      <p className="text-[10px] text-slate-500 line-clamp-2">{item.snippet}</p>
                      <div className="flex gap-1.5">
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className="flex-1 py-1 rounded-lg border border-violet-200 text-[10px] text-center text-violet-700 hover:bg-white font-semibold">
                          Abrir
                        </a>
                        <button onClick={() => addUrlToNotebook(item.url, item.titulo)}
                          disabled={addingUrl === item.url}
                          className="flex-1 py-1 rounded-lg bg-violet-600 text-white text-[10px] font-bold disabled:opacity-40 flex items-center justify-center gap-1">
                          {addingUrl === item.url ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          Adicionar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {selectedDocIds.length > 0 && (
        <div className="p-2 border-t border-slate-100 flex-shrink-0">
          <p className="text-[10px] text-violet-600 font-bold text-center">
            {selectedDocIds.length} fonte{selectedDocIds.length > 1 ? "s" : ""} ativa{selectedDocIds.length > 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );

  // ─── CHAT PANEL ────────────────────────────────────────────────────────────
  const ChatPanel = (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7">
            <TiagaoCharacter state={chatLoading ? "thinking" : "idle"} size={28} showLabel={false} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800 truncate">
              {!restrictToSelected || selectedDocs.length === 0
                ? `Todos os documentos (${docs.length})`
                : selectedDocs.length === 1 ? `"${selectedDocs[0]?.title}"` : `${selectedDocs.length} fontes selecionadas`}
            </p>
            <p className="text-[10px] text-slate-400">Respostas exclusivamente baseadas no que você adicionou</p>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Limpar chat">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {selectedDocIds.length > 0 && (
          <button
            onClick={() => setRestrictToSelected(v => !v)}
            className={`mt-2 w-full flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
              restrictToSelected
                ? "bg-violet-50 border-violet-300 text-violet-700"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
            }`}
            title={restrictToSelected ? "Clique para perguntar em TODOS os documentos" : "Clique para perguntar SÓ nos documentos marcados"}
          >
            {restrictToSelected ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span className="flex-1 text-left">
              {restrictToSelected
                ? `Perguntar só sobre ${selectedDocIds.length} ${selectedDocIds.length === 1 ? "fonte" : "fontes"} marcada${selectedDocIds.length === 1 ? "" : "s"}`
                : "Perguntar sobre todos os documentos"}
            </span>
            <span className={`w-7 h-3.5 rounded-full relative transition-colors ${restrictToSelected ? "bg-violet-500" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${restrictToSelected ? "left-3.5" : "left-0.5"}`} />
            </span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="mb-4">
              <TiagaoCharacter state="idle" size={80} showLabel={false} />
            </div>
            <p className="text-base font-black text-slate-700 mb-1">Pergunte sobre seus documentos</p>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {docs.length === 0
                ? "Adicione um documento na coluna de Fontes para começar"
                : "As respostas vêm exclusivamente do conteúdo que você adicionou"}
            </p>
            {docs.length > 0 && (
              <div className="flex flex-col items-center gap-2 w-full">
                {loadingSuggestions ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Gerando perguntas sugeridas...
                  </div>
                ) : suggestedQs.length > 0 ? (
                  <>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Sugestões baseadas no seu conteúdo</p>
                    <div className="flex flex-col gap-1.5 w-full">
                      {suggestedQs.map((q, i) => (
                        <button key={i} onClick={() => { setInputMsg(q); setSuggestedQs([]); }}
                          className="w-full text-left px-3 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-800 text-xs font-medium hover:bg-violet-100 transition-colors flex items-center gap-2">
                          <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 text-violet-400" />
                          {q}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["Faça um resumo", "Pontos mais importantes?", "Como cai no ENEM?", "Explique o conceito"].map(q => (
                      <button key={q} onClick={() => setInputMsg(q)}
                        className="px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-xs font-medium hover:bg-violet-100 transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => {
          // Renderiza texto com [Fonte N] como chips clicáveis
          const fontesMap = new Map((msg.fontes ?? []).map(f => [f.numero, f]));
          const parts = msg.role === "assistant"
            ? msg.text.split(/(\[Fonte \d+\])/g).map((part, idx) => {
                const m = part.match(/^\[Fonte (\d+)\]$/);
                if (m) {
                  const n = parseInt(m[1]);
                  const f = fontesMap.get(n);
                  return (
                    <button
                      key={idx}
                      onClick={() => setOpenFonte(o => o?.msgIdx === i && o?.numero === n ? null : { msgIdx: i, numero: n })}
                      className={`inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 mx-0.5 rounded-md text-[10px] font-black align-baseline transition-all ${
                        f ? "bg-violet-100 text-violet-700 hover:bg-violet-600 hover:text-white cursor-pointer" : "bg-slate-100 text-slate-400"
                      }`}
                      title={f ? `Ver trecho de "${f.titulo}"` : "Fonte não disponível"}
                      disabled={!f}
                    >
                      {n}
                    </button>
                  );
                }
                return <span key={idx}>{part}</span>;
              })
            : null;

          const fonteAberta = openFonte?.msgIdx === i ? msg.fontes?.find(f => f.numero === openFonte.numero) : null;

          return (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
              {msg.role === "assistant" && <div className="flex-shrink-0 mt-1"><TiagaoCharacter state="idle" size={28} showLabel={false} /></div>}
              <div className="max-w-[82%] space-y-2">
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user" ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-800"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.role === "assistant" ? parts : msg.text}</p>
                </div>

                {/* Trecho expandido (clicado) */}
                <AnimatePresence>
                  {fonteAberta && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -4, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-xl">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Quote className="w-3 h-3 text-violet-600" />
                            <span className="text-[10px] font-black text-violet-700 uppercase tracking-wider">Fonte {fonteAberta.numero}</span>
                            <span className="text-[10px] font-bold text-slate-700">· {fonteAberta.titulo}</span>
                          </div>
                          <button onClick={() => setOpenFonte(null)} className="p-0.5 hover:bg-violet-100 rounded">
                            <X className="w-3 h-3 text-violet-600" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {fonteAberta.trechoCompleto ?? fonteAberta.trecho}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Ações da mensagem */}
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <button
                      onClick={() => navigator.clipboard.writeText(msg.text)}
                      title="Copiar resposta"
                      className="p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      <ClipboardList className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setExpandedMsg({ text: msg.text, idx: i })}
                      title="Expandir resposta (tela cheia, PDF, compartilhar)"
                      className="p-1 rounded-lg text-slate-300 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { /* feedback positivo — no-op por ora */ }}
                      title="Boa resposta"
                      className="p-1 rounded-lg text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors text-xs">
                      👍
                    </button>
                    <button
                      onClick={() => { /* feedback negativo — no-op por ora */ }}
                      title="Resposta ruim"
                      className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors text-xs">
                      👎
                    </button>
                  </div>
                )}

                {/* Citações — botão colapsável (não ficam abertas por padrão) */}
                {msg.fontes && msg.fontes.length > 0 && (
                  <div>
                    <button
                      onClick={() => setOpenSourceList(s => s === i ? null : i)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-all"
                    >
                      <span className="text-[10px] text-slate-500">📄</span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {openSourceList === i ? "Ocultar" : `Ver`} {msg.fontes.length} fonte{msg.fontes.length > 1 ? "s" : ""}
                      </span>
                    </button>
                    {openSourceList === i && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {msg.fontes.map(f => {
                          const isOpen = openFonte?.msgIdx === i && openFonte?.numero === f.numero;
                          return (
                            <button
                              key={f.numero}
                              onClick={() => setOpenFonte(o => o?.msgIdx === i && o?.numero === f.numero ? null : { msgIdx: i, numero: f.numero })}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-left transition-all ${
                                isOpen ? "bg-violet-100 ring-1 ring-violet-300" : "bg-slate-100 hover:bg-slate-200"
                              }`}
                            >
                              <span className="text-[10px] font-black text-violet-600">[{f.numero}]</span>
                              <p className="text-[10px] font-medium text-slate-600 truncate max-w-[160px]">{f.titulo}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Gerar conteúdo com estas fontes ── */}
                {msg.role === "assistant" && selectedDocIds.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gerar com estas fontes</p>
                    <div className="flex flex-wrap gap-1">
                      {([
                        { tool: "slides"      as Tool, emoji: "📊", label: "Slides"  },
                        { tool: "podcast"     as Tool, emoji: "🎙", label: "Podcast" },
                        { tool: "study-guide" as Tool, emoji: "📝", label: "Resumo"  },
                        { tool: "mapa-mental" as Tool, emoji: "🧠", label: "Mapa"    },
                        { tool: "flashcards"  as Tool, emoji: "🃏", label: "Cards"   },
                        { tool: "questoes"    as Tool, emoji: "✅", label: "Questões" },
                      ] as { tool: Tool; emoji: string; label: string }[]).map(({ tool, emoji, label }) => (
                        <button
                          key={tool}
                          disabled={toolLoading}
                          onClick={() => {
                            setNotebookView("workspace");
                            runTool(tool, selectedDocIds[0]);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 hover:bg-violet-100 border border-violet-100 hover:border-violet-200 transition-all disabled:opacity-40"
                        >
                          <span className="text-[10px]">{emoji}</span>
                          <span className="text-[10px] font-semibold text-violet-600">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {chatLoading && (
          <div className="flex justify-start gap-2">
            <TiagaoCharacter state="thinking" size={28} showLabel={false} />
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
              <span className="text-xs text-slate-500">Buscando nas fontes...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex-shrink-0 bg-white border-t border-slate-200">
        {/* Chat modes selector */}
        <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-1 overflow-x-auto">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1 flex-shrink-0">Modo:</span>
          {CHAT_MODES.map(m => (
            <button key={m.key} onClick={() => setChatMode(m.key as typeof chatMode)}
              className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border ${
                chatMode === m.key
                  ? `${m.active} border-transparent shadow-sm`
                  : `bg-white border-slate-200 ${m.color} hover:border-current`
              }`}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 px-3 pb-3">
          <input value={inputMsg} onChange={e => setInputMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder={docs.length === 0 ? "Adicione um documento para começar..." : `Modo ${CHAT_MODES.find(m => m.key === chatMode)?.label} • Pergunte algo...`}
            disabled={docs.length === 0 || chatLoading}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-violet-400 focus:outline-none text-sm text-slate-800 placeholder-slate-400 disabled:opacity-50" />
          <button onClick={sendMessage} disabled={!inputMsg.trim() || chatLoading || docs.length === 0}
            className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center disabled:opacity-30 hover:bg-violet-700 transition-colors flex-shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // ─── TOOLS PANEL ───────────────────────────────────────────────────────────
  const ToolsPanel = (
    <div className="flex flex-col h-full bg-white border-l border-slate-200/70">
      <div className="px-4 py-3.5 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
            <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.08em]">Studio</p>
          </div>
          {selectedDocIds.length > 0 && <span className="text-[9px] font-bold text-slate-400">{selectedDocIds.length} doc</span>}
        </div>
        {/* Artefatos criados pelo Tiagão (doc_id = 0) — visível sempre */}
        {tiagaoArtifacts.length > 0 && (
          <div className="mb-2 p-2 rounded-xl bg-violet-50 border border-violet-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3 h-3 text-violet-600" />
              <p className="text-[10px] font-black text-violet-800 uppercase tracking-wider">Criado pelo Tiagão ({tiagaoArtifacts.length})</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {tiagaoArtifacts.map(a => {
                const kindMap: Record<string, string> = {
                  slides: "📊", mapa_mental: "🗺️", "mapa-mental": "🗺️",
                  infografico: "📈", resumo: "📄", questoes: "📝",
                  prova: "📝", flashcards: "🃏", plano_estudos: "📅",
                };
                const emoji = kindMap[a.kind] ?? "✨";
                return (
                  <div key={a.id} className="group inline-flex items-center bg-white border border-violet-200 rounded-lg overflow-hidden hover:border-violet-400 transition-all">
                    <button
                      onClick={() => openSavedArtifact(a)}
                      className="flex items-center gap-1 px-2 py-1 hover:bg-violet-50 text-[10px] font-bold text-slate-700"
                      title={`Abrir: ${a.title}`}
                    >
                      <span>{emoji}</span>
                      <span className="truncate max-w-[100px]">{a.title || a.kind}</span>
                    </button>
                    <button
                      onClick={() => deleteSavedArtifact(a.id)}
                      className="px-1 py-1 hover:bg-rose-50 text-rose-400 hover:text-rose-600"
                      title="Remover artefato"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Tools list: hidden when result is showing, scrollable otherwise ── */}
      <div className={`overflow-y-auto p-4 transition-all ${toolResult && activeTool ? "hidden" : "flex-1"}`}>
        {selectedDocIds.length === 0 ? (
          <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 p-4 text-center">
            <Sparkles className="w-5 h-5 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">Selecione uma fonte</p>
            <p className="text-[10px] text-slate-400 mt-0.5">para liberar as ferramentas IA</p>
          </div>
        ) : (
          <div className="space-y-3">

            {/* ── 3 Ferramentas em destaque (estilo NotebookLM Studio) ── */}
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Gerar com IA</p>
              <div className="space-y-2">
                {FEATURED_STUDIO_TOOLS.map(key => {
                  const cfg = TOOL_CONFIG[key];
                  const Icon = cfg.icon;
                  const isActive = activeTool === key;
                  const isLoading = toolLoading && isActive;
                  const tintClass = ICON_TINT[cfg.color] ?? "text-slate-500 bg-slate-100";
                  return (
                    <button key={key}
                      onClick={() => runTool(key, selectedDocIds[0])}
                      disabled={toolLoading}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all disabled:opacity-60 active:scale-[0.98] ${
                        isActive
                          ? `${COLOR_MAP[cfg.color]} shadow-sm`
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                      }`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? "bg-white/60" : tintClass}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[12px] font-bold text-slate-800">{cfg.label}</p>
                          {cfg.badge && (
                            <span className={`text-[8px] font-black px-1 py-0.5 rounded ${cfg.badge === "NOVO" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>{cfg.badge}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">{cfg.desc}</p>
                      </div>
                      {isLoading
                        ? <Loader2 className="w-4 h-4 animate-spin text-slate-400 flex-shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Artefatos gerados — lista com 3-pontos (estilo NotebookLM) ── */}
            {savedArtifacts.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Conteúdo gerado</p>
                <div className="space-y-1">
                  {savedArtifacts.map(a => {
                    const cfg = TOOL_CONFIG[(a.kind as Tool)];
                    const Icon = cfg?.icon ?? FileText;
                    const isMenuOpen = openArtifactMenu === a.id;
                    return (
                      <div key={a.id} className="relative group flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ICON_TINT[cfg?.color ?? "slate"]}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <button onClick={() => openSavedArtifact(a)} className="flex-1 min-w-0 text-left">
                          <p className="text-[11px] font-semibold text-slate-800 truncate">{a.title || cfg?.label || a.kind}</p>
                          <p className="text-[9px] text-slate-400">{cfg?.label ?? a.kind}</p>
                        </button>
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={() => setOpenArtifactMenu(isMenuOpen ? null : a.id)}
                            className="p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {isMenuOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenArtifactMenu(null)} />
                              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1">
                                <button onClick={() => { openSavedArtifact(a); setOpenArtifactMenu(null); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 text-left">
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> Abrir / Rever
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-wider">Exportar</p>
                                <button onClick={() => { downloadArtifactAsPDF(a); setOpenArtifactMenu(null); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 text-left">
                                  <Download className="w-3.5 h-3.5 text-rose-500" /> Baixar como PDF
                                </button>
                                <button onClick={() => { downloadArtifactAsPPTX(a); setOpenArtifactMenu(null); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 text-left">
                                  <Download className="w-3.5 h-3.5 text-orange-500" /> Baixar como PowerPoint
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                <button onClick={() => { deleteSavedArtifact(a.id); setOpenArtifactMenu(null); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-rose-600 hover:bg-rose-50 text-left">
                                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Mais ferramentas (expandável) ── */}
            <div>
              <button onClick={() => setShowMoreTools(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-200 text-left text-[11px] font-bold text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all">
                <ChevronsUpDown className="w-3.5 h-3.5" />
                <span>Mais ferramentas</span>
                <span className="ml-auto text-[10px] font-normal text-slate-400">
                  {Object.keys(TOOL_CONFIG).length - FEATURED_STUDIO_TOOLS.length} disponíveis
                </span>
              </button>

              {showMoreTools && (
                <div className="mt-2 space-y-1">
                  {/* Persona selector */}
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl mb-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">🎭 Persona do Professor</p>
                    <select
                      value={selectedPersona}
                      onChange={e => setSelectedPersona(e.target.value)}
                      className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-medium focus:outline-none focus:border-violet-400"
                    >
                      {PERSONAS_OPTIONS.map(p => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Aula Viva format */}
                  <div className="p-2 bg-orange-50 border border-orange-200 rounded-xl mb-2">
                    <p className="text-[9px] font-black text-orange-400 uppercase tracking-wider mb-1.5">📺 Formato Aula Viva</p>
                    <div className="grid grid-cols-2 gap-1">
                      {([["jornal","📰 Jornal"],["chef","👨‍🍳 Chef"],["investigacao","🔍 Investigação"],["talk-show","🎤 Talk Show"]] as const).map(([f, label]) => (
                        <button key={f} onClick={() => setAulaVivaFormato(f as any)}
                          className={`text-[10px] font-bold py-1 px-1.5 rounded-lg border transition-all ${aulaVivaFormato === f ? "bg-orange-500 text-white border-orange-500" : "bg-white text-orange-700 border-orange-200 hover:border-orange-400"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* All non-featured tools */}
                  {(Object.entries(TOOL_CONFIG) as [Tool, typeof TOOL_CONFIG[Tool]][])
                    .filter(([key]) => !FEATURED_STUDIO_TOOLS.includes(key))
                    .map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      const isActive = activeTool === key;
                      const isLoading = toolLoading && isActive;
                      return (
                        <button key={key}
                          onClick={() => runTool(key, selectedDocIds[0])}
                          disabled={toolLoading}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all disabled:opacity-60 ${
                            isActive ? `${COLOR_MAP[cfg.color]} border-current` : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}>
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-800 truncate">{cfg.label}</p>
                              {cfg.badge && (
                                <span className={`text-[9px] font-black px-1 py-0.5 rounded-md ${cfg.badge === "NOVO" ? "bg-emerald-500 text-white" : cfg.badge === "v2" ? "bg-violet-600 text-white" : "bg-rose-500 text-white"}`}>{cfg.badge}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">{cfg.desc}</p>
                          </div>
                          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
                        </button>
                      );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      <div className={`overflow-y-auto ${toolLoading || (toolResult && activeTool) ? "flex-1" : "hidden"}`}>
        {toolLoading && !toolResult && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <TiagaoCharacter state="thinking" size={60} showLabel />
            <p className="text-xs text-slate-500 font-medium">
              {activeTool === "podcast" ? "Preparando o episódio estilo Nerdcast..." :
               activeTool === "flashcards" ? "Criando flashcards com macetes..." :
               activeTool === "questoes" ? "Gerando questões com Taxonomia de Bloom..." :
               activeTool === "mapa-mental" ? "Desenhando o mapa com conexões cruzadas..." :
               activeTool === "tabela" ? "Montando a tabela comparativa..." :
               activeTool === "relatorio" ? "Redigindo o relatório..." :
               activeTool === "briefing" ? "Gerando o briefing executivo..." :
               activeTool === "plano-aula" ? "Preparando o plano com rúbrica BNCC..." :
               activeTool === "tarefa" ? "Montando a tarefa com gabarito e rúbrica..." :
               activeTool === "sequencia-didatica" ? "Construindo a sequência didática multi-aula..." :
               activeTool === "aula-viva" ? "Escrevendo o roteiro do episódio TV/streaming..." :
               activeTool === "micro-aulas" ? "Criando versões 15s, 60s, 3min e 10min..." :
               activeTool === "narrativa" ? "Construindo a narrativa épica didática..." :
               activeTool === "remix-cultural" ? "Conectando o conteúdo com a cultura pop..." :
               activeTool === "plano-aula-versoes" ? "Gerando as 5 versões do plano de aula..." :
               activeTool === "aula-viva-formato" ? "Criando o formato especial da Aula Viva..." :
               activeTool === "avaliacao-voz" ? "Montando podcast, entrevista e debate estruturado..." :
               activeTool === "making-of" ? "Revelando os bastidores pedagógicos da aula..." :
               activeTool === "simulador-aula" ? "Simulando a turma virtual com 5 alunos-tipo..." :
               "Gerando..."}
            </p>
          </div>
        )}

        {toolError && !toolLoading && (
          <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{toolError}</p>
            </div>
          </div>
        )}

        {!toolLoading && !!toolResult && activeTool && (
          <div className="flex flex-col h-full">
            {/* Result header bar */}
            <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-2 flex-shrink-0 bg-white">
              {(() => { const cfg = TOOL_CONFIG[activeTool]; const Icon = cfg.icon; return (
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ICON_TINT[cfg.color] ?? "bg-slate-100 text-slate-500"}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              ); })()}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{TOOL_CONFIG[activeTool].label}</p>
                <p className="text-[9px] text-slate-400">Resultado gerado por IA</p>
              </div>
              {/* Download buttons */}
              <button
                onClick={() => {
                  const fakeArtifact = { id: 0, kind: activeTool, title: TOOL_CONFIG[activeTool].label, created_at: "" };
                  // Download PDF by creating print window from current toolResult
                  const extractText = (payload: unknown, depth = 0): string => {
                    if (depth > 6 || !payload) return "";
                    if (typeof payload === "string") return payload;
                    if (Array.isArray(payload)) return payload.map(v => extractText(v, depth + 1)).join("\n");
                    if (typeof payload === "object") return Object.entries(payload as Record<string, unknown>).filter(([k]) => !["icon","color","image","emoji","id","url"].includes(k)).map(([,v]) => extractText(v, depth + 1)).join("\n");
                    return String(payload);
                  };
                  const title = TOOL_CONFIG[activeTool].label;
                  const lines = extractText(toolResult).split("\n").map(l => l.trim()).filter(Boolean);
                  const bodyHtml = lines.map(l => `<p style="margin:0 0 6px;font-size:13px;line-height:1.6">${l.replace(/</g,"&lt;")}</p>`).join("");
                  const win = window.open("", "_blank");
                  if (win) {
                    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 20px;color:#1e293b}h1{font-size:22px;font-weight:800;margin-bottom:24px;color:#312e81;border-bottom:2px solid #e2e8f0;padding-bottom:12px}p{margin:0 0 8px;font-size:13px;line-height:1.65}@media print{body{margin:20px}}</style></head><body><h1>${title}</h1>${bodyHtml}<script>window.onload=function(){window.print();}<\/script></body></html>`);
                    win.document.close();
                  }
                }}
                className="p-1.5 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors"
                title="Baixar como PDF"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={async () => {
                  const _title = TOOL_CONFIG[activeTool].label;
                  const _payload = toolResult;
                  const pptxgen = (await import("pptxgenjs")).default;
                  const prs = new pptxgen();
                  prs.layout = "LAYOUT_WIDE"; prs.title = _title;
                  const ts = prs.addSlide(); ts.background = { color: "312e81" };
                  ts.addText(_title, { x: 0.5, y: 2.2, w: "90%", h: 1.5, fontSize: 36, bold: true, color: "FFFFFF", align: "center" });
                  ts.addText("StudyAI · studyai.com.br", { x: 0.5, y: 4.2, w: "90%", h: 0.5, fontSize: 14, color: "a5b4fc", align: "center" });
                  const _extract = (p: unknown, d = 0): string => { if (d > 6 || !p) return ""; if (typeof p === "string") return p; if (Array.isArray(p)) return p.map((v: unknown) => _extract(v, d + 1)).join("\n"); if (typeof p === "object") return Object.entries(p as Record<string, unknown>).filter(([k]) => !["icon","color","image","emoji","id","url"].includes(k)).map(([,v]) => _extract(v, d + 1)).join("\n"); return String(p); };
                  const _isSlideArr = Array.isArray(_payload) && (_payload as any[])[0]?.titulo !== undefined;
                  if (_isSlideArr) { (_payload as any[]).forEach((s: any) => { const sl = prs.addSlide(); sl.background = { color: "FFFFFF" }; if (s.titulo) sl.addText(s.titulo, { x: 0.5, y: 0.4, w: "90%", h: 0.8, fontSize: 22, bold: true, color: "312e81" }); const b = s.pontos?.join("\n") ?? s.conteudo ?? s.texto ?? ""; if (b) sl.addText(b, { x: 0.5, y: 1.4, w: "90%", h: 4, fontSize: 14, color: "334155", valign: "top" }); }); }
                  else { const ls = _extract(_payload).split("\n").map((l: string) => l.trim()).filter(Boolean); for (let i = 0; i < ls.length; i += 14) { const sl = prs.addSlide(); sl.background = { color: "FFFFFF" }; sl.addText(ls.slice(i, i + 14).join("\n"), { x: 0.5, y: 0.5, w: "90%", h: 5.5, fontSize: 13, color: "334155", valign: "top" }); sl.addText(_title, { x: 0.5, y: 6.8, w: "90%", h: 0.35, fontSize: 9, color: "94a3b8", align: "right" }); } }
                  await prs.writeFile({ fileName: `${_title.replace(/[^a-z0-9]/gi, "_")}.pptx` });
                }}
                className="p-1.5 rounded-lg border border-orange-200 text-orange-500 hover:bg-orange-50 transition-colors"
                title="Baixar como PowerPoint"
              >
                <Presentation className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setActiveTool(null); setToolResult(null); setToolError(null); }}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                title="Fechar resultado"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">

            {activeTool === "overview" && (() => {
              const r = toolResult as Overview;
              return (
                <div className="p-3 space-y-4">
                  {/* Insight Central */}
                  {r.insightCentral && (
                    <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
                      <p className="text-[9px] font-black text-violet-500 uppercase tracking-wider mb-1">💡 Insight Central</p>
                      <p className="text-xs font-bold text-violet-900 leading-snug">{r.insightCentral}</p>
                    </div>
                  )}
                  {r.summary && !r.insightCentral && (
                    <div>
                      <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-1.5">Resumo</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{r.summary}</p>
                    </div>
                  )}
                  {/* Contexto */}
                  {r.contexto && (
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Contexto</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{r.contexto}</p>
                    </div>
                  )}
                  {/* Pilares */}
                  {r.pilares && r.pilares.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-1.5">Pilares</p>
                      <div className="space-y-2">
                        {r.pilares.map((p, i) => (
                          <div key={i} className="rounded-lg border border-violet-100 bg-violet-50/50 p-2.5">
                            <p className="text-[10px] font-black text-violet-700 mb-0.5">{p.conceito}</p>
                            <p className="text-[10px] text-slate-600 leading-snug">{p.explicacao}</p>
                            {p.conexaoEnem && (
                              <div className="mt-1.5 flex items-start gap-1">
                                <GraduationCap className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-[9px] text-amber-700">{p.conexaoEnem}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Aplicação Prática */}
                  {r.aplicacaoPratica && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">Aplicação Prática</p>
                      <p className="text-[10px] text-emerald-800 leading-snug">{r.aplicacaoPratica}</p>
                    </div>
                  )}
                  {/* Questão Provocadora */}
                  {r.questaoProvocadora && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1">❓ Questão Provocadora</p>
                      <p className="text-[10px] text-amber-800 font-medium leading-snug italic">"{r.questaoProvocadora}"</p>
                    </div>
                  )}
                  {/* Tópicos-chave */}
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Tópicos-chave</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.keyTopics?.map((t, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-[10px] font-medium text-slate-700">{t}</span>
                      ))}
                    </div>
                  </div>
                  {/* FAQ */}
                  <div>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1.5">FAQ</p>
                    <div className="space-y-1.5">
                      {r.faq?.map((item, i) => (
                        <details key={i} className="group">
                          <summary className="text-xs font-semibold text-slate-700 cursor-pointer list-none flex items-center gap-1.5 py-1">
                            <ChevronRight className="w-3 h-3 text-amber-500 group-open:rotate-90 transition-transform flex-shrink-0" />
                            {item.q}
                          </summary>
                          <p className="text-xs text-slate-600 mt-1 pl-4 leading-relaxed">{item.a}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                  {/* Próximos Passos */}
                  {r.proximosPassos && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">→ Próximos Passos</p>
                      <p className="text-[10px] text-slate-700 leading-snug">{r.proximosPassos}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {activeTool === "study-guide" && (() => {
              const r = toolResult as StudyGuide;
              return (
                <div className="p-4 space-y-4">
                  {/* Objetivo Final — hero card */}
                  {r.objetivoFinal && (
                    <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 p-4 text-white shadow-lg">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">🎯 Ao Final, Você Será Capaz de</p>
                      <p className="text-sm font-semibold leading-relaxed">{r.objetivoFinal}</p>
                    </div>
                  )}

                  {/* Checklist de Competências */}
                  {((r.checklistCompetencias?.length ?? 0) > 0) && (
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">📋 Competências que você vai dominar</p>
                      <div className="space-y-1.5">
                        {r.checklistCompetencias!.map((c, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-700 leading-relaxed">{c}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pré-requisitos */}
                  {r.prerequisitos && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-50 border border-violet-100">
                      <span className="text-lg flex-shrink-0">📖</span>
                      <div>
                        <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-1">Pré-requisitos</p>
                        <p className="text-xs text-violet-900 leading-relaxed">{r.prerequisitos}</p>
                      </div>
                    </div>
                  )}

                  {/* Quiz Diagnóstico */}
                  {((r.quizDiagnostico?.length ?? 0) > 0) && (
                    <details className="group rounded-xl border border-amber-200 overflow-hidden" open>
                      <summary className="px-4 py-3 cursor-pointer list-none bg-amber-50 flex items-center gap-2">
                        <span className="text-base">🧪</span>
                        <p className="text-xs font-black text-amber-800 flex-1">Teste seus Conhecimentos Prévios</p>
                        <ChevronDown className="w-4 h-4 text-amber-500 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-3 space-y-2 bg-white">
                        {r.quizDiagnostico!.map((q, i) => (
                          <div key={i} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                            <p className="text-xs font-semibold text-amber-900 leading-relaxed">{i + 1}. {q.pergunta}</p>
                            {q.dica && <p className="text-[11px] text-amber-600 mt-1.5">💡 Dica: {q.dica}</p>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Módulos */}
                  {((r.modulos?.length ?? 0) > 0) && (
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">📚 Módulos de Estudo</p>
                      {r.modulos!.map((mod, i) => (
                        <details key={i} className="group rounded-2xl border border-violet-100 overflow-hidden shadow-sm" open={i === 0}>
                          <summary className="px-4 py-3 cursor-pointer list-none bg-gradient-to-r from-violet-50 to-violet-50 flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-md">{mod.numero}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 leading-tight">{mod.titulo}</p>
                              {mod.objetivo && <p className="text-[10px] text-violet-600 mt-0.5 line-clamp-1">{mod.objetivo}</p>}
                            </div>
                            {mod.tempoBruto && <span className="text-[10px] text-slate-400 flex-shrink-0 font-medium">⏱ {mod.tempoBruto}</span>}
                            <ChevronDown className="w-4 h-4 text-violet-400 flex-shrink-0 group-open:rotate-180 transition-transform" />
                          </summary>
                          <div className="px-4 py-3 space-y-3 bg-white">
                            {mod.conceitoCentral && (
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">💡 Conceito Central</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{mod.conceitoCentral}</p>
                              </div>
                            )}
                            {mod.curiosidade && (
                              <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-200 flex items-start gap-2">
                                <span className="text-xl flex-shrink-0">🤩</span>
                                <div>
                                  <p className="text-[10px] font-black text-yellow-700 uppercase tracking-wider mb-1">Sabia que?</p>
                                  <p className="text-xs text-yellow-900 leading-relaxed">{mod.curiosidade}</p>
                                </div>
                              </div>
                            )}
                            {mod.aprofundamento && (
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">🔬 Aprofundamento</p>
                                <p className="text-sm text-slate-600 leading-relaxed">{mod.aprofundamento}</p>
                              </div>
                            )}
                            {mod.exemploResolvido && (
                              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-1.5">✏️ Exemplo Resolvido</p>
                                <p className="text-sm text-emerald-900 leading-relaxed">{mod.exemploResolvido}</p>
                              </div>
                            )}
                            {((mod.errosComuns?.length ?? 0) > 0) && (
                              <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-wider mb-1.5">⚠️ Erros Comuns</p>
                                <div className="space-y-1.5">
                                  {mod.errosComuns!.map((e, j) => (
                                    <div key={j} className="flex items-start gap-2">
                                      <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                                      <p className="text-xs text-red-800 leading-relaxed">{e}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {((mod.checkpoint?.length ?? 0) > 0) && (
                              <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
                                <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-1.5">✅ Checkpoint — Perguntas de Autoavaliação</p>
                                <div className="space-y-1.5">
                                  {mod.checkpoint!.map((c, j) => (
                                    <div key={j} className="flex items-start gap-2">
                                      <HelpCircle className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                                      <p className="text-xs text-violet-900 leading-relaxed">{c}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}

                  {/* Síntese Integradora */}
                  {r.sintese && (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">🔗 Síntese Integradora</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{r.sintese}</p>
                    </div>
                  )}

                  {/* Aplicação Prática */}
                  {r.aplicacaoPratica && (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100">
                      <p className="text-[10px] font-black text-teal-600 uppercase tracking-wider mb-2">🎯 Aplicação Prática</p>
                      <p className="text-sm text-teal-900 leading-relaxed">{r.aplicacaoPratica}</p>
                    </div>
                  )}

                  {/* Expansão */}
                  {(r.expansao?.leituras?.length || r.expansao?.conexoes?.length) ? (
                    <div className="grid grid-cols-2 gap-2">
                      {((r.expansao?.leituras?.length ?? 0) > 0) && (
                        <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
                          <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-2">📚 Leituras</p>
                          {r.expansao!.leituras!.map((l, i) => <p key={i} className="text-[11px] text-violet-800 py-0.5 leading-snug">• {l}</p>)}
                        </div>
                      )}
                      {((r.expansao?.conexoes?.length ?? 0) > 0) && (
                        <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
                          <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-2">🔗 Conexões</p>
                          {r.expansao!.conexoes!.map((c, i) => <p key={i} className="text-[11px] text-violet-800 py-0.5 leading-snug">• {c}</p>)}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Cronograma */}
                  {((r.cronogramaSugerido?.length ?? 0) > 0) && (
                    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="px-4 py-2.5 bg-slate-800">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-wider">📅 Cronograma de Estudo Sugerido</p>
                      </div>
                      <div className="divide-y divide-slate-100 bg-white">
                        {r.cronogramaSugerido.map((d, i) => (
                          <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                            <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                            <p className="text-xs text-slate-700 leading-relaxed">{d}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {activeTool === "flashcards" && (() => {
              const r = toolResult as { flashcards: Flashcard[] };
              return r.flashcards ? <FlashcardViewer cards={r.flashcards} /> : null;
            })()}

            {activeTool === "questoes" && (() => {
              const r = toolResult as { questoes: Questao[] };
              return r.questoes ? <QuestaViewer questoes={r.questoes} /> : null;
            })()}

            {activeTool === "mapa-mental" && (() => {
              const r = toolResult as MindMap;
              return r.subject ? <MindMapView map={r} /> : null;
            })()}

            {activeTool === "podcast" && (() => {
              const r = toolResult as PodcastRoteiro;
              return r.titulo ? <PodcastViewer podcast={r} /> : null;
            })()}

            {activeTool === "timeline" && (() => {
              const r = toolResult as { timeline: Timeline };
              return r.timeline?.eventos?.length ? <TimelineView t={r.timeline} /> : null;
            })()}

            {activeTool === "slides" && (() => {
              const r = toolResult as { apresentacao?: Slides; html?: string; titulo?: string; formato?: string };
              if (r?.html) {
                const safeName = (r.titulo ?? "material-studyai").replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "material-studyai";
                // Wraps fragment HTML in a complete document so browsers render it instead of showing as raw text
                const ensureFullHtml = (raw: string, title: string): string => {
                  let t = (raw ?? "").trim();
                  if (!t) return "";
                  // Defesa: remove cercas markdown ```html ... ``` que a IA às vezes deixa
                  t = t.replace(/^```(?:html|HTML)?\s*\r?\n?/i, "").replace(/\r?\n?```\s*$/i, "").trim();
                  if (/^<!doctype/i.test(t) || /^<html[\s>]/i.test(t)) return t;
                  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title.replace(/</g, "&lt;")}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:960px;margin:2rem auto;padding:0 1.25rem;line-height:1.6;color:#0f172a}h1,h2,h3{color:#4f46e5}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e2e8f0;padding:.5rem}code,pre{background:#f1f5f9;border-radius:6px;padding:.15rem .35rem;font-family:ui-monospace,Menlo,Consolas,monospace}pre{padding:.75rem;overflow:auto}</style>
</head>
<body>
${t}
</body>
</html>`;
                };
                const fullHtml = ensureFullHtml(r.html ?? "", r.titulo ?? "Material StudyAI");
                const openInNewTab = () => {
                  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  window.open(url, "_blank", "noopener,noreferrer");
                  setTimeout(() => URL.revokeObjectURL(url), 60_000);
                };
                const downloadHTML = () => {
                  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${safeName}.html`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 5_000);
                };
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-[10px] font-bold flex-shrink-0">HTML</span>
                        <p className="text-xs font-semibold text-slate-800 truncate">{r.titulo ?? "Material StudyAI"}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={openInNewTab}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg hover:border-violet-400 hover:text-violet-700 transition-colors"
                          title="Abrir em nova aba"
                        >
                          <Maximize2 className="w-3 h-3" /> Nova aba
                        </button>
                        <button
                          onClick={downloadHTML}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                          title="Baixar como arquivo .html"
                        >
                          <Download className="w-3 h-3" /> Baixar HTML
                        </button>
                      </div>
                    </div>
                    <iframe
                      srcDoc={fullHtml}
                      className="w-full h-[85vh] rounded-xl border border-gray-200 shadow-sm"
                      sandbox="allow-scripts allow-same-origin"
                      title={r.titulo ?? "Material StudyAI"}
                    />
                  </div>
                );
              }
              return r.apresentacao?.slides?.length
                ? <SlidesView deck={r.apresentacao} idx={slideIdx} setIdx={setSlideIdx} />
                : null;
            })()}

            {activeTool === "infografico" && (() => {
              const r = toolResult as { b64_json: string; mimeType: string; titulo: string; subtitulo: string; estilo: string };
              if (!r.b64_json) return null;
              const dataUrl = `data:${r.mimeType};base64,${r.b64_json}`;
              return (
                <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 truncate">{r.titulo}</h3>
                      <p className="text-[11px] text-slate-500 truncate">{r.subtitulo}</p>
                      <span className="inline-block mt-1 text-[9px] uppercase tracking-wide bg-fuchsia-100 text-fuchsia-700 px-1.5 py-0.5 rounded font-bold">{r.estilo}</span>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => setInfoFull(dataUrl)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-fuchsia-600 text-white px-2 py-1.5 rounded-lg hover:bg-fuchsia-700">
                        <Maximize2 className="w-3 h-3" /> Ampliar
                      </button>
                      <a href={dataUrl} download={`infografico-${r.titulo.replace(/\s+/g, "-")}.png`}
                         className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-900 text-white px-2 py-1.5 rounded-lg hover:bg-slate-700">
                        <Download className="w-3 h-3" /> PNG
                      </a>
                    </div>
                  </div>
                  <button onClick={() => setInfoFull(dataUrl)} className="block w-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                    <img src={dataUrl} alt={r.titulo}
                         className="w-full max-h-[60vh] object-contain mx-auto cursor-zoom-in hover:opacity-95 transition-opacity" />
                  </button>
                  <p className="text-[10px] text-slate-400 text-center">Clique para ampliar</p>
                </div>
              );
            })()}

            {activeTool === "tabela" && (() => {
              const r = toolResult as { titulo?: string; descricao?: string; colunas?: string[]; linhas?: Record<string, string>[]; markdown?: string };
              if (r.markdown) {
                return (
                  <div className="p-3">
                    <p className="text-xs font-bold text-slate-700 mb-2">{r.titulo}</p>
                    {r.descricao && <p className="text-[11px] text-slate-500 mb-3">{r.descricao}</p>}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <pre className="text-[11px] p-3 whitespace-pre font-mono text-slate-700 bg-slate-50">{r.markdown}</pre>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(r.markdown!)}
                      className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-violet-600 hover:underline">
                      <ClipboardList className="w-3 h-3" /> Copiar tabela
                    </button>
                  </div>
                );
              }
              if (r.colunas && r.linhas) {
                return (
                  <div className="p-3">
                    <p className="text-xs font-bold text-slate-700 mb-2">{r.titulo}</p>
                    {r.descricao && <p className="text-[11px] text-slate-500 mb-3">{r.descricao}</p>}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-violet-50">
                            {r.colunas.map((col, ci) => (
                              <th key={ci} className="px-2 py-1.5 text-left font-bold text-violet-700 border-b border-violet-100 whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {r.linhas.map((row, ri) => (
                            <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                              {r.colunas!.map((col, ci) => (
                                <td key={ci} className="px-2 py-1.5 text-slate-700 border-b border-slate-100 align-top">{row[col] ?? "—"}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {activeTool === "briefing" && (() => {
              const r = toolResult as Briefing;
              return (
                <div className="p-3 space-y-3">
                  <div className="p-3 rounded-xl bg-slate-800 text-white">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Contexto / Problema</p>
                    <p className="text-xs leading-snug">{r.problema}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Pontos-Chave</p>
                    <div className="space-y-1.5">
                      {r.pontosChave?.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[9px] font-black flex-shrink-0">{i+1}</div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-800">{p.ponto}</p>
                            {p.evidencia && <p className="text-[9px] text-slate-500 mt-0.5">{p.evidencia}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">Conclusões</p>
                    <p className="text-[10px] text-emerald-800 leading-snug">{r.conclusoes}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-1.5">Recomendações</p>
                    <div className="space-y-1.5">
                      {r.recomendacoes?.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-semibold text-slate-800">{rec.acao}</p>
                            {rec.justificativa && <p className="text-[9px] text-slate-500">{rec.justificativa}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1">→ Próximos Passos</p>
                    <p className="text-[10px] text-amber-800 leading-snug">{r.proximosPassos}</p>
                  </div>
                  {((r.palavrasChave?.length ?? 0) > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {r.palavrasChave.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] font-medium">{p}</span>
                      ))}
                    </div>
                  )}
                  {r.conexoesEnem && (
                    <div className="flex items-start gap-1.5 p-2 bg-amber-50 rounded-lg border border-amber-100">
                      <GraduationCap className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[9px] text-amber-700">{r.conexoesEnem}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {activeTool === "plano-aula" && (() => {
              const r = toolResult as PlanoAula;
              const objetivos = Array.isArray(r.objetivos)
                ? { geral: null, especificos: r.objetivos as string[], indicadores: [] }
                : r.objetivos as { geral: string; especificos: string[]; indicadores: string[] };
              const prereqs = Array.isArray(r.prerequisitos)
                ? r.prerequisitos as Array<{ conceito: string; status: string }>
                : null;
              return (
                <div className="p-3 space-y-3">
                  {/* Header */}
                  <div className="p-3 rounded-xl bg-violet-700 text-white">
                    <p className="text-xs font-black leading-snug">{r.titulo}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold">{r.turma}</span>
                      <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold">{r.duracao}</span>
                      {(r as any).persona && <span className="px-2 py-0.5 bg-white/30 rounded text-[9px] font-bold">🎭 {(r as any).persona}</span>}
                    </div>
                    {r.perfilTurma && <p className="text-[9px] text-violet-200 mt-1.5 leading-snug">{r.perfilTurma}</p>}
                  </div>

                  {/* v2: Snapshot Executivo (/schemas/plano_aula_v2.py) */}
                  {(r as any).snapshotExecutivo && (() => {
                    const s = (r as any).snapshotExecutivo;
                    return (
                      <div className="bg-slate-900 text-white rounded-xl p-3 space-y-1.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase">⚡ Snapshot Executivo</p>
                        {s.essencia && <p className="text-[11px] font-bold text-white">"{s.essencia}"</p>}
                        {s.porqueAgora && <p className="text-[10px] text-slate-300">🎯 {s.porqueAgora}</p>}
                        {s.comoSaberQueAprendeu && <p className="text-[10px] text-emerald-400">✅ {s.comoSaberQueAprendeu}</p>}
                        {s.riscoMaior && <p className="text-[10px] text-red-400">⚠️ {s.riscoMaior}</p>}
                        {s.podaInteligente && <p className="text-[10px] text-amber-300">✂️ {s.podaInteligente}</p>}
                      </div>
                    );
                  })()}

                  {/* v2: Clima de Aula */}
                  {(r as any).climaDeAula && (() => {
                    const c = (r as any).climaDeAula;
                    return (
                      <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                        <p className="text-[9px] font-black text-violet-600 uppercase mb-1.5">🌡️ Clima de Aula</p>
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          {c.energiaEsperada && <p className="text-violet-700">⚡ {c.energiaEsperada}</p>}
                          {c.temperatura && <p className="text-violet-700">🎭 {c.temperatura}</p>}
                          {c.atencaoPrevista && <p className="text-violet-600 col-span-2">👁 {c.atencaoPrevista}</p>}
                          {c.recomendacaoAmbiental && <p className="text-violet-500 col-span-2 italic">🏫 {c.recomendacaoAmbiental}</p>}
                        </div>
                      </div>
                    );
                  })()}

                  {/* v2: Momento Zero */}
                  {(r as any).momentoCero && (() => {
                    const m = (r as any).momentoCero;
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-[9px] font-black text-amber-600 uppercase mb-1.5">🌅 Momento Zero (antes da aula)</p>
                        {m.chegada && <p className="text-[10px] text-amber-700">🚪 {m.chegada}</p>}
                        {m.acolhimento && <p className="text-[10px] text-amber-700 mt-0.5">🤝 {m.acolhimento}</p>}
                        {m.verificacaoHumor && <p className="text-[10px] text-amber-600 italic mt-0.5">💬 {m.verificacaoHumor}</p>}
                      </div>
                    );
                  })()}

                  {/* v2: Validação por Pares (/core/validador_pares.py) */}
                  {(r as any)._validacaoPares && (() => {
                    const v = (r as any)._validacaoPares;
                    const icons: Record<string, string> = { veterano: "👨‍🏫", inclusao: "♿", pesquisador: "🔬" };
                    return (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                        <p className="text-[9px] font-black text-emerald-600 uppercase mb-1.5">✅ Validação por Pares (3 IAs)</p>
                        {v.consenso && <p className="text-[10px] font-bold text-emerald-700 mb-1.5">{v.consenso}</p>}
                        {["veterano", "inclusao", "pesquisador"].map(key => v[key] && (
                          <div key={key} className="mb-1">
                            <p className="text-[9px] font-black text-slate-500 uppercase">{icons[key]} {key}</p>
                            <p className="text-[10px] text-slate-700">{v[key]}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* BNCC */}
                  {r.bncc && (
                    <div className="p-2 rounded-lg bg-violet-50 border border-violet-200">
                      <p className="text-[9px] font-black text-violet-600 uppercase tracking-wider mb-0.5">BNCC</p>
                      <p className="text-[9px] text-violet-800 font-semibold">{r.bncc.competencia}</p>
                      <p className="text-[9px] text-violet-700">{r.bncc.habilidade}</p>
                      {((r.bncc.objetosConhecimento?.length ?? 0) > 0) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.bncc.objetosConhecimento.map((o, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[8px] font-medium">{o}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Objetivos */}
                  <div>
                    {objetivos.geral && (
                      <p className="text-[10px] font-semibold text-violet-700 mb-1 italic">{objetivos.geral}</p>
                    )}
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Objetivos Específicos</p>
                    {objetivos.especificos?.map((o, i) => (
                      <p key={i} className="text-[10px] text-slate-700 flex items-start gap-1.5 mb-0.5">
                        <CheckCircle className="w-3 h-3 text-violet-400 flex-shrink-0 mt-0.5" />{o}
                      </p>
                    ))}
                    {((objetivos.indicadores?.length ?? 0) > 0) && (
                      <div className="mt-1.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Indicadores de Sucesso</p>
                        {objetivos.indicadores.map((ind, i) => (
                          <p key={i} className="text-[9px] text-slate-600 flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />{ind}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pré-requisitos */}
                  {prereqs ? (
                    <div className="p-2 rounded-lg bg-violet-50 border border-violet-100">
                      <p className="text-[9px] font-black text-violet-600 uppercase tracking-wider mb-0.5">Pré-requisitos</p>
                      {prereqs.map((p, i) => (
                        <p key={i} className="text-[9px] text-violet-800">• <strong>{p.conceito}</strong> — {p.status}</p>
                      ))}
                    </div>
                  ) : r.prerequisitos ? (
                    <div className="p-2 rounded-lg bg-violet-50 border border-violet-100">
                      <p className="text-[9px] font-black text-violet-600 uppercase tracking-wider mb-0.5">Pré-requisitos</p>
                      <p className="text-[9px] text-violet-800">{r.prerequisitos as string}</p>
                    </div>
                  ) : null}

                  {/* Dificuldades Previsíveis */}
                  {((r.dificuldadesPrevisíveis?.length ?? 0) > 0) && (
                    <details className="group">
                      <summary className="text-[10px] font-black text-red-500 cursor-pointer list-none flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Dificuldades Previsíveis
                        <ChevronDown className="w-3 h-3 ml-auto group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-1 space-y-1">
                        {r.dificuldadesPrevisíveis!.map((d, i) => (
                          <div key={i} className="p-2 rounded-lg bg-red-50 border border-red-100">
                            <p className="text-[9px] font-bold text-red-700">{d.dificuldade}</p>
                            <p className="text-[9px] text-slate-600 mt-0.5">→ {d.prevencao}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Desenvolvimento */}
                  {((r.desenvolvimento?.length ?? 0) > 0) && (
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Desenvolvimento</p>
                      <div className="space-y-2">
                        {r.desenvolvimento.map((d, i) => (
                          <details key={i} className="group rounded-xl border border-slate-200 overflow-hidden">
                            <summary className="px-2.5 py-1.5 cursor-pointer list-none bg-slate-50 flex items-center gap-2">
                              <span className="text-[9px] font-black text-violet-500 w-10 flex-shrink-0">{d.tempo}</span>
                              <span className="text-[10px] font-bold text-slate-700 flex-1">{d.nome ?? d.etapa}</span>
                              <span className="text-[9px] text-slate-400">{d.etapa}</span>
                            </summary>
                            <div className="px-2.5 py-2 space-y-1.5">
                              <p className="text-[10px] text-slate-700 leading-snug">{d.atividade}</p>
                              {d.estrategia && <p className="text-[9px] text-slate-500 italic">{d.estrategia}</p>}
                              <p className="text-[9px] text-slate-400">📦 {d.recursos}</p>
                              {((d.perguntasNorteadoras?.length ?? 0) > 0) && (
                                <div className="pt-1">
                                  <p className="text-[9px] font-black text-violet-500 mb-0.5">Perguntas Norteadoras</p>
                                  {d.perguntasNorteadoras!.map((q, j) => (
                                    <p key={j} className="text-[9px] text-violet-700 italic">• {q}</p>
                                  ))}
                                </div>
                              )}
                              {/* v2: Diálogo Esperado */}
                              {(d as any).dialogoEsperado && (
                                <div className="p-1.5 rounded-lg bg-violet-50 border border-violet-100 mt-1">
                                  <p className="text-[8px] font-black text-violet-500 uppercase mb-0.5">💬 Diálogo Esperado</p>
                                  {(d as any).dialogoEsperado.professor && <p className="text-[9px] text-violet-700">👨‍🏫 {(d as any).dialogoEsperado.professor}</p>}
                                  {(d as any).dialogoEsperado.aluno && <p className="text-[9px] text-violet-500 mt-0.5">👩‍🎓 {(d as any).dialogoEsperado.aluno}</p>}
                                </div>
                              )}
                              {d.diferenciacão && (
                                <div className="flex gap-1 pt-0.5">
                                  <div className="flex-1 p-1.5 rounded bg-emerald-50 border border-emerald-100">
                                    <p className="text-[8px] font-black text-emerald-600">Avançados</p>
                                    <p className="text-[8px] text-emerald-800">{d.diferenciacão.avancados}</p>
                                  </div>
                                  <div className="flex-1 p-1.5 rounded bg-rose-50 border border-rose-100">
                                    <p className="text-[8px] font-black text-rose-600">Apoio</p>
                                    <p className="text-[8px] text-rose-800">{d.diferenciacão.comDificuldade}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Avaliação com Rúbrica */}
                  {r.avaliacao && (
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Avaliação</p>
                      <p className="text-[9px] text-slate-700 mb-1.5">{r.avaliacao.instrumento}</p>
                      {((r.avaliacao.rubrica?.length ?? 0) > 0) && (
                        <details className="group">
                          <summary className="text-[10px] font-black text-amber-600 cursor-pointer list-none flex items-center gap-1">
                            📋 Rúbrica de Avaliação
                            <ChevronDown className="w-3 h-3 ml-auto group-open:rotate-180 transition-transform" />
                          </summary>
                          <div className="mt-1.5 overflow-x-auto">
                            <table className="w-full text-[8px] border-collapse">
                              <thead>
                                <tr className="bg-slate-100">
                                  <th className="px-1.5 py-1 text-left font-black text-slate-600 border border-slate-200">Critério</th>
                                  <th className="px-1.5 py-1 text-center font-black text-red-600 border border-slate-200">D</th>
                                  <th className="px-1.5 py-1 text-center font-black text-amber-600 border border-slate-200">C</th>
                                  <th className="px-1.5 py-1 text-center font-black text-violet-600 border border-slate-200">B</th>
                                  <th className="px-1.5 py-1 text-center font-black text-emerald-600 border border-slate-200">A</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.avaliacao.rubrica!.map((row, i) => (
                                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                    <td className="px-1.5 py-1 font-semibold text-slate-700 border border-slate-200">{row.criterio}</td>
                                    <td className="px-1.5 py-1 text-slate-600 border border-slate-200">{row.insuficiente}</td>
                                    <td className="px-1.5 py-1 text-slate-600 border border-slate-200">{row.regular}</td>
                                    <td className="px-1.5 py-1 text-slate-600 border border-slate-200">{row.bom}</td>
                                    <td className="px-1.5 py-1 text-slate-600 border border-slate-200">{row.excelente}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Tarefa de Casa */}
                  {r.tarefaCasa && (
                    <div className="p-2.5 rounded-lg bg-violet-50 border border-violet-100">
                      <p className="text-[9px] font-black text-violet-600 uppercase tracking-wider mb-0.5">📚 Tarefa de Casa</p>
                      <p className="text-[9px] text-violet-800 leading-snug">{r.tarefaCasa}</p>
                    </div>
                  )}

                  {/* Adaptações */}
                  {r.adaptacoes && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                        <p className="text-[9px] font-black text-emerald-600 mb-0.5">🚀 Turmas Rápidas</p>
                        <p className="text-[9px] text-emerald-800 leading-snug">{r.adaptacoes.turmaRapida}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-100">
                        <p className="text-[9px] font-black text-rose-600 mb-0.5">🤝 Com Dificuldade</p>
                        <p className="text-[9px] text-rose-800 leading-snug">{r.adaptacoes.turmaDificuldade}</p>
                      </div>
                    </div>
                  )}

                  {/* v2: Versões de Emergência */}
                  {(r as any).versoesEmergencia && (() => {
                    const v = (r as any).versoesEmergencia;
                    return (
                      <details className="group">
                        <summary className="text-[10px] font-black text-orange-600 cursor-pointer list-none flex items-center gap-1">
                          🚨 Versões de Emergência
                          <ChevronDown className="w-3 h-3 ml-auto group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="mt-1 space-y-1">
                          {v.seTurmaEstiverCansada && <div className="p-2 bg-orange-50 border border-orange-100 rounded-lg"><p className="text-[8px] font-black text-orange-500">😴 Se turma estiver cansada</p><p className="text-[9px] text-orange-700">{v.seTurmaEstiverCansada}</p></div>}
                          {v.seTecnologiaFalhar && <div className="p-2 bg-red-50 border border-red-100 rounded-lg"><p className="text-[8px] font-black text-red-500">📵 Se tecnologia falhar</p><p className="text-[9px] text-red-700">{v.seTecnologiaFalhar}</p></div>}
                          {v.seTempoAcabar && <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg"><p className="text-[8px] font-black text-amber-500">⏰ Se tempo acabar</p><p className="text-[9px] text-amber-700">{v.seTempoAcabar}</p></div>}
                          {v.seAlunoDesafiar && <div className="p-2 bg-violet-50 border border-violet-100 rounded-lg"><p className="text-[8px] font-black text-violet-500">😤 Se aluno desafiar</p><p className="text-[9px] text-violet-700">{v.seAlunoDesafiar}</p></div>}
                        </div>
                      </details>
                    );
                  })()}

                  {/* Referências */}
                  {r.referencias && (
                    <details className="group">
                      <summary className="text-[10px] font-black text-slate-500 cursor-pointer list-none flex items-center gap-1">
                        📖 Referências
                        <ChevronDown className="w-3 h-3 ml-auto group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-1 space-y-1">
                        {r.referencias.teoricas?.map((ref, i) => (
                          <p key={i} className="text-[9px] text-slate-600">• {ref}</p>
                        ))}
                        {r.referencias.fontesCaderno && (
                          <p className="text-[9px] text-violet-600 italic">Caderno: {r.referencias.fontesCaderno}</p>
                        )}
                      </div>
                    </details>
                  )}

                  {/* Reflexão Pós-Aula */}
                  {r.reflexao !== undefined && (
                    <details className="group">
                      <summary className="text-[10px] font-black text-slate-400 cursor-pointer list-none flex items-center gap-1">
                        🪞 Reflexão Pós-Aula (preencher depois)
                        <ChevronDown className="w-3 h-3 ml-auto group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-1 space-y-1.5 text-[9px] text-slate-500">
                        <div className="p-2 rounded bg-slate-50 border border-slate-100">
                          <p className="font-bold text-slate-600 mb-0.5">✅ O que funcionou</p>
                          <p className="text-slate-400 italic">{r.reflexao?.oQueFuncionou || "(preencher após a aula)"}</p>
                        </div>
                        <div className="p-2 rounded bg-slate-50 border border-slate-100">
                          <p className="font-bold text-slate-600 mb-0.5">🔧 O que precisa ajustar</p>
                          <p className="text-slate-400 italic">{r.reflexao?.oQuePrecisaAjustar || "(preencher após a aula)"}</p>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              );
            })()}

            {activeTool === "tarefa" && (() => {
              const r = toolResult as Tarefa;
              const showProfessor = tarefaShowProfessor;
              const setShowProfessor = setTarefaShowProfessor;
              return (
                <div className="p-3 space-y-3">
                  {/* Header */}
                  <div className="p-3 rounded-xl bg-emerald-700 text-white">
                    <p className="text-xs font-black">{r.titulo}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold">{r.tipo}</span>
                      <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold">{r.nivel}</span>
                      <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold">⏱ {r.tempoEstimado}</span>
                    </div>
                  </div>

                  {/* Alternância Aluno / Professor */}
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                    <button onClick={() => setShowProfessor(false)}
                      className={`flex-1 py-1.5 text-[10px] font-black transition-colors ${!showProfessor ? "bg-emerald-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                      📚 Para o Aluno
                    </button>
                    <button onClick={() => setShowProfessor(true)}
                      className={`flex-1 py-1.5 text-[10px] font-black transition-colors ${showProfessor ? "bg-violet-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                      🎓 Para o Professor
                    </button>
                  </div>

                  {!showProfessor ? (
                    /* ─── SEÇÃO DO ALUNO ─── */
                    <div className="space-y-2.5">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5">📋 O que você vai fazer</p>
                        <p className="text-[10px] text-slate-700 leading-snug">{r.paraAluno?.oQueVaiFazer}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-0.5">🎯 Por que isso importa</p>
                        <p className="text-[10px] text-emerald-800 leading-snug">{r.paraAluno?.porQueImporta}</p>
                      </div>

                      {((r.paraAluno?.doQuePreucisa?.length ?? 0) > 0) && (
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">📦 O que você precisa</p>
                          {r.paraAluno!.doQuePreucisa!.map((m, i) => (
                            <p key={i} className="text-[10px] text-slate-700">• {m}</p>
                          ))}
                        </div>
                      )}

                      {((r.paraAluno?.passos?.length ?? 0) > 0) && (
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">📝 Passo a passo</p>
                          <div className="space-y-1.5">
                            {r.paraAluno!.passos!.map((p, i) => (
                              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 border-b border-emerald-100">
                                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center flex-shrink-0">{p.numero}</span>
                                  <span className="text-[10px] font-bold text-emerald-800 flex-1">{p.nome}</span>
                                  <span className="text-[9px] text-emerald-500">{p.duracao}</span>
                                </div>
                                <div className="px-2.5 py-2">
                                  <p className="text-[10px] text-slate-700 leading-snug">{p.instrucao}</p>
                                  {p.dica && (
                                    <div className="mt-1.5 flex items-start gap-1.5 p-1.5 rounded-lg bg-amber-50 border border-amber-100">
                                      <span className="text-[10px]">💡</span>
                                      <p className="text-[9px] text-amber-700 italic">{p.dica}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-2.5 rounded-xl bg-violet-50 border border-violet-200">
                        <p className="text-[9px] font-black text-violet-600 uppercase tracking-wider mb-0.5">✅ Como saber se acertou</p>
                        <p className="text-[10px] text-violet-800 leading-snug">{r.paraAluno?.comoSaberSeAcertou}</p>
                      </div>

                      {((r.paraAluno?.seTravar?.length ?? 0) > 0) && (
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">🤔 Se travar, tente</p>
                          {r.paraAluno!.seTravar!.map((s, i) => (
                            <p key={i} className="text-[10px] text-slate-600">• {s}</p>
                          ))}
                        </div>
                      )}

                      {r.paraAluno?.querMaisDesafio && (
                        <div className="p-2.5 rounded-xl bg-violet-50 border border-violet-200">
                          <p className="text-[9px] font-black text-violet-600 uppercase tracking-wider mb-0.5">🚀 Quer mais desafio?</p>
                          <p className="text-[10px] text-violet-800 leading-snug">{r.paraAluno.querMaisDesafio}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ─── SEÇÃO DO PROFESSOR ─── */
                    <div className="space-y-2.5">
                      <div className="p-2.5 rounded-xl bg-violet-50 border border-violet-200">
                        <p className="text-[9px] font-black text-violet-600 uppercase tracking-wider mb-0.5">🎯 Objetivo</p>
                        <p className="text-[10px] text-violet-800 leading-snug">{r.paraProfessor?.objetivo}</p>
                      </div>

                      <details className="group rounded-xl border border-slate-200 overflow-hidden">
                        <summary className="px-2.5 py-2 cursor-pointer list-none bg-slate-50 flex items-center gap-2 text-[10px] font-black text-slate-700">
                          📖 Resposta Esperada / Gabarito
                          <ChevronDown className="w-3 h-3 ml-auto group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="px-2.5 py-2 text-[10px] text-slate-700 leading-snug whitespace-pre-wrap">
                          {r.paraProfessor?.respostaEsperada}
                        </div>
                      </details>

                      {((r.paraProfessor?.errosComuns?.length ?? 0) > 0) && (
                        <div>
                          <p className="text-[10px] font-black text-red-500 uppercase tracking-wider mb-1.5">⚠️ Erros Comuns</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-[8px] border-collapse">
                              <thead>
                                <tr className="bg-slate-100">
                                  <th className="px-1.5 py-1 text-left font-black text-slate-600 border border-slate-200">Erro</th>
                                  <th className="px-1.5 py-1 text-left font-black text-slate-600 border border-slate-200">Causa</th>
                                  <th className="px-1.5 py-1 text-left font-black text-slate-600 border border-slate-200">Estratégia</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.paraProfessor.errosComuns.map((e, i) => (
                                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                    <td className="px-1.5 py-1 text-red-700 border border-slate-200">{e.erro}</td>
                                    <td className="px-1.5 py-1 text-slate-600 border border-slate-200">{e.causa}</td>
                                    <td className="px-1.5 py-1 text-emerald-700 border border-slate-200">{e.estrategia}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {((r.paraProfessor?.rubrica?.length ?? 0) > 0) && (
                        <div>
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1.5">📋 Rúbrica</p>
                          <div className="space-y-1">
                            {r.paraProfessor.rubrica.map((rv, i) => (
                              <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-slate-200">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black flex-shrink-0 ${
                                  i === 0 ? "bg-emerald-100 text-emerald-700" :
                                  i === 1 ? "bg-violet-100 text-violet-700" :
                                  i === 2 ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                                }`}>{rv.nivel}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] text-slate-700 leading-snug">{rv.descricao}</p>
                                  <p className="text-[8px] text-slate-400">Nota: {rv.notaEquivalente}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {r.paraProfessor?.diferenciacao && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                            <p className="text-[9px] font-black text-emerald-600 mb-0.5">Avançados</p>
                            <p className="text-[9px] text-emerald-800">{r.paraProfessor.diferenciacao.avancados}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-rose-50 border border-rose-100">
                            <p className="text-[9px] font-black text-rose-600 mb-0.5">Com Dificuldade</p>
                            <p className="text-[9px] text-rose-800">{r.paraProfessor.diferenciacao.comDificuldade}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {r.paraProfessor?.tempoCorrecao && (
                          <div className="p-2 rounded-lg bg-slate-100 flex-1">
                            <p className="text-[9px] font-black text-slate-500 mb-0.5">Tempo de Correção</p>
                            <p className="text-[9px] text-slate-700">{r.paraProfessor.tempoCorrecao}</p>
                          </div>
                        )}
                        {r.paraProfessor?.conexaoProximaAula && (
                          <div className="p-2 rounded-lg bg-violet-50 border border-violet-100 flex-1">
                            <p className="text-[9px] font-black text-violet-600 mb-0.5">Próxima Aula</p>
                            <p className="text-[9px] text-violet-800">{r.paraProfessor.conexaoProximaAula}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {activeTool === "sequencia-didatica" && (() => {
              const r = toolResult as SequenciaDidade;
              const activeAula = seqActiveAula;
              const setActiveAula = setSeqActiveAula;
              return (
                <div className="p-3 space-y-3">
                  {/* Header */}
                  <div className="p-3 rounded-xl bg-violet-700 text-white">
                    <p className="text-xs font-black leading-snug">{r.titulo}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold">{r.nivel}</span>
                      <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold">{r.duracaoTotal}</span>
                    </div>
                    {r.objetivo && <p className="text-[9px] text-violet-200 mt-1.5 leading-snug">{r.objetivo}</p>}
                  </div>

                  {/* Produto Final */}
                  <div className="p-2.5 rounded-xl bg-violet-50 border border-violet-200">
                    <p className="text-[9px] font-black text-violet-600 uppercase tracking-wider mb-0.5">🏆 Produto Final</p>
                    <p className="text-[10px] text-violet-800 font-semibold">{r.produtoFinal}</p>
                    <p className="text-[9px] text-violet-600 mt-0.5">{r.avaliacaoSomativa}</p>
                  </div>

                  {/* BNCC */}
                  {r.bncc && (
                    <div className="p-2 rounded-lg bg-violet-50 border border-violet-100">
                      <p className="text-[9px] font-black text-violet-600 mb-0.5">BNCC</p>
                      <p className="text-[9px] text-violet-800">{r.bncc.competencia}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {r.bncc.habilidades?.map((h, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[8px]">{h}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mapa da Sequência */}
                  {((r.mapaDaSequencia?.length ?? 0) > 0) && (
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">🗺️ Mapa da Sequência</p>
                      <div className="flex gap-1 flex-wrap">
                        {r.mapaDaSequencia.map((m, i) => (
                          <button key={i} onClick={() => setActiveAula(activeAula === m.numero ? null : m.numero)}
                            className={`flex-1 min-w-[60px] p-2 rounded-lg border text-left transition-all ${
                              activeAula === m.numero
                                ? "bg-violet-600 border-violet-600 text-white"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:border-violet-300"
                            }`}>
                            <p className="text-[8px] font-black mb-0.5">Aula {m.numero}</p>
                            <p className="text-[9px] font-semibold leading-tight line-clamp-2">{m.tema}</p>
                            {m.conceito && <p className={`text-[8px] mt-0.5 ${activeAula === m.numero ? "text-violet-200" : "text-slate-400"}`}>{m.conceito}</p>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aulas Detalhadas */}
                  {((r.aulas?.length ?? 0) > 0) && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Aulas Detalhadas</p>
                      {r.aulas.map((aula, i) => (
                        <details key={i} className="group rounded-xl border border-violet-200 overflow-hidden">
                          <summary className="px-2.5 py-2 cursor-pointer list-none bg-violet-50 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center flex-shrink-0">{aula.numero}</span>
                            <p className="text-[10px] font-bold text-slate-800 flex-1 line-clamp-1">{aula.titulo}</p>
                            <ChevronDown className="w-3 h-3 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                          </summary>
                          <div className="px-2.5 py-2.5 space-y-2">
                            {((aula.objetivos?.length ?? 0) > 0) && (
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Objetivos</p>
                                {aula.objetivos.map((o, j) => (
                                  <p key={j} className="text-[9px] text-slate-700 flex items-start gap-1">
                                    <CheckCircle className="w-2.5 h-2.5 text-violet-400 flex-shrink-0 mt-0.5" />{o}
                                  </p>
                                ))}
                              </div>
                            )}
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Atividade Principal</p>
                              <p className="text-[10px] text-slate-700 leading-snug">{aula.atividadePrincipal}</p>
                            </div>
                            {((aula.recursos?.length ?? 0) > 0) && (
                              <p className="text-[9px] text-slate-400">📦 {aula.recursos.join(", ")}</p>
                            )}
                            {aula.avaliacaoFormativa && (
                              <div className="p-1.5 rounded bg-amber-50 border border-amber-100">
                                <p className="text-[9px] text-amber-700"><strong>Avaliação formativa:</strong> {aula.avaliacaoFormativa}</p>
                              </div>
                            )}
                            {aula.conexaoProxima && (
                              <div className="flex items-start gap-1.5">
                                <span className="text-[10px]">→</span>
                                <p className="text-[9px] text-slate-500 italic">{aula.conexaoProxima}</p>
                              </div>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}

                  {/* Avaliação Integrada */}
                  {r.avaliacaoIntegrada && (
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">📊 Avaliação Integrada</p>
                      <p className="text-[9px] text-slate-700 mb-1.5">{r.avaliacaoIntegrada.instrumento}</p>
                      {((r.avaliacaoIntegrada.rubrica?.length ?? 0) > 0) && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-[8px] border-collapse">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="px-1.5 py-1 text-left font-black text-slate-600 border border-slate-200">Dimensão</th>
                                <th className="px-1.5 py-1 text-center font-black text-slate-600 border border-slate-200">Peso</th>
                                <th className="px-1.5 py-1 text-left font-black text-slate-600 border border-slate-200">Critérios</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.avaliacaoIntegrada.rubrica.map((row, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                  <td className="px-1.5 py-1 font-semibold text-violet-700 border border-slate-200">{row.dimensao}</td>
                                  <td className="px-1.5 py-1 text-center font-bold text-slate-700 border border-slate-200">{row.peso}</td>
                                  <td className="px-1.5 py-1 text-slate-600 border border-slate-200 leading-snug">{row.criterios}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recursos */}
                  {((r.recursos?.permanentes?.length ?? 0) > 0) && (
                    <details className="group">
                      <summary className="text-[10px] font-black text-slate-500 cursor-pointer list-none flex items-center gap-1">
                        📦 Recursos da Sequência
                        <ChevronDown className="w-3 h-3 ml-auto group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-1">
                        <p className="text-[9px] font-bold text-slate-600 mb-0.5">Permanentes:</p>
                        {r.recursos.permanentes.map((m, i) => (
                          <p key={i} className="text-[9px] text-slate-600">• {m}</p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })()}

            {/* ── AULA VIVA Renderer ── */}
            {activeTool === "aula-viva" && (() => {
              const r = toolResult as any;
              if (!r) return null;
              return (
                <div className="p-3 space-y-3">
                  {/* Ficha Técnica */}
                  <div className="p-3 rounded-xl bg-orange-600 text-white">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Tv className="w-4 h-4" />
                      <p className="text-xs font-black">AULA VIVA — {r.titulo}</p>
                    </div>
                    <p className="text-[10px] text-orange-100 italic">{r.subtitulo}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold">{r.genero}</span>
                      <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold">{r.duracaoTotal}</span>
                      <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold">🎵 {r.trilhaSonora}</span>
                    </div>
                  </div>

                  {/* Snapshot Executivo */}
                  {r.snapshotExecutivo && (
                    <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200">
                      <p className="text-[9px] font-black text-orange-600 uppercase tracking-wider mb-1.5">📋 Snapshot Executivo</p>
                      <div className="space-y-1">
                        {[
                          ["O que aprenderão", r.snapshotExecutivo.oQueVaoAprender],
                          ["Por que importa", r.snapshotExecutivo.porQueImporta],
                          ["Como aprenderão", r.snapshotExecutivo.comoVaoAprender],
                          ["Como saberemos", r.snapshotExecutivo.comoSaberemos],
                        ].map(([k, v]) => (
                          <div key={k} className="flex gap-1.5">
                            <span className="text-[9px] font-bold text-orange-500 min-w-[80px]">{k}:</span>
                            <span className="text-[9px] text-slate-700">{v as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Elenco */}
                  {r.elenco && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1.5">🎬 Elenco</p>
                      <div className="space-y-1">
                        <p className="text-[9px] text-slate-700"><span className="font-bold">Host:</span> {r.elenco.host}</p>
                        <p className="text-[9px] text-slate-700"><span className="font-bold">Especialista:</span> {r.elenco.especialistaConvidado}</p>
                        <p className="text-[9px] text-slate-700"><span className="font-bold">Público:</span> {r.elenco.publico}</p>
                      </div>
                    </div>
                  )}

                  {/* Cenas */}
                  {((r.cenas?.length ?? 0) > 0) && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">🎥 Roteiro Cena a Cena</p>
                      {r.cenas.map((cena: any) => {
                        const tipoColor: Record<string, string> = {
                          vinheta: "bg-orange-500", recapitulacao: "bg-slate-500", gancho: "bg-red-500",
                          acao: "bg-violet-500", comercial: "bg-green-500", climax: "bg-violet-600", fechamento: "bg-orange-700"
                        };
                        return (
                          <details key={cena.numero} className="rounded-xl border border-slate-200 overflow-hidden">
                            <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer bg-slate-50 hover:bg-slate-100">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black text-white ${tipoColor[cena.tipo] ?? "bg-slate-400"}`}>
                                CENA {cena.numero}
                              </span>
                              <span className="text-[10px] font-bold text-slate-700 flex-1">{cena.nome}</span>
                              <span className="text-[9px] text-slate-400">{cena.duracao}</span>
                            </summary>
                            <div className="px-3 py-2 bg-white space-y-1.5">
                              {cena.trilha && <p className="text-[9px] text-slate-500">🎵 Trilha: <span className="italic">{cena.trilha}</span></p>}
                              {cena.conteudoVisual && (
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Visual:</p>
                                  <p className="text-[9px] text-slate-700">{cena.conteudoVisual}</p>
                                </div>
                              )}
                              <div className="p-2 rounded-lg bg-orange-50 border border-orange-100">
                                <p className="text-[9px] font-bold text-orange-600 mb-0.5">Fala do Host:</p>
                                <p className="text-[9px] text-orange-900 italic">"{cena.falaHost}"</p>
                              </div>
                              {cena.pontoDeVirada && <p className="text-[9px] text-violet-700">⚡ Ponto de virada: {cena.pontoDeVirada}</p>}
                              {cena.cliffhanger && <p className="text-[9px] text-gray-700">🎭 Cliffhanger: {cena.cliffhanger}</p>}
                              {cena.transicao && <p className="text-[9px] text-slate-400">→ {cena.transicao}</p>}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  )}

                  {/* Guia de Direção */}
                  {r.guiaDeDirecao?.versoesAlternativas && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5">🎬 Versões Alternativas</p>
                      {Object.entries(r.guiaDeDirecao.versoesAlternativas).map(([k, v]) => (
                        <div key={k} className="flex gap-1.5 mb-0.5">
                          <span className="text-[9px] font-bold text-slate-600 capitalize min-w-[70px]">{k}:</span>
                          <span className="text-[9px] text-slate-600">{v as string}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── MICRO-AULAS Renderer ── */}
            {activeTool === "micro-aulas" && (() => {
              const r = toolResult as any;
              if (!r) return null;
              return (
                <div className="p-3 space-y-3">
                  {/* Header */}
                  <div className="p-3 rounded-xl bg-cyan-600 text-white">
                    <div className="flex items-center gap-1.5">
                      <Play className="w-4 h-4" />
                      <p className="text-xs font-black">{r.tema}</p>
                    </div>
                    <p className="text-[9px] text-cyan-200 mt-1">Micro-aulas em 5 formatos — TikTok • Reels • Shorts • Podcast</p>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 overflow-x-auto pb-0.5">
                    {(["15s", "60s", "3min", "10min", "serie"] as const).map(tab => (
                      <button key={tab} onClick={() => setMicroTab(tab)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black whitespace-nowrap flex-shrink-0 transition-colors ${
                          microTab === tab ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}>
                        {tab === "serie" ? "📺 Série" : tab}
                      </button>
                    ))}
                  </div>

                  {/* 15s */}
                  {microTab === "15s" && r.conceito15s && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-50 to-purple-50 border border-cyan-200">
                        <p className="text-[9px] font-black text-cyan-600 uppercase mb-1">🎬 Versão 15 Segundos (TikTok/Reels)</p>
                        <div className="space-y-1.5">
                          <div className="p-2 rounded-lg bg-black/5">
                            <p className="text-[9px] font-bold text-slate-500">Hook Visual (0-3s)</p>
                            <p className="text-[9px] text-slate-800">{r.conceito15s.hookVisual}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-cyan-600 text-white text-center">
                            <p className="text-xs font-black">{r.conceito15s.textNaTela}</p>
                            <p className="text-[9px] text-cyan-200 mt-0.5">texto na tela</p>
                          </div>
                          <div className="p-2 rounded-lg bg-white border border-cyan-200">
                            <p className="text-[9px] font-bold text-slate-500">Fala:</p>
                            <p className="text-[9px] text-slate-800 italic">"{r.conceito15s.fala}"</p>
                          </div>
                          <p className="text-[9px] text-cyan-600 font-bold">CTA: {r.conceito15s.callToAction}</p>
                          <div className="flex flex-wrap gap-1">
                            {r.conceito15s.hashtags?.map((h: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded text-[8px]">{h}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 60s */}
                  {microTab === "60s" && r.versao60s && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200">
                        <p className="text-[9px] font-black text-cyan-600 uppercase mb-2">⏱️ Versão 60 Segundos</p>
                        <div className="space-y-1.5">
                          {r.versao60s.estrutura?.map((e: any, i: number) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-[8px] font-bold text-cyan-500 min-w-[50px] mt-0.5">{e.segundo}</span>
                              <p className="text-[9px] text-slate-700">{e.conteudo}</p>
                            </div>
                          ))}
                        </div>
                        {r.versao60s.roteiro && (
                          <div className="mt-2 p-2 rounded-lg bg-white border border-cyan-100">
                            <p className="text-[9px] font-bold text-slate-500 mb-0.5">Roteiro completo:</p>
                            <p className="text-[9px] text-slate-800 whitespace-pre-line">{r.versao60s.roteiro}</p>
                          </div>
                        )}
                        {r.versao60s.musica && <p className="text-[9px] text-cyan-600 mt-1">🎵 Trilha: {r.versao60s.musica}</p>}
                      </div>
                    </div>
                  )}

                  {/* 3min */}
                  {microTab === "3min" && r.versao3min && (
                    <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 space-y-2">
                      <p className="text-[9px] font-black text-cyan-600 uppercase">📱 Versão 3 Minutos (YouTube Shorts / IGTV)</p>
                      {[
                        ["Gancho", r.versao3min.gancho],
                        ["Contexto", r.versao3min.contexto],
                        ["Conteúdo", r.versao3min.conteudo],
                        ["Aplicação", r.versao3min.aplicacao],
                        ["Fechamento", r.versao3min.fechamento],
                      ].map(([k, v]) => v && (
                        <div key={k} className="flex gap-1.5">
                          <span className="text-[9px] font-bold text-cyan-500 min-w-[65px]">{k}:</span>
                          <span className="text-[9px] text-slate-700">{v}</span>
                        </div>
                      ))}
                      {r.versao3min.roteiro && (
                        <div className="p-2 rounded-lg bg-white border border-cyan-100 mt-1">
                          <p className="text-[9px] font-bold text-slate-500 mb-0.5">Roteiro completo:</p>
                          <p className="text-[9px] text-slate-800 whitespace-pre-line">{r.versao3min.roteiro}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 10min */}
                  {microTab === "10min" && r.versao10min && (
                    <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 space-y-2">
                      <p className="text-[9px] font-black text-cyan-600 uppercase">🎧 Versão 10 Minutos (Commute/Podcast)</p>
                      <p className="text-[9px] text-slate-600 italic">{r.versao10min.descricao}</p>
                      <div className="space-y-1">
                        {r.versao10min.estrutura?.map((e: any, i: number) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-[8px] font-bold text-cyan-500 min-w-[40px] mt-0.5">{e.minuto} min</span>
                            <p className="text-[9px] text-slate-700">{e.conteudo}</p>
                          </div>
                        ))}
                      </div>
                      {r.versao10min.roteiro && (
                        <div className="p-2 rounded-lg bg-white border border-cyan-100">
                          <p className="text-[9px] font-bold text-slate-500 mb-0.5">Roteiro completo:</p>
                          <p className="text-[9px] text-slate-800 whitespace-pre-line">{r.versao10min.roteiro}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Série */}
                  {microTab === "serie" && r.serieDeMicroAulas && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">📺 Série de Micro-Aulas (5 episódios)</p>
                      {r.serieDeMicroAulas.map((ep: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-xl border border-cyan-200 bg-white">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[8px] font-black flex items-center justify-center flex-shrink-0">{ep.episodio}</span>
                            <p className="text-[10px] font-bold text-slate-800">{ep.titulo}</p>
                          </div>
                          <p className="text-[9px] text-slate-600 ml-7">{ep.conceito}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── NARRATIVA DIDÁTICA Renderer ── */}
            {activeTool === "narrativa" && (() => {
              const r = toolResult as any;
              if (!r) return null;
              return (
                <div className="p-3 space-y-3">
                  {/* Header */}
                  <div className="p-3 rounded-xl bg-fuchsia-700 text-white">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BookOpen className="w-4 h-4" />
                      <p className="text-xs font-black">{r.titulo}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold">{r.genero}</span>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 overflow-x-auto pb-0.5">
                    {[["universo", "🌍 Universo"], ["ato1", "Ato 1"], ["ato2", "Ato 2"], ["ato3", "Ato 3"], ["ludico", "🎮 Lúdico"]].map(([t, l]) => (
                      <button key={t} onClick={() => setNarrTab(t as typeof narrTab)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black whitespace-nowrap flex-shrink-0 transition-colors ${
                          narrTab === t ? "bg-fuchsia-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}>{l}</button>
                    ))}
                  </div>

                  {/* Universo + Personagens */}
                  {narrTab === "universo" && (
                    <div className="space-y-2">
                      {r.universo && (
                        <div className="p-2.5 rounded-xl bg-fuchsia-50 border border-fuchsia-200">
                          <p className="text-[9px] font-black text-fuchsia-600 mb-1.5">🌍 Universo da História</p>
                          <div className="space-y-1">
                            <div><span className="text-[9px] font-bold text-slate-500">Cenário: </span><span className="text-[9px] text-slate-700">{r.universo.cenario}</span></div>
                            <div><span className="text-[9px] font-bold text-slate-500">Grande Problema: </span><span className="text-[9px] text-slate-700">{r.universo.grandeProblema}</span></div>
                            <div><span className="text-[9px] font-bold text-slate-500">Stakes: </span><span className="text-[9px] text-slate-700">{r.universo.stakesEmocionais}</span></div>
                          </div>
                        </div>
                      )}
                      {r.personagens && (
                        <div className="p-2.5 rounded-xl bg-violet-50 border border-violet-200">
                          <p className="text-[9px] font-black text-violet-600 mb-1.5">👥 Personagens</p>
                          <div className="space-y-2">
                            {r.personagens.protagonista && (
                              <div className="p-1.5 rounded-lg bg-white border border-violet-100">
                                <p className="text-[9px] font-bold text-gray-700">🦸 Protagonista: {r.personagens.protagonista.nome}</p>
                                <p className="text-[9px] text-slate-600">Papel: {r.personagens.protagonista.papel}</p>
                                <p className="text-[9px] text-slate-600">Habilidade: {r.personagens.protagonista.habilidadeEspecial}</p>
                                <p className="text-[9px] text-slate-600">Arco: {r.personagens.protagonista.arcoTransformacao}</p>
                              </div>
                            )}
                            {r.personagens.mentor && (
                              <div className="p-1.5 rounded-lg bg-white border border-violet-100">
                                <p className="text-[9px] font-bold text-gray-700">🧙 Mentor</p>
                                <p className="text-[9px] text-slate-600">Papel: {r.personagens.mentor.papel}</p>
                                <p className="text-[9px] text-slate-600">Limitação: {r.personagens.mentor.limitacao}</p>
                              </div>
                            )}
                            {r.personagens.antagonista && (
                              <div className="p-1.5 rounded-lg bg-white border border-violet-100">
                                <p className="text-[9px] font-bold text-red-600">👹 Antagonista</p>
                                <p className="text-[9px] text-slate-600">{r.personagens.antagonista}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Atos */}
                  {(narrTab === "ato1" || narrTab === "ato2" || narrTab === "ato3") && (() => {
                    const atos: Record<string, { label: string; key: keyof typeof r.estruturaDramatica; color: string }> = {
                      ato1: { label: "Ato 1: Mundo Comum", key: "ato1", color: "from-violet-50 to-violet-50 border-violet-200" },
                      ato2: { label: "Ato 2: Mundo Especial", key: "ato2", color: "from-fuchsia-50 to-purple-50 border-fuchsia-200" },
                      ato3: { label: "Ato 3: Retorno", key: "ato3", color: "from-green-50 to-emerald-50 border-green-200" },
                    };
                    const cfg = atos[narrTab];
                    const ato = r.estruturaDramatica?.[cfg.key] ?? {};
                    return (
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${cfg.color} border space-y-1.5`}>
                        <p className="text-[9px] font-black text-slate-600 uppercase mb-1">{cfg.label}</p>
                        {Object.entries(ato).map(([k, v]) => (
                          <div key={k}>
                            <p className="text-[9px] font-bold text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</p>
                            <p className="text-[9px] text-slate-700">{v as string}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Lúdico */}
                  {narrTab === "ludico" && r.elementosLudicos && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-yellow-50 border border-yellow-200">
                        <p className="text-[9px] font-black text-yellow-700 mb-1.5">🎮 Elementos Lúdicos</p>
                        {Object.entries(r.elementosLudicos).map(([k, v]) => (
                          <div key={k} className="flex gap-1.5 mb-1">
                            <span className="text-[9px] font-bold text-yellow-600 capitalize min-w-[80px]">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            <span className="text-[9px] text-slate-700">{v as string}</span>
                          </div>
                        ))}
                      </div>
                      {r.avaliacaoNarrativa && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                          <p className="text-[9px] font-black text-emerald-700 mb-1">✅ Avaliação Narrativa</p>
                          {Object.entries(r.avaliacaoNarrativa).map(([k, v]) => (
                            <div key={k} className="mb-0.5">
                              <span className="text-[9px] font-bold text-emerald-600 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}: </span>
                              <span className="text-[9px] text-slate-700">{v as string}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── REMIX CULTURAL Renderer ── */}
            {activeTool === "remix-cultural" && (() => {
              const r = toolResult as any;
              if (!r) return null;
              return (
                <div className="p-3 space-y-3">
                  {/* Header */}
                  <div className="p-3 rounded-xl bg-pink-600 text-white">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Music className="w-4 h-4" />
                      <p className="text-xs font-black">{r.tema} — Remix Cultural</p>
                    </div>
                    {r.fraseDeEngajamento && (
                      <p className="text-[9px] text-pink-200 italic mt-1">"{r.fraseDeEngajamento}"</p>
                    )}
                  </div>

                  {/* Mapeamento de Referências */}
                  {((r.mapeamentoReferencias?.length ?? 0) > 0) && (
                    <div className="p-2.5 rounded-xl bg-pink-50 border border-pink-200">
                      <p className="text-[9px] font-black text-pink-600 uppercase tracking-wider mb-1.5">🎯 Mapeamento de Referências</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[9px]">
                          <thead><tr className="bg-pink-100">
                            <th className="text-left px-1.5 py-1 font-bold text-pink-700">Categoria</th>
                            <th className="text-left px-1.5 py-1 font-bold text-pink-700">Referência</th>
                            <th className="text-left px-1.5 py-1 font-bold text-pink-700">Conexão Pedagógica</th>
                          </tr></thead>
                          <tbody>
                            {r.mapeamentoReferencias.map((ref: any, i: number) => (
                              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-pink-50/40"}>
                                <td className="px-1.5 py-1 font-semibold text-pink-600">{ref.categoria}</td>
                                <td className="px-1.5 py-1 text-slate-800">{ref.referencia}</td>
                                <td className="px-1.5 py-1 text-slate-600">{ref.conexaoPedagogica}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Aula Remixada */}
                  {r.aulaRemixada && (
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-50 to-fuchsia-50 border border-pink-200">
                      <p className="text-[9px] font-black text-pink-600 uppercase tracking-wider mb-1.5">🎪 Aula Remixada</p>
                      <div className="space-y-1.5">
                        <div className="p-2 rounded-lg bg-white border border-pink-100">
                          <p className="text-[9px] font-bold text-pink-500 mb-0.5">Gancho:</p>
                          <p className="text-[9px] text-slate-800 italic">"{r.aulaRemixada.gancho}"</p>
                        </div>
                        {[
                          ["📖 Desenvolvimento", r.aulaRemixada.desenvolvimento],
                          ["🔍 Aprofundamento", r.aulaRemixada.aprofundamento],
                          ["🤔 Crítica", r.aulaRemixada.critica],
                          ["🎨 Produto", r.aulaRemixada.produto],
                        ].map(([k, v]) => v && (
                          <div key={k as string}>
                            <p className="text-[9px] font-bold text-slate-500">{k as string}</p>
                            <p className="text-[9px] text-slate-700">{v as string}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Memes Educacionais */}
                  {((r.memesEducacionais?.length ?? 0) > 0) && (
                    <div className="p-2.5 rounded-xl bg-yellow-50 border border-yellow-200">
                      <p className="text-[9px] font-black text-yellow-700 uppercase tracking-wider mb-1.5">😂 Memes Educacionais</p>
                      <div className="space-y-2">
                        {r.memesEducacionais.map((m: any, i: number) => (
                          <div key={i} className="p-2 rounded-lg bg-white border border-yellow-200">
                            <p className="text-[9px] font-bold text-yellow-600">Formato: {m.formato}</p>
                            {m.imagemDescricao && <p className="text-[9px] text-slate-500 italic">Imagem: {m.imagemDescricao}</p>}
                            <div className="mt-1 rounded-lg bg-black text-white p-1.5 text-center">
                              <p className="text-[9px] font-bold">{m.textoSuperior}</p>
                              <div className="my-1 h-px bg-white/20" />
                              <p className="text-[9px] font-black text-yellow-300">{m.textoInferior}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Playlist */}
                  {r.playlistDaAula && (
                    <div className="p-2.5 rounded-xl bg-pink-50 border border-pink-200">
                      <p className="text-[9px] font-black text-pink-600 uppercase tracking-wider mb-1.5">🎵 Playlist da Aula</p>
                      {((r.playlistDaAula.musicasQueExplicam?.length ?? 0) > 0) && (
                        <div className="space-y-1 mb-2">
                          {r.playlistDaAula.musicasQueExplicam.map((m: any, i: number) => (
                            <div key={i} className="flex gap-1.5">
                              <span className="text-[9px] text-pink-400">{i + 1}.</span>
                              <div>
                                <span className="text-[9px] font-bold text-slate-800">{m.musica}</span>
                                <span className="text-[9px] text-slate-500"> — {m.comoConecta}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {r.playlistDaAula.trilhaSonoraPara && (
                        <p className="text-[9px] text-pink-700">📚 Para estudar: <span className="italic">{r.playlistDaAula.trilhaSonoraPara}</span></p>
                      )}
                    </div>
                  )}

                  {/* Conexões Surpreendentes */}
                  {((r.conexoesSurpreendentes?.length ?? 0) > 0) && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">✨ Conexões Surpreendentes</p>
                      {r.conexoesSurpreendentes.map((c: string, i: number) => (
                        <p key={i} className="text-[9px] text-slate-700 mb-0.5">• {c}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── PLANO DE AULA — 5 VERSÕES Renderer ── */}
            {activeTool === "plano-aula-versoes" && (() => {
              const r = toolResult as any;
              if (!r) return null;
              const tabs: Array<[typeof verTab, string]> = [
                ["turmaDificil", "😤 Difícil"],
                ["turmaAvancada", "🚀 Avançada"],
                ["turmaInclusiva", "♿ Inclusiva"],
                ["aulaRemota", "💻 Remota"],
                ["aulaHibrida", "🔄 Híbrida"],
              ];
              return (
                <div className="p-3 space-y-3">
                  {/* Header */}
                  <div className="p-3 rounded-xl bg-violet-700 text-white">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Shuffle className="w-4 h-4" />
                      <p className="text-xs font-black">5 Versões: {r.tema}</p>
                    </div>
                    <p className="text-[9px] text-violet-200">{r.nivel} · {r.duracao}</p>
                    {r.objetivoCentral && <p className="text-[9px] text-violet-200 mt-1 italic">{r.objetivoCentral}</p>}
                  </div>

                  {/* Versão tabs */}
                  <div className="flex gap-1 overflow-x-auto pb-0.5">
                    {tabs.map(([t, l]) => (
                      <button key={t} onClick={() => setVerTab(t)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black whitespace-nowrap flex-shrink-0 transition-colors ${
                          verTab === t ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}>{l}</button>
                    ))}
                  </div>

                  {/* Turma Difícil */}
                  {verTab === "turmaDificil" && r.versoes?.turmaDificil && (() => {
                    const v = r.versoes.turmaDificil;
                    return (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200">
                          <p className="text-[9px] font-black text-red-600 mb-1">😤 Turma Difícil — Baixo Engajamento</p>
                          <p className="text-[9px] text-slate-700 mb-2">{v.diagnostico}</p>
                          {((v.estrategiasEngajamento?.length ?? 0) > 0) && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-[9px]">
                                <thead><tr className="bg-red-100">
                                  <th className="text-left px-1.5 py-1 font-bold text-red-700">Estratégia</th>
                                  <th className="text-left px-1.5 py-1 font-bold text-red-700">Como aplicar</th>
                                </tr></thead>
                                <tbody>{v.estrategiasEngajamento.map((e: any, i: number) => (
                                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-red-50/40"}>
                                    <td className="px-1.5 py-1 font-semibold text-red-600">{e.estrategia}</td>
                                    <td className="px-1.5 py-1 text-slate-700">{e.aplicacao}</td>
                                  </tr>
                                ))}</tbody>
                              </table>
                            </div>
                          )}
                          {((v.adaptacoes?.length ?? 0) > 0) && (
                            <div className="mt-1.5">
                              <p className="text-[9px] font-bold text-red-500 mb-0.5">Adaptações:</p>
                              {v.adaptacoes.map((a: string, i: number) => <p key={i} className="text-[9px] text-slate-700">• {a}</p>)}
                            </div>
                          )}
                          {v.abertura && <div className="mt-1.5 p-2 rounded-lg bg-white border border-red-100">
                            <p className="text-[9px] font-bold text-red-500">Abertura:</p>
                            <p className="text-[9px] text-slate-700 italic">"{v.abertura}"</p>
                          </div>}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Turma Avançada */}
                  {verTab === "turmaAvancada" && r.versoes?.turmaAvancada && (() => {
                    const v = r.versoes.turmaAvancada;
                    return (
                      <div className="p-2.5 rounded-xl bg-violet-50 border border-violet-200 space-y-2">
                        <p className="text-[9px] font-black text-violet-600 mb-1">🚀 Turma Avançada — Enriquecimento</p>
                        <p className="text-[9px] text-slate-700">{v.diagnostico}</p>
                        {((v.estrategiasEnriquecimento?.length ?? 0) > 0) && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-[9px]">
                              <thead><tr className="bg-violet-100">
                                <th className="text-left px-1.5 py-1 font-bold text-violet-700">Estratégia</th>
                                <th className="text-left px-1.5 py-1 font-bold text-violet-700">Aplicação</th>
                              </tr></thead>
                              <tbody>{v.estrategiasEnriquecimento.map((e: any, i: number) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-violet-50/40"}>
                                  <td className="px-1.5 py-1 font-semibold text-violet-600">{e.estrategia}</td>
                                  <td className="px-1.5 py-1 text-slate-700">{e.aplicacao}</td>
                                </tr>
                              ))}</tbody>
                            </table>
                          </div>
                        )}
                        {((v.adaptacoes?.length ?? 0) > 0) && (
                          <div>
                            <p className="text-[9px] font-bold text-violet-500 mb-0.5">Adaptações:</p>
                            {v.adaptacoes.map((a: string, i: number) => <p key={i} className="text-[9px] text-slate-700">• {a}</p>)}
                          </div>
                        )}
                        {v.produtoFinal && <p className="text-[9px] text-violet-700 mt-1">🏆 Produto Final: {v.produtoFinal}</p>}
                      </div>
                    );
                  })()}

                  {/* Turma Inclusiva */}
                  {verTab === "turmaInclusiva" && r.versoes?.turmaInclusiva && (() => {
                    const v = r.versoes.turmaInclusiva;
                    return (
                      <div className="p-2.5 rounded-xl bg-green-50 border border-green-200 space-y-2">
                        <p className="text-[9px] font-black text-green-600 mb-1">♿ Turma Inclusiva — Acessibilidade Total</p>
                        {v.perfilEspecifico && <p className="text-[9px] text-slate-700">{v.perfilEspecifico}</p>}
                        {((v.adaptacoesPorNecessidade?.length ?? 0) > 0) && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-[9px]">
                              <thead><tr className="bg-green-100">
                                <th className="text-left px-1.5 py-1 font-bold text-green-700">Necessidade</th>
                                <th className="text-left px-1.5 py-1 font-bold text-green-700">Adaptação</th>
                              </tr></thead>
                              <tbody>{v.adaptacoesPorNecessidade.map((a: any, i: number) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-green-50/40"}>
                                  <td className="px-1.5 py-1 font-semibold text-green-600">{a.necessidade}</td>
                                  <td className="px-1.5 py-1 text-slate-700">{a.adaptacao}</td>
                                </tr>
                              ))}</tbody>
                            </table>
                          </div>
                        )}
                        {((v.recursosAcessiveis?.length ?? 0) > 0) && (
                          <div>
                            <p className="text-[9px] font-bold text-green-500 mb-0.5">Recursos Acessíveis:</p>
                            {v.recursosAcessiveis.map((r: string, i: number) => <p key={i} className="text-[9px] text-slate-700">• {r}</p>)}
                          </div>
                        )}
                        {v.avaliacaoAdaptada && <p className="text-[9px] text-green-700 mt-1">📝 Avaliação adaptada: {v.avaliacaoAdaptada}</p>}
                      </div>
                    );
                  })()}

                  {/* Aula Remota */}
                  {verTab === "aulaRemota" && r.versoes?.aulaRemota && (() => {
                    const v = r.versoes.aulaRemota;
                    return (
                      <div className="p-2.5 rounded-xl bg-violet-50 border border-violet-200 space-y-2">
                        <p className="text-[9px] font-black text-violet-600 mb-1">💻 Aula Remota — 100% Digital</p>
                        {v.modalidade && <span className="px-2 py-0.5 bg-violet-100 text-violet-600 rounded text-[8px] font-bold">{v.modalidade}</span>}
                        {((v.adaptacoesEngajamento?.length ?? 0) > 0) && (
                          <div className="overflow-x-auto mt-1.5">
                            <table className="w-full text-[9px]">
                              <thead><tr className="bg-violet-100">
                                <th className="text-left px-1.5 py-1 font-bold text-violet-700">Desafio</th>
                                <th className="text-left px-1.5 py-1 font-bold text-violet-700">Solução</th>
                              </tr></thead>
                              <tbody>{v.adaptacoesEngajamento.map((a: any, i: number) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-violet-50/40"}>
                                  <td className="px-1.5 py-1 font-semibold text-violet-600">{a.desafio}</td>
                                  <td className="px-1.5 py-1 text-slate-700">{a.solucao}</td>
                                </tr>
                              ))}</tbody>
                            </table>
                          </div>
                        )}
                        {((v.interacoesObrigatorias?.length ?? 0) > 0) && (
                          <div>
                            <p className="text-[9px] font-bold text-violet-500 mb-0.5">Interações obrigatórias:</p>
                            {v.interacoesObrigatorias.map((r: string, i: number) => <p key={i} className="text-[9px] text-slate-700">• {r}</p>)}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Aula Híbrida */}
                  {verTab === "aulaHibrida" && r.versoes?.aulaHibrida && (() => {
                    const v = r.versoes.aulaHibrida;
                    return (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                        <p className="text-[9px] font-black text-amber-700 mb-1">🔄 Aula Híbrida — Rotacional</p>
                        {((v.organizacao?.length ?? 0) > 0) && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-[9px]">
                              <thead><tr className="bg-amber-100">
                                <th className="text-left px-1.5 py-1 font-bold text-amber-700">Estação</th>
                                <th className="text-left px-1.5 py-1 font-bold text-amber-700">Atividade</th>
                                <th className="text-left px-1.5 py-1 font-bold text-amber-700">Tempo</th>
                              </tr></thead>
                              <tbody>{v.organizacao.map((e: any, i: number) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-amber-50/40"}>
                                  <td className="px-1.5 py-1 font-semibold text-amber-600">{e.estacao}</td>
                                  <td className="px-1.5 py-1 text-slate-700">{e.atividade}</td>
                                  <td className="px-1.5 py-1 text-slate-500">{e.tempo}</td>
                                </tr>
                              ))}</tbody>
                            </table>
                          </div>
                        )}
                        {v.atividadeOnline && <p className="text-[9px] text-amber-700 mt-1">💻 Online: {v.atividadeOnline}</p>}
                        {v.sincronizacao && <p className="text-[9px] text-amber-700">🔄 Sync: {v.sincronizacao}</p>}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* ─── Aula Viva Formato renderer (/tools/aula_viva/*.py) ────── */}
            {activeTool === "aula-viva-formato" && toolResult && (() => {
              const r = toolResult as any;
              const fmt = r.formato ?? aulaVivaFormato;
              const fmtLabel: Record<string, string> = { jornal: "📰 Jornal da Aula", chef: "👨‍🍳 Aula Chef", investigacao: "🔍 Aula Investigação", "talk-show": "🎤 Aula Talk Show" };
              return (
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black text-orange-600">{fmtLabel[fmt] ?? fmt}</span>
                    {r.persona && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{r.persona}</span>}
                  </div>
                  {r.titulo && <div className="bg-orange-50 border border-orange-200 rounded-xl p-3"><p className="text-[11px] font-black text-orange-700">{r.titulo}</p>{r.tema && <p className="text-[10px] text-orange-500 mt-0.5">Tema: {r.tema}</p>}</div>}

                  {/* Jornal da Aula */}
                  {fmt === "jornal" && (<>
                    {((r.manchetes?.length ?? 0) > 0) && <div className="bg-slate-50 border border-slate-200 rounded-xl p-3"><p className="text-[9px] font-black text-slate-500 uppercase mb-2">📰 Manchetes</p>{r.manchetes.map((m: string, i: number) => <p key={i} className="text-[10px] text-slate-700 font-semibold border-b border-slate-100 py-1">• {m}</p>)}</div>}
                    {r.abertura && <div className="bg-white border border-slate-200 rounded-xl p-3"><p className="text-[9px] font-black text-slate-500 uppercase mb-1.5">🎤 Abertura</p><p className="text-[10px] text-slate-700"><strong>Âncora:</strong> {r.abertura.ancora}</p>{r.abertura.chamadas?.map((c: string, i: number) => <p key={i} className="text-[10px] text-slate-600 mt-0.5">• {c}</p>)}</div>}
                    {r.segmentos?.map((s: any, i: number) => <div key={i} className="bg-white border border-slate-200 rounded-xl p-3"><p className="text-[9px] font-black text-slate-500 uppercase mb-1">{s.nome} <span className="text-slate-400">({s.duracao})</span></p><p className="text-[10px] text-slate-700">{s.script}</p>{s.participantes && <p className="text-[10px] text-slate-400 mt-0.5">👥 {s.participantes}</p>}</div>)}
                    {((r.plantaoCuriosidades?.length ?? 0) > 0) && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3"><p className="text-[9px] font-black text-amber-600 uppercase mb-1.5">⚡ Plantão de Curiosidades</p>{r.plantaoCuriosidades.map((c: string, i: number) => <p key={i} className="text-[10px] text-amber-700 mt-0.5">• {c}</p>)}</div>}
                    {r.debate && <div className="bg-violet-50 border border-violet-200 rounded-xl p-3"><p className="text-[9px] font-black text-violet-600 uppercase mb-1">🗣️ Debate — {r.debate.tema}</p>{r.debate.posicoes?.map((p: string, i: number) => <p key={i} className="text-[10px] text-violet-700">• {p}</p>)}{r.debate.mediacao && <p className="text-[10px] text-violet-500 mt-1">Mediação: {r.debate.mediacao}</p>}</div>}
                    {r.encerramentoAncora && <div className="bg-slate-800 text-white rounded-xl p-3"><p className="text-[9px] font-black uppercase mb-1">📡 Encerramento</p><p className="text-[10px]">{r.encerramentoAncora}</p></div>}
                    {r.missaoPosEdicao && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><p className="text-[9px] font-black text-emerald-600 uppercase mb-1">🏠 Missão Pós-Edição</p><p className="text-[10px] text-emerald-700">{r.missaoPosEdicao}</p></div>}
                  </>)}

                  {/* Aula Chef */}
                  {fmt === "chef" && (<>
                    {r.mise_en_place && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3"><p className="text-[9px] font-black text-amber-600 uppercase mb-1.5">🍽️ Mise en Place</p><p className="text-[10px] text-amber-700 mb-1">⏱ {r.mise_en_place.tempoDePreparo}</p>{r.mise_en_place.ingredientes?.map((i: string, idx: number) => <p key={idx} className="text-[10px] text-amber-700">• {i}</p>)}{((r.mise_en_place.utensilios?.length ?? 0) > 0) && <p className="text-[10px] text-amber-500 mt-1">🔧 {r.mise_en_place.utensilios?.join(", ")}</p>}</div>}
                    {r.receita && <div className="bg-orange-50 border border-orange-200 rounded-xl p-3"><p className="text-[9px] font-black text-orange-600 uppercase mb-1">📋 Receita</p><p className="text-[11px] font-bold text-orange-700">{r.receita.nome}</p><p className="text-[10px] text-orange-500">🍽️ {r.receita.porcoes} | Dificuldade: {r.receita.dificuldade}</p></div>}
                    {r.etapas?.map((e: any, i: number) => <div key={i} className="bg-white border border-slate-200 rounded-xl p-3"><p className="text-[9px] font-black text-slate-500 uppercase mb-1">{e.nome} <span className="text-slate-400">{e.tempoDeAula}</span></p><p className="text-[10px] text-slate-700">🥄 {e.tecnica}</p><p className="text-[10px] text-amber-700 mt-0.5">🧂 Ingrediente: {e.ingredienteConceito}</p>{e.errosComuns && <p className="text-[10px] text-red-500 mt-0.5">⚠️ {e.errosComuns}</p>}{e.sinaisDePontoIdeal && <p className="text-[10px] text-emerald-600 mt-0.5">✅ Ponto ideal: {e.sinaisDePontoIdeal}</p>}</div>)}
                    {r.degustacao && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><p className="text-[9px] font-black text-emerald-600 uppercase mb-1">👅 Degustação (Avaliação)</p><p className="text-[10px] text-emerald-700">{r.degustacao.instrumento}</p></div>}
                    {r.receitaCasa && <div className="bg-violet-50 border border-violet-200 rounded-xl p-3"><p className="text-[9px] font-black text-violet-600 uppercase mb-1">🏠 Receita para Casa</p><p className="text-[10px] text-violet-700">{r.receitaCasa}</p></div>}
                    {r.cardapioProximaAula && <div className="bg-slate-50 border border-slate-200 rounded-xl p-3"><p className="text-[9px] font-black text-slate-500 uppercase mb-1">📅 Próximo Cardápio</p><p className="text-[10px] text-slate-600">{r.cardapioProximaAula}</p></div>}
                  </>)}

                  {/* Aula Investigação */}
                  {fmt === "investigacao" && (<>
                    {r.boletimOcorrencia && <div className="bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-[9px] font-black text-red-600 uppercase mb-1">🚔 Boletim de Ocorrência</p><p className="text-[10px] text-red-700 font-semibold">Crime: {r.boletimOcorrencia.crime}</p><p className="text-[10px] text-red-600 mt-0.5">Investigadores: {r.boletimOcorrencia.investigadores}</p>{r.boletimOcorrencia.evidencias?.map((e: string, i: number) => <p key={i} className="text-[10px] text-red-500">🔍 {e}</p>)}</div>}
                    {r.perfilSuspeito && <div className="bg-slate-900 text-white rounded-xl p-3"><p className="text-[9px] font-black uppercase mb-1">🕵️ Perfil do Suspeito</p><p className="text-[11px] font-bold">{r.perfilSuspeito.nome}</p>{r.perfilSuspeito.caracteristicas?.map((c: string, i: number) => <p key={i} className="text-[10px] text-slate-300">• {c}</p>)}{r.perfilSuspeito.pontoFraco && <p className="text-[10px] text-emerald-400 mt-1">🎯 Ponto fraco: {r.perfilSuspeito.pontoFraco}</p>}</div>}
                    {r.investigacao && <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3"><p className="text-[9px] font-black text-yellow-600 uppercase mb-1">🔎 Trabalho de Campo</p><p className="text-[10px] text-yellow-700">{r.investigacao.missao}</p>{r.investigacao.materiais?.map((m: string, i: number) => <p key={i} className="text-[10px] text-yellow-600">📦 {m}</p>)}</div>}
                    {r.julgamento && <div className="bg-violet-50 border border-violet-200 rounded-xl p-3"><p className="text-[9px] font-black text-violet-600 uppercase mb-1">⚖️ Julgamento</p><p className="text-[10px] text-violet-700">Acusação: {r.julgamento.acusacao}</p><p className="text-[10px] text-violet-600 mt-0.5">Defesa: {r.julgamento.defesa}</p></div>}
                    {r.vereditoFinal && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><p className="text-[9px] font-black text-emerald-600 uppercase mb-1">🔨 Veredito Final</p><p className="text-[10px] text-emerald-700">{r.vereditoFinal}</p></div>}
                    {r.proxoCaso && <div className="bg-slate-50 border border-slate-200 rounded-xl p-3"><p className="text-[9px] font-black text-slate-500 uppercase mb-1">📁 Próximo Caso</p><p className="text-[10px] text-slate-600">{r.proxoCaso}</p></div>}
                  </>)}

                  {/* Aula Talk Show */}
                  {fmt === "talk-show" && (<>
                    {r.coldOpen && <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3"><p className="text-[9px] font-black text-yellow-600 uppercase mb-1">🎬 Cold Open</p><p className="text-[10px] text-yellow-700">{r.coldOpen.cena}</p>{r.coldOpen.punchline && <p className="text-[10px] text-yellow-600 font-semibold mt-1">💬 "{r.coldOpen.punchline}"</p>}</div>}
                    {r.monologo && <div className="bg-slate-50 border border-slate-200 rounded-xl p-3"><p className="text-[9px] font-black text-slate-500 uppercase mb-1">🎤 Monólogo do Host</p><p className="text-[10px] text-slate-700">{r.monologo.roteiro}</p>{r.monologo.piadas?.map((p: string, i: number) => <p key={i} className="text-[10px] text-slate-500 italic mt-0.5">😂 {p}</p>)}</div>}
                    {((r.top3?.length ?? 0) > 0) && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3"><p className="text-[9px] font-black text-rose-600 uppercase mb-1.5">🏆 Top 3 — Fatos do Tema</p>{r.top3.map((f: any, i: number) => <div key={i} className="mb-1.5"><p className="text-[10px] font-bold text-rose-700">{i+1}. {f.fato}</p><p className="text-[10px] text-rose-500">{f.porqueImporta}</p></div>)}</div>}
                    {r.entrevista && <div className="bg-violet-50 border border-violet-200 rounded-xl p-3"><p className="text-[9px] font-black text-violet-600 uppercase mb-1">🎙️ Entrevista — {r.entrevista.entrevistado}</p>{r.entrevista.perguntas?.map((p: string, i: number) => <p key={i} className="text-[10px] text-violet-700 mt-0.5">Q{i+1}: {p}</p>)}{r.entrevista.reveal_final && <p className="text-[10px] text-violet-800 font-semibold mt-1.5">✨ Reveal: {r.entrevista.reveal_final}</p>}</div>}
                    {((r.mitosVerdades?.length ?? 0) > 0) && <div className="bg-orange-50 border border-orange-200 rounded-xl p-3"><p className="text-[9px] font-black text-orange-600 uppercase mb-1.5">🔮 Mitos e Verdades</p>{r.mitosVerdades.map((m: any, i: number) => <div key={i} className="mb-1.5"><p className="text-[10px] font-bold text-orange-700">{m.veredicto === "Mito" ? "❌" : "✅"} {m.afirmacao}</p><p className="text-[10px] text-orange-500">{m.explicacao}</p></div>)}</div>}
                    {r.encerramento && <div className="bg-slate-800 text-white rounded-xl p-3"><p className="text-[9px] font-black uppercase mb-1">🌟 Encerramento</p><p className="text-[10px]">{r.encerramento.teaser}</p>{r.encerramento.tarefa && <p className="text-[10px] text-slate-300 mt-1">📝 {r.encerramento.tarefa}</p>}</div>}
                  </>)}
                </div>
              );
            })()}

            {/* ─── Avaliação por Voz renderer (/endpoints/avaliacao_voz.py) ─ */}
            {activeTool === "avaliacao-voz" && toolResult && (() => {
              const r = toolResult as any;
              return (
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Mic className="w-4 h-4 text-rose-500" />
                    <span className="text-sm font-black text-rose-600">Avaliação por Voz</span>
                    {r.persona && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.persona}</span>}
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-xl">
                    {([["podcast","🎙️ Podcast"],["entrevista","🎤 Entrevista"],["debate","⚖️ Debate"]] as const).map(([t, label]) => (
                      <button key={t} onClick={() => setVozTab(t)}
                        className={`flex-1 text-[10px] font-bold py-1 rounded-lg transition-all ${vozTab === t ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {vozTab === "podcast" && r.podcast && (<>
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                      <p className="text-[11px] font-black text-rose-700">{r.podcast.titulo}</p>
                      <p className="text-[10px] text-rose-500">{r.podcast.formato} · {r.podcast.duracao}</p>
                    </div>
                    {r.podcast.roteiro?.map((m: any, i: number) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl p-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{m.momento}</p>
                        <p className="text-[10px] text-slate-700">{m.script}</p>
                        {m.dica && <p className="text-[10px] text-rose-500 mt-0.5 italic">💡 {m.dica}</p>}
                      </div>
                    ))}
                    {((r.podcast.criteriosAvaliacao?.length ?? 0) > 0) && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1.5">📊 Critérios de Avaliação</p>
                        {r.podcast.criteriosAvaliacao.map((c: any, i: number) => (
                          <div key={i} className="mb-1.5">
                            <p className="text-[10px] font-bold text-slate-700">{c.criterio} <span className="text-rose-500">{c.peso}</span></p>
                            {c.indicadores?.map((ind: string, j: number) => <p key={j} className="text-[10px] text-slate-500">• {ind}</p>)}
                          </div>
                        ))}
                      </div>
                    )}
                  </>)}

                  {vozTab === "entrevista" && r.entrevistaSimulada && (<>
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                      <p className="text-[9px] font-black text-violet-500 uppercase mb-1">{r.entrevistaSimulada.formato}</p>
                      <p className="text-[10px] text-violet-700">{r.entrevistaSimulada.abertura}</p>
                    </div>
                    {r.entrevistaSimulada.perguntas?.map((p: any, i: number) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] bg-violet-100 text-violet-600 font-black px-1.5 py-0.5 rounded">P{p.numero}</span>
                          <span className="text-[9px] text-slate-400 uppercase">{p.tipo}</span>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-700">{p.pergunta}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">✅ {p.resposta_esperada}</p>
                        {p.followup && <p className="text-[10px] text-violet-500 mt-0.5">↩️ {p.followup}</p>}
                      </div>
                    ))}
                  </>)}

                  {vozTab === "debate" && r.debateEstruturado && (<>
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                      <p className="text-[9px] font-black text-violet-500 uppercase mb-1">⚖️ Tese</p>
                      <p className="text-[11px] font-bold text-violet-700">"{r.debateEstruturado.tese}"</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {r.debateEstruturado.grupos?.map((g: any, i: number) => (
                        <div key={i} className={`rounded-xl p-2.5 border ${i === 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                          <p className="text-[9px] font-black uppercase mb-1" style={{color: i===0?"#059669":"#DC2626"}}>{g.nome}</p>
                          {g.argumentos?.map((a: string, j: number) => <p key={j} className="text-[10px] text-slate-700 mt-0.5">• {a}</p>)}
                        </div>
                      ))}
                    </div>
                    {r.debateEstruturado.estrutura_debate?.map((rod: any, i: number) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl p-2.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase">{rod.rodada} · {rod.tempo}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">{rod.instrucao}</p>
                      </div>
                    ))}
                    {r.debateEstruturado.reflexao_final && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3"><p className="text-[9px] font-black text-amber-600 uppercase mb-1">🤔 Reflexão Final</p><p className="text-[10px] text-amber-700">{r.debateEstruturado.reflexao_final}</p></div>}
                  </>)}
                </div>
              );
            })()}

            {/* ─── Making Of renderer (/endpoints/making_of.py) ────────────── */}
            {activeTool === "making-of" && toolResult && (() => {
              const r = toolResult as any;
              return (
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Film className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-black text-slate-700">Making Of Pedagógico</span>
                    {r.persona && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.persona}</span>}
                  </div>

                  {r.historiaDoConteudo && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
                      <p className="text-[9px] font-black text-amber-600 uppercase">📜 História do Conteúdo</p>
                      <p className="text-[10px] text-amber-700"><strong>Origem:</strong> {r.historiaDoConteudo.origemDoTema}</p>
                      {r.historiaDoConteudo.evolucoesChave?.map((e: string, i: number) => <p key={i} className="text-[10px] text-amber-600">• {e}</p>)}
                      {r.historiaDoConteudo.controversiasExistentes && <p className="text-[10px] text-orange-600 italic">⚡ {r.historiaDoConteudo.controversiasExistentes}</p>}
                      {r.historiaDoConteudo.conexoesSurpreendentes?.map((c: string, i: number) => <p key={i} className="text-[10px] text-amber-500">🔗 {c}</p>)}
                    </div>
                  )}

                  {r.decisoesPedagogicas?.map((d: any, i: number) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-3">
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1">🎯 Decisão {i+1}</p>
                      <p className="text-[10px] font-bold text-slate-700">{d.decisao}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">📚 {d.racionalidade}</p>
                      <p className="text-[10px] text-red-400 mt-0.5">❌ Rejeitado: {d.alternativaRejeitada}</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">✅ {d.porque}</p>
                    </div>
                  ))}

                  {r.errosQueJaCometei?.map((e: any, i: number) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-[9px] font-black text-red-500 uppercase mb-1">💥 Erro que já cometi</p>
                      <p className="text-[10px] text-red-700 font-semibold">{e.erro}</p>
                      <p className="text-[10px] text-red-500 mt-0.5">Consequência: {e.consequencia}</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">Aprendizado: {e.aprendizado}</p>
                    </div>
                  ))}

                  {r.segredosDoProfissional?.map((s: any, i: number) => (
                    <div key={i} className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                      <p className="text-[9px] font-black text-violet-500 uppercase mb-1">🔐 Segredo {i+1}</p>
                      <p className="text-[10px] font-bold text-violet-700">{s.segredo}</p>
                      <p className="text-[10px] text-violet-500 mt-0.5">✅ Quando usar: {s.contexto}</p>
                      <p className="text-[10px] text-red-400 mt-0.5">⚠️ {s.aviso}</p>
                    </div>
                  ))}

                  {r.reflexaoHonesta && (
                    <div className="bg-slate-800 text-white rounded-xl p-3 space-y-1">
                      <p className="text-[9px] font-black uppercase text-slate-400">💬 Reflexão Honesta</p>
                      <p className="text-[10px]">❤️ {r.reflexaoHonesta.oQueMaisGosto}</p>
                      <p className="text-[10px] text-slate-300">😓 {r.reflexaoHonesta.oQueMaisTeio}</p>
                      <p className="text-[10px] text-violet-300 italic mt-1">"{r.reflexaoHonesta.mensagemAosAlunos}"</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ─── Simulador de Aula renderer (/endpoints/simulador_aula.py) ─ */}
            {activeTool === "simulador-aula" && toolResult && (() => {
              const r = toolResult as any;
              const PERFIL_COLORS: Record<string, string> = {
                "A Entusiasta": "bg-yellow-50 border-yellow-200",
                "O Resistente": "bg-red-50 border-red-200",
                "A Silenciosa Brilhante": "bg-violet-50 border-violet-200",
                "O Com Dificuldade Real": "bg-orange-50 border-orange-200",
                "A Avançada Que Se Entedia": "bg-violet-50 border-violet-200",
              };
              const PERFIL_EMOJI: Record<string, string> = {
                "A Entusiasta": "🌟", "O Resistente": "😤", "A Silenciosa Brilhante": "🔵",
                "O Com Dificuldade Real": "🧱", "A Avançada Que Se Entedia": "🚀",
              };
              return (
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-black text-emerald-700">Simulador de Aula</span>
                    {r.persona && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.persona}</span>}
                  </div>

                  {/* Turma Virtual */}
                  {((r.turmaVirtual?.length ?? 0) > 0) && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">👥 Turma Virtual</p>
                      <div className="space-y-2">
                        {r.turmaVirtual.map((aluno: any, i: number) => (
                          <div key={i} className={`rounded-xl p-2.5 border ${PERFIL_COLORS[aluno.perfil] ?? "bg-slate-50 border-slate-200"}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-sm">{PERFIL_EMOJI[aluno.perfil] ?? "👤"}</span>
                              <p className="text-[10px] font-black text-slate-700">{aluno.nome}</p>
                              <span className="text-[9px] text-slate-400">{aluno.perfil}</span>
                            </div>
                            <p className="text-[10px] text-slate-600">{aluno.descricao}</p>
                            <p className="text-[10px] text-emerald-600 mt-0.5">✅ {aluno.comoEngajar}</p>
                            <p className="text-[10px] text-red-500 mt-0.5">🚨 {aluno.sinalDePerda}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Simulação momento a momento */}
                  {((r.simulacaoMomento?.length ?? 0) > 0) && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">🎬 Simulação da Aula</p>
                      {r.simulacaoMomento.map((m: any, i: number) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 mb-2">
                          <p className="text-[9px] font-black text-slate-500 uppercase mb-1.5">{m.momento}</p>
                          <p className="text-[10px] font-semibold text-slate-700 mb-1.5">📢 {m.script_professor}</p>
                          <div className="grid grid-cols-2 gap-1 mb-1.5 text-[9px]">
                            {[["Ana","🌟",m.reacao_ana],["Carlos","😤",m.reacao_carlos],["Beatriz","🔵",m.reacao_beatriz],["Diego","🧱",m.reacao_diego],["Fernanda","🚀",m.reacao_fernanda]].map(([nome, emoji, reacao]) => (
                              <div key={nome as string} className="bg-slate-50 rounded-lg p-1.5">
                                <p className="font-black text-slate-500">{emoji} {nome}</p>
                                <p className="text-slate-600 mt-0.5">{reacao as string}</p>
                              </div>
                            ))}
                          </div>
                          {m.intervencao_necessaria && <p className="text-[10px] text-violet-600 border-t border-slate-100 pt-1.5 mt-1.5">🎯 Intervenção: {m.intervencao_necessaria}</p>}
                          {m.aprendizado_do_ensaio && <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">💡 {m.aprendizado_do_ensaio}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Leitura de Riscos */}
                  {((r.leituraDeRiscos?.length ?? 0) > 0) && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-[9px] font-black text-red-600 uppercase mb-1.5">⚠️ Leitura de Riscos</p>
                      {r.leituraDeRiscos.map((risco: any, i: number) => (
                        <div key={i} className="mb-2">
                          <p className="text-[10px] font-bold text-red-700">{risco.risco} <span className="text-red-400">[{risco.probabilidade}]</span></p>
                          <p className="text-[10px] text-red-600">Prevenção: {risco.prevencao}</p>
                          <p className="text-[10px] text-orange-600">Plano B: {risco.plano_b}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Conclusão */}
                  {r.conclusaoDoEnsaio && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-[9px] font-black text-emerald-600 uppercase mb-1.5">✅ Conclusão do Ensaio</p>
                      {r.conclusaoDoEnsaio.o_que_ajustar?.map((a: string, i: number) => <p key={i} className="text-[10px] text-red-600">🔧 {a}</p>)}
                      {r.conclusaoDoEnsaio.o_que_manter?.map((m: string, i: number) => <p key={i} className="text-[10px] text-emerald-700">✅ {m}</p>)}
                      {r.conclusaoDoEnsaio.mantra_da_aula && <p className="text-[11px] font-black text-emerald-800 mt-2 border-t border-emerald-200 pt-2">🙏 "{r.conclusaoDoEnsaio.mantra_da_aula}"</p>}
                    </div>
                  )}
                </div>
              );
            })()}

            {activeTool === "relatorio" && (() => {
              const r = toolResult as { titulo?: string; template?: string; markdown?: string; secoes?: Array<{ titulo: string; conteudo: string }> };
              return (
                <div className="p-3 space-y-3">
                  {/* Template selector */}
                  <div className="flex gap-1 flex-wrap">
                    {(["academico", "blog", "executivo", "aula"] as const).map(t => (
                      <button key={t} onClick={() => setRelatorioTemplate(t)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                          relatorioTemplate === t ? "bg-violet-600 border-violet-600 text-white" : "border-slate-200 text-slate-600 hover:border-violet-300"
                        }`}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                    <button onClick={() => runTool("relatorio", selectedDocIds[0])} disabled={toolLoading}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1 disabled:opacity-40">
                      <RefreshCw className="w-3 h-3" /> Regerar
                    </button>
                  </div>
                  {r.titulo && <h3 className="text-sm font-black text-slate-800">{r.titulo}</h3>}
                  {r.markdown ? (
                    <div className="prose prose-sm max-w-none text-slate-700">
                      <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{r.markdown}</pre>
                    </div>
                  ) : r.secoes ? (
                    <div className="space-y-3">
                      {r.secoes.map((s, i) => (
                        <div key={i}>
                          <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-1">{s.titulo}</p>
                          <p className="text-xs text-slate-700 leading-relaxed">{s.conteudo}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {(r.markdown ?? "") && (
                    <button onClick={() => navigator.clipboard.writeText(r.markdown!)}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-violet-600 hover:underline">
                      <ClipboardList className="w-3 h-3" /> Copiar relatório
                    </button>
                  )}
                </div>
              );
            })()}
            </div>
          </div>
        )}

        {!toolLoading && !toolResult && !toolError && !activeTool && selectedDocIds.length > 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <Users className="w-8 h-8 text-slate-200 mb-2" />
            <p className="text-xs text-slate-400 font-medium">Escolha uma ferramenta para gerar conteúdo</p>
            <p className="text-[10px] text-slate-300 mt-1">O Podcast é uma exclusividade do StudyAI!</p>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Open a caderno from the home view ───────────────────────────────────────
  function openCaderno(c: Caderno) {
    setActiveCaderno(c);
    setNotebookView("workspace");
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  const filteredCadernos = cadernos.filter(c =>
    c.title.toLowerCase().includes(homeSearch.toLowerCase())
  );
  const recentCadernos = [...cadernos]
    .sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime())
    .slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col md:pl-64 pt-14 md:pt-0" style={{ background: "#f3e8ff", backgroundImage: "radial-gradient(at 0% 0%, hsla(262,83%,58%,0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(290,85%,60%,0.15) 0px, transparent 50%)", backgroundAttachment: "fixed" }}>
      <AppNav />

      {/* ═══ HOME VIEW ═══ */}
      {notebookView === "home" && (
        <motion.div
          key="notebook-home"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-6xl mx-auto px-4 pt-8 pb-16">

            {/* Header */}
            <div className="flex items-start justify-between mb-8 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => navigate("/app")} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-white/60 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="font-display font-bold text-slate-900 text-xl leading-tight tracking-tight">Meus Cadernos</h1>
                    <p className="text-sm text-slate-500 font-medium">Estudo com IA contextual baseado nas suas fontes</p>
                  </div>
                </div>
              </div>
              <button
                onClick={openNewCaderno}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                Novo Caderno
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={homeSearch}
                onChange={e => setHomeSearch(e.target.value)}
                placeholder="Buscar cadernos..."
                className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-sm text-slate-800 placeholder-slate-400 font-medium"
              />
              {homeSearch && (
                <button onClick={() => setHomeSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Recent highlights — only when no search and > 1 caderno */}
            {!homeSearch && recentCadernos.length > 1 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Recentes</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recentCadernos.map(c => {
                    const s = getCadernoStyle(c.color);
                    return (
                      <motion.button
                        key={c.id}
                        whileHover={{ scale: 1.01, y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => openCaderno(c)}
                        className="text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                      >
                        <div className={`h-1.5 w-full bg-gradient-to-r ${s.gradient}`} />
                        <div className="p-4">
                          <div className="flex items-center gap-2.5 mb-2">
                            <span className="text-2xl">{c.emoji ?? "📘"}</span>
                            <div className="min-w-0">
                              <p className="font-display font-bold text-slate-900 text-sm truncate">{c.title}</p>
                              {c.docs_count != null && (
                                <p className={`text-[10px] font-bold ${s.text}`}>{c.docs_count} fonte{c.docs_count !== 1 ? "s" : ""}</p>
                              )}
                            </div>
                          </div>
                          {c.persona && <p className="text-[11px] text-slate-400 line-clamp-1 leading-snug">{c.persona}</p>}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All notebooks grid */}
            {!homeSearch && <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Todos os cadernos</p>
            </div>}

            {filteredCadernos.length === 0 && !homeSearch ? (
              /* Empty state */
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-violet-500/30">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <h2 className="font-display font-bold text-slate-800 text-xl mb-2">Crie seu primeiro caderno</h2>
                <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
                  Adicione PDFs, vídeos e sites. A IA responde com base exatamente no que você enviou.
                </p>
                <button
                  onClick={openNewCaderno}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 text-white font-bold shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Criar caderno
                </button>
              </motion.div>
            ) : filteredCadernos.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-500 font-medium">Nenhum caderno encontrado para "{homeSearch}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCadernos.map((c, idx) => {
                  const s = getCadernoStyle(c.color);
                  const dateStr = c.updated_at
                    ? new Date(c.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                    : c.created_at
                    ? new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                    : null;
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.25 }}
                      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col"
                    >
                      {/* Color stripe */}
                      <div className={`h-2 w-full bg-gradient-to-r ${s.gradient}`} />

                      <div className="p-5 flex-1 flex flex-col">
                        {/* Emoji + title */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl leading-none">{c.emoji ?? "📘"}</span>
                            <div className="min-w-0">
                              <p className="font-display font-bold text-slate-900 leading-tight text-base">{c.title}</p>
                              {c.is_default && (
                                <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">Padrão</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setActiveCaderno(c); setCadernoForm({ title: c.title, persona: c.persona ?? "", goals: c.goals ?? "", emoji: c.emoji ?? "📘", color: c.color ?? "indigo" }); setShowCadernoModal("edit"); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex-shrink-0"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Persona / goals preview */}
                        {c.persona || c.goals ? (
                          <p className="text-[12px] text-slate-500 leading-snug line-clamp-2 mb-3 flex-1">
                            {c.persona || c.goals}
                          </p>
                        ) : (
                          <div className="flex-1" />
                        )}

                        {/* Stats */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-3">
                            {c.docs_count != null && (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg ${s.light} ${s.text}`}>
                                <FileText className="w-3 h-3" />
                                {c.docs_count} fonte{c.docs_count !== 1 ? "s" : ""}
                              </span>
                            )}
                            {dateStr && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                <Calendar className="w-3 h-3" />
                                {dateStr}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => openCaderno(c)}
                            className={`flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-[0.98] transition-all`}
                          >
                            Abrir <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* "Add new" card */}
                <motion.button
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: filteredCadernos.length * 0.04, duration: 0.25 }}
                  onClick={openNewCaderno}
                  className="bg-white/60 rounded-2xl border-2 border-dashed border-slate-200 hover:border-violet-300 hover:bg-white transition-all flex flex-col items-center justify-center gap-3 py-10 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
                    <Plus className="w-5 h-5 text-slate-400 group-hover:text-violet-600 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-500 group-hover:text-violet-700 transition-colors">Novo caderno</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">PDF, vídeo, áudio, URL...</p>
                  </div>
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ═══ WORKSPACE VIEW ═══ */}
      {notebookView === "workspace" && (
      <motion.div
        key="notebook-workspace"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="flex-1 flex flex-col overflow-hidden bg-slate-50"
      >

      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/70 px-5 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => setNotebookView("home")} className="text-slate-400 hover:text-slate-700 transition-colors p-1 -ml-1 rounded-md hover:bg-slate-100">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="h-5 w-px bg-slate-200" />
        {activeCaderno && (() => {
          const s = getCadernoStyle(activeCaderno.color);
          return (
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm text-base`}>
                {activeCaderno.emoji ?? "📘"}
              </div>
              <div>
                <p className="font-display font-bold text-slate-900 text-[13px] leading-tight tracking-tight">{activeCaderno.title}</p>
                <button onClick={() => setNotebookView("home")} className="text-[10px] text-slate-400 hover:text-violet-600 font-medium leading-tight flex items-center gap-0.5 transition-colors">
                  <Layers className="w-2.5 h-2.5" /> Meus Cadernos
                </button>
              </div>
            </div>
          );
        })()}

        <div className="ml-auto flex items-center gap-2">
          {selectedDocIds.length > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-700">{selectedDocIds.length} {selectedDocIds.length === 1 ? "fonte" : "fontes"}</span>
            </div>
          )}
          <button
            onClick={() => { setShowShareModal(true); if (!shareToken) generateShareLink(); }}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:border-violet-300 hover:bg-violet-50 transition-all"
            title="Compartilhar caderno"
          >
            {shareLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            Compartilhar
          </button>

          {/* 3-dot notebook actions menu */}
          <div className="relative">
            <button
              onClick={() => setNotebookMenuOpen(v => !v)}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all"
              title="Ações do caderno"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {notebookMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotebookMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1.5">
                  <button
                    onClick={() => { openEditCaderno(); setNotebookMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <Pencil className="w-4 h-4 text-slate-400" /> Renomear caderno
                  </button>
                  <button
                    onClick={() => { setShowShareModal(true); if (!shareToken) generateShareLink(); setNotebookMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" /> Compartilhar caderno
                  </button>
                  <div className="h-px bg-slate-100 mx-3 my-1" />
                  <button
                    onClick={() => { if (activeCaderno) { if (confirm("Excluir este caderno?")) { deleteCaderno(activeCaderno.id); setNotebookMenuOpen(false); } } }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 text-left"
                  >
                    <Trash2 className="w-4 h-4" /> Excluir caderno
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="lg:hidden flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
            {(["sources", "chat", "tools"] as const).map(p => (
              <button key={p} onClick={() => setMobilePanel(p)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  mobilePanel === p ? "bg-white shadow text-slate-800" : "text-slate-500"
                }`}>
                {p === "sources" ? "Fontes" : p === "chat" ? "Chat" : "Studio"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden lg:flex w-[260px] xl:w-[280px] flex-shrink-0 flex-col overflow-hidden">{SourcesPanel}</div>
        {/* Chat col: shrinks to fixed width when tool result is active */}
        <div className={`hidden lg:flex flex-col overflow-hidden bg-slate-50 transition-all duration-300 ${
          toolResult && activeTool ? "w-[280px] flex-shrink-0" : "flex-1"
        }`}>{ChatPanel}</div>
        {/* Studio/Results col: expands to flex-1 when tool result is active */}
        <div className={`hidden lg:flex flex-col overflow-hidden border-l border-slate-200/70 transition-all duration-300 ${
          toolResult && activeTool ? "flex-1" : "w-[300px] xl:w-[320px] flex-shrink-0"
        }`}>{ToolsPanel}</div>

        <div className="flex lg:hidden flex-1 flex-col overflow-hidden">
          {mobilePanel === "sources" && SourcesPanel}
          {mobilePanel === "chat"    && ChatPanel}
          {mobilePanel === "tools"   && ToolsPanel}
        </div>
      </div>

      </motion.div>
      )}

      {/* ── MODAL RESPOSTA EXPANDIDA ── */}
      <AnimatePresence>
        {expandedMsg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setExpandedMsg(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
                expandedSize === "full"
                  ? "fixed inset-0 rounded-none"
                  : expandedSize === "three-quarters"
                  ? "w-full max-w-5xl h-[82vh]"
                  : "w-full max-w-3xl h-[58vh]"
              }`}
            >
              {/* Barra superior */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 flex-shrink-0 bg-white">
                {/* Ícone */}
                <div className="w-7 h-7 flex-shrink-0">
                  <TiagaoCharacter state="idle" size={28} showLabel={false} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-700 truncate">Resposta #{expandedMsg.idx + 1}</p>
                  <p className="text-[10px] text-slate-400">{expandedMsg.text.length} caracteres · StudyAI Notebook</p>
                </div>

                {/* Tamanho */}
                <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-0.5 gap-0.5 text-[11px]">
                  {([
                    { key: "half",          label: "½",         title: "Meia tela" },
                    { key: "three-quarters", label: "¾",        title: "¾ da tela" },
                    { key: "full",          label: "⛶",         title: "Tela cheia" },
                  ] as const).map(opt => (
                    <button key={opt.key} onClick={() => setExpandedSize(opt.key)}
                      title={opt.title}
                      className={`w-8 h-6 rounded-lg font-black transition-all ${
                        expandedSize === opt.key ? "bg-white shadow text-violet-600" : "text-slate-500 hover:text-slate-700"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Ações export */}
                <div className="flex items-center gap-1">
                  {/* Copiar */}
                  <button
                    onClick={() => navigator.clipboard.writeText(expandedMsg.text)}
                    title="Copiar texto"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                    <ClipboardList className="w-4 h-4" />
                  </button>

                  {/* Imprimir / PDF */}
                  <button
                    onClick={() => {
                      const w = window.open("", "_blank");
                      if (!w) return;
                      w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
                        <meta charset="utf-8"/>
                        <title>StudyAI — Resposta #${expandedMsg.idx + 1}</title>
                        <style>
                          body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; color: #1e293b; line-height: 1.8; font-size: 15px; padding: 0 20px; }
                          h1 { font-size: 18px; color: #4f46e5; margin-bottom: 4px; }
                          .meta { font-size: 12px; color: #94a3b8; margin-bottom: 32px; }
                          pre { white-space: pre-wrap; word-break: break-word; }
                          @media print { body { margin: 20mm; } }
                        </style>
                      </head><body>
                        <h1>StudyAI — Resposta #${expandedMsg.idx + 1}</h1>
                        <p class="meta">Gerado em ${new Date().toLocaleDateString("pt-BR", { dateStyle: "long" })}</p>
                        <pre>${expandedMsg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
                      </body></html>`);
                      w.document.close();
                      w.focus();
                      setTimeout(() => w.print(), 500);
                    }}
                    title="Imprimir / Salvar como PDF"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                    <Printer className="w-4 h-4" />
                  </button>

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`*StudyAI — Resposta:*\n\n${expandedMsg.text.slice(0, 1800)}${expandedMsg.text.length > 1800 ? "...\n\n_Texto completo gerado no StudyAI_" : ""}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Enviar pelo WhatsApp"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </a>

                  {/* Email */}
                  <a
                    href={`mailto:?subject=${encodeURIComponent("Resposta StudyAI")}&body=${encodeURIComponent(`Resposta gerada pelo StudyAI:\n\n${expandedMsg.text}`)}`}
                    title="Enviar por e-mail"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </a>

                  {/* Copiar link */}
                  <button
                    onClick={() => {
                      const url = `${window.location.href.split("?")[0]}?msg=${expandedMsg.idx}`;
                      navigator.clipboard.writeText(url);
                    }}
                    title="Copiar link para esta resposta"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  {/* Download .txt */}
                  <button
                    onClick={() => {
                      const blob = new Blob([expandedMsg.text], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = `studyai-resposta-${expandedMsg.idx + 1}.txt`;
                      a.click(); URL.revokeObjectURL(url);
                    }}
                    title="Baixar como .txt"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* Fechar */}
                <button onClick={() => setExpandedMsg(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white">
                <div className="max-w-3xl mx-auto">
                  <p className="text-slate-800 text-base leading-relaxed whitespace-pre-wrap font-[Georgia,serif] selection:bg-violet-100">
                    {expandedMsg.text}
                  </p>
                </div>
              </div>

              {/* Rodapé */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex-shrink-0 flex items-center justify-between">
                <p className="text-[11px] text-slate-400">Gerado pelo StudyAI • study.ia.br</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setExpandedMsg(null)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors">
                    Fechar
                  </button>
                  <button
                    onClick={() => {
                      const w = window.open("", "_blank");
                      if (!w) return;
                      w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
                        <meta charset="utf-8"/>
                        <title>StudyAI — Resposta #${expandedMsg.idx + 1}</title>
                        <style>
                          body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; color: #1e293b; line-height: 1.8; font-size: 15px; padding: 0 20px; }
                          h1 { font-size: 18px; color: #4f46e5; margin-bottom: 4px; }
                          .meta { font-size: 12px; color: #94a3b8; margin-bottom: 32px; }
                          pre { white-space: pre-wrap; word-break: break-word; }
                          @media print { body { margin: 20mm; } }
                        </style>
                      </head><body>
                        <h1>StudyAI — Resposta #${expandedMsg.idx + 1}</h1>
                        <p class="meta">Gerado em ${new Date().toLocaleDateString("pt-BR", { dateStyle: "long" })}</p>
                        <pre>${expandedMsg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
                      </body></html>`);
                      w.document.close();
                      w.focus();
                      setTimeout(() => w.print(), 500);
                    }}
                    className="text-xs font-bold px-4 py-1.5 rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-colors flex items-center gap-1.5">
                    <Printer className="w-3 h-3" /> Imprimir / PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caderno modal */}
      <AnimatePresence>
        {showCadernoModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowCadernoModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-slate-800">
                  {showCadernoModal === "new" ? "Novo caderno" : "Editar caderno"}
                </h3>
                <button onClick={() => setShowCadernoModal(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex gap-2">
                  <input value={cadernoForm.emoji} onChange={e => setCadernoForm(f => ({ ...f, emoji: e.target.value.slice(0, 2) }))}
                    className="w-14 px-2 py-2 rounded-lg border border-slate-200 text-center text-2xl" />
                  <input value={cadernoForm.title} onChange={e => setCadernoForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Nome do caderno (ex: ENEM Biologia)"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Persona / foco do tutor</label>
                  <textarea value={cadernoForm.persona} onChange={e => setCadernoForm(f => ({ ...f, persona: e.target.value }))}
                    placeholder="Ex: Explique como se eu fosse aluno do 3º ano, com foco em ENEM, usando exemplos do cotidiano brasileiro."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Objetivos do aluno</label>
                  <textarea value={cadernoForm.goals} onChange={e => setCadernoForm(f => ({ ...f, goals: e.target.value }))}
                    placeholder="Ex: Quero atingir 750+ em Ciências da Natureza no ENEM 2026."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-violet-400" />
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {showCadernoModal === "edit" && activeCaderno && !activeCaderno.is_default ? (
                  <button onClick={() => { deleteCaderno(activeCaderno.id); setShowCadernoModal(null); }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <button onClick={() => setShowCadernoModal(null)}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                  <button onClick={saveCaderno} disabled={!cadernoForm.title.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-violet-500" />
                    Compartilhar caderno
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Qualquer pessoa com o link pode ver (somente leitura)</p>
                </div>
                <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {shareLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando link...
                  </div>
                ) : shareToken ? (
                  <>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={`${window.location.origin}/shared/${shareToken}`}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50 text-slate-700 focus:outline-none"
                        onFocus={e => e.target.select()}
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/shared/${shareToken}`)}
                        className="px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 flex items-center gap-1.5 whitespace-nowrap">
                        <ClipboardList className="w-3.5 h-3.5" />
                        Copiar
                      </button>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-xs text-amber-700">O link dá acesso público de leitura aos documentos e resumos do caderno.</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <button onClick={generateShareLink} disabled={shareLoading}
                        className="text-xs font-bold text-slate-500 hover:text-violet-600 flex items-center gap-1 disabled:opacity-40">
                        <RefreshCw className="w-3 h-3" /> Gerar novo link
                      </button>
                      <a
                        href={`/shared/${shareToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-violet-600 hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Visualizar
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-6 gap-3">
                    <p className="text-sm text-slate-500">Nenhum link gerado ainda.</p>
                    <button onClick={generateShareLink} disabled={shareLoading}
                      className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Gerar link de compartilhamento
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox infográfico */}
      {infoFull && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setInfoFull(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={(e) => { e.stopPropagation(); setInfoFull(null); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={infoFull}
            alt="Infográfico ampliado"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={infoFull}
            download="infografico.png"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-100"
          >
            <Download className="w-4 h-4" /> Baixar PNG
          </a>
        </div>
      )}
    </div>
  );
}
