import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, Search, Trash2, Eye, FileText,
  Presentation, Brain, Image as ImageIcon, BookOpen, Microscope,
  ClipboardList, Sparkles, AlertCircle, Layers,
} from "lucide-react";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { AppNav } from "@/components/AppNav";

type Kind =
  | "resumao" | "slides" | "mapa_mental" | "infografico"
  | "material_premium" | "lesson_plan" | "exam" | "research" | "content_package";

interface Item {
  id: number;
  source?: "generated_content" | "lesson_plans";
  owner_role: "student" | "teacher";
  kind: Kind;
  title: string;
  materia: string | null;
  payload: any;
  html_url: string | null;
  created_at: string;
}

const KIND_META: Record<Kind, { label: string; icon: any; color: string; group: "student" | "teacher" | "both" }> = {
  resumao:          { label: "Resumão",            icon: FileText,      color: "text-emerald-600 bg-emerald-50 border-emerald-200", group: "student" },
  slides:           { label: "Slides",             icon: Presentation,  color: "text-indigo-600 bg-indigo-50 border-indigo-200",    group: "both" },
  mapa_mental:      { label: "Mapa Mental",        icon: Brain,         color: "text-violet-600 bg-violet-50 border-violet-200",    group: "both" },
  infografico:      { label: "Infográfico",        icon: ImageIcon,     color: "text-rose-600 bg-rose-50 border-rose-200",          group: "student" },
  material_premium: { label: "Material Premium",   icon: Sparkles,      color: "text-amber-600 bg-amber-50 border-amber-200",       group: "teacher" },
  lesson_plan:     { label: "Plano de Aula",      icon: BookOpen,      color: "text-blue-600 bg-blue-50 border-blue-200",          group: "teacher" },
  exam:             { label: "Prova",               icon: ClipboardList, color: "text-red-600 bg-red-50 border-red-200",             group: "teacher" },
  research:         { label: "Pesquisa",            icon: Microscope,    color: "text-cyan-600 bg-cyan-50 border-cyan-200",          group: "teacher" },
  content_package:  { label: "Pacote Completo",     icon: Layers,        color: "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200", group: "teacher" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MeusConteudosPage() {
  const [, navigate] = useLocation();
  const { user, isLoading: isLoaded } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<Kind | "">("");
  const [roleFilter, setRoleFilter] = useState<"" | "student" | "teacher">("");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Item | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (kindFilter) params.set("kind", kindFilter);
      if (roleFilter) params.set("role", roleFilter);
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "100");
      const [r, lpRes] = await Promise.all([
        fetch(`/api/content/history?${params}`, { credentials: "include" }),
        // Legacy: planos de aula salvos antes do histórico universal
        (kindFilter && kindFilter !== "lesson_plan") || roleFilter === "student"
          ? Promise.resolve(null)
          : fetch(`/api/teacher/lesson-plans`, { credentials: "include" }).catch(() => null),
      ]);
      if (!r.ok) {
        if (r.status === 401) { navigate("/sign-in"); return; }
        throw new Error("Falha ao carregar");
      }
      const d = await r.json();
      const main: Item[] = (d.items ?? []).map((i: Item) => ({ ...i, source: "generated_content" as const }));

      let legacy: Item[] = [];
      if (lpRes && lpRes.ok) {
        const lpd = await lpRes.json();
        legacy = (lpd.plans ?? []).map((p: any): Item => ({
          id: p.id,
          source: "lesson_plans",
          owner_role: "teacher",
          kind: "lesson_plan",
          title: p.title,
          materia: p.disciplina,
          payload: { disciplina: p.disciplina, serie: p.serie, duracao: p.duracao, objetivo: p.objetivo, turma_name: p.turma_name },
          html_url: null,
          created_at: p.created_at,
        }));
      }

      const merged = [...main, ...legacy].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setItems(merged);
      setTotal((d.total ?? 0) + legacy.length);
    } catch (e: any) {
      setError(e?.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded && !user) { navigate("/sign-in"); return; }
    if (!isLoaded && user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user, kindFilter, roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function del(item: Item) {
    if (!confirm("Excluir este conteúdo?")) return;
    const url = item.source === "lesson_plans"
      ? `/api/teacher/lesson-plans/${item.id}`
      : `/api/content/${item.id}`;
    const r = await fetch(url, { method: "DELETE", credentials: "include" });
    if (r.ok) setItems(prev => prev.filter(i => !(i.id === item.id && i.source === item.source)));
  }

  async function open(item: Item) {
    if (item.source === "lesson_plans") {
      const r = await fetch(`/api/teacher/lesson-plans/${item.id}`, { credentials: "include" });
      if (!r.ok) { alert("Não foi possível abrir."); return; }
      const d = await r.json();
      const plan = d.plan ?? {};
      const full: Item = {
        ...item,
        payload: { ...plan, plano: plan.plano },
      };
      setViewing(full);
      return;
    }
    // Busca o conteúdo completo (lista só traz summary leve).
    const r = await fetch(`/api/content/${item.id}`, { credentials: "include" });
    if (!r.ok) { alert("Não foi possível abrir."); return; }
    const d = await r.json();
    const full: Item = d.item ?? item;

    if (full.kind === "material_premium" && full.payload?.html) {
      const blob = new Blob([full.payload.html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      // libera o objeto depois de uns segundos
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    setViewing(full);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.title.toLowerCase().includes(q) || (i.materia ?? "").toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 md:pl-64 pt-14 md:pt-0">
      <AppNav />
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10">
        <button onClick={() => navigate(-1 as any)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">Meus Conteúdos</h1>
          <p className="text-gray-500 mt-2">Histórico universal de tudo que você gerou — resumos, slides, mapas, provas e mais.</p>
        </motion.div>

        {/* Filtros */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-6 flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título ou matéria..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <select value={kindFilter} onChange={e => setKindFilter(e.target.value as any)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
            <option value="">Todos os tipos</option>
            {Object.entries(KIND_META).map(([k, m]) => (
              <option key={k} value={k}>{m.label}</option>
            ))}
          </select>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
            <option value="">Aluno + Professor</option>
            <option value="student">Como Aluno</option>
            <option value="teacher">Como Professor</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-gray-500 mt-3 text-sm">Carregando seu histórico...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-bold">Nada por aqui ainda</p>
            <p className="text-gray-500 text-sm mt-1">Conforme você gera conteúdos no app, eles aparecem nesta tela.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 font-semibold mb-3">{total} {total === 1 ? "item" : "itens"}</p>
            <div className="grid gap-3">
              {filtered.map(item => {
                const meta = KIND_META[item.kind] ?? KIND_META.content_package;
                const Icon = meta.icon;
                return (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-gray-200 bg-white p-4 lg:p-5 hover:shadow-md transition-shadow flex flex-col lg:flex-row gap-4 lg:items-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${meta.color} flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
                        {item.materia && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{item.materia}</span>}
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{item.owner_role === "teacher" ? "👨‍🏫 Professor" : "🎓 Aluno"}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm truncate">{item.title}</h3>
                      <p className="text-gray-500 text-xs mt-0.5">{formatDate(item.created_at)}</p>
                    </div>
                    <div className="flex gap-2 lg:flex-shrink-0">
                      <button onClick={() => open(item)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Abrir
                      </button>
                      <button onClick={() => del(item)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 text-xs font-bold transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Viewer modal genérico (JSON pretty) */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-indigo-600 font-bold tracking-wider">{KIND_META[viewing.kind]?.label}</p>
                <h2 className="font-black text-gray-900 truncate">{viewing.title}</h2>
              </div>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-900 text-2xl leading-none px-3">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <ContentRenderer item={viewing} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContentRenderer({ item }: { item: Item }) {
  const p = item.payload || {};

  if (item.kind === "infografico" && p.b64_json) {
    return (
      <div className="text-center">
        <img src={`data:${p.mimeType || "image/png"};base64,${p.b64_json}`} alt={p.titulo || item.title}
          className="max-w-full mx-auto rounded-xl shadow-lg" />
        {p.titulo && <p className="mt-4 text-gray-900 font-bold">{p.titulo}</p>}
        {p.subtitulo && <p className="text-gray-500 text-sm">{p.subtitulo}</p>}
      </div>
    );
  }

  if (item.kind === "resumao" && p.resumao) {
    const r = p.resumao;
    return (
      <div className="space-y-4 text-sm">
        {r.visaoGeral && <div><h3 className="font-black text-gray-900 mb-1">Visão Geral</h3><p className="text-gray-700">{r.visaoGeral}</p></div>}
        {r.conceitosChave?.length > 0 && (
          <div><h3 className="font-black text-gray-900 mb-2">Conceitos-chave</h3>
            <div className="space-y-2">{r.conceitosChave.map((c: any, i: number) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="font-bold text-gray-900">{c.titulo}</p>
                <p className="text-gray-600 text-xs mt-1">{c.explicacao}</p>
                {c.comoMemorizar && <p className="text-indigo-700 text-xs mt-1.5">💡 {c.comoMemorizar}</p>}
              </div>
            ))}</div>
          </div>
        )}
        {r.armadilhas?.length > 0 && <div><h3 className="font-black text-gray-900 mb-1">Armadilhas</h3><ul className="list-disc pl-5 text-gray-700 space-y-1">{r.armadilhas.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul></div>}
        {r.dicaFinal && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3"><strong className="text-amber-700">🎯 Dica final:</strong> <span className="text-gray-700">{r.dicaFinal}</span></div>}
      </div>
    );
  }

  if (item.kind === "slides" && p.slides) {
    return (
      <div className="space-y-3">
        {p.slides.map((s: any, i: number) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{s.emoji || "📄"}</span>
              <span className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider">{s.tipo}</span>
            </div>
            <p className="font-bold text-gray-900 text-sm">{s.titulo}</p>
            {s.subtitulo && <p className="text-gray-500 text-xs mt-1">{s.subtitulo}</p>}
            {s.texto && <p className="text-gray-700 text-xs mt-2">{s.texto}</p>}
            {s.items && <ul className="list-disc pl-5 text-gray-700 text-xs mt-2 space-y-0.5">{s.items.map((it: string, j: number) => <li key={j}>{it}</li>)}</ul>}
            {s.pergunta && <p className="text-gray-700 text-xs mt-2 italic">{s.pergunta}</p>}
          </div>
        ))}
      </div>
    );
  }

  if (item.kind === "mapa_mental" && p.categories) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-black text-gray-900">{p.subject}</h3>
        {p.categories.map((cat: any, i: number) => (
          <div key={i} className="rounded-xl border border-violet-200 bg-violet-50 p-3">
            <p className="font-bold text-violet-900">{cat.name}</p>
            <ul className="mt-2 space-y-1">{cat.topics?.map((t: any, j: number) => (
              <li key={j} className="text-sm text-gray-700"><strong>{t.name}</strong>{t.subtopics?.length ? `: ${t.subtopics.map((s: any) => s.name).join(", ")}` : ""}</li>
            ))}</ul>
          </div>
        ))}
      </div>
    );
  }

  if ((item.kind === "exam" || item.kind === "content_package" || item.kind === "research") && (p.exam || p.content)) {
    const data = p.exam || p.content;
    return (
      <div className="space-y-4">
        {data.titulo && <h3 className="text-lg font-black text-gray-900">{data.titulo}</h3>}
        {data.resumo && <p className="text-sm text-gray-700">{data.resumo}</p>}
        {data.questions?.length > 0 && (
          <div className="space-y-3">{data.questions.map((q: any, i: number) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="font-bold text-gray-900 text-sm">{i + 1}. {q.text}</p>
              {q.context && <p className="text-gray-500 text-xs mt-1 italic">{q.context}</p>}
              <ul className="mt-2 space-y-1 text-xs">{q.alternatives?.map((a: string, j: number) => (
                <li key={j} className={j === q.correct ? "text-emerald-700 font-bold" : "text-gray-600"}>{a}</li>
              ))}</ul>
              {q.explanation && <p className="text-indigo-700 text-xs mt-2"><strong>Explicação:</strong> {q.explanation}</p>}
            </div>
          ))}</div>
        )}
      </div>
    );
  }

  if (item.kind === "lesson_plan") {
    const plano = p.plano || p;
    return (
      <div className="space-y-4 text-sm">
        {(p.disciplina || p.serie || p.duracao) && (
          <div className="flex flex-wrap gap-2">
            {p.disciplina && <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">{p.disciplina}</span>}
            {p.serie && <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">{p.serie}</span>}
            {p.duracao && <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">⏱ {p.duracao}</span>}
          </div>
        )}
        {p.objetivo && <div><h3 className="font-black text-gray-900 mb-1">Objetivo</h3><p className="text-gray-700">{p.objetivo}</p></div>}
        {plano?.objetivos?.length > 0 && (
          <div><h3 className="font-black text-gray-900 mb-1">Objetivos específicos</h3><ul className="list-disc pl-5 text-gray-700 space-y-1">{plano.objetivos.map((o: string, i: number) => <li key={i}>{o}</li>)}</ul></div>
        )}
        {plano?.conteudos?.length > 0 && (
          <div><h3 className="font-black text-gray-900 mb-1">Conteúdos</h3><ul className="list-disc pl-5 text-gray-700 space-y-1">{plano.conteudos.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul></div>
        )}
        {plano?.abertura && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="font-bold text-blue-900">🚪 Abertura ({plano.abertura.duracao})</p><p className="text-gray-700 text-xs mt-1">{plano.abertura.descricao}</p>{plano.abertura.atividade && <p className="text-gray-600 text-xs mt-1 italic">Atividade: {plano.abertura.atividade}</p>}</div>}
        {plano?.desenvolvimento && <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3"><p className="font-bold text-indigo-900">📚 Desenvolvimento ({plano.desenvolvimento.duracao})</p><p className="text-gray-700 text-xs mt-1">{plano.desenvolvimento.descricao}</p>{plano.desenvolvimento.atividades?.length > 0 && <ul className="list-disc pl-5 text-gray-600 text-xs mt-1.5 space-y-0.5">{plano.desenvolvimento.atividades.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>}</div>}
        {plano?.fechamento && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="font-bold text-emerald-900">🎯 Fechamento ({plano.fechamento.duracao})</p><p className="text-gray-700 text-xs mt-1">{plano.fechamento.descricao}</p>{plano.fechamento.avaliacao && <p className="text-gray-600 text-xs mt-1 italic">Avaliação: {plano.fechamento.avaliacao}</p>}</div>}
        {plano?.materiais?.length > 0 && <div><h3 className="font-black text-gray-900 mb-1">Materiais</h3><p className="text-gray-700">{plano.materiais.join(", ")}</p></div>}
        {plano?.tarefa_casa && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3"><strong className="text-amber-700">📝 Tarefa de casa:</strong> <span className="text-gray-700">{plano.tarefa_casa}</span></div>}
        {plano?.observacoes && <div><h3 className="font-black text-gray-900 mb-1">Observações</h3><p className="text-gray-700 text-xs">{plano.observacoes}</p></div>}
      </div>
    );
  }

  // Fallback
  return <pre className="text-xs text-gray-600 bg-gray-50 p-4 rounded-xl overflow-auto whitespace-pre-wrap">{JSON.stringify(p, null, 2)}</pre>;
}
