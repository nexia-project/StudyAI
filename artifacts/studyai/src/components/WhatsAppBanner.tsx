import { useState, useEffect } from "react";
import { Smartphone } from "lucide-react";

export function WhatsAppBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isWhatsApp = /WhatsApp/i.test(ua);
    const isInstagram = /Instagram/i.test(ua);
    const isFacebook = /FBAN|FBAV/i.test(ua);
    if (isWhatsApp || isInstagram || isFacebook) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const handleOpen = () => {
    window.open(window.location.href, "_blank");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-[#25D366] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
      <Smartphone className="w-5 h-5 flex-shrink-0" />
      <p className="text-sm font-semibold flex-1 leading-tight">
        Para fazer login, abra o site no Chrome ou Safari.
      </p>
      <button
        onClick={handleOpen}
        className="flex-shrink-0 bg-white text-[#25D366] text-xs font-bold px-3 py-1.5 rounded-full hover:bg-green-50 transition-colors"
      >
        Abrir no navegador
      </button>
    </div>
  );
}
