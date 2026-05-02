import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  useGetAdminApplication,
  useSubmitAdminDecision,
  useAddAdminRemark,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  User,
  GraduationCap,
  ClipboardList,
  PenLine,
  FileText,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Building2,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// ── Local types for strongly-typed template rendering ─────────────────────
interface AcademicRow {
  id: number;
  institution: string;
  level: string;
  board?: string | null;
  passingYear: number;
  percentage?: string | number | null;
  gradeOrGpa?: string | null;
}

interface TestRow {
  id: number;
  testName: string;
  score: string;
  maxScore?: string | null;
  testDate: string;
}

interface EssayRow {
  id: number;
  type: string;
  prompt: string;
  content?: string | null;
}

interface DocumentRow {
  id: number;
  category: string;
  fileName: string;
  isVerified: boolean;
}

interface RemarkRow {
  id: number;
  adminName: string;
  remark: string;
  createdAt?: string | null;
}

interface ProfileRow {
  firstName: string;
  lastName: string;
  fatherName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  cnicNumber?: string | null;
  nationality?: string | null;
  province?: string | null;
  city?: string | null;
  phoneNumber?: string | null;
  email: string;
}

interface AppRow {
  id: number;
  status: string;
  studentId: string;
  universityName: string;
  universityShortName: string;
  programName: string;
  adminNotes?: string | null;
  decisionReason?: string | null;
}

// ── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  submitted: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  under_review: { label: "Under Review", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  accepted: { label: "Accepted", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  rejected: { label: "Rejected", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  waitlisted: { label: "Waitlisted", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
};

// ── Sub-components ────────────────────────────────────────────────────────
function Section({ title, icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm text-slate-700">
        {value != null && value !== "" ? String(value) : <span className="text-slate-300 italic">Not provided</span>}
      </div>
    </div>
  );
}

