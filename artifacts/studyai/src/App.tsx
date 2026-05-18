import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, useRef, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { ptBR } from "@clerk/localizations";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import HomeLegacy from "@/pages/HomeLegacy";
import HistoryPage from "@/pages/History";
import MeusConteudosPage from "@/pages/MeusConteudos";
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
import ProfessorLoginPage from "@/pages/ProfessorLogin";
import ProfessorTurmaPage from "@/pages/ProfessorTurma";
import InstituicaoPage, { InstituicaoLoginPage, InstituicaoConvitePage } from "@/pages/Instituicao";
import GovernoPage from "@/pages/Governo";
import GovernoLoginPage from "@/pages/GovernoLogin";
import SimuladoEnemPage from "@/pages/SimuladoEnem";
import ConcursosPage from "@/pages/Concursos";
import CronogramaPage from "@/pages/Cronograma";
import CadernoPage from "@/pages/Caderno";
import SalaEstudosPage from "@/pages/SalaEstudos";
import AulaIAPage from "@/pages/AulaIA";
import LousaImersivaPage from "@/pages/LousaImersiva";
import TrilhaPage from "@/pages/Trilha";
import NotebookPage from "@/pages/Notebook";
import BaseConhecimentoPage from "@/pages/BaseConhecimento";
import AtividadesAlunoPage from "@/pages/AtividadesAluno";
import ComunicacaoPage from "@/pages/Comunicacao";
import TutorIAPage from "@/pages/TutorIA";
import FazedoresPage from "@/pages/Fazedores";
import NotFound from "@/pages/not-found";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WhatsAppBanner } from "@/components/WhatsAppBanner";
import { VoiceProfessor } from "@/components/VoiceProfessor";
import { CookieConsent } from "@/components/CookieConsent";
import { Logo } from "@/components/Logo";
import { ModeProvider } from "@/context/ModeContext";
import { clearStudyaiAccountLocalCaches, STUDYAI_ACCOUNT_CHANGED } from "@/lib/account-storage";

// Hide the floating Tiagão on full-immersive lesson pages so two voices never overlap.
function VoiceProfessorGate() {
  const [location] = useLocation();
  // Routes where the lesson itself uses TTS — suppress floating professor.
  const HIDE_ON = ["/aula-ia", "/notebook", "/lousa-imersiva", "/professor", "/instituicao", "/admin", "/governo"];
  if (HIDE_ON.some(p => location.startsWith(p))) return null;
  // Wouter path is relative to `base`; marketing home is `/` only (not sign-in/up).
  const path = (location || "/").replace(/\/+$/, "") || "/";
  const isLanding = path === "/";
  return <VoiceProfessor variant={isLanding ? "landing" : "app"} />;
}
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
  // Handle absolute URLs — Clerk sometimes passes full URLs (e.g. after OAuth)
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const url = new URL(path);
      path = url.pathname + url.search + url.hash;
    } catch {
      // ignore, fall through
    }
  }
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
        clearStudyaiAccountLocalCaches();
        qc.clear();
        window.dispatchEvent(new CustomEvent(STUDYAI_ACCOUNT_CHANGED, { detail: { userId } }));
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// Sign-in page
function StudyIALogo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1rem" }}>
      <Logo variant="horizontal" style={{ height: 48, width: "auto" }} />
      <span style={{ fontSize: 12, color: "#64748B", marginTop: 4, letterSpacing: "0.5px" }}>
        Tutor inteligente para o ENEM
      </span>
    </div>
  );
}

function SignInPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "3rem" }}>
      <StudyIALogo />
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} forceRedirectUrl={`${basePath}/app`} />
    </div>
  );
}

// Sign-up page
function SignUpPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "3rem" }}>
      <StudyIALogo />
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} forceRedirectUrl={`${basePath}/app`} />
    </div>
  );
}

// Auth paths that should never be used as a return destination
const AUTH_PATHS = ["/sign-in", "/sign-up"];

function PostLoginRedirect() {
  const { isAuthenticated, isLoading } = useStudyAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    // If user is authenticated but still on an auth page, send to /app
    if (AUTH_PATHS.some((p) => location.startsWith(p))) {
      navigate("/app", { replace: true });
      return;
    }

    try {
      const dest = sessionStorage.getItem("auth_return_to");
      sessionStorage.removeItem("auth_return_to");
      if (dest && dest.startsWith("/") && !dest.startsWith("//")) {
        // Strip basePath prefix (handles empty basePath safely)
        const stripped = basePath && dest.startsWith(basePath)
          ? dest.slice(basePath.length) || "/"
          : dest;
        // Never redirect back to an auth page
        if (!AUTH_PATHS.some((p) => stripped.startsWith(p))) {
          navigate(stripped || "/app", { replace: true });
        }
      }
    } catch {
      // ignore (private browsing may block sessionStorage)
    }
  }, [isAuthenticated, isLoading, location, navigate]);

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

