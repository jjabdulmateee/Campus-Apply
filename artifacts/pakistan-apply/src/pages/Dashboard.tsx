import AppLayout from "@/components/AppLayout";
import { Link } from "wouter";
import { useGetMyDashboard, useGetApplicationsSummary, useListMyApplications } from "@workspace/api-client-react";
import { APPLICATION_STATUS_COLORS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, GraduationCap, FileText, TrendingUp, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetMyDashboard();
  const { data: summary, isLoading: summaryLoading } = useGetApplicationsSummary();
  const { data: applications } = useListMyApplications();

  return (
    <AppLayout title="Dashboard" subtitle="Track your application progress">
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryLoading
            ? [1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4">
                  <Skeleton className="w-9 h-9 rounded-xl mb-3" />
                  <Skeleton className="h-7 w-10 mb-1.5" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))
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

        {/* Profile completion + steps */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center flex-1">
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  {i < 5 && <Skeleton className="flex-1 h-0.5 mx-1" />}
                </div>
              ))}
            </div>
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        ) : dashboard ? (
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Application Progress</h2>
              <span className="text-sm font-bold text-sky-600">{dashboard.profileCompletionPercent}% complete</span>
            </div>

            {/* Horizontal step progress */}
            <div className="hidden md:flex items-center gap-0 mb-6">
              {dashboard.profileSections.map((step, i) => (
                <div key={step.slug} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all",
                      step.isComplete
                        ? "border-sky-500 bg-sky-500 text-white"
                        : step.completionPercent > 0
                          ? "border-sky-300 bg-sky-50 text-sky-500"
                          : "border-slate-200 bg-white text-slate-400"
                    )}>
                      {step.isComplete ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className="text-xs text-slate-500 mt-1 whitespace-nowrap">{step.name}</span>
                  </div>
                  {i < dashboard.profileSections.length - 1 && (
                    <div className={cn("flex-1 h-0.5 mx-1 -mt-4", step.isComplete ? "bg-sky-400" : "bg-slate-100")} />
                  )}
                </div>
              ))}
            </div>

            {/* Mobile step list */}
            <div className="md:hidden space-y-2">
              {dashboard.profileSections.map((step) => (
                <div key={step.slug} className="flex items-center gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    step.isComplete ? "border-sky-500 bg-sky-500" : "border-slate-200 bg-white"
                  )}>
                    {step.isComplete && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className={cn("text-sm", step.isComplete ? "text-slate-700 font-medium" : "text-slate-400")}>
                    {step.name}
                  </span>
                  {step.completionPercent > 0 && !step.isComplete && (
                    <span className="ml-auto text-xs text-sky-500">{step.completionPercent}%</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-sky-50 flex flex-wrap gap-3">
              <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700 transition-colors">
                Continue Profile <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/universities" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-sky-600 transition-colors">
                Browse Universities <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : null}

        {/* Recent Applications */}
        {applications && applications.length > 0 && (
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Recent Applications</h2>
              <Link href="/applications" className="text-sm text-sky-600 hover:text-sky-700 font-medium">View all</Link>
            </div>
            <div className="space-y-3">
              {applications.slice(0, 3).map((app) => (
                <Link key={app.id} href="/applications" className="flex items-center gap-4 p-3 rounded-xl bg-sky-50/50 hover:bg-sky-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{app.universityName}</div>
                    <div className="text-xs text-slate-400 truncate">{app.programName}</div>
                  </div>
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0", APPLICATION_STATUS_COLORS[app.status])}>
                    {APPLICATION_STATUS_LABELS[app.status]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions when no applications */}
        {(!applications || applications.length === 0) && !isLoading && (
          <div className="bg-gradient-to-br from-sky-600 to-sky-700 rounded-2xl p-6 text-white">
            <h2 className="text-lg font-semibold mb-2">Start Applying</h2>
            <p className="text-sky-100 text-sm mb-4">
              Browse Pakistan's top universities and add them to your application list.
            </p>
            <Link href="/universities" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-sky-600 font-semibold text-sm hover:bg-sky-50 transition-colors">
              Browse Universities <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Recent activity */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 space-y-3">
            <Skeleton className="h-4 w-32 mb-4" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : dashboard && dashboard.recentActivity.length > 0 ? (
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {dashboard.recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                  <div>
                    <span className="text-sm text-slate-700">{a.action}: </span>
                    <span className="text-sm text-slate-500">{a.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
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
