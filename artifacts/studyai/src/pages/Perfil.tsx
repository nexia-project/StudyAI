import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  ArrowLeft,
  User,
  GraduationCap,
  Target,
  Phone,
  Mail,
  Save,
  CheckCircle2,
  Pencil,
  Lock,
} from "lucide-react";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { cn } from "@/lib/utils";

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
  "Outro / Concurso / Idiomas",
];

const GOALS = [
  { value: "enem", label: "ENEM", emoji: "📝" },
  { value: "vestibular", label: "Vestibular", emoji: "🏛️" },
  { value: "concurso", label: "Concurso Público", emoji: "⚖️" },
  { value: "escola", label: "Escola / Recuperação", emoji: "📚" },
  { value: "faculdade", label: "Faculdade / Superior", emoji: "🎓" },
  { value: "outro", label: "Outro objetivo", emoji: "🎯" },
];

export default function PerfilPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { profile, loading, saveProfile } = useStudentProfile();

  const [form, setForm] = useState({
    nome: "",
    serie: "",
    objetivo: "",
    concursoAlvo: "",
    telefone: "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        nome: profile.nome || "",
        serie: profile.serie || "",
        objetivo: profile.objetivo || "",
        concursoAlvo: profile.concursoAlvo || "",
        telefone: profile.telefone || "",
      });
    }
  }, [profile]);

  const needsTarget = form.objetivo === "concurso" || form.objetivo === "vestibular";
  const targetLabel = form.objetivo === "concurso" ? "Qual concurso você vai prestar?" : "Qual universidade / curso você quer?";
  const targetPlaceholder = form.objetivo === "concurso" ? "Ex: Polícia Federal, INSS, TRF..." : "Ex: FUVEST - Medicina, UNICAMP - Engenharia...";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await saveProfile({
      nome: form.nome,
      serie: form.serie,
      objetivo: form.objetivo,
      concursoAlvo: form.concursoAlvo || undefined,
      telefone: form.telefone || undefined,
    });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputClass = "w-full px-4 py-3.5 rounded-2xl bg-secondary/50 border-2 border-transparent focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(139,92,246,0.1)] transition-all outline-none font-medium text-foreground";
  const labelClass = "text-sm font-bold text-foreground mb-1.5 flex items-center gap-2";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/app")}
          className="p-2 rounded-xl hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-black text-foreground">Meus Dados</h1>
          <p className="text-xs text-muted-foreground">Gerencie seu perfil de estudante</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Avatar + info do login */}
        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-border shadow-sm p-6 flex items-center gap-4"
          >
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user.firstName || "Perfil"}
                className="w-16 h-16 rounded-full object-cover ring-4 ring-primary/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-black ring-4 ring-primary/20">
                {(form.nome || user?.firstName || "E").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-black text-foreground text-lg truncate">
                {form.nome || user?.firstName || "Estudante"}
              </p>
              {(profile?.email || user?.email) && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" />
                  {profile?.email || user?.email}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                  {form.serie || "Série não definida"}
                </span>
                {form.objetivo && (
                  <span className="text-xs bg-accent/10 text-accent px-2.5 py-0.5 rounded-full font-bold capitalize">
                    {GOALS.find(g => g.value === form.objetivo)?.emoji} {GOALS.find(g => g.value === form.objetivo)?.label || form.objetivo}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Formulário */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Dados pessoais */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-5 h-5 text-primary" />
                <h2 className="font-black text-foreground">Dados Pessoais</h2>
              </div>

              <div>
                <label className={labelClass}>
                  <User className="w-4 h-4 text-muted-foreground" />
                  Nome / Apelido
                </label>
                <input
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  placeholder="Como você quer ser chamado?"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Telefone / WhatsApp
                  <span className="text-xs font-normal text-muted-foreground ml-1">(opcional)</span>
                </label>
                <input
                  type="tel"
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  placeholder="Ex: (11) 99999-9999"
                  className={inputClass}
                />
              </div>

              {(profile?.email || user?.email) && (
                <div>
                  <label className={labelClass}>
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    E-mail
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </label>
                  <input
                    type="email"
                    value={profile?.email || user?.email || ""}
                    disabled
                    className={cn(inputClass, "opacity-60 cursor-not-allowed bg-secondary/30")}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5 ml-1">O e-mail é gerenciado pela sua conta de acesso</p>
                </div>
              )}
            </div>

            {/* Dados de ensino */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-5 h-5 text-accent" />
                <h2 className="font-black text-foreground">Dados de Ensino</h2>
              </div>

              <div>
                <label className={labelClass}>
                  <GraduationCap className="w-4 h-4 text-muted-foreground" />
                  Série / Nível atual
                </label>
                <select
                  name="serie"
                  value={form.serie}
                  onChange={handleChange}
                  className={cn(inputClass, "appearance-none cursor-pointer")}
                >
                  <option value="">Selecione sua série...</option>
                  {GRADES.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  <Target className="w-4 h-4 text-muted-foreground" />
                  Objetivo de estudo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {GOALS.map(goal => (
                    <button
                      key={goal.value}
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, objetivo: goal.value, concursoAlvo: "" }));
                        setSaved(false);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-2xl border-2 text-sm font-bold transition-all text-left",
                        form.objetivo === goal.value
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-secondary/30 text-foreground hover:border-primary/40 hover:bg-primary/5"
                      )}
                    >
                      <span className="text-base">{goal.emoji}</span>
                      {goal.label}
                    </button>
                  ))}
                </div>
              </div>

              {needsTarget && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className={labelClass}>
                    <Target className="w-4 h-4 text-primary" />
                    {targetLabel}
                  </label>
                  <input
                    type="text"
                    name="concursoAlvo"
                    value={form.concursoAlvo}
                    onChange={handleChange}
                    placeholder={targetPlaceholder}
                    className={inputClass}
                  />
                </motion.div>
              )}
            </div>

            {/* Botão salvar */}
            <button
              type="submit"
              disabled={saving}
              className={cn(
                "w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all shadow-lg",
                saved
                  ? "bg-green-500 text-white shadow-green-200"
                  : "bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 hover:scale-[1.01] shadow-primary/20"
              )}
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Dados salvos com sucesso!
                </>
              ) : saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvar meus dados
                </>
              )}
            </button>

            {!isAuthenticated && (
              <p className="text-center text-sm text-muted-foreground">
                Faça login para salvar seu perfil na nuvem e acessar de qualquer dispositivo
              </p>
            )}
          </motion.form>
        )}
      </div>
    </div>
  );
}
