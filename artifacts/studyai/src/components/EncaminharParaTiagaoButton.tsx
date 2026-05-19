import { Mic } from "lucide-react";

type EncaminharParaTiagaoButtonProps = {
  onClick: () => void;
  className?: string;
  /** Texto curto (Home) vs. com “(voz)” (portais docente/notebook). */
  variant?: "default" | "short";
  /** Fundo escuro (cartão de recuperação do simulado). */
  tone?: "light" | "onDark";
  disabled?: boolean;
};

export function EncaminharParaTiagaoButton({
  onClick,
  className = "",
  variant = "default",
  tone = "light",
  disabled = false,
}: EncaminharParaTiagaoButtonProps) {
  const label =
    variant === "short"
      ? "Encaminhar para o Tiagão"
      : "Encaminhar para o Tiagão (voz)";

  const toneClasses =
    tone === "onDark"
      ? "border-white/30 bg-white/15 text-white hover:bg-white/25"
      : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Só depois de ler a resposta escrita — o Tiagão continua por voz"
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses} ${className}`}
    >
      <Mic className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}
