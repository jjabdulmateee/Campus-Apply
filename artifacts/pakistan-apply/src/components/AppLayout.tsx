import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  User,
  GraduationCap,
  ClipboardList,
  BookOpen,
  PenLine,
  Search,
  FileText,
  FolderLock,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Settings,
  LifeBuoy,
  Bookmark,
  Users,
  FlaskConical,
} from "lucide-react";
import { useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import { useGetMyDashboard, type DashboardSummary } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { SettingsModal } from "@/components/SettingsModal";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "My Profile", icon: User },
  { href: "/education", label: "Education", icon: GraduationCap },
  { href: "/testing", label: "Test Scores", icon: ClipboardList },
  { href: "/activities", label: "Activities", icon: BookOpen },
  { href: "/writing", label: "Essays", icon: PenLine },
  { href: "/recommenders", label: "Recommenders", icon: Users },
  { href: "/universities", label: "University Search", icon: Search },
  { href: "/my-colleges", label: "My Colleges", icon: Bookmark },
  { href: "/applications", label: "My Applications", icon: FileText },
  { href: "/documents", label: "Document Locker", icon: FolderLock },
  { href: "/help", label: "Help & Support", icon: LifeBuoy },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const { data: dashboard } = useGetMyDashboard();
  const { user, logout, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="h-full flex flex-col bg-white/80 backdrop-blur-xl border-r border-sky-100">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-sky-100 flex items-center justify-between">
        <div>
          <div className="text-xl font-bold text-sky-700 tracking-tight">PakApply</div>
          <div className="text-xs text-slate-400 mt-0.5">College Portal</div>
        </div>
        <div className="flex items-center gap-1">
          {!onClose && <NotificationBell />}
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-sky-50">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Profile Completion */}
      {dashboard && (
        <div className="px-4 py-4 border-b border-sky-50">
          <div className="bg-sky-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-sky-700">Profile Complete</span>
              <span className="text-xs font-bold text-sky-600">{dashboard.profileCompletionPercent}%</span>
            </div>
            <Progress value={dashboard.profileCompletionPercent} className="h-1.5 bg-sky-100" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = location === href || location.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                  : "text-slate-600 hover:bg-sky-50 hover:text-sky-700",
              )}
              onClick={onClose}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — user card */}
      <div className="px-3 py-3 border-t border-sky-100">
        <div className="rounded-2xl bg-sky-50 p-3 space-y-3">
          {/* Avatar + name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-200 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-white shadow-sm">
              {user?.avatarUrl ? (
                <img
                  src={`/api/storage/objects/${user.avatarUrl}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : user?.fullName ? (
                <span className="text-sm font-bold text-sky-700">
                  {user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                </span>
              ) : (
                <User className="w-5 h-5 text-sky-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate">
                {user?.fullName ?? "Student"}
              </div>
              <div className="text-xs text-slate-400 truncate">{user?.email ?? ""}</div>
              {user?.role === "admin" && (
                <span className="inline-block text-[10px] font-semibold text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded-md mt-0.5">Admin</span>
              )}
            </div>
          </div>

          {/* Action row */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white text-xs font-medium text-slate-600 hover:bg-sky-100 hover:text-sky-700 transition-all shadow-sm"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AppLayout({ children, rightPanel, title, subtitle }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [betaDismissed, setBetaDismissed] = useState(() =>
    localStorage.getItem("pakapp_beta_dismissed") === "1"
  );
  const { data: dashboard } = useGetMyDashboard();

  const dismissBeta = () => {
    localStorage.setItem("pakapp_beta_dismissed", "1");
    setBetaDismissed(true);
  };

  return (
    <div className="min-h-screen bg-sky-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 z-50 transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto lg:flex-shrink-0 print:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Beta banner */}
        {!betaDismissed && (
          <div className="bg-gradient-to-r from-violet-600 to-sky-600 text-white px-4 py-2 flex items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2 text-xs">
              <FlaskConical className="w-3.5 h-3.5 flex-shrink-0 opacity-90" />
              <span className="font-semibold">Beta</span>
              <span className="opacity-80 hidden sm:inline">
                PakApply is in public beta — some features are still in development. Your feedback helps us improve.
              </span>
              <span className="opacity-80 sm:hidden">PakApply is in public beta.</span>
            </div>
            <button
              onClick={dismissBeta}
              className="p-1 rounded hover:bg-white/20 transition-colors flex-shrink-0"
              aria-label="Dismiss beta banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top bar (mobile) */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-sky-100 px-4 py-3 flex items-center gap-3 print:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-sky-50 text-slate-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-lg font-bold text-sky-700 flex-1">PakApply</div>
          <NotificationBell />
        </div>

        {/* Page area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Center: main content */}
          <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
            {children}
          </main>

          {/* Right panel */}
          {(rightPanel || dashboard) && (
            <aside className="hidden xl:flex flex-col w-72 flex-shrink-0 px-4 py-6 space-y-4 overflow-y-auto">
              {rightPanel ?? <DefaultRightPanel dashboard={dashboard} />}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

function DefaultRightPanel({
  dashboard,
}: {
  dashboard: DashboardSummary | undefined;
}) {
  if (!dashboard) return null;

  return (
    <>
      {dashboard.upcomingDeadlines.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Upcoming Deadlines</h3>
          <div className="space-y-3">
            {dashboard.upcomingDeadlines.map((d, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold",
                    d.daysLeft <= 7
                      ? "bg-red-100 text-red-600"
                      : d.daysLeft <= 14
                        ? "bg-amber-100 text-amber-600"
                        : "bg-sky-100 text-sky-600",
                  )}
                >
                  {d.daysLeft}d
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-700">{d.universityName}</div>
                  <div className="text-xs text-slate-400">{d.programName}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
