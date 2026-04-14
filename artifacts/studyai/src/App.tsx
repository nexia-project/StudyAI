import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import HistoryPage from "@/pages/History";
import RankingPage from "@/pages/Ranking";
import DashboardPage from "@/pages/Dashboard";
import RedacaoPage from "@/pages/Redacao";
import MapaPage from "@/pages/Mapa";
import PricingPage from "@/pages/Pricing";
import AdminPage from "@/pages/Admin";
import PrivacidadePage from "@/pages/Privacidade";
import NotFound from "@/pages/not-found";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@workspace/replit-auth-web";
import { WhatsAppBanner } from "@/components/WhatsAppBanner";
import { VoiceProfessor } from "@/components/VoiceProfessor";
import { CookieConsent } from "@/components/CookieConsent";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PostLoginRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    try {
      const dest = sessionStorage.getItem("auth_return_to");
      sessionStorage.removeItem("auth_return_to");
      if (dest && dest.startsWith("/") && !dest.startsWith("//")) {
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        const path = dest.startsWith(base) ? dest.slice(base.length) : dest;
        navigate(path || "/app");
      }
    } catch {
      // ignore (private browsing may block sessionStorage)
    }
  }, [isAuthenticated, isLoading, navigate]);

  return null;
}

// Intercepts 402 (free limit reached) and redirects directly to /pricing
function FetchInterceptor() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const original = window.fetch.bind(window);
    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const res = await original(...args);
      if (res.status === 402) {
        const clone = res.clone();
        clone.json().then((data: any) => {
          if (data?.erro === "limite_gratuito") {
            navigate("/pricing");
          }
        }).catch(() => {});
      }
      return res;
    };
    return () => { window.fetch = original; };
  }, [navigate]);

  return null;
}

function RedirectTo({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => { navigate(to, { replace: true }); }, []);
  return null;
}

function Router() {
  return (
    <>
      <PostLoginRedirect />
      <FetchInterceptor />
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/app" component={Home} />
        <Route path="/app/pricing" component={PricingPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/historico" component={HistoryPage} />
        <Route path="/ranking" component={RankingPage} />
        <Route path="/redacao" component={RedacaoPage} />
        <Route path="/mapa" component={MapaPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/privacidade" component={PrivacidadePage} />
        {/* Aliases: Paula/navigation can send users to these paths */}
        <Route path="/simulado" component={() => <RedirectTo to="/app" />} />
        <Route path="/simulado-adaptativo" component={() => <RedirectTo to="/app" />} />
        <Route path="/flashcards" component={() => <RedirectTo to="/app" />} />
        <Route path="/pomodoro" component={() => <RedirectTo to="/app" />} />
        <Route path="/plano" component={() => <RedirectTo to="/app" />} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WhatsAppBanner />
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <VoiceProfessor />
          <CookieConsent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
