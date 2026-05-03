import AppLayout from "@/components/AppLayout";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetMyRecommenders,
  useInviteRecommender,
  useDeleteRecommender,
  getGetMyRecommendersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Users,
  Plus,
  Trash2,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  BookOpen,
  X,
} from "lucide-react";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Valid email required"),
  subjectTaught: z.string().min(1, "Required"),
  relationship: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const RELATIONSHIPS = [
  "Teacher / Instructor",
  "Class Teacher",
  "Principal / Vice Principal",
  "Tutor",
  "Academic Advisor",
  "Department Head",
  "Other",
];

const STATUS_CONFIG = {
  pending: {
    label: "Invitation Pending",
    icon: Clock,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  submitted: {
    label: "Letter Submitted",
    icon: CheckCircle2,
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  declined: {
    label: "Declined",
    icon: XCircle,
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    dot: "bg-red-400",
  },
} as const;

export default function Recommenders() {
  const { data: recommenders = [], isLoading } = useGetMyRecommenders();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { mutate: invite, isPending: isInviting } = useInviteRecommender({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyRecommendersQueryKey() });
        toast({
          title: "Invitation sent",
          description: "Your recommender has been notified.",
        });
        setShowForm(false);
        reset();
      },
      onError: () => {
        toast({ title: "Failed to invite recommender", variant: "destructive" });
      },
    },
  });

  const { mutate: remove } = useDeleteRecommender({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyRecommendersQueryKey() });
        toast({ title: "Recommender removed" });
        setDeletingId(null);
      },
      onError: () => {
        toast({ title: "Failed to remove recommender", variant: "destructive" });
        setDeletingId(null);
      },
    },
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    invite({ data });
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    remove({ recommenderId: id });
  };

  const submittedCount = recommenders.filter((r) => r.status === "submitted").length;
  const pendingCount = recommenders.filter((r) => r.status === "pending").length;

  return (
    <AppLayout
      title="Recommenders"
      subtitle="Invite teachers and mentors to submit letters of recommendation"
    >
      {/* FERPA Notice */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 mb-6 flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <BookOpen className="w-4 h-4 text-sky-600" />
        </div>
        <div>
          <div className="text-sm font-semibold text-sky-800 mb-1">FERPA Waiver Notice</div>
          <p className="text-xs text-sky-700 leading-relaxed">
            By inviting recommenders through Campus Apply, you waive your right to view their
            confidential letters of recommendation. Recommenders can submit letters directly
            through a secure link sent to their email address. Most universities prefer waived
            access as it increases the credibility of recommendations.
          </p>
        </div>
      </div>

      {/* Stats bar */}
      {recommenders.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Invited", value: recommenders.length, color: "text-slate-700" },
            { label: "Pending", value: pendingCount, color: "text-amber-600" },
            { label: "Submitted", value: submittedCount, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <div className={cn("text-2xl font-black", color)}>{value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recommender cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="h-4 w-48 bg-slate-100 rounded mb-3" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : recommenders.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-sky-400" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">No recommenders yet</h3>
          <p className="text-sm text-slate-400 mb-5">
            Invite up to 3 teachers, mentors, or academic advisors to write letters for your applications.
          </p>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-sky-600 hover:bg-sky-700 rounded-xl gap-2"
          >
            <Plus className="w-4 h-4" />
            Invite Your First Recommender
          </Button>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {recommenders.map((rec) => {
            const cfg = STATUS_CONFIG[rec.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0 text-sky-700 font-black text-sm">
                  {rec.firstName[0]}{rec.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">
                        {rec.firstName} {rec.lastName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{rec.subjectTaught}</div>
                      {rec.relationship && (
                        <div className="text-xs text-slate-400">{rec.relationship}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(rec.id)}
                      disabled={deletingId === rec.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      {deletingId === rec.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Mail className="w-3 h-3" />
                      {rec.email}
                    </div>
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                      cfg.bg, cfg.border, cfg.text,
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </div>
                  </div>

                  {rec.status === "pending" && (
                    <div className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                      Waiting for {rec.firstName} to submit their recommendation letter via email link.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add button (when list exists and not showing form) */}
      {recommenders.length > 0 && recommenders.length < 3 && !showForm && (
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
          className="w-full rounded-2xl border-dashed border-sky-200 text-sky-600 hover:bg-sky-50 gap-2 h-12"
        >
          <Plus className="w-4 h-4" />
          Invite Another Recommender
        </Button>
      )}

      {recommenders.length >= 3 && !showForm && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-center text-sm text-slate-500">
          You have reached the maximum of 3 recommenders.
        </div>
      )}

      {/* Invite form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-sky-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                <Send className="w-4 h-4 text-sky-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Invite a Recommender</h2>
            </div>
            <button
              onClick={() => { setShowForm(false); reset(); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="First Name" error={errors.firstName?.message} required>
                <Input
                  {...register("firstName")}
                  placeholder="Ahmad"
                  className="border-slate-200 focus:border-sky-400"
                />
              </Field>
              <Field label="Last Name" error={errors.lastName?.message} required>
                <Input
                  {...register("lastName")}
                  placeholder="Khan"
                  className="border-slate-200 focus:border-sky-400"
                />
              </Field>
            </div>

            <Field label="Email Address" error={errors.email?.message} required>
              <Input
                {...register("email")}
                type="email"
                placeholder="teacher@school.edu.pk"
                className="border-slate-200 focus:border-sky-400"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Subject Taught" error={errors.subjectTaught?.message} required>
                <Input
                  {...register("subjectTaught")}
                  placeholder="Mathematics, Physics..."
                  className="border-slate-200 focus:border-sky-400"
                />
              </Field>
              <Field label="Your Relationship">
                <Select
                  value={watch("relationship") ?? ""}
                  onValueChange={(v) => setValue("relationship", v)}
                >
                  <SelectTrigger className="border-slate-200 focus:border-sky-400">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
              An email invitation will be sent to this address. The recommender can submit their
              letter directly through a secure link — no Campus Apply account required.
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowForm(false); reset(); }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isInviting}
                className="bg-sky-600 hover:bg-sky-700 rounded-xl gap-2"
              >
                {isInviting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Invitation
              </Button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}

function Field({
  label, children, error, required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
