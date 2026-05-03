import AppLayout from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useGetMyDashboard,
  useGetMyRecommenders,
  useListMyApplications,
} from "@workspace/api-client-react";
import {
  Bell,
  ChevronDown,
  Search,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetMyDashboard();
  const { data: applications } = useListMyApplications();
  const { data: recommenders } = useGetMyRecommenders();
  const { user } = useAuth();

  const firstName = user?.fullName?.split(" ")[0] ?? "Student";

  return (
    <AppLayout rightPanel={<HelpPanel />}>
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50 px-6 py-5 shadow-sm">
          <div className="text-2xl font-bold text-sky-900">
            Good afternoon, {firstName}!
          </div>
          <div className="text-sm text-slate-500 mt-1">
            Finish your application and stay on top of deadlines.
          </div>
        </div>

        <CollapsibleCard
          title="My Common Application"
          subtitle={`${dashboard?.profileCompletionPercent ?? 0}% complete`}
        >
          {isLoading ? (
            <Skeleton className="h-36 rounded-xl" />
          ) : (
            <div className="space-y-4">
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-600 transition-all duration-500"
                  style={{ width: `${dashboard?.profileCompletionPercent ?? 0}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                {dashboard?.profileSections.slice(0, 7).map((step) => {
                  const href = sectionHref(step.slug);
                  return (
                    <Link
                      key={step.slug}
                      href={href}
                      className="flex flex-col items-center gap-1.5 text-center group"
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white transition-colors group-hover:border-sky-400",
                          step.isComplete
                            ? "border-green-600"
                            : "border-dashed border-sky-400",
                        )}
                      >
                        {step.isComplete ? (
                          <div className="h-4 w-4 rounded-full bg-green-600" />
                        ) : (
                          <div className="h-2.5 w-2.5 rounded-full border-2 border-sky-400" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-tight">
                        {sectionLabel(step.slug, step.name)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </CollapsibleCard>

        <CollapsibleCard
          title="My Colleges"
          subtitle={`${applications?.length ?? 0} colleges on your list`}
        >
          <div className="space-y-4">
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-600 transition-all"
                style={{ width: `${Math.min((applications?.length ?? 0) * 10, 100)}%` }}
              />
            </div>

            <div className="space-y-2">
              {(applications ?? []).slice(0, 3).map((app) => (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}/review`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 hover:border-sky-200 hover:bg-sky-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-700">
                      {app.universityName}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {app.programName}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full",
                      app.status === "submitted"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700",
                    )}
                  >
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </span>
                </Link>
              ))}
              {(applications ?? []).length === 0 && (
                <div className="text-sm text-slate-400 py-2">
                  No colleges added yet.{" "}
                  <Link href="/universities" className="text-sky-600 hover:underline">
                    Search universities
                  </Link>
                </div>
              )}
            </div>

            {(dashboard?.upcomingDeadlines ?? []).length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Upcoming Deadlines
                </div>
                <div className="space-y-2">
                  {(dashboard?.upcomingDeadlines ?? []).slice(0, 3).map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate text-slate-700">{d.universityName}</span>
                      <span
                        className={cn(
                          "flex-shrink-0 text-xs font-semibold",
                          d.daysLeft <= 7
                            ? "text-red-600"
                            : d.daysLeft <= 14
                              ? "text-amber-600"
                              : "text-slate-400",
                        )}
                      >
                        {d.daysLeft}d left
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/universities"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
            >
              <Search className="h-4 w-4" />
              Search Universities
            </Link>
          </div>
        </CollapsibleCard>
      </div>
    </AppLayout>
  );
}

const FAQ_QUESTIONS = [
  "How do I add a university to my list?",
  "Can I change answers after submitting?",
  "How many universities can I apply to?",
  "When is my submission deadline?",
  "How do I upload my documents?",
  "What test scores are accepted?",
  "Can I apply as a transfer student?",
];

function HelpPanel() {
  const [faqSearch, setFaqSearch] = useState("");
  const filtered = FAQ_QUESTIONS.filter((q) =>
    q.toLowerCase().includes(faqSearch.toLowerCase()),
  );
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Bell className="h-4 w-4 text-sky-600" />
        Help & Support
      </div>
      <div className="relative">
        <Input
          placeholder="Search FAQs…"
          className="pr-10 h-9 text-sm"
          value={faqSearch}
          onChange={(e) => setFaqSearch(e.target.value)}
        />
        <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
      </div>
      <div className="space-y-2">
        {filtered.length > 0 ? (
          filtered.map((q) => <FaqItem key={q} question={q} />)
        ) : (
          <p className="text-xs text-slate-400 py-1">No FAQs match your search.</p>
        )}
      </div>
      <Link
        href="/help"
        className="block w-full text-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      >
        Contact Support
      </Link>
    </div>
  );
}

function FaqItem({ question }: { question: string }) {
  return (
    <Link
      href="/help"
      className="block rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 hover:border-sky-200 hover:bg-sky-50 transition-colors"
    >
      <div className="text-xs font-medium text-slate-700">{question}</div>
      <div className="mt-0.5 text-[11px] text-sky-600">Read answer →</div>
    </Link>
  );
}

function CollapsibleCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="text-left">
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function sectionHref(slug: string) {
  if (slug.includes("profile")) return "/profile";
  if (slug.includes("family")) return "/profile";
  if (slug.includes("education")) return "/education";
  if (slug.includes("grade")) return "/education";
  if (slug.includes("course")) return "/education";
  if (slug.includes("test")) return "/testing";
  if (slug.includes("activity")) return "/activities";
  if (slug.includes("writing") || slug.includes("essay")) return "/writing";
  if (slug.includes("recommender")) return "/recommenders";
  return "/dashboard";
}

function sectionLabel(slug: string, fallback: string) {
  if (slug.includes("profile")) return "Profile";
  if (slug.includes("family")) return "Family";
  if (slug.includes("education")) return "Education";
  if (slug.includes("grade")) return "Courses";
  if (slug.includes("course")) return "Courses";
  if (slug.includes("test")) return "Testing";
  if (slug.includes("activity")) return "Activities";
  if (slug.includes("writing") || slug.includes("essay")) return "Writing";
  if (slug.includes("recommender")) return fallback;
  return fallback;
}