/** Aviso curto antes de enviar rotas legadas para o hub (`/app`). */
function LegacyRedirectNotice({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  useEffect(() => {
    const id = window.setTimeout(() => navigate("/app", { replace: true }), 2000);
    return () => window.clearTimeout(id);
  }, [navigate]);
  return (
    <div className="min-h-[45vh] flex flex-col items-center justify-center gap-4 px-6 text-center font-sans text-slate-700">
      <p className="max-w-md text-sm leading-relaxed">{children}</p>
      <p className="text-xs text-slate-500">Redirecionando para o app…</p>
    </div>
  );
}

// Handles Clerk OAuth callback redirects (e.g. after Google sign-in)
// Clerk redirects to /v1/oauth_callback?err_code=... on failure
function OAuthCallbackPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errCode = params.get("err_code");
    if (errCode) {
      // Store error to show on sign-in page
      sessionStorage.setItem("oauth_error", errCode);
      navigate("/sign-in", { replace: true });
    } else {
      // Success — Clerk handles session, go to app
      navigate("/app", { replace: true });
    }
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "4px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "#6366f1", fontFamily: "sans-serif" }}>Autenticando...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
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
        <Route path="/app/legacy" component={HomeLegacy} />
        {/* Redirect deprecated preview URL — keeps stragglers from hitting 404. */}
        <Route path="/app/preview-layout" component={() => <RedirectTo to="/app" />} />
        <Route path="/app/pricing" component={PricingPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/historico" component={HistoryPage} />
        <Route path="/meus-conteudos" component={MeusConteudosPage} />
        <Route path="/ranking" component={RankingPage} />
        <Route path="/redacao" component={RedacaoPage} />
        <Route path="/mapa" component={MapaPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/privacidade" component={PrivacidadePage} />
        <Route path="/perfil" component={PerfilPage} />
        <Route path="/mapa-mental" component={MapaMentalPage} />
        <Route path="/conquistas" component={ConquistasPage} />
        <Route path="/professor/login" component={ProfessorLoginPage} />
        <Route path="/professor/turma/:id" component={ProfessorTurmaPage} />
        <Route path="/professor" component={ProfessorPage} />
        <Route path="/instituicao/login" component={InstituicaoLoginPage} />
        <Route path="/instituicao/convite/:token" component={InstituicaoConvitePage} />
        <Route path="/instituicao" component={InstituicaoPage} />
        <Route path="/governo/login" component={GovernoLoginPage} />
        <Route path="/governo" component={GovernoPage} />
        <Route path="/simulado-enem" component={SimuladoEnemPage} />
        <Route path="/concursos" component={ConcursosPage} />
        <Route path="/sala-estudos" component={SalaEstudosPage} />
        <Route path="/cronograma" component={CronogramaPage} />
        <Route path="/aula-ia" component={AulaIAPage} />
        <Route path="/lousa-imersiva" component={LousaImersivaPage} />
        <Route path="/caderno" component={CadernoPage} />
        <Route path="/trilha" component={TrilhaPage} />
        <Route path="/notebook" component={NotebookPage} />
        <Route path="/base-conhecimento" component={BaseConhecimentoPage} />
        <Route path="/atividades" component={AtividadesAlunoPage} />
        <Route path="/comunicacao" component={ComunicacaoPage} />
        <Route path="/tutor-ia" component={TutorIAPage} />
        <Route path="/aluno/fazedores" component={FazedoresPage} />
        <Route path="/fazedores" component={() => <RedirectTo to="/aluno/fazedores" />} />
        {/* Clerk OAuth callback — handles Google/GitHub sign-in redirects */}
        <Route path="/v1/oauth_callback" component={OAuthCallbackPage} />
        {/* Aliases: navigation shortcuts */}
        <Route path="/simulado" component={() => <RedirectTo to="/simulado-enem" />} />
        <Route path="/simulado-adaptativo" component={() => (
          <LegacyRedirectNotice>
            Integramos o simulado adaptativo e os treinos guiados no app principal — use o hub e o Simulado ENEM a partir de um único lugar.
          </LegacyRedirectNotice>
        )} />
        <Route path="/flashcards" component={() => (
          <LegacyRedirectNotice>
            Integramos flashcards e revisões espaçadas no app principal — continue pelo hub para acessar tudo com o mesmo login.
          </LegacyRedirectNotice>
        )} />
        <Route path="/pomodoro" component={() => <RedirectTo to="/sala-estudos" />} />
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
      signInForceRedirectUrl={`${basePath}/app`}
      signUpForceRedirectUrl={`${basePath}/app`}
      localization={ptBR}
      appearance={{
        layout: {
          logoPlacement: "none",
        },
        variables: {
          colorPrimary: "#4F46E5",
          colorBackground: "#ffffff",
          fontFamily: "Inter, system-ui, sans-serif",
          borderRadius: "0.75rem",
        },
        elements: {
          logoBox: { display: "none" },
          card: "shadow-xl rounded-2xl border border-slate-100",
          headerTitle: "text-slate-900 font-black text-xl",
          headerSubtitle: "text-slate-500 text-sm",
          socialButtonsBlockButton: "border border-slate-200 rounded-xl font-semibold",
          formButtonPrimary: "bg-violet-600 hover:bg-violet-700 rounded-xl font-bold",
          footerActionLink: "text-violet-600 font-semibold hover:text-violet-700",
          // Hide phone number field — Replit-managed Clerk doesn't support SMS/phone
          // and Brazil (+55) is blocked, causing "not supported" errors when auto-filled
          "formField__phoneNumber": { display: "none" },
          "phoneInputBox": { display: "none" },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WhatsAppBanner />
          <Router />
          <VoiceProfessorGate />
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
      <ModeProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
      </ModeProvider>
    </ErrorBoundary>
  );
}

export default App;
