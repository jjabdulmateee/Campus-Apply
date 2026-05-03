import { Link, useLocation, useSearch } from "wouter";
import {
  LayoutDashboard,
  FileText,
  GraduationCap,
  Search,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  LogOut,
  Settings,
  FlaskConical,
  User,
  CircleCheckBig,
  CircleDashed,
  FolderOpen,
  LifeBuoy,
  ClipboardList,
  Clipboard,
} from "lucide-react";
import { useState, useEffect } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import { useGetMyDashboard, type DashboardSummary } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { SettingsModal } from "@/components/SettingsModal";


const sidebarTree = [
  {
    key: "profile",
    label: "Profile",
    href: "/profile?step=legal_name",
    children: [
      { label: "Personal Information", href: "/profile?step=legal_name" },
      { label: "Address", href: "/profile?step=address" },
      { label: "Contact Details", href: "/profile?step=contact" },
      { label: "Demographics", href: "/profile?step=demographics" },
      { label: "Language", href: "/profile?step=language" },
      { label: "Geography and Nationality", href: "/profile?step=geography" },
      { label: "Common App Fee Waiver", href: "/profile?step=fee_waiver" },
    ],
  },
  {
    key: "family",
    label: "Family",
    href: "/profile?step=demographics",
    children: [
      { label: "Background", href: "/profile?step=demographics" },
      { label: "Guardian / Parent", href: "/profile?step=guardian" },
    ],
  },
  {
    key: "education",
    label: "Education",
    href: "/education",
    children: [{ label: "Academic History", href: "/education" }],
  },
  {
    key: "testing",
    label: "Testing",
    href: "/testing",
    children: [{ label: "Test Scores", href: "/testing" }],
  },
  {
    key: "activities",
    label: "Activities",
    href: "/activities",
    children: [{ label: "Activity List", href: "/activities" }],
  },
  {
    key: "writing",
    label: "Writing",
    href: "/writing",
    children: [{ label: "Essays", href: "/writing" }],
  },
  {
    key: "courses",
    label: "Courses & Grades",
    href: "/education",
    children: [{ label: "Courses", href: "/education" }, { label: "Grades", href: "/education" }],
  },
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

      <nav className="flex-1 overflow-y-auto px-0 py-0 flex flex-col">
        <div className="px-3 py-2">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              location === "/dashboard" ? "bg-[#D1D5DB] text-slate-800" : "text-slate-700 hover:bg-slate-100",
            )}
            onClick={onClose}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Dashboard</span>
          </Link>
        </div>

        <div className="border-t border-slate-200">
          <MyApplicationGroup dashboard={dashboard} location={location} onClose={onClose} />
        </div>

        <div className="border-t border-slate-200 px-3 pt-2.5 pb-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 px-2 py-1.5">My List</div>
          <SidebarFlatLink href="/my-colleges" icon={GraduationCap} label="My Colleges" location={location} onClose={onClose} />
          <SidebarFlatLink href="/applications" icon={ClipboardList} label="My Applications" location={location} onClose={onClose} />
        </div>

        <div className="border-t border-slate-200 px-3 pt-2.5 pb-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 px-2 py-1.5">Explore</div>
          <SidebarFlatLink href="/universities" icon={Search} label="College Search" location={location} onClose={onClose} />
          <SidebarFlatLink href="/documents" icon={FolderOpen} label="Documents" location={location} onClose={onClose} />
        </div>

        <div className="mt-auto">
          <HelpSupportSidebar location={location} onClose={onClose} />
        </div>
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

const SLUG_MAP: Record<string, string[]> = {
  profile: ["profile"],
  family: ["family"],
  education: ["education"],
  testing: ["test"],
  activities: ["activity"],
  writing: ["essay"],
  courses: ["course", "grade"],
};

const COURSE_CHILDREN = [
  { label: "Courses", href: "/education/courses?tab=courses" },
  { label: "Grades", href: "/education/courses?tab=courses" },
];

