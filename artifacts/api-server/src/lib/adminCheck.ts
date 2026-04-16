function getAdminIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS || "";
  const ids = raw.split(",").map(s => s.trim()).filter(Boolean);
  return new Set(ids);
}

export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return getAdminIds().has(String(userId));
}
