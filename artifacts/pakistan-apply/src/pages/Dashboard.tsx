import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useGetApplicationsSummary,
  useGetMyDashboard,
  useGetMyRecommenders,
  useListMyApplications,
} from "@workspace/api-client-react";
import { Bell, BookOpen, ChevronDown, FileText, Home, Menu, MessageSquare, Search, Users, WalletCards } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetMyDashboard();
  const { data: summary, isLoading: summaryLoading } = useGetApplicationsSummary();
  const { data: applications } = useListMyApplications();
  const { data: recommenders } = useGetMyRecommenders();
  const { user } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);

  const firstName = user?.fullName?.split(" ")[0] ?? "Student";
  const newlySubmitted = (recommenders ?? []).filter((r) => r.status === "submitted");

  return (
    <AppLayout>
      <div className="flex min-h-screen bg-[#F9FAFB]">
        <LeftSidebar user={user} />

        <main className="min-w-0 flex-1 overflow-y-auto border-x border-slate-200 bg-[#F9FAFB] px-4 py-4 md:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <button className="rounded-md border border-slate-200 bg-white p-2">
              <Menu className="h-5 w-5 text-slate-700" />
            </button>
            <div className="text-lg font-semibold text-slate-800">Dashboard</div>
            <button onClick={() => setHelpOpen(true)} className="rounded-md border border-slate-200 bg-white p-2">
              <MessageSquare className="h-5 w-5 text-slate-700" />
            </button>
          </div>

          <div className="mb-4 hidden lg:block">
            <h1 className="text-3xl font-semibold text-slate-800">Dashboard</h1>
          </div>

          <div className="rounded-md border border-slate-200 bg-[#E0F2FE] p-4">
            <div className="flex items-center gap-4">
              <img src="@assets/image_1777791042006.png" alt="" className="hidden h-16 w-24 object-contain md:block" />
              <div>
                <div className="text-2xl font-semibold text-[#1E3A8A]">Good morning, {firstName}!</div>
                <div className="text-sm text-[#4B5563]">Finish your application and stay on top of deadlines.</div>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <CollapsibleCard title="My Application" subtitle={`${dashboard?.profileCompletionPercent ?? 0}/7 sections complete`} open>
              {isLoading ? (
                <Skeleton className="h-36 rounded-md" />
              ) : (
                <div className="space-y-4">
                  <div className="h-4 rounded-full bg-[#F3F4F6]">
                    <div className="h-4 rounded-full bg-[#166534]" style={{ width: `${dashboard?.profileCompletionPercent ?? 0}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {dashboard?.profileSections.slice(0, 7).map((step) => (
                      <div key={step.slug} className="flex min-w-[72px] flex-col items-center gap-1 text-center">
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white",
                            step.isComplete ? "border-[#166534] text-[#166534]" : "border-[#3B82F6] border-dashed text-[#3B82F6]",
                          )}
                        >
                          {step.isComplete ? <div className="h-4 w-4 rounded-full bg-[#166534]" /> : <div className="h-2.5 w-2.5 rounded-full border-2 border-[#3B82F6]" />}
                        </div>
                        <div className="text-xs text-[#4B5563]">{step.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleCard>

            <CollapsibleCard title="My Colleges" subtitle={`${applications?.length ?? 0} colleges on my list`}>
              <div className="space-y-4">
                <div className="h-4 rounded-full bg-[#F3F4F6]">
                  <div className="h-4 rounded-full bg-[#166534]" style={{ width: `${Math.min((applications?.length ?? 0) * 10, 100)}%` }} />
                </div>

                <div className="space-y-3">
                  {(applications ?? []).slice(0, 3).map((app) => (
                    <div key={app.id} className="rounded-md border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-700">{app.universityName}</div>
                          <div className="truncate text-xs text-slate-500">{app.programName}</div>
                        </div>
                        <div className="text-xs text-slate-500">{app.status}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="mb-3 text-sm font-medium text-slate-700">Deadlines</div>
                    <div className="space-y-2 text-sm text-[#4B5563]">
                      {(dashboard?.upcomingDeadlines ?? []).slice(0, 3).map((d, i) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <span className="truncate">{d.universityName}</span>
                          <span className="text-xs text-slate-500">{d.daysLeft} days</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <MiniCalendar />
                </div>
              </div>
            </CollapsibleCard>

            <div className="rounded-md border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-base font-medium text-slate-700">Recent applications</div>
                <Link href="/applications" className="text-sm text-slate-500">View all</Link>
              </div>
              <div className="space-y-2">
                {applications?.slice(0, 3).map((app) => (
                  <div key={app.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-[#F9FAFB] p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-700">{app.universityName}</div>
                      <div className="truncate text-xs text-slate-500">{app.programName}</div>
                    </div>
                    <div className="text-xs text-slate-500">{app.status}</div>
                  </div>
                ))}
              </div>
            </div>

            {summaryLoading ? null : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric label="Total" value={summary?.total ?? 0} />
                <Metric label="Submitted" value={summary?.submitted ?? 0} />
                <Metric label="Accepted" value={summary?.accepted ?? 0} />
                <Metric label="Review" value={summary?.under_review ?? 0} />
              </div>
            )}

            {newlySubmitted.length > 0 && (
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="mb-3 text-sm font-medium text-slate-700">Recommenders</div>
                <div className="space-y-2">
                  {newlySubmitted.map((r) => (
                    <div key={r.id} className="rounded-md border border-slate-200 bg-[#F9FAFB] p-3 text-sm text-slate-600">
                      {r.firstName} {r.lastName} · {r.subjectTaught}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white px-4 py-4 xl:block">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-base font-medium text-slate-700">
              <Bell className="h-4 w-4" />
              Help & support
            </div>
            <div className="mt-4 relative">
              <Input placeholder="Search FAQs" className="pr-10" />
              <Search className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-4 space-y-3">
              <FaqItem question="How can I add a college to My Colleges?" />
              <FaqItem question="Can I change answers after submitting?" />
              <FaqItem question="How many colleges can I add?" />
              <FaqItem question="When is my submission deadline?" />
            </div>
            <button className="mt-4 w-full rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600">
              Contact Support
            </button>
          </div>
        </aside>
      </div>

      <button onClick={() => setHelpOpen(true)} className="fixed bottom-4 right-4 z-40 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm xl:hidden">
        Help
      </button>

      {helpOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 xl:hidden" onClick={() => setHelpOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-[300px] overflow-y-auto bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-base font-medium text-slate-700">Help & support</div>
              <button onClick={() => setHelpOpen(false)} className="text-slate-500">×</button>
            </div>
            <div className="mt-4">
              <Input placeholder="Search FAQs" />
            </div>
            <div className="mt-4 space-y-3">
              <FaqItem question="How can I add a college to My Colleges?" />
              <FaqItem question="Can I change answers after submitting?" />
              <FaqItem question="How many colleges can I add?" />
              <FaqItem question="When is my submission deadline?" />
            </div>
            <button className="mt-4 w-full rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600">
              Contact Support
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function LeftSidebar({ user }: { user: ReturnType<typeof useAuth>["user"] }) {
  const appId = `APP-${String(user?.id ?? "44324581").slice(0, 8).toUpperCase()}`;
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="px-4 py-4">
        <div className="text-xl font-semibold text-slate-900">app</div>
      </div>
      <nav className="px-2">
        <NavHeader label="APPLY" />
        <NavItem icon={Home} label="Dashboard" active />
        <NavItem icon={FileText} label="My Application" />
        <NavItem icon={BookOpen} label="My Colleges" />
        <NavHeader label="EXPLORE" />
        <NavItem icon={Search} label="College search" />
        <NavItem icon={WalletCards} label="Direct admissions" />
        <NavItem icon={Users} label="Financial aid" />
      </nav>
      <div className="mt-auto border-t border-slate-200 p-4">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
              {user?.fullName?.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "ST"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-700">{user?.fullName ?? "Student"}</div>
              <div className="truncate text-xs text-slate-500">{user?.email ?? ""}</div>
              <div className="text-xs text-slate-500">{appId}</div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-500">
          <div className="mb-1">Need help?</div>
          <div className="mb-1">Privacy and legal</div>
          <div>Social links</div>
        </div>
      </div>
    </aside>
  );
}

function NavHeader({ label }: { label: string }) {
  return <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</div>;
}

function NavItem({ icon: Icon, label, active }: { icon: React.ElementType; label: string; active?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-md px-4 py-3 text-sm", active ? "bg-slate-200 text-slate-800" : "text-slate-600")}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}

function CollapsibleCard({ title, subtitle, children, open = false }: { title: string; subtitle?: string; children: React.ReactNode; open?: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-[#E5E7EB] px-4 py-3">
        <div>
          <div className="text-base font-medium text-slate-700">{title}</div>
          {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
        </div>
        <ChevronDown className="h-4 w-4 text-slate-600" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MiniCalendar() {
  const days = Array.from({ length: 35 }, (_, i) => i + 1);
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
        <span>May</span>
        <span className="text-xs">2026</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d}>{d}</div>
        ))}
        {days.map((d) => (
          <div key={d} className="py-1 text-xs text-slate-600">
            {d <= 31 ? d : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqItem({ question }: { question: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="text-sm font-medium text-slate-700">{question}</div>
      <div className="mt-1 text-xs text-slate-500">Read full answer</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-2xl font-semibold text-slate-700">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}