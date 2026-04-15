import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Zap, Star, BookOpen } from "lucide-react";
import { startCheckout } from "@/hooks/useSubscription";

export const FREE_LIMIT_EVENT = "studyai:limit-reached";

export function triggerLimitModal() {
  window.dispatchEvent(new CustomEvent(FREE_LIMIT_EVENT));
}

export function FreeLimitModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(FREE_LIMIT_EVENT, handler);
    return () => window.removeEventListener(FREE_LIMIT_EVENT, handler);
  }, []);

  async function handleUpgrade() {
    setLoading(true);
    try {
      await startCheckout();
    } catch {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="relative bg-gray-900 border border-purple-500/40 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-purple-500/20 text-center"
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: "spring", duration: 0.4 }}
          >
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-purple-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Você usou seus 5 estudos gratuitos 🎓
            </h2>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">
              Você explorou o StudyAI e viu como ele pode transformar seus estudos.
              Agora é hora de ir a fundo — sem limite nenhum.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6 text-left">
              {[
                { icon: <BookOpen className="w-4 h-4 text-green-400" />, text: "Planos ilimitados" },
                { icon: <Zap className="w-4 h-4 text-yellow-400" />, text: "Flashcards ilimitados" },
                { icon: <Star className="w-4 h-4 text-blue-400" />, text: "Simulados ilimitados" },
                { icon: <Zap className="w-4 h-4 text-pink-400" />, text: "Professor Tiagão voz" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  {item.icon}
                  <span className="text-sm text-gray-300">{item.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all disabled:opacity-60"
            >
              {loading ? "Redirecionando..." : "Assinar por R$29,90/mês →"}
            </button>
            <p className="text-gray-500 text-xs mt-3">
              Cancele quando quiser · Garantia de 7 dias
            </p>

            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 text-xl"
            >
              ×
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
