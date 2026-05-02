import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Education from "@/pages/Education";
import Testing from "@/pages/Testing";
import Activities from "@/pages/Activities";
import Writing from "@/pages/Writing";
import Universities from "@/pages/Universities";
import UniversityDetail from "@/pages/UniversityDetail";
import Applications from "@/pages/Applications";
import Apply from "@/pages/Apply";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/education" component={Education} />
      <Route path="/testing" component={Testing} />
      <Route path="/activities" component={Activities} />
      <Route path="/writing" component={Writing} />
      <Route path="/universities" component={Universities} />
      <Route path="/universities/:id" component={UniversityDetail} />
      <Route path="/applications" component={Applications} />
      <Route path="/apply/:universityId" component={Apply} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
