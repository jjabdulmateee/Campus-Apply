import AppLayout from "@/components/AppLayout";
import { Link } from "wouter";
import {
  useListMyApplications,
  useGetApplicationsSummary,
  useSubmitApplication,
  useWithdrawApplication,
  getListMyApplicationsQueryKey,
  getGetApplicationsSummaryQueryKey,
  getGetMyDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { APPLICATION_STATUS_COLORS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { GraduationCap, Loader2, Send, Trash2, FileText, Plus, ClipboardCheck } from "lucide-react";
import { useState } from "react";

export default function Applications() {
  const { data: applications, isLoading } = useListMyApplications();
  const { data: summary } = useGetApplicationsSummary();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListMyApplicationsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetApplicationsSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMyDashboardQueryKey() });
  };

  const { mutate: submit, isPending: submitting } = useSubmitApplication({
    mutation: {
      onSuccess: () => {
        invalidate();
        setSubmittingId(null);
        toast({ title: "Application submitted" });
      },
      onError: () => toast({ title: "Submit failed", variant: "destructive" }),
    },
  });

  const { mutate: withdraw, isPending: withdrawing } = useWithdrawApplication({
    mutation: {
      onSuccess: () => {
        invalidate();
        setWithdrawingId(null);
        toast({ title: "Application withdrawn" });
      },
      onError: () => toast({ title: "Withdraw failed", variant: "destructive" }),
    },
  });

  return (
    <AppLayout title="My Applications" subtitle="Track and manage all your university applications">
      <div className="space-y-5">
        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total", value: summary.total, color: "sky" },
              { label: "Submitted", value: summary.submitted, color: "blue" },
              { label: "Accepted", value: summary.accepted, color: "green" },
              { label: "Under Review", value: summary.under_review, color: "amber" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4 text-center"
              >
                <div
                  className={cn(
                    "text-2xl font-bold",
                    s.color === "sky"
                      ? "text-sky-600"
                      : s.color === "blue"
                        ? "text-blue-600"
                        : s.color === "green"
                          ? "text-green-600"
                          : "text-amber-600",
                  )}
                >
                  {s.value}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Application list */}
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white rounded-2xl" />
            ))}
          </div>
        ) : applications && applications.length > 0 ? (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-6 h-6 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-slate-800">{app.universityName}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{app.programName}</p>
                        {app.appliedAt && (
                          <p className="text-xs text-slate-400 mt-1">
                            Started:{" "}
                            {new Date(app.appliedAt).toLocaleDateString("en-PK", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        )}
                        {app.submittedAt && (
                          <p className="text-xs text-slate-400">
                            Submitted:{" "}
                            {new Date(app.submittedAt).toLocaleDateString("en-PK", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0",
                          APPLICATION_STATUS_COLORS[app.status],
                        )}
                      >
                        {APPLICATION_STATUS_LABELS[app.status]}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      {app.status === "draft" && (
                        <>
                          <Link
                            href={`/applications/${app.id}/review`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            Review &amp; Submit
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSubmittingId(app.id);
                              submit({ applicationId: app.id });
                            }}
                            disabled={submitting && submittingId === app.id}
                            className="text-xs gap-1.5 border-sky-200 text-sky-600 hover:bg-sky-50"
                          >
                            {submitting && submittingId === app.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            Quick Submit
                          </Button>
                        </>
                      )}
                      {app.status !== "withdrawn" && app.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setWithdrawingId(app.id);
                            withdraw({ applicationId: app.id });
                          }}
                          disabled={withdrawing && withdrawingId === app.id}
                          className="text-xs border-red-100 text-red-500 hover:bg-red-50 gap-1.5"
                        >
                          {withdrawing && withdrawingId === app.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Withdraw
                        </Button>
                      )}
                      <Link
                        href={`/universities/${app.universityId}`}
                        className="text-xs text-sky-500 hover:text-sky-600 font-medium"
                      >
                        View University
                      </Link>
                      {app.status !== "draft" && (
                        <Link
                          href={`/applications/${app.id}/review`}
                          className="text-xs text-sky-500 hover:text-sky-600 font-medium"
                        >
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-sky-200 p-16 text-center">
            <FileText className="w-10 h-10 text-sky-200 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-slate-700 mb-1">No applications yet</h3>
            <p className="text-sm text-slate-400 mb-5">
              Browse universities and apply to programs that interest you.
            </p>
            <Link
              href="/universities"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Find Universities
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
