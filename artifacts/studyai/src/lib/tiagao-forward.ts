/**
 * Encaminha conteúdo escrito (busca, chat, pesquisa) para o Tiagão por voz.
 * O input original permanece em modo texto; só após este clique o painel de voz abre.
 */

export type TiagaoForwardPedagogicalMode =
  | "professor"
  | "treinador"
  | "socratico"
  | "corretor"
  | "simulador_banca";

export function forwardToTiagao(
  text: string,
  opts?: { pedagogicalMode?: TiagaoForwardPedagogicalMode },
): void {
  if (typeof window === "undefined") return;
  const trimmed = text.trim();
  if (!trimmed) return;
  window.dispatchEvent(
    new CustomEvent("studyai:ask-tiagao", {
      detail: {
        text: trimmed,
        pedagogicalMode: opts?.pedagogicalMode,
      },
    }),
  );
}

export function openTiagaoVoicePanel(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("studyai:open-voice"));
}

/** Monta prompt de encaminhamento com histórico escrito recente. */
export function buildForwardPromptFromExchange(args: {
  userQuery: string;
  assistantReply: string;
  label?: string;
}): string {
  const label = args.label ?? "troca anterior em texto";
  const parts = [
    `Continuar por voz a partir desta ${label}.`,
    `Pergunta/contexto do usuário: ${args.userQuery.trim()}`,
  ];
  if (args.assistantReply.trim()) {
    parts.push(`Resposta já entregue por escrito (não repita tudo; aprofunde ou adapte para voz): ${args.assistantReply.trim().slice(0, 4000)}`);
  }
  parts.push("Conduza como colega pedagógico em tom natural para voz.");
  return parts.join("\n\n");
}
