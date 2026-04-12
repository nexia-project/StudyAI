import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Cookie, X, Check } from "lucide-react";

const CONSENT_KEY = "studyai_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString() }));
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
      role="dialog"
      aria-label="Consentimento de cookies"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Cookie className="w-5 h-5 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm">Cookies e Privacidade</p>
            <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
              Usamos apenas cookies essenciais para manter sua sessão. Sem rastreamento de terceiros.{" "}
              <button
                onClick={() => navigate("/privacidade")}
                className="text-violet-600 underline hover:text-violet-800"
              >
                Política de Privacidade
              </button>
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={decline}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Recusar
          </button>
          <button
            onClick={accept}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
