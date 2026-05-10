import { useLocation } from "wouter";
import { Lock, Sparkles } from "lucide-react";
import { startCheckout } from "@/hooks/useSubscription";
import { useState } from "react";

interface PremiumGateProps {
  children: React.ReactNode;
  feature?: string;
  description?: string;
  className?: string;
}

export function PremiumGate({ children, feature, description, className }: PremiumGateProps) {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await startCheckout();
    } catch {
      navigate("/pricing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="pointer-events-none select-none blur-[3px] opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl border-2 border-dashed border-violet-300 z-10">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg">
            <Lock className="w-5 h-5 text-white" />
          </div>
          {feature && (
            <p className="font-bold text-gray-800 text-sm">
              {feature}
            </p>
          )}
          {description && (
            <p className="text-xs text-gray-500 max-w-[200px]">{description}</p>
          )}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="mt-1 flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? "Carregando..." : "Assinar Premium"}
          </button>
        </div>
      </div>
    </div>
  );
}
