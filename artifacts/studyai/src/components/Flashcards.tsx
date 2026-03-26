import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Layers,
  Zap,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Flashcard {
  id: number;
  frente: string;
  verso: string;
  categoria: string;
  nivel: "facil" | "medio" | "dificil";
}

interface FlashcardsProps {
  materia: string;
  serie: string;
  resumo: string;
  diaNumero?: number;
  diaTopicos?: string;
  onClose: () => void;
}

const NIVEL_COLORS = {
  facil: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", label: "Fácil" },
  medio: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300", label: "Médio" },
  dificil: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "Difícil" },
};

const BASE_URL = import.meta.env.BASE_URL ?? "/";

async function fetchFlashcards(params: {
  materia: string;
  serie: string;
  resumo: string;
  diaNumero?: number;
  diaTopicos?: string;
}): Promise<Flashcard[]> {
  const res = await fetch(`${BASE_URL}api/flashcards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Erro ao gerar flashcards");
  const data = await res.json();
  return data.flashcards as Flashcard[];
}

export function FlashcardsModal({
  materia,
  serie,
  resumo,
  diaNumero,
  diaTopicos,
  onClose,
}: FlashcardsProps) {
  const { isAuthenticated } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);

  // Save flashcard session when finished
  useEffect(() => {
    if (!finished || !isAuthenticated || cards.length === 0) return;
    fetch("/api/history/flashcard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        materia,
        diaNumero: diaNumero ?? null,
        totalCards: cards.length,
        known: known.size,
        unknown: unknown.size,
      }),
    }).catch(() => {});
  }, [finished]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCards([]);
    setCurrent(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
    setFinished(false);
    setStarted(false);
    try {
      const result = await fetchFlashcards({ materia, serie, resumo, diaNumero, diaTopicos });
      setCards(result);
      setStarted(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [materia, serie, resumo, diaNumero, diaTopicos]);

  const markKnown = () => {
    setKnown((prev) => new Set([...prev, cards[current].id]));
    setUnknown((prev) => {
      const n = new Set(prev);
      n.delete(cards[current].id);
      return n;
    });
    advance();
  };

  const markUnknown = () => {
    setUnknown((prev) => new Set([...prev, cards[current].id]));
    setKnown((prev) => {
      const n = new Set(prev);
      n.delete(cards[current].id);
      return n;
    });
    advance();
  };

  const advance = () => {
    setFlipped(false);
    setTimeout(() => {
      if (current >= cards.length - 1) {
        setFinished(true);
      } else {
        setCurrent((p) => p + 1);
      }
    }, 80);
  };

  const restart = () => {
    setCurrent(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
    setFinished(false);
  };

  const restartUnknown = () => {
    const unknownCards = cards.filter((c) => unknown.has(c.id));
    if (unknownCards.length === 0) return;
    setCards(unknownCards);
    setCurrent(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
    setFinished(false);
  };

  const card = cards[current];
  const knownCount = known.size;
  const unknownCount = unknown.size;
  const unanswered = cards.length - knownCount - unknownCount;
  const pct = cards.length > 0 ? Math.round((knownCount / cards.length) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 rounded-t-[2.5rem] flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Flashcards</h2>
              <p className="text-xs text-gray-500 font-medium">
                {diaNumero ? `Dia ${diaNumero} — ` : ""}{materia}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {/* Landing */}
          {!started && !loading && (
            <div className="text-center py-8 flex flex-col items-center gap-6">
              <div className="w-24 h-24 rounded-[2rem] bg-violet-100 flex items-center justify-center">
                <Layers className="w-12 h-12 text-violet-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Flashcards com Active Recall</h3>
                <p className="text-gray-500 max-w-sm mx-auto text-sm leading-relaxed">
                  Método usado no Anki e em universidades de elite. A IA cria 15 cartões com perguntas, respostas e <strong>âncoras mnemônicas</strong> para gravar de vez.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full max-w-xs text-center">
                <div className="bg-emerald-50 rounded-2xl p-3">
                  <p className="text-2xl font-black text-emerald-600">5</p>
                  <p className="text-xs text-emerald-700 font-semibold">Fáceis</p>
                </div>
                <div className="bg-yellow-50 rounded-2xl p-3">
                  <p className="text-2xl font-black text-yellow-600">5</p>
                  <p className="text-xs text-yellow-700 font-semibold">Médios</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-3">
                  <p className="text-2xl font-black text-red-600">5</p>
                  <p className="text-xs text-red-700 font-semibold">Difíceis</p>
                </div>
              </div>
              <button
                onClick={generate}
                className="bg-violet-600 hover:bg-violet-700 text-white font-black text-lg px-8 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-violet-200"
              >
                Gerar Flashcards ⚡
              </button>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
              <p className="font-bold text-gray-700">Gerando 15 flashcards...</p>
              <p className="text-sm text-gray-400">A IA está criando âncoras mnemônicas únicas</p>
            </div>
          )}

          {/* Finished */}
          {finished && (
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              <Trophy className="w-16 h-16 text-yellow-500 drop-shadow-lg" />
              <div>
                <h3 className="text-3xl font-black mb-1">
                  {pct >= 80 ? "Incrível! 🔥" : pct >= 60 ? "Bom trabalho! 💪" : "Continue praticando! 📚"}
                </h3>
                <p className="text-gray-500">Você revisou todos os {cards.length} flashcards</p>
              </div>
              <div className="w-full max-w-xs">
                <div className="w-full bg-gray-100 rounded-full h-4 mb-2">
                  <div
                    className="h-4 bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-sm font-bold text-gray-700">{pct}% dominado</p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                <div className="bg-emerald-50 rounded-2xl p-4">
                  <p className="text-3xl font-black text-emerald-600">{knownCount}</p>
                  <p className="text-xs text-emerald-700 font-semibold">Já sei ✓</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-4">
                  <p className="text-3xl font-black text-red-600">{unknownCount}</p>
                  <p className="text-xs text-red-700 font-semibold">Preciso revisar</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                {unknownCount > 0 && (
                  <button
                    onClick={restartUnknown}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-2xl transition-all text-sm"
                  >
                    Revisar os {unknownCount} que errei
                  </button>
                )}
                <button
                  onClick={restart}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-2xl transition-all text-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Recomeçar
                </button>
              </div>
              <button
                onClick={generate}
                className="text-violet-600 hover:text-violet-800 font-bold text-sm underline underline-offset-2"
              >
                Gerar novos flashcards
              </button>
            </div>
          )}

          {/* Card Study */}
          {started && !loading && !finished && card && (
            <div className="flex flex-col gap-5">
              {/* Progress */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-violet-500 rounded-full transition-all"
                    style={{ width: `${((current) / cards.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-400">{current + 1}/{cards.length}</span>
              </div>

              {/* Stats bar */}
              <div className="flex gap-3 justify-center">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {knownCount} já sei
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
                  <XCircle className="w-3.5 h-3.5" /> {unknownCount} a revisar
                </span>
                {unanswered > 0 && (
                  <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
                    {unanswered} pendente{unanswered !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Card */}
              <div
                className="cursor-pointer select-none"
                onClick={() => setFlipped((f) => !f)}
                style={{ perspective: "1200px" }}
              >
                <motion.div
                  style={{ transformStyle: "preserve-3d", minHeight: "220px" }}
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="relative w-full"
                >
                  {/* Front */}
                  <div
                    className="absolute inset-0 backface-hidden rounded-[2rem] border-2 border-gray-100 bg-white p-6 sm:p-8 flex flex-col items-center justify-center gap-4 shadow-lg min-h-[220px]"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className={cn(
                      "self-start text-xs font-black uppercase px-3 py-1 rounded-full",
                      NIVEL_COLORS[card.nivel]?.bg,
                      NIVEL_COLORS[card.nivel]?.text
                    )}>
                      {NIVEL_COLORS[card.nivel]?.label}
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{card.categoria}</p>
                    <p className="text-xl sm:text-2xl font-black text-gray-900 text-center leading-snug">
                      {card.frente}
                    </p>
                    <p className="text-xs text-gray-400 mt-2 animate-pulse">Toque para revelar ↩</p>
                  </div>

                  {/* Back */}
                  <div
                    className="absolute inset-0 backface-hidden rounded-[2rem] border-2 border-violet-200 bg-violet-50 p-6 sm:p-8 flex flex-col gap-4 shadow-lg min-h-[220px]"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-violet-500" />
                      <span className="text-xs font-black text-violet-600 uppercase tracking-wider">Resposta</span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-gray-900 leading-relaxed flex-1">
                      {card.verso}
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Flip hint */}
              {!flipped && (
                <p className="text-center text-xs text-gray-400 font-medium">
                  Pense na resposta antes de revelar
                </p>
              )}

              {/* Action buttons */}
              <AnimatePresence>
                {flipped && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3"
                  >
                    <button
                      onClick={markUnknown}
                      className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-100 hover:bg-red-200 text-red-700 font-black transition-all hover:scale-[1.02] active:scale-95 text-sm"
                    >
                      <XCircle className="w-5 h-5" /> Não sabia
                    </button>
                    <button
                      onClick={markKnown}
                      className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-black transition-all hover:scale-[1.02] active:scale-95 text-sm"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Sabia!
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Nav arrows */}
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => {
                    if (current > 0) {
                      setFlipped(false);
                      setTimeout(() => setCurrent((p) => p - 1), 60);
                    }
                  }}
                  disabled={current === 0}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30 hover:bg-gray-200 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={generate}
                  className="text-xs text-gray-400 hover:text-gray-600 font-bold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Gerar novos
                </button>
                <button
                  onClick={() => {
                    if (current < cards.length - 1) {
                      setFlipped(false);
                      setTimeout(() => setCurrent((p) => p + 1), 60);
                    } else {
                      setFinished(true);
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function FlashcardsButton({
  materia,
  serie,
  resumo,
  diaNumero,
  diaTopicos,
}: Omit<FlashcardsProps, "onClose">) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-2 rounded-xl transition-all hover:scale-105 active:scale-95"
      >
        <Layers className="w-3.5 h-3.5" />
        Flashcards
      </button>
      <AnimatePresence>
        {open && (
          <FlashcardsModal
            materia={materia}
            serie={serie}
            resumo={resumo}
            diaNumero={diaNumero}
            diaTopicos={diaTopicos}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