function DecisionBtn({ active, onClick, icon, label, activeClass, inactiveClass }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeClass: string;
  inactiveClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all",
        active ? activeClass : inactiveClass,
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function AdminApplicationDetail() {
  const [, params] = useRoute("/admin/applications/:id");
  const [,] = useLocation();
  const appId = parseInt(params?.id ?? "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetAdminApplication(appId);
  const decisionMutation = useSubmitAdminDecision();
  const remarkMutation = useAddAdminRemark();

  const [decisionStatus, setDecisionStatus] = useState<"under_review" | "accepted" | "rejected" | "waitlisted">("under_review");
  const [decisionReason, setDecisionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [newRemark, setNewRemark] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading application…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Application not found.</div>
      </div>
    );
  }

  const application = data.application as unknown as AppRow;
  const profile = data.profile as unknown as ProfileRow | null;
  const academics = (data.academics ?? []) as unknown as AcademicRow[];
  const tests = (data.tests ?? []) as unknown as TestRow[];
  const essays = (data.essays ?? []) as unknown as EssayRow[];
  const documents = (data.documents ?? []) as unknown as DocumentRow[];
  const remarks = (data.remarks ?? []) as unknown as RemarkRow[];

  const sc = STATUS_CONFIG[application.status] ?? { label: application.status, color: "text-slate-600", bg: "bg-slate-50" };

  const handleDecision = async () => {
    try {
      await decisionMutation.mutateAsync({
        id: appId,
        data: {
          status: decisionStatus,
          decisionReason: decisionReason || undefined,
          adminNotes: adminNotes || undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["getAdminApplication"] });
      queryClient.invalidateQueries({ queryKey: ["listAdminApplications"] });
      queryClient.invalidateQueries({ queryKey: ["listApplications"] });
      toast({ title: "Decision saved", description: "The applicant's status has been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save decision.", variant: "destructive" });
    }
  };

  const handleAddRemark = async () => {
    if (!newRemark.trim()) return;
    try {
      await remarkMutation.mutateAsync({ id: appId, data: { remark: newRemark } });
      queryClient.invalidateQueries({ queryKey: ["getAdminApplication"] });
      setNewRemark("");
      toast({ title: "Note added" });
    } catch {
      toast({ title: "Error", description: "Failed to add note.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard">
            <button className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold">Application Review</div>
            <div className="text-xs text-slate-400">
              {profile ? `${profile.firstName} ${profile.lastName}` : application.studentId}
              {" · "}
              {application.universityShortName}
            </div>
          </div>
        </div>
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", sc.bg, sc.color)}>
          {sc.label}
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Student data */}
          <div className="col-span-12 lg:col-span-7 space-y-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Student Data</h2>

            {/* Personal info */}
            <Section title="Personal Information" icon={<User className="w-4 h-4 text-sky-500" />}>
              {profile ? (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Full Name" value={`${profile.firstName} ${profile.lastName}`} />
                  <Field label="Father's Name" value={profile.fatherName} />
                  <Field label="Date of Birth" value={profile.dateOfBirth} />
                  <Field label="Gender" value={profile.gender} />
                  <Field label="CNIC Number" value={profile.cnicNumber} />
                  <Field label="Nationality" value={profile.nationality} />
                  <Field label="Province" value={profile.province} />
                  <Field label="City" value={profile.city} />
                  <Field label="Phone" value={profile.phoneNumber} />
                  <Field label="Email" value={profile.email} />
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Profile not filled out.</p>
              )}
            </Section>

            {/* Academics */}
            <Section title="Academic Records" icon={<GraduationCap className="w-4 h-4 text-sky-500" />} defaultOpen={academics.length > 0}>
              {academics.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No academic records submitted.</p>
              ) : (
                <div className="space-y-3">
                  {academics.map((a) => (
                    <div key={a.id} className="bg-slate-50 rounded-lg p-3 text-sm">
                      <div className="font-semibold text-slate-700">{a.institution}</div>
                      <div className="text-slate-500 text-xs mt-1 flex flex-wrap gap-3">
                        <span>{String(a.level).replace(/_/g, " ")}</span>
                        {a.board && <span>Board: {a.board}</span>}
                        <span>{a.passingYear}</span>
                        {a.percentage != null && (
                          <span className="font-semibold text-sky-600">{String(a.percentage)}%</span>
                        )}
                        {a.gradeOrGpa && <span>Grade: {a.gradeOrGpa}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Test scores */}
            <Section title="Test Scores" icon={<ClipboardList className="w-4 h-4 text-sky-500" />} defaultOpen={tests.length > 0}>
              {tests.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No test scores submitted.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {tests.map((t) => (
                    <div key={t.id} className="bg-slate-50 rounded-lg p-3">
                      <div className="font-semibold text-sm text-slate-700">{t.testName}</div>
                      <div className="text-lg font-bold text-sky-600 mt-1">
                        {t.score}{t.maxScore ? ` / ${t.maxScore}` : ""}
                      </div>
                      <div className="text-xs text-slate-400">{t.testDate}</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Essays */}
            <Section title="Essays & Statements" icon={<PenLine className="w-4 h-4 text-sky-500" />} defaultOpen={essays.length > 0}>
              {essays.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No essays submitted.</p>
              ) : (
                <div className="space-y-4">
                  {essays.map((e) => (
                    <div key={e.id}>
                      <div className="text-xs font-semibold text-slate-500 mb-1">
                        {String(e.type).replace(/_/g, " ")}
                      </div>
                      <div className="text-xs text-slate-400 italic mb-2">{e.prompt}</div>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-lg p-3">
                        {e.content ?? <span className="text-slate-300">No content</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* Right: Documents + Decision */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Documents & Decision</h2>

            {/* Documents */}
            <Section title="Uploaded Documents" icon={<FileText className="w-4 h-4 text-sky-500" />}>
              {documents.length === 0 ? (
                <div className="text-center py-4">
                  <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 italic">No documents uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-sky-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700 truncate">
                          {String(doc.category).replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{doc.fileName}</div>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full border",
                          doc.isVerified
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-amber-50 text-amber-700 border-amber-200",
                        )}
                      >
                        {doc.isVerified ? "Verified" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Decision panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-500" />
                Decision Panel
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <DecisionBtn
                  active={decisionStatus === "accepted"}
                  onClick={() => setDecisionStatus("accepted")}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  label="Approve"
                  activeClass="bg-green-600 text-white border-green-600"
                  inactiveClass="border-green-200 text-green-700 hover:bg-green-50"
                />
                <DecisionBtn
                  active={decisionStatus === "rejected"}
                  onClick={() => setDecisionStatus("rejected")}
                  icon={<XCircle className="w-4 h-4" />}
                  label="Reject"
                  activeClass="bg-red-600 text-white border-red-600"
                  inactiveClass="border-red-200 text-red-700 hover:bg-red-50"
                />
                <DecisionBtn
                  active={decisionStatus === "waitlisted"}
                  onClick={() => setDecisionStatus("waitlisted")}
                  icon={<Clock className="w-4 h-4" />}
                  label="Waitlist"
                  activeClass="bg-purple-600 text-white border-purple-600"
                  inactiveClass="border-purple-200 text-purple-700 hover:bg-purple-50"
                />
                <DecisionBtn
                  active={decisionStatus === "under_review"}
                  onClick={() => setDecisionStatus("under_review")}
                  icon={<AlertCircle className="w-4 h-4" />}
                  label="Request Info"
                  activeClass="bg-blue-600 text-white border-blue-600"
                  inactiveClass="border-blue-200 text-blue-700 hover:bg-blue-50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Decision Reason (shown to applicant)
                </label>
                <Textarea
                  placeholder="Explain the decision to the student…"
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Internal Admin Notes (not visible to student)
                </label>
                <Textarea
                  placeholder="Private notes for your admissions team…"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              <Button
                onClick={handleDecision}
                disabled={decisionMutation.isPending}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white"
              >
                {decisionMutation.isPending ? "Saving…" : "Save Decision"}
              </Button>

              {application.decisionReason && (
                <div className="text-xs bg-slate-50 rounded-lg p-3 text-slate-600 border border-slate-100">
                  <span className="font-semibold text-slate-500">Last decision reason: </span>
                  {application.decisionReason}
                </div>
              )}
            </div>

            {/* Admin remarks */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-500" />
                Internal Notes
                {remarks.length > 0 && (
                  <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {remarks.length}
                  </span>
                )}
              </h3>

              {remarks.length > 0 && (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {remarks.map((r) => (
                    <div key={r.id} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-600">{r.adminName}</span>
                        <span className="text-xs text-slate-400">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{r.remark}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Textarea
                  placeholder="Add an internal note…"
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  rows={2}
                  className="text-sm resize-none flex-1"
                />
                <Button
                  onClick={handleAddRemark}
                  disabled={!newRemark.trim() || remarkMutation.isPending}
                  size="icon"
                  className="self-end bg-sky-600 hover:bg-sky-700 h-9 w-9 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
