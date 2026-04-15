import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
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
import PerfilPage from "@/pages/Perfil";
import MapaMentalPage from "@/pages/MapaMental";
import ConquistasPage from "@/pages/Conquistas";
import ProfessorPage from "@/pages/Professor";
import ProfessorTurmaPage from "@/pages/ProfessorTurma";
import InstituicaoPage from "@/pages/Instituicao";
import GovernoPage from "@/pages/Governo";
import NotFound from "@/pages/not-found";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WhatsAppBanner } from "@/components/WhatsAppBanner";
import { VoiceProfessor } from "@/components/VoiceProfessor";
import { CookieConsent } from "@/components/CookieConsent";
import { useStudyAuth } from "@/hooks/useStudyAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
// NOTE: in dev this env var will be empty, in prod it will be automatically set
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

// Invalidate React Query cache when signed-in user changes
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// Sign-in page
function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "4rem" }}>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

// Sign-up page
function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "4rem" }}>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function PostLoginRedirect() {
  const { isAuthenticated, isLoading } = useStudyAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    try {
      const dest = sessionStorage.getItem("auth_return_to");
      sessionStorage.removeItem("auth_return_to");
      if (dest && dest.startsWith("/") && !dest.startsWith("//")) {
        const path = dest.startsWith(basePath) ? dest.slice(basePath.length) : dest;
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
      <ClerkQueryClientCacheInvalidator />
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
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
        <Route path="/perfil" component={PerfilPage} />
        <Route path="/mapa-mental" component={MapaMentalPage} />
        <Route path="/conquistas" component={ConquistasPage} />
        <Route path="/professor" component={ProfessorPage} />
        <Route path="/professor/turma/:id" component={ProfessorTurmaPage} />
        <Route path="/instituicao" component={InstituicaoPage} />
        <Route path="/governo" component={GovernoPage} />
        {/* Aliases: navigation shortcuts */}
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

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl || undefined}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WhatsAppBanner />
          <Router />
          <VoiceProfessor />
          <CookieConsent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ErrorBoundary>
  );
}

export default App;
