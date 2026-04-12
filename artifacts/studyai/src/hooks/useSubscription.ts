import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";

export interface SubscriptionStatus {
  status: "free" | "active" | "inactive" | "trialing" | "past_due";
  isPremium: boolean;
}

export function useSubscription() {
  const { user, isLoading: authLoading } = useAuth();

  const query = useQuery<SubscriptionStatus>({
    queryKey: ["subscription-status", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/subscription/status", {
        credentials: "include",
      });
      if (!res.ok) return { status: "free" as const, isPremium: false };
      return res.json();
    },
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  // isLoading must be true while auth is still loading OR while subscription query is fetching.
  // Without this, pages see isPremium=false before the auth resolves and flash the paywall.
  const isLoading = authLoading || (!!user && query.isLoading);

  return {
    isPremium: query.data?.isPremium ?? false,
    status: query.data?.status ?? "free",
    isLoading,
    refetch: query.refetch,
  };
}

export async function startCheckout(): Promise<void> {
  const res = await fetch("/api/subscription/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao iniciar pagamento");
  }
  const { url } = await res.json();
  if (url) window.location.href = url;
}

export async function openBillingPortal(): Promise<void> {
  const res = await fetch("/api/subscription/create-portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao abrir portal");
  }
  const { url } = await res.json();
  if (url) window.location.href = url;
}
