import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Sparkles,
  Check,
  X,
  Crown,
  Zap,
  BookOpen,
  Brain,
  BarChart2,
  PenLine,
  Trophy,
  Clock,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";
import { useSubscription, startCheckout, openBillingPortal } from "@/hooks/useSubscription";

const FREE_FEATURES = [
  { label: "1 plano de estudos por mês", limit: true },
  { label: "2 simulados por mês", limit: true },
  { label: "5 flashcards por semana", limit: true },
  { label: "5 mensagens/dia com a Professor Tiagão", limit: true },
  { label: "1 correção de redação por mês", limit: true },
  { label: "Dashboard de desempenho", limit: false },
  { label: "Timer Pomodoro", limit: false },
];

const PREMIUM_FEATURES = [
  { label: "Planos de estudos ilimitados", icon: BookOpen },
  { label: "Simulados ilimitados (adaptativo)", icon: Brain },
  { label: "Flashcards ilimitados com IA avançada", icon: BookOpen },
  { label: "Chat tutor ilimitado", icon: Brain },
  { label: "Correções de redação ilimitadas", icon: PenLine },
  { label: "Resumões estratégicos ilimitados", icon: Sparkles },
  { label: "Dashboard completo + mapa de calor", icon: BarChart2 },
  { label: "Ranking prioritário", icon: Trophy },
  { label: "Histórico completo de planos", icon: Clock },
];

export default function PricingPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setSuccessMessage("🎉 Pagamento realizado com sucesso! Bem-vindo ao StudyAI Premium!");
    } else if (params.get("canceled") === "true") {
      setSuccessMessage("Pagamento cancelado. Você pode tentar novamente quando quiser.");
    }
  }, []);

  const handleCheckout = async () => {
    if (!user) {
      try { sessionStorage.setItem("auth_return_to", "/app/pricing"); } catch {}
      navigate("/sign-in");
      return;
    }
    setCheckoutLoading(true);
    try {
      await startCheckout();
    } catch (err: any) {
      alert(err.message || "Erro ao iniciar pagamento");
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      await openBillingPortal();
    } catch (err: any) {
      alert(err.message || "Erro ao abrir portal");
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-violet-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/app")}
          className="flex items-center gap-1.5 text-gray-500 hover:text-violet-700 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-violet-600" />
          <span className="font-bold text-violet-700 text-sm">StudyAI Premium</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-2xl text-center font-medium text-sm ${
              successMessage.startsWith("🎉")
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-amber-50 border border-amber-200 text-amber-800"
            }`}
          >
            {successMessage}
          </motion.div>
        )}

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            Desbloqueie todo o potencial do StudyAI
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-3">
            Estude mais inteligente,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">
              alcance seus objetivos
            </span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Tudo que você precisa para passar no ENEM, vestibular ou concurso — com IA de ponta.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">

          {/* Free card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm flex flex-col"
          >
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Gratuito</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-gray-900">R$0</span>
                <span className="text-gray-400">/sempre</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Experimente tudo com limites</p>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  <Check className={`w-4 h-4 flex-shrink-0 ${f.limit ? "text-amber-400" : "text-green-500"}`} />
                  <span className="text-gray-700">{f.label}</span>
                  {f.limit && (
                    <span className="ml-auto text-[10px] font-bold text-amber-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">limite</span>
                  )}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate("/app")}
              className="w-full py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              Começar Grátis
            </button>
          </motion.div>

          {/* Pro / Premium card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative bg-gradient-to-br from-violet-600 to-violet-700 rounded-3xl p-6 shadow-xl text-white overflow-hidden flex flex-col md:-mt-4 md:mb-0"
          >
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full" />

            <div className="relative flex flex-col flex-1">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Crown className="w-4 h-4 text-yellow-300" />
                    <p className="text-xs font-semibold text-violet-200 uppercase tracking-widest">Pro</p>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-4xl font-black">R$29</span>
                    <span className="text-2xl font-black">,90</span>
                    <span className="text-violet-300 ml-1">/mês</span>
                  </div>
                  <p className="text-sm text-violet-200 mt-1">Cancele quando quiser</p>
                </div>
                <div className="bg-yellow-400 text-yellow-900 text-xs font-black px-2.5 py-1 rounded-full whitespace-nowrap">
                  + POPULAR
                </div>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {PREMIUM_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white/90">{f.label}</span>
                  </li>
                ))}
              </ul>

              {subLoading ? (
                <div className="w-full py-3 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                </div>
              ) : isPremium ? (
                <div className="space-y-2">
                  <div className="w-full py-3 rounded-2xl bg-white/20 text-center text-white font-bold text-sm flex items-center justify-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-300" />
                    Você é Premium! ✨
                  </div>
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="w-full py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white/80 font-medium text-xs transition-all"
                  >
                    {portalLoading ? "Carregando..." : "Gerenciar assinatura"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-3 rounded-2xl bg-white text-violet-700 font-black text-sm hover:bg-violet-50 hover:scale-[1.02] transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aguarde...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Assinar — R$29,90/mês
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>

          {/* Annual card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl border-2 border-violet-200 p-6 shadow-sm flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-xs font-black px-2.5 py-1 rounded-full border border-emerald-200">
              ECONOMIZE 50%
            </div>
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Anual</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-gray-900">R$179</span>
                <span className="text-xl font-black text-gray-900">,00</span>
                <span className="text-gray-400">/ano</span>
              </div>
              <p className="text-sm text-violet-600 font-semibold mt-1">≈ R$14,92/mês · 6 meses de bônus</p>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {[
                "Tudo do plano Pro ilimitado",
                "Prioridade no suporte",
                "Acesso antecipado a novas funções",
                "Badge exclusivo no ranking",
                "6 meses grátis vs mensal",
              ].map((feat, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-violet-500 flex-shrink-0" />
                  <span className="text-gray-700">{feat}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || subLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black text-sm hover:from-violet-500 hover:to-purple-500 hover:scale-[1.02] transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isPremium ? (
                <><Crown className="w-4 h-4 text-yellow-300" /> Você já é Premium!</>
              ) : checkoutLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</>
              ) : (
                <><Zap className="w-4 h-4" /> Assinar Anual — R$179,00</>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">Cobrança única anual</p>
          </motion.div>

        </div>

        {/* FAQ / guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm text-center"
        >
          <p className="text-2xl mb-2">🔒</p>
          <p className="font-bold text-gray-800 mb-1">Pagamento 100% seguro</p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Processado pelo Stripe. Cancele a qualquer momento diretamente pelo portal de assinatura.
            Sem taxa de cancelamento, sem burocracia.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
