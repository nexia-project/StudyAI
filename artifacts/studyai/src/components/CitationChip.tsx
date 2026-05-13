/**
 * CitationChip + renderTextWithCitations
 *
 * Componente compartilhado entre Notebook, TutorChat e VoiceProfessor para
 * exibir citações inline `[Fonte N]` como chips clicáveis.
 *
 * Suporta duas variantes de fonte:
 *  - "user-doc"          (PDF / material próprio do aluno — violeta)
 *  - "semantic-scholar"  (artigo peer-reviewed externo — azul, ícone livro)
 *
 * Padrão extraído de pages/Notebook.tsx (linhas ~3022-3074) e estendido para
 * suportar metadados de artigos externos (DOI, openAccessPdf, abstract).
 *
 * Quando o chip externo é aberto, exibe um drawer/modal-light dentro da
 * própria mensagem com título, autores, ano, venue, DOI, link PDF e abstract.
 */

import { type ReactNode, useState, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ExternalLink, FileText, Quote, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CitationProvider = "user-doc" | "semantic-scholar";

export interface Citation {
  numero: number;
  titulo: string;
  trecho?: string;
  trechoCompleto?: string;
  provider?: CitationProvider;
  // Campos opcionais — usados quando provider === "semantic-scholar"
  autores?: string[];
  ano?: number | null;
  venue?: string | null;
  url?: string;
  doi?: string | null;
  openAccessPdf?: string | null;
  citationCount?: number | null;
}

function isExternal(c: Citation): boolean {
  return c.provider === "semantic-scholar";
}

function chipClasses(c: Citation, isOpen: boolean): string {
  if (isExternal(c)) {
    return cn(
      "inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 mx-0.5 rounded-md text-[10px] font-black align-baseline transition-all cursor-pointer",
      isOpen
        ? "bg-blue-600 text-white"
        : "bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white",
    );
  }
  return cn(
    "inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 mx-0.5 rounded-md text-[10px] font-black align-baseline transition-all cursor-pointer",
    isOpen
      ? "bg-violet-600 text-white"
      : "bg-violet-100 text-violet-700 hover:bg-violet-600 hover:text-white",
  );
}

export function CitationChip({
  citation,
  isOpen = false,
  onClick,
}: {
  citation: Citation;
  isOpen?: boolean;
  onClick?: (c: Citation) => void;
}) {
  const tooltip = isExternal(citation)
    ? `Artigo científico — "${citation.titulo}"${citation.autores?.[0] ? ` · ${citation.autores[0]}${citation.autores.length > 1 ? " et al." : ""}` : ""}${citation.ano ? ` (${citation.ano})` : ""}`
    : `Ver trecho de "${citation.titulo}"`;
  return (
    <button
      type="button"
      onClick={() => onClick?.(citation)}
      className={chipClasses(citation, isOpen)}
      title={tooltip}
    >
      {citation.numero}
    </button>
  );
}

/**
 * Renderiza o texto da resposta substituindo cada `[Fonte N]` pelo chip
 * correspondente. Se a fonte N não estiver em `citations`, mantém o texto cru.
 *
 * Recebe um callback de clique para que o consumidor controle o estado de
 * "qual fonte está aberta" (pode ser por mensagem, por exemplo).
 */
export function renderTextWithCitations(
  text: string,
  citations: Citation[],
  options: {
    openNumero?: number | null;
    onChipClick?: (c: Citation) => void;
  } = {},
): ReactNode {
  const { openNumero, onChipClick } = options;
  const map = new Map(citations.map(c => [c.numero, c]));
  const parts = text.split(/(\[Fonte \d+\])/g);
  return parts.map((part, idx) => {
    const m = part.match(/^\[Fonte (\d+)\]$/);
    if (m) {
      const n = parseInt(m[1], 10);
      const c = map.get(n);
      if (c) {
        return (
          <CitationChip
            key={`chip-${idx}-${n}`}
            citation={c}
            isOpen={openNumero === n}
            onClick={onChipClick}
          />
        );
      }
      // Fonte referenciada mas não disponível — exibe placeholder cinza
      return (
        <span
          key={`miss-${idx}-${n}`}
          className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 mx-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-400 align-baseline"
          title="Fonte não disponível"
        >
          {n}
        </span>
      );
    }
    return <span key={`txt-${idx}`}>{part}</span>;
  });
}

/**
 * Detalhe expandido de uma citação aberta — drawer inline.
 * Use abaixo do bubble da mensagem.
 *
 * Para `user-doc`: mostra apenas título + trecho.
 * Para `semantic-scholar`: mostra título, autores, ano, venue, DOI, link PDF e abstract.
 */
export function CitationDetail({
  citation,
  onClose,
}: {
  citation: Citation;
  onClose?: () => void;
}) {
  const external = isExternal(citation);
  const accent = external ? "blue" : "violet";

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -4, height: 0 }}
      className="overflow-hidden"
    >
      <div
        className={cn(
          "px-3 py-2.5 border rounded-xl",
          accent === "blue"
            ? "bg-blue-50 border-blue-200"
            : "bg-violet-50 border-violet-200",
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {external ? (
              <BookOpen className={cn("w-3 h-3 flex-shrink-0", "text-blue-600")} />
            ) : (
              <Quote className={cn("w-3 h-3 flex-shrink-0", "text-violet-600")} />
            )}
            <span
              className={cn(
                "text-[10px] font-black uppercase tracking-wider",
                accent === "blue" ? "text-blue-700" : "text-violet-700",
              )}
            >
              Fonte {citation.numero}
            </span>
            {external && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white rounded px-1 py-0.5">
                Científico
              </span>
            )}
            {!external && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-600 text-white rounded px-1 py-0.5">
                Meu material
              </span>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "p-0.5 rounded flex-shrink-0",
                accent === "blue" ? "hover:bg-blue-100" : "hover:bg-violet-100",
              )}
              aria-label="Fechar"
            >
              <X
                className={cn(
                  "w-3 h-3",
                  accent === "blue" ? "text-blue-600" : "text-violet-600",
                )}
              />
            </button>
          )}
        </div>

        <p className="text-[11px] font-bold text-slate-800 mb-1 leading-tight">
          {citation.titulo}
        </p>

        {external && (
          <p className="text-[10px] text-slate-500 leading-snug mb-1.5">
            {citation.autores && citation.autores.length > 0 ? (
              <span>
                {citation.autores.slice(0, 3).join(", ")}
                {citation.autores.length > 3 ? " et al." : ""}
              </span>
            ) : (
              <span>Autor desconhecido</span>
            )}
            {citation.ano ? <span> · {citation.ano}</span> : null}
            {citation.venue ? <span> · {citation.venue}</span> : null}
            {typeof citation.citationCount === "number" ? (
              <span> · {citation.citationCount} citações</span>
            ) : null}
          </p>
        )}

        {(citation.trechoCompleto ?? citation.trecho) && (
          <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap mb-1.5">
            {citation.trechoCompleto ?? citation.trecho}
          </p>
        )}

        {external && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {citation.url && (
              <a
                href={citation.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full px-2 py-0.5 transition-colors"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                Abstract
              </a>
            )}
            {citation.openAccessPdf && (
              <a
                href={citation.openAccessPdf}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-full px-2 py-0.5 transition-colors"
              >
                <FileText className="w-2.5 h-2.5" />
                PDF grátis
              </a>
            )}
            {citation.doi && (
              <a
                href={`https://doi.org/${citation.doi}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full px-2 py-0.5 transition-colors"
              >
                DOI: {citation.doi}
              </a>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Card compacto de citação usado na lista "Fontes consultadas" abaixo da mensagem.
 *
 * Diferente de `CitationDetail`, este componente é a entrada da lista (não o
 * drawer aberto) e dispara `onClick` para que o consumidor abra o detalhe.
 */
export function CitationListItem({
  citation,
  isOpen,
  onClick,
}: {
  citation: Citation;
  isOpen?: boolean;
  onClick?: (c: Citation) => void;
}) {
  const external = isExternal(citation);
  const labelId = useId();
  const subtitle = external
    ? [
        citation.autores?.[0]
          ? `${citation.autores[0]}${citation.autores.length && citation.autores.length > 1 ? " et al." : ""}`
          : null,
        typeof citation.ano === "number" ? String(citation.ano) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Meu material";
  return (
    <button
      type="button"
      onClick={() => onClick?.(citation)}
      aria-labelledby={labelId}
      className={cn(
        "flex items-start gap-1.5 px-2 py-1 rounded-lg text-left transition-all max-w-[260px]",
        external
          ? isOpen
            ? "bg-blue-100 ring-1 ring-blue-300"
            : "bg-blue-50 hover:bg-blue-100 border border-blue-100"
          : isOpen
            ? "bg-violet-100 ring-1 ring-violet-300"
            : "bg-slate-100 hover:bg-slate-200",
      )}
    >
      {external ? (
        <BookOpen className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
      ) : (
        <Quote className="w-3 h-3 text-violet-600 flex-shrink-0 mt-0.5" />
      )}
      <span
        className={cn(
          "text-[10px] font-black flex-shrink-0",
          external ? "text-blue-700" : "text-violet-600",
        )}
      >
        [{citation.numero}]
      </span>
      <span id={labelId} className="flex flex-col min-w-0">
        <span className="text-[10px] font-bold text-slate-700 truncate leading-tight">
          {citation.titulo}
        </span>
        {subtitle && (
          <span className="text-[9px] text-slate-500 truncate leading-tight">
            {subtitle}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Bloco completo "📚 Fontes consultadas (N)" retrátil. Embute a lista de chips
 * com clique abrindo o detail inline.
 *
 * Estado de "qual está aberta" é gerenciado internamente — para a maioria dos
 * consumidores isto é o que se quer.
 */
export function CitationsSection({
  citations,
  defaultOpen = false,
}: {
  citations: Citation[];
  defaultOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [openNumero, setOpenNumero] = useState<number | null>(null);

  if (!citations.length) return null;
  const hasExternal = citations.some(isExternal);
  const label = hasExternal ? "Fontes consultadas" : "Fontes";

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-all"
      >
        <span className="text-[10px] text-slate-500">
          {hasExternal ? "📚" : "📄"}
        </span>
        <span className="text-[10px] font-semibold text-slate-500">
          {expanded ? "Ocultar" : "Ver"} {citations.length} {label.toLowerCase()}
          {citations.length > 1 && !label.endsWith("s") ? "s" : ""}
        </span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1 mt-1">
              {citations.map(c => (
                <CitationListItem
                  key={c.numero}
                  citation={c}
                  isOpen={openNumero === c.numero}
                  onClick={() =>
                    setOpenNumero(n => (n === c.numero ? null : c.numero))
                  }
                />
              ))}
            </div>
            <AnimatePresence>
              {openNumero !== null && (
                (() => {
                  const c = citations.find(x => x.numero === openNumero);
                  if (!c) return null;
                  return (
                    <div className="mt-1.5">
                      <CitationDetail
                        citation={c}
                        onClose={() => setOpenNumero(null)}
                      />
                    </div>
                  );
                })()
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
