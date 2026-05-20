import AppLayout from "@/components/AppLayout";
import { useState } from "react";
import { Link } from "wouter";
import {
  useListMyColleges,
  useRemoveCollege,
  useUpdateCollegeStatus,
  useListMyApplications,
  useWithdrawApplication,
  getListMyCollegesQueryKey,
  getListMyApplicationsQueryKey,
  getGetMyDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import SubmitModal from "@/components/SubmitModal";
import WithdrawApplicationDialog from "@/components/WithdrawApplicationDialog";
import {
  Building2,
  MapPin,
  Trash2,
  ChevronDown,
  ChevronUp,
  Globe,
  CalendarDays,
  Trophy,
  BadgeCheck,
  ArrowRight,
  Search,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Circle,
  Ban,
} from "lucide-react";

const COLLEGE_STATUS_STEPS = [
  { key: "researching", label: "Added", short: "Added" },
  { key: "questions_started", label: "Questions Started", short: "Questions" },
  { key: "recommenders_invited", label: "Recommenders Invited", short: "Recommenders" },
  { key: "review_and_submit", label: "Review & Submit", short: "Review" },
  { key: "submitted", label: "Submitted", short: "Done" },
] as const;

type CollegeStatus = (typeof COLLEGE_STATUS_STEPS)[number]["key"];

const STAGE_ACTIONS: Record<CollegeStatus, { label: string; getHref: (appId?: number) => string | null }> = {
  researching: { label: "Fill Application Questions", getHref: (id) => id ? `/applications/${id}/review` : "/applications" },
  questions_started: { label: "Continue Questions", getHref: (id) => id ? `/applications/${id}/review` : "/applications" },
  recommenders_invited: { label: "Manage Recommenders", getHref: () => "/recommenders" },
  review_and_submit: { label: "Review & Submit →", getHref: (id) => id ? `/applications/${id}/review` : "/applications" },
  submitted: { label: "", getHref: () => null },
};

function CollegeStepper({
  status,
  universityId,
  applicationId,
  applicationStatus,
  onAdvance,
  advancing,
  onWithdraw,
  withdrawing,
}: {
  status: CollegeStatus;
  universityId: number;
  applicationId?: number;
  applicationStatus?: string;
  onAdvance: (universityId: number, nextStatus: CollegeStatus) => void;
  advancing: boolean;
  onWithdraw?: () => void;
  withdrawing?: boolean;
}) {
  const currentIdx = COLLEGE_STATUS_STEPS.findIndex((s) => s.key === status);
  const nextStep = COLLEGE_STATUS_STEPS[currentIdx + 1];

  return (
    <div className="mt-4 space-y-3">
      {/* Stepper */}
      <div className="flex items-start">
        {COLLEGE_STATUS_STEPS.map((step, idx) => {
          const done = idx <= currentIdx;
          const active = idx === currentIdx;
          return (
            <div key={step.key} className="flex items-start flex-1">
              <div className="flex flex-col items-center w-full">
                <div className="flex items-center w-full">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                      done && !active
                        ? "border-sky-500 bg-sky-500"
                        : active
                          ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200"
                          : "border-slate-200 bg-white",
                    )}
                  >
                    {done && !active && <div className="w-2 h-2 rounded-full bg-white" />}
                    {active && <div className="w-2 h-2 rounded-full bg-sky-500" />}
                  </div>
                  {idx < COLLEGE_STATUS_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-0.5",
                        done ? "bg-sky-400" : "bg-slate-100",
                      )}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] mt-1.5 text-center leading-tight w-12",
                    done && !active
                      ? "text-sky-600 font-medium"
                      : active
                        ? "text-slate-700 font-semibold"
                        : "text-slate-300",
                  )}
                >
                  {step.short}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage action + advance */}
      <div className="flex items-center gap-3 flex-wrap">
        {status !== "submitted" && (() => {
          const action = STAGE_ACTIONS[status];
          const href = action.getHref(applicationId);
          return href ? (
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-800 hover:underline"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              {action.label}
            </Link>
          ) : null;
        })()}
        {nextStep && status !== "submitted" && (
          <Button
            size="sm"
            disabled={advancing}
            onClick={() => onAdvance(universityId, nextStep.key)}
            variant="outline"
            className="h-7 text-xs gap-1.5 border-slate-200"
          >
            {advancing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : null}
            Mark done →
          </Button>
        )}
        {status === "submitted" && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Application complete
            </div>
            {applicationStatus === "withdrawn" ? (
              <span className="text-xs text-slate-400 font-medium">Withdrawn</span>
            ) : applicationId && onWithdraw ? (
              <Button
                size="sm"
                variant="outline"
                disabled={withdrawing}
                onClick={onWithdraw}
                className="h-7 text-xs gap-1.5 border-red-100 text-red-500 hover:bg-red-50"
              >
                {withdrawing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                Withdraw Application
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function CollegeCard({
  college,
  applicationId,
  applicationStatus,
  onRemove,
  removing,
  onAdvance,
  advancing,
  onWithdraw,
  withdrawing,
}: {
  college: {
    id: number;
    universityId: number;
    status: string;
    addedAt?: string | null;
    university?: {
      id: number;
      name: string;
      shortName?: string | null;
      city: string;
      province: string;
      type: string;
      website?: string | null;
      applicationDeadline?: string | null;
      deadlineType?: string | null;
      applicationFeeRequired?: boolean | null;
      essayRequired?: boolean | null;
      acceptsTransfer?: boolean | null;
      ranking?: number | null;
      admissionOpen?: boolean | null;
      description?: string | null;
    } | null;
  };
  applicationId?: number;
  applicationStatus?: string;
  onRemove: (universityId: number) => void;
  removing: boolean;
  onAdvance: (universityId: number, status: CollegeStatus) => void;
  advancing: boolean;
  onWithdraw?: () => void;
  withdrawing?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const u = college.university;
  const isTransfer = localStorage.getItem("pakapp_user_type") === "transfer";

  const deadlineLabel =
    college.university?.deadlineType === "early_action"
      ? "Early Action"
      : college.university?.deadlineType === "regular_decision"
        ? "Regular Decision"
        : college.university?.deadlineType === "rolling"
          ? "Rolling Admissions"
          : null;

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-sky-600">
              {u ? (u.shortName ?? u.name).slice(0, 4) : "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold text-slate-800 leading-snug">{u?.name ?? "Unknown University"}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {u ? `${u.city}, ${u.province}` : "—"}
                  </span>
                  {u?.admissionOpen && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Open</span>
                  )}
                  {deadlineLabel && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">{deadlineLabel}</span>
                  )}
                  {isTransfer && u?.acceptsTransfer && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5" /> Transfer Friendly
                    </span>
                  )}
                  {u?.ranking && (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> #{u.ranking}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setExpanded((e) => !e)}
                  className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-sky-600 transition-colors"
                  title={expanded ? "Collapse" : "View Details"}
                >
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => onRemove(college.universityId)}
                  disabled={removing}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                  title="Remove from list"
                >
                  {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Stepper */}
            <CollegeStepper
              status={college.status as CollegeStatus}
              universityId={college.universityId}
              applicationId={applicationId}
              applicationStatus={applicationStatus}
              onAdvance={onAdvance}
              advancing={advancing}
              onWithdraw={onWithdraw}
              withdrawing={withdrawing}
            />
          </div>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && u && (
        <div className="border-t border-sky-50 bg-sky-50/30 px-5 py-4 space-y-3">
          {u.description && (
            <p className="text-xs text-slate-500 leading-relaxed">{u.description}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {u.applicationDeadline && (
              <DetailItem icon={CalendarDays} label="Application Deadline" value={u.applicationDeadline} />
            )}
            {deadlineLabel && (
              <DetailItem icon={Circle} label="Deadline Type" value={deadlineLabel} />
            )}
            <DetailItem
              icon={BadgeCheck}
              label="Application Fee"
              value={u.applicationFeeRequired === false ? "No fee required" : "Fee required"}
              valueColor={u.applicationFeeRequired === false ? "text-green-600" : "text-slate-600"}
            />
            <DetailItem
              icon={BadgeCheck}
              label="Personal Essay"
              value={u.essayRequired === false ? "No essay required" : "Essay required"}
              valueColor={u.essayRequired === false ? "text-green-600" : "text-slate-600"}
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            {u.website && (
              <a
                href={u.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-medium"
              >
                <Globe className="w-3.5 h-3.5" /> Visit Website
              </a>
            )}
            <Link
              href={`/universities/${u.id}`}
              className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-medium"
            >
              <Building2 className="w-3.5 h-3.5" /> View Programs
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  valueColor = "text-slate-700",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{label}</div>
        <div className={cn("text-xs font-semibold mt-0.5", valueColor)}>{value}</div>
      </div>
    </div>
  );
}

interface SubmitTarget {
  universityId: number;
  universityName: string;
  feeRequired: boolean | null | undefined;
  programId?: number;
}

export default function MyColleges() {
  const { data: colleges, isLoading } = useListMyColleges();
  const { data: applications } = useListMyApplications();
  const qc = useQueryClient();

  const appByUniversity = new Map(
    (applications ?? []).map((a) => [a.universityId, a]),
  );
  const { toast } = useToast();
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [advancingId, setAdvancingId] = useState<number | null>(null);
  const [submitTarget, setSubmitTarget] = useState<SubmitTarget | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<{
    applicationId: number;
    universityName: string;
  } | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListMyCollegesQueryKey() });
    qc.invalidateQueries({ queryKey: getListMyApplicationsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMyDashboardQueryKey() });
  };

  const { mutate: remove } = useRemoveCollege({
    mutation: {
      onSuccess: () => {
        invalidate();
        setRemovingId(null);
        toast({ title: "College removed from your list" });
      },
      onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
    },
  });

  const { mutate: advance } = useUpdateCollegeStatus({
    mutation: {
      onSuccess: () => {
        invalidate();
        setAdvancingId(null);
        toast({ title: "Progress updated" });
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    },
  });

  const { mutate: withdrawApp, isPending: withdrawing } = useWithdrawApplication({
    mutation: {
      onSuccess: () => {
        invalidate();
        setWithdrawingId(null);
        setWithdrawTarget(null);
        toast({ title: "Application withdrawn" });
      },
      onError: () => {
        setWithdrawingId(null);
        toast({ title: "Withdraw failed", variant: "destructive" });
      },
    },
  });

  const handleRemove = (universityId: number) => {
    setRemovingId(universityId);
    remove({ universityId });
  };

  const handleAdvance = (universityId: number, status: CollegeStatus) => {
    if (status === "submitted") {
      const college = colleges?.find((c) => c.universityId === universityId);
      const linkedApp = appByUniversity.get(universityId);
      setSubmitTarget({
        universityId,
        universityName: college?.university?.name ?? "University",
        feeRequired: college?.university?.applicationFeeRequired,
        programId: linkedApp?.programId,
      });
      return;
    }
    setAdvancingId(universityId);
    advance({ universityId, data: { status } });
  };

  // Stats
  const total = colleges?.length ?? 0;
  const submitted = colleges?.filter((c) => c.status === "submitted").length ?? 0;
  const inProgress = colleges?.filter(
    (c) => c.status !== "researching" && c.status !== "submitted",
  ).length ?? 0;

  return (
    <AppLayout title="My Universities" subtitle="Track your university list and application progress">
      <div className="space-y-5">
        {/* Summary chips */}
        {total > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "On My List", value: total, color: "sky" },
              { label: "In Progress", value: inProgress, color: "amber" },
              { label: "Completed", value: submitted, color: "green" },
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
                      : s.color === "amber"
                        ? "text-amber-600"
                        : "text-green-600",
                  )}
                >
                  {s.value}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* College list */}
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white rounded-2xl" />
            ))}
          </div>
        ) : colleges && colleges.length > 0 ? (
          <div className="space-y-3">
            {colleges.map((college) => {
              const app = appByUniversity.get(college.universityId);
              return (
              <CollegeCard
                key={college.id}
                college={college}
                applicationId={app?.id}
                applicationStatus={app?.status}
                onRemove={handleRemove}
                removing={removingId === college.universityId}
                onAdvance={handleAdvance}
                advancing={advancingId === college.universityId}
                withdrawing={withdrawing && withdrawingId === app?.id}
                onWithdraw={
                  app &&
                  ["submitted", "under_review", "waitlisted"].includes(app.status)
                    ? () =>
                        setWithdrawTarget({
                          applicationId: app.id,
                          universityName: college.university?.name ?? "University",
                        })
                    : undefined
                }
              />
            );})}
          </div>
        ) : (
          // Empty state
          <div className="bg-white rounded-2xl border border-dashed border-sky-200 p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-sky-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">Your university list is empty</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
              Search and save universities to track your applications in one place.
            </p>
            <Link
              href="/universities"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 transition-colors"
            >
              <Search className="w-4 h-4" /> Find your first university
            </Link>
          </div>
        )}
      </div>

      {submitTarget && (
        <SubmitModal
          universityId={submitTarget.universityId}
          universityName={submitTarget.universityName}
          feeRequired={submitTarget.feeRequired}
          programId={submitTarget.programId}
          onClose={() => setSubmitTarget(null)}
          onSuccess={() => {
            invalidate();
            setSubmitTarget(null);
          }}
        />
      )}

      <WithdrawApplicationDialog
        open={withdrawTarget !== null}
        onOpenChange={(open) => {
          if (!open) setWithdrawTarget(null);
        }}
        universityName={withdrawTarget?.universityName ?? "this university"}
        isPending={withdrawing}
        onConfirm={() => {
          if (!withdrawTarget) return;
          setWithdrawingId(withdrawTarget.applicationId);
          withdrawApp({ applicationId: withdrawTarget.applicationId });
        }}
      />
    </AppLayout>
  );
}
