import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import RoleSelection from "@/pages/RoleSelection";
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
import ReviewApplication from "@/pages/ReviewApplication";
import DocumentLocker from "@/pages/DocumentLocker";
import MyColleges from "@/pages/MyColleges";
import HelpSupport from "@/pages/HelpSupport";
import Recommenders from "@/pages/Recommenders";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminApplicationDetail from "@/pages/AdminApplicationDetail";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) setLocation("/login");
      else if (!isAdmin) setLocation("/dashboard");
    }
  }, [isLoading, isAuthenticated, isAdmin, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) return null;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/role-selection" component={RoleSelection} />
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/profile">{() => <ProtectedRoute component={Profile} />}</Route>
      <Route path="/education">{() => <ProtectedRoute component={Education} />}</Route>
      <Route path="/testing">{() => <ProtectedRoute component={Testing} />}</Route>
      <Route path="/activities">{() => <ProtectedRoute component={Activities} />}</Route>
      <Route path="/writing">{() => <ProtectedRoute component={Writing} />}</Route>
      <Route path="/universities">{() => <ProtectedRoute component={Universities} />}</Route>
      <Route path="/universities/:id">{() => <ProtectedRoute component={UniversityDetail} />}</Route>
      <Route path="/my-colleges">{() => <ProtectedRoute component={MyColleges} />}</Route>
      <Route path="/applications">{() => <ProtectedRoute component={Applications} />}</Route>
      <Route path="/applications/:id/review">{() => <ProtectedRoute component={ReviewApplication} />}</Route>
      <Route path="/apply/:universityId">{() => <ProtectedRoute component={Apply} />}</Route>
      <Route path="/documents">{() => <ProtectedRoute component={DocumentLocker} />}</Route>
      <Route path="/recommenders">{() => <ProtectedRoute component={Recommenders} />}</Route>
      <Route path="/help">{() => <ProtectedRoute component={HelpSupport} />}</Route>
      <Route path="/admin/dashboard">{() => <AdminRoute component={AdminDashboard} />}</Route>
      <Route path="/admin/applications/:id">{() => <AdminRoute component={AdminApplicationDetail} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
