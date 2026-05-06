import { Bot, Zap } from "lucide-react";

interface ChatResponseProps {
  response: string;
  model?: string;
  cached?: boolean;
  loading?: boolean;
}

export default function ChatResponse({ response, model, cached, loading }: ChatResponseProps) {
  if (loading) {
    return (
      <div className="flex items-start gap-3 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
          <div className="h-3 bg-slate-100 rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (!response) return null;

  const paragraphs = response.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="prose prose-slate prose-sm max-w-none">
          {paragraphs.map((p, i) => {
            if (p.startsWith("## "))
              return <h2 key={i} className="text-base font-bold text-slate-800 mt-3 mb-1">{p.slice(3)}</h2>;
            if (p.startsWith("# "))
              return <h1 key={i} className="text-lg font-bold text-slate-900 mt-3 mb-1">{p.slice(2)}</h1>;
            if (p.startsWith("- ") || p.startsWith("• ")) {
              const items = p.split("\n").filter(Boolean);
              return (
                <ul key={i} className="list-disc list-inside space-y-0.5 my-2">
                  {items.map((item, j) => (
                    <li key={j} className="text-slate-700 text-sm">{item.replace(/^[-•]\s*/, "")}</li>
                  ))}
                </ul>
              );
            }
            return <p key={i} className="text-slate-700 text-sm leading-relaxed my-1.5">{p}</p>;
          })}
        </div>
        {(model || cached) && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {cached && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3" /> Cache
              </span>
            )}
            {model && (
              <span className="text-xs text-slate-400 font-mono">{model}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
