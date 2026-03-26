import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Sparkles, 
  GraduationCap, 
  BookOpen, 
  Clock, 
  AlertTriangle,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { useGenerateStudyPlan } from "@/hooks/use-study-plan";
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
  "Outro / Concurso / Idiomas"
];

export default function Home() {
  const [step, setStep] = useState<"form" | "loading" | "result">("form");
  const [formData, setFormData] = useState({
    nome: "",
    serie: "",
    tempo: "",
    dificuldades: "",
    texto: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [planResult, setPlanResult] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useGenerateStudyPlan();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrorMsg(null); // clear error when typing
  };

  const handleSubmit = async () => {
    if (!file && !formData.texto.trim()) {
      setErrorMsg("Por favor, envie uma imagem do material ou digite o conteúdo.");
      return;
    }

    setStep("loading");
    setErrorMsg(null);

    const submitData = new FormData();
    if (formData.nome) submitData.append("nome", formData.nome);
    if (formData.serie) submitData.append("serie", formData.serie);
    if (formData.tempo) submitData.append("tempo", formData.tempo);
    if (formData.dificuldades) submitData.append("dificuldades", formData.dificuldades);
    if (formData.texto) submitData.append("texto", formData.texto);
    if (file) submitData.append("file", file);

    mutation.mutate(submitData, {
      onSuccess: (data) => {
        if (data.plano) {
          setPlanResult(data.plano);
          setStep("result");
        } else {
          setErrorMsg("Não foi possível gerar o plano. Tente novamente.");
          setStep("form");
        }
      },
      onError: (err) => {
        setErrorMsg(err.message || "Erro de conexão. Tente novamente.");
        setStep("form");
      }
    });
  };

  const handleReset = () => {
    setFile(null);
    setFormData(prev => ({ ...prev, texto: "" }));
    setPlanResult("");
    setErrorMsg(null);
    setStep("form");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen pb-20 pt-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10 max-w-2xl mx-auto"
      >
        <div className="inline-flex items-center justify-center p-3 bg-white shadow-xl shadow-primary/10 rounded-2xl mb-6">
          <GraduationCap className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
          Crie seu <span className="text-gradient">Plano de Estudos</span> com IA
        </h1>
        <p className="text-lg text-muted-foreground">
          Envie uma foto do seu material ou digite o assunto, e nossa inteligência artificial criará um roteiro personalizado perfeito para você.
        </p>
      </motion.div>

      {/* Main Content Area */}
      <div className="w-full max-w-3xl relative">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: FORM */}
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
              className="glass-card rounded-[2rem] p-6 sm:p-8"
            >
              
              {errorMsg && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-destructive">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{errorMsg}</p>
                </div>
              )}

              <div className="space-y-8">
                {/* Section: Profile */}
                <section>
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-foreground">
                    <span className="bg-primary/10 text-primary p-2 rounded-xl"><Sparkles className="w-5 h-5" /></span>
                    Seu Perfil
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Como quer ser chamado?</label>
                      <input
                        type="text"
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        placeholder="Ex: João Silva"
                        className="w-full px-4 py-3 rounded-xl bg-background border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Ano / Série</label>
                      <select
                        name="serie"
                        value={formData.serie}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl bg-background border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-foreground appearance-none"
                      >
                        <option value="">Selecione sua série...</option>
                        {GRADES.map(grade => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" /> Tempo diário
                      </label>
                      <input
                        type="text"
                        name="tempo"
                        value={formData.tempo}
                        onChange={handleInputChange}
                        placeholder="Ex: 2 horas por dia"
                        className="w-full px-4 py-3 rounded-xl bg-background border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-muted-foreground" /> Maiores dificuldades
                      </label>
                      <input
                        type="text"
                        name="dificuldades"
                        value={formData.dificuldades}
                        onChange={handleInputChange}
                        placeholder="Ex: Matemática, focar..."
                        className="w-full px-4 py-3 rounded-xl bg-background border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      />
                    </div>
                  </div>
                </section>

                <hr className="border-border" />

                {/* Section: Content */}
                <section>
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-foreground">
                    <span className="bg-accent/10 text-accent p-2 rounded-xl"><BookOpen className="w-5 h-5" /></span>
                    O que vamos estudar?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Envie uma foto do material OR digite o assunto abaixo.
                  </p>

                  <div className="space-y-6">
                    <ImageUpload 
                      selectedFile={file} 
                      onFileSelect={setFile} 
                    />

                    <div className="flex items-center gap-4">
                      <div className="h-px bg-border flex-1"></div>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ou escreva</span>
                      <div className="h-px bg-border flex-1"></div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-1">
                        <FileText className="w-4 h-4 text-muted-foreground" /> Conteúdo / Assunto
                      </label>
                      <textarea
                        name="texto"
                        value={formData.texto}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder="Ex: Preciso estudar sobre Revolução Francesa e a Era Napoleônica..."
                        className="w-full px-4 py-3 rounded-xl bg-background border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-y"
                      />
                    </div>
                  </div>
                </section>

                <button
                  onClick={handleSubmit}
                  className="w-full relative overflow-hidden group px-6 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5" />
                    Gerar Meu Plano Mágico
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: LOADING */}
          {step === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="glass-card rounded-[2rem] p-12 flex flex-col items-center justify-center min-h-[400px] text-center"
            >
              <div className="relative w-24 h-24 mb-8">
                {/* Glowing animated rings */}
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-[spin_3s_linear_infinite]"></div>
                <div className="absolute inset-2 border-4 border-accent/40 border-t-accent rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Analisando seu material...</h3>
              <p className="text-muted-foreground max-w-sm">
                Nossa IA está lendo o conteúdo, entendendo suas dificuldades e preparando o roteiro perfeito.
              </p>
            </motion.div>
          )}

          {/* STEP 3: RESULT */}
          {step === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full"
            >
              <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Plano gerado com sucesso!
                </div>
                
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-border shadow-sm hover:shadow-md hover:border-primary/30 text-foreground font-medium transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-muted-foreground" />
                  Criar Novo Plano
                </button>
              </div>

              <div className="glass-card rounded-[2rem] p-6 sm:p-10 shadow-xl shadow-primary/5">
                <article className="prose prose-purple prose-headings:font-display prose-h1:text-3xl prose-h1:text-primary prose-h2:text-2xl prose-h2:text-foreground prose-a:text-accent hover:prose-a:text-primary prose-strong:text-foreground max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {planResult}
                  </ReactMarkdown>
                </article>
              </div>
              
              <div className="mt-8 text-center">
                 <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <BookOpen className="w-5 h-5" />
                  Estudar outro assunto
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
