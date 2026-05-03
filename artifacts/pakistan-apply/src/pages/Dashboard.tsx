import AppLayout from "@/components/AppLayout";
import { Link } from "wouter";
import { useGetMyDashboard, useGetApplicationsSummary, useListMyApplications, useGetMyRecommenders } from "@workspace/api-client-react";
import { APPLICATION_STATUS_COLORS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, GraduationCap, FileText, TrendingUp, ArrowRight, Users, CheckCircle2, Trophy, AlertCircle, Clock3, Sparkles, CalendarDays, MessageSquare, ChevronRight, Plus } from "lucide-react";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetMyDashboard();
  const { data: summary, isLoading: summaryLoading } = useGetApplicationsSummary();
  const { data: applications } = useListMyApplications();
  const { data: recommenders } = useGetMyRecommenders();

  const newlySubmitted = (recommenders ?? []).filter((r) => r.status === "submitted");
  const decidedApps = (applications ?? []).filter((a) =>
    ["accepted", "rejected", "waitlisted"].includes(a.status),
  );
  const acceptedApps = decidedApps.filter((a) => a.status === "accepted");
  const activeApps = (applications ?? []).filter((a) => a.status !== "accepted");

  return (
    <AppLayout title="Dashboard" subtitle="Track your application progress">
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-sky-700 via-sky-600 to-violet-600 p-6 text-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Common App-style dashboard
              </div>
              <h1 className="mt-3 text-2xl font-bold md:text-3xl">Welcome back{dashboard?.recentActivity?.length ? ", keep going" : ""}.</h1>
              <p className="mt-2 max-w-2xl text-sm text-sky-50/90">
                Finish your profile, review your applications, and stay on top of decisions.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[36rem]">
              {summaryLoading ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-2xl bg-white/15" />) : (
                <>
                  <MiniStat label="Total" value={summary?.total ?? 0} />
                  <MiniStat label="Submitted" value={summary?.submitted ?? 0} />
                  <MiniStat label="Accepted" value={summary?.accepted ?? 0} />
                  <MiniStat label="Review" value={summary?.under_review ?? 0} />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(280px,0.8fr)]">
          <div className="space-y-6">
            {isLoading ? (
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-3 w-28" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                </div>
              </div>
            ) : dashboard ? (
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">My Application</h2>
                    <p className="text-sm text-slate-500">Your profile is {dashboard.profileCompletionPercent}% complete</p>
                  </div>
                  <Link href="/profile" className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {dashboard.profileSections.map((step) => (
                    <div key={step.slug} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">{step.name}</span>
                        <span className="text-xs font-semibold text-slate-500">{step.completionPercent}%</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-200">
                        <div className={cn("h-2 rounded-full", step.isComplete ? "bg-sky-600" : "bg-sky-400")} style={{ width: `${step.completionPercent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {summaryLoading
                ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
                : (
                  <>
                    <StatCard icon={FileText} label="Total Applications" value={summary?.total ?? 0} color="sky" />
                    <StatCard icon={CheckCircle} label="Submitted" value={summary?.submitted ?? 0} color="blue" />
                    <StatCard icon={TrendingUp} label="Accepted" value={summary?.accepted ?? 0} color="green" />
                    <StatCard icon={Clock} label="Under Review" value={summary?.under_review ?? 0} color="amber" />
                  </>
                )
              }
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Recent Applications</h2>
                <Link href="/applications" className="text-sm font-semibold text-sky-600">View all</Link>
              </div>
              <div className="mt-4 space-y-3">
                {applications?.slice(0, 3).map((app) => (
                  <Link key={app.id} href="/applications" className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100">
                      <GraduationCap className="w-5 h-5 text-sky-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">{app.universityName}</div>
                      <div className="truncate text-xs text-slate-500">{app.programName}</div>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", APPLICATION_STATUS_COLORS[app.status])}>
                      {APPLICATION_STATUS_LABELS[app.status]}
                    </span>
                  </Link>
                ))}
                {!applications?.length && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    No applications yet.
                  </div>
                )}
              </div>
            </div>

            {acceptedApps.length > 0 && (
              <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-sky-50 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100">
                    <Trophy className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Acceptances</h2>
                    <p className="text-sm text-slate-500">Open your official letter</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {acceptedApps.map((app) => (
                    <div key={app.id} className="flex items-center gap-3 rounded-2xl bg-white/80 p-4">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-800">{app.universityName}</div>
                        <div className="truncate text-xs text-slate-500">{app.programName}</div>
                      </div>
                      <Link href={`/acceptance-letter/${app.id}`} className="rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white">
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <QuickActionPanel />

            {newlySubmitted.length > 0 && (
              <div className="rounded-3xl border border-green-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Recommenders</h2>
                    <p className="text-xs text-slate-500">Letters just came in</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {newlySubmitted.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-green-50 p-3">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-800">{r.firstName} {r.lastName}</div>
                        <div className="truncate text-xs text-slate-500">{r.subjectTaught}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeApps.length > 0 && (
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">Decision updates</h2>
                <div className="mt-4 space-y-2">
                  {activeApps.map((app) => (
                    <div key={app.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                      {app.status === "waitlisted" ? <Clock3 className="w-4 h-4 text-amber-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-800">{app.universityName}</div>
                        <div className="truncate text-xs text-slate-500">{app.programName}</div>
                      </div>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", APPLICATION_STATUS_COLORS[app.status as keyof typeof APPLICATION_STATUS_COLORS])}>
                        {APPLICATION_STATUS_LABELS[app.status as keyof typeof APPLICATION_STATUS_LABELS]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50">
                  <CalendarDays className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Deadlines</h2>
                  <p className="text-xs text-slate-500">Coming up next</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {dashboard?.upcomingDeadlines?.length ? dashboard.upcomingDeadlines.slice(0, 3).map((d, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-bold", d.daysLeft <= 7 ? "bg-red-100 text-red-600" : d.daysLeft <= 14 ? "bg-amber-100 text-amber-600" : "bg-sky-100 text-sky-600")}>
                      {d.daysLeft}d
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-800">{d.universityName}</div>
                      <div className="truncate text-xs text-slate-500">{d.programName}</div>
                    </div>
                  </div>
                )) : <EmptyState title="No deadlines" text="You're all caught up." />}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50">
                  <MessageSquare className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Activity</h2>
                  <p className="text-xs text-slate-500">Your latest updates</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {isLoading ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />) : dashboard?.recentActivity?.length ? dashboard.recentActivity.map((a, i) => (
                  <div key={i} className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-sm font-semibold text-slate-800">{a.action}</div>
                    <div className="text-xs text-slate-500">{a.detail}</div>
                  </div>
                )) : <EmptyState title="No recent activity" text="Your updates will appear here." />}
              </div>
            </div>

            <div className="rounded-3xl bg-sky-600 p-6 text-white shadow-sm">
              <h2 className="text-base font-semibold">Need help?</h2>
              <p className="mt-2 text-sm text-sky-50/90">Our team can help with essays, deadlines, and applications.</p>
              <div className="mt-4 flex gap-3">
                <Link href="/help" className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-sky-700">
                  Support
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link href="/universities" className="inline-flex items-center justify-center rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold text-white">
                  <Plus className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/15 p-4 text-left">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs font-medium text-sky-50/80">{label}</div>
    </div>
  );
}

function QuickActionPanel() {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Quick actions</h2>
      <div className="mt-4 space-y-3">
        <Link href="/profile" className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
          <span className="text-sm font-semibold text-slate-800">Finish profile</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
        <Link href="/universities" className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
          <span className="text-sm font-semibold text-slate-800">Browse universities</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
        <Link href="/applications" className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
          <span className="text-sm font-semibold text-slate-800">Review applications</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="mt-1 text-xs text-slate-500">{text}</div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: "sky" | "blue" | "green" | "amber";
}) {
  const colors = {
    sky: "bg-sky-50 text-sky-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