function MyApplicationGroup({
  dashboard,
  location,
  onClose,
}: {
  dashboard: DashboardSummary | undefined;
  location: string;
  onClose?: () => void;
}) {
  const [location_] = useLocation();
  const search = useSearch();
  const fullLocation = `${location_}${search ? `?${search}` : ""}`;

  // Collect all hrefs across the tree (top-level + first-level children)
  const allChildHrefs = sidebarTree.flatMap((item) => [item.href, ...(item.children?.map((c) => c.href) ?? [])]);
  const isAnyChildActive = allChildHrefs.some((href) =>
    href.includes("?") ? fullLocation === href : location_ === href || location_.startsWith(href + "/"),
  );

  const [groupOpen, setGroupOpen] = useState(true);

  // Keep open if a child becomes active
  useEffect(() => {
    if (isAnyChildActive) setGroupOpen(true);
  }, [fullLocation]);

  const profileSections: DashboardSummary["profileSections"] = dashboard?.profileSections ?? [];

  return (
    <div className="border-b border-slate-200">
      {/* Parent header */}
      <button
        type="button"
        onClick={() => setGroupOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold transition-colors select-none",
          isAnyChildActive
            ? "text-sky-700 bg-sky-50"
            : "text-slate-700 hover:bg-slate-50",
        )}
      >
        <Clipboard className="h-4 w-4 shrink-0 text-sky-600" />
        <span className="flex-1 text-left">My Application</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-300",
            groupOpen ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      {/* Animated children container */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          groupOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          {sidebarTree.map((item) => {
            const targets = SLUG_MAP[item.key] ?? [];
            const isComplete = profileSections.some(
              (s) => targets.some((t) => s.slug.includes(t)) && s.isComplete,
            );
            const itemWithChildren =
              item.key === "courses" ? { ...item, children: COURSE_CHILDREN } : item;
            return (
              <SidebarAccordionItem
                key={item.key}
                item={{ ...itemWithChildren, status: isComplete ? "complete" : "incomplete" }}
                location={location}
                onClose={onClose}
                level={1}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SidebarAccordionItem({
  item,
  location,
  onClose,
  level,
}: {
  item: {
    label: string;
    href: string;
    status: "complete" | "incomplete";
    children?: Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }>;
  };
  location: string;
  onClose?: () => void;
  level: number;
}) {
  const search = useSearch();
  const fullLocation = `${location}${search ? `?${search}` : ""}`;

  const descendantHrefs: string[] = [];
  item.children?.forEach((c) => {
    descendantHrefs.push(c.href);
    c.children?.forEach((gc) => descendantHrefs.push(gc.href));
  });

  const isActive =
    fullLocation === item.href ||
    descendantHrefs.includes(fullLocation) ||
    (!item.href.includes("?") && (location === item.href || location.startsWith(item.href + "/")));

  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [fullLocation, isActive]);

  const hasChildren = !!item.children?.length;

  return (
    <div className="border-b border-slate-200">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 text-sm",
          level > 0 && "pl-8",
          isActive ? "bg-[#D1D5DB] text-slate-800 font-semibold" : "text-slate-700",
        )}
      >
        {hasChildren ? (
          <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        {item.status === "complete" ? (
          <CircleCheckBig className="h-4 w-4 text-[#15803d]" />
        ) : (
          <CircleDashed className="h-4 w-4 text-slate-400" />
        )}
        <Link href={item.href} onClick={onClose} className="flex-1">
          {item.label}
        </Link>
      </div>
      {hasChildren && open && (
        <div>
          {item.children!.map((child) => (
            <SidebarSubItem key={child.label} item={child} location={location} onClose={onClose} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarSubItem({
  item,
  location,
  onClose,
  level,
}: {
  item: { label: string; href: string; children?: Array<{ label: string; href: string }> };
  location: string;
  onClose?: () => void;
  level: number;
}) {
  const search = useSearch();
  const fullLocation = `${location}${search ? `?${search}` : ""}`;
  const isActive = item.href.includes("?")
    ? fullLocation === item.href
    : location === item.href || location.startsWith(item.href + "/");
  const [open, setOpen] = useState(isActive);
  const hasChildren = !!item.children?.length;

  return (
    <div>
      <div className={cn("flex items-center gap-2 px-3 py-2 text-sm", level > 0 && "pl-10", isActive && "bg-[#D1D5DB] font-semibold text-slate-800")}>
        {hasChildren ? (
          <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        <span className="w-4" />
        <Link href={item.href} onClick={onClose} className="flex-1">
          {item.label}
        </Link>
      </div>
      {hasChildren && open && (
        <div>
          {item.children!.map((child) => (
            <div key={child.label} className={cn("px-3 py-1.5 text-sm", "pl-14")}>
              <Link href={child.href} onClick={onClose} className={cn(location === child.href ? "font-semibold text-slate-800" : "text-slate-600")}>
                {child.label}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HelpSupportSidebar({
  location,
  onClose,
}: {
  location: string;
  onClose?: () => void;
}) {
  return (
    <div className="border-t border-slate-200 px-3 pt-2.5 pb-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 px-2 py-1.5">Help & Support</div>
      <SidebarFlatLink href="/help?tab=faq" icon={LifeBuoy} label="Help & Support" location={location} onClose={onClose} />
    </div>
  );
}

function SidebarFlatLink({
  href,
  icon: Icon,
  label,
  location,
  onClose,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  location: string;
  onClose?: () => void;
}) {
  const isActive = location === href || location.startsWith(href + "/");
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive ? "bg-[#D1D5DB] text-slate-800" : "text-slate-600 hover:bg-slate-100",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
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
