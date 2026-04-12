import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";

export interface SubscriptionStatus {
  status: "free" | "active" | "inactive" | "trialing" | "past_due";
  isPremium: boolean;
  freeAiUses: number;
  freeAiUsesRemaining: number | null;
  freeAiLimit: number;
}

export function useSubscription() {
  const { user, isLoading: authLoading } = useAuth();

  const query = useQuery<SubscriptionStatus>({
    queryKey: ["subscription-status", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/subscription/status", {
        credentials: "include",
      });
      if (!res.ok) return { status: "free" as const, isPremium: false, freeAiUses: 0, freeAiUsesRemaining: 5, freeAiLimit: 5 };
      return res.json();
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const isLoading = authLoading || (!!user && query.isLoading);

  return {
    isPremium: query.data?.isPremium ?? false,
    status: query.data?.status ?? "free",
    freeAiUses: query.data?.freeAiUses ?? 0,
    freeAiUsesRemaining: query.data?.freeAiUsesRemaining ?? 5,
    freeAiLimit: query.data?.freeAiLimit ?? 5,
    isLoading,
    refetch: query.refetch,
  };
}

export async function startCheckout(): Promise<void> {
  const res = await fetch("/api/subscription/create-checkout", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao iniciar pagamento");
  }
  const { url } = await res.json();
  if (url) window.location.href = url;
}

export async function openBillingPortal(): Promise<void> {
  const res = await fetch("/api/subscription/create-portal", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao abrir portal");
  }
  const { url } = await res.json();
  if (url) window.location.href = url;
}
