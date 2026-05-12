/**
 * Normaliza destinos legados do Tiagão (<ir:...>) e atalhos para rotas reais do app.
 * Mantém paths já corretos inalterados.
 */
export function normalizeTiagaoLegacyPath(param: unknown): string {
  const raw = typeof param === "string" ? param.trim() : "";
  if (!raw) return "/app";
  const p = raw.startsWith("/") ? raw : `/${raw}`;
  const aliases: Record<string, string> = {
    "/plano": "/app",
    "/home": "/app",
    "/inicio": "/app",
    "/simulado": "/simulado-enem",
    "/vestibular": "/simulado-enem",
    "/enem": "/simulado-enem",
    "/flashcards": "/app",
  };
  return aliases[p] ?? p;
}
