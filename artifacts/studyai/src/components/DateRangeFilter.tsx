import { useState, useCallback } from "react";
import { Calendar, ChevronDown } from "lucide-react";

export type DatePreset =
  | "today" | "yesterday" | "7d" | "15d" | "30d"
  | "this_month" | "last_month" | "this_year" | "last_year"
  | "custom";

export interface DateRange {
  from: string;
  to: string;
  preset: DatePreset;
}

interface Preset {
  key: DatePreset;
  label: string;
}

const PRESETS: Preset[] = [
  { key: "today",       label: "Hoje" },
  { key: "yesterday",   label: "Ontem" },
  { key: "7d",          label: "7 dias" },
  { key: "15d",         label: "15 dias" },
  { key: "30d",         label: "30 dias" },
  { key: "this_month",  label: "Este mês" },
  { key: "last_month",  label: "Mês passado" },
  { key: "this_year",   label: "Este ano" },
  { key: "last_year",   label: "Ano passado" },
  { key: "custom",      label: "Personalizado" },
];

export function computeDates(preset: DatePreset, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = fmt(now);

  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const ys = fmt(y);
      return { from: ys, to: ys };
    }
    case "7d": {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { from: fmt(d), to: today };
    }
    case "15d": {
      const d = new Date(now); d.setDate(d.getDate() - 14);
      return { from: fmt(d), to: today };
    }
    case "30d": {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      return { from: fmt(d), to: today };
    }
    case "this_month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(d), to: today };
    }
    case "last_month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(s), to: fmt(e) };
    }
    case "this_year": {
      return { from: `${now.getFullYear()}-01-01`, to: today };
    }
    case "last_year": {
      const y = now.getFullYear() - 1;
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    case "custom":
      return { from: customFrom ?? today, to: customTo ?? today };
    default:
      return { from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), to: today };
  }
}

export function defaultDateRange(): DateRange {
  const { from, to } = computeDates("30d");
  return { from, to, preset: "30d" };
}

/** Compute previous period of equal length */
export function prevPeriodDates(from: string, to: string): { from: string; to: string } {
  const ms = new Date(to).getTime() - new Date(from).getTime() + 86400000;
  const pTo = new Date(new Date(from).getTime() - 86400000);
  const pFrom = new Date(pTo.getTime() - ms + 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(pFrom), to: fmt(pTo) };
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  loading?: boolean;
  className?: string;
}

export function DateRangeFilter({ value, onChange, loading, className = "" }: Props) {
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);
  const [showCustom, setShowCustom] = useState(value.preset === "custom");

  const selectPreset = useCallback((preset: DatePreset) => {
    if (preset === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    const { from, to } = computeDates(preset);
    onChange({ from, to, preset });
  }, [onChange]);

  const applyCustom = useCallback(() => {
    if (!customFrom || !customTo) return;
    const from = customFrom <= customTo ? customFrom : customTo;
    const to   = customFrom <= customTo ? customTo   : customFrom;
    onChange({ from, to, preset: "custom" });
  }, [customFrom, customTo, onChange]);

  const reset = useCallback(() => {
    setShowCustom(false);
    setCustomFrom("");
    setCustomTo("");
    const { from, to } = computeDates("30d");
    onChange({ from, to, preset: "30d" });
  }, [onChange]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map(p => {
          const active = value.preset === p.key;
          return (
            <button
              key={p.key}
              onClick={() => selectPreset(p.key)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border
                ${active
                  ? "bg-violet-600 border-violet-500 text-white shadow-sm shadow-violet-500/30"
                  : "bg-transparent border-white/[0.12] text-white/50 hover:border-white/30 hover:text-white/70"
                }
                ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              {p.label}
            </button>
          );
        })}

        {/* period label */}
        {!showCustom && (
          <span className="ml-auto text-[10px] text-white/25 font-mono hidden sm:block">
            {value.from} → {value.to}
          </span>
        )}
      </div>

      {/* Custom date pickers */}
      {showCustom && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2">
            <Calendar className="w-3.5 h-3.5 text-white/40" />
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="bg-transparent text-xs text-white/80 focus:outline-none w-28"
            />
          </div>
          <span className="text-white/30 text-xs">até</span>
          <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2">
            <Calendar className="w-3.5 h-3.5 text-white/40" />
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="bg-transparent text-xs text-white/80 focus:outline-none w-28"
            />
          </div>
          <button
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
            className="px-4 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            Aplicar
          </button>
          <button onClick={reset} className="text-xs text-white/35 hover:text-white/70 transition-colors px-1">
            Limpar
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-1.5 text-[10px] text-violet-400">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Atualizando dados...
        </div>
      )}
    </div>
  );
}
