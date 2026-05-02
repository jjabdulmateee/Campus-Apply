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
  Building2,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useGetMyDashboard, type DashboardSummary } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "My Profile", icon: User },
  { href: "/education", label: "Education", icon: GraduationCap },
  { href: "/testing", label: "Test Scores", icon: ClipboardList },
  { href: "/activities", label: "Activities", icon: BookOpen },
  { href: "/writing", label: "Essays", icon: PenLine },
  { href: "/universities", label: "University Search", icon: Search },
  { href: "/applications", label: "My Applications", icon: FileText },
  { href: "/documents", label: "Document Locker", icon: FolderLock },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const { data: dashboard } = useGetMyDashboard();
  const { user, logout, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

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
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-sky-50">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        )}
      </div>

      {/* Admin toggle — only visible to admin users */}
      {isAdmin && (
        <div className="px-4 pt-3 pb-1">
          <Link href="/admin/dashboard" onClick={onClose}>
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer">
              <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span className="text-sm font-semibold">Admin Portal</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-60" />
            </div>
          </Link>
        </div>
      )}

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

      {/* Bottom — user info + logout */}
      <div className="px-4 py-4 border-t border-sky-100">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-700 truncate">
              {user?.fullName ?? "Student"}
            </div>
            <div className="text-xs text-slate-400 truncate">{user?.email ?? ""}</div>
            {user?.role === "admin" && (
              <div className="text-xs text-sky-500 font-medium mt-0.5">Admin</div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
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
  const { data: dashboard } = useGetMyDashboard();

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
        {/* Top bar (mobile) */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-sky-100 px-4 py-3 flex items-center gap-3 print:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-sky-50 text-slate-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-lg font-bold text-sky-700">PakApply</div>
        </div>

        {/* Page area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Center: main content */}
          <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
            {(title || subtitle) && (
              <div className="mb-6">
                {title && <h1 className="text-2xl font-bold text-slate-900">{title}</h1>}
                {subtitle && <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>}
              </div>
            )}
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

      <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Application Steps</h3>
        <div className="space-y-2">
          {dashboard.profileSections.map((s) => (
            <div key={s.slug} className="flex items-center gap-3">
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                  s.isComplete ? "border-sky-500 bg-sky-500" : "border-slate-200",
                )}
              >
                {s.isComplete && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-700">{s.name}</div>
                {!s.isComplete && (
                  <Progress value={s.completionPercent} className="h-1 mt-1 bg-slate-100" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-sky-600 rounded-2xl p-4 text-white">
        <div className="text-sm font-semibold mb-1">Need help?</div>
        <div className="text-xs text-sky-100 mb-3">
          Our team is available to assist with your application.
        </div>
        <button className="w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold">
          Contact Support
        </button>
      </div>
    </>
  );
}
