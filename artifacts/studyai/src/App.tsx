import { Switch, Route, Router as WouterRouter } from "wouter";
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
import NotFound from "@/pages/not-found";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
