import { useState } from "react";
import { Send, Zap, Brain, Presentation } from "lucide-react";

export type TaskType = "fast" | "deep" | "slides";
export type AiProvider = "openai" | "claude";

interface ChatFormProps {
  onSubmit: (message: string, type: TaskType, provider: AiProvider) => void;
  loading: boolean;
}

const types: { value: TaskType; label: string; icon: typeof Zap; desc: string }[] = [
  { value: "fast",   label: "Rápido",       icon: Zap,          desc: "Resposta direta e concisa" },
  { value: "deep",   label: "Aprofundado",  icon: Brain,        desc: "Análise detalhada" },
  { value: "slides", label: "Slides",       icon: Presentation, desc: "Estrutura em apresentação" },
];

export default function ChatForm({ onSubmit, loading }: ChatFormProps) {
  const [message, setMessage]   = useState("");
  const [type, setType]         = useState<TaskType>("fast");
  const [provider, setProvider] = useState<AiProvider>("openai");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || loading) return;
    onSubmit(message.trim(), type, provider);
    setMessage("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {types.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.value} type="button"
              onClick={() => setType(t.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border ${
                type === t.value
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400"
              }`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden text-sm">
          {(["openai", "claude"] as AiProvider[]).map(p => (
            <button key={p} type="button"
              onClick={() => setProvider(p)}
              className={`px-3 py-1.5 font-semibold transition-all ${
                provider === p ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}>
              {p === "openai" ? "GPT" : "Claude"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
          placeholder="Digite sua pergunta ou tema..."
          rows={3}
          className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button type="submit" disabled={loading || !message.trim()}
          className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-semibold">
          <Send className="w-4 h-4" />
        </button>
      </div>
      {type !== "fast" && (
        <p className="text-xs text-slate-400">
          {types.find(t => t.value === type)?.desc} · Pode levar alguns segundos
        </p>
      )}
    </form>
  );
}
