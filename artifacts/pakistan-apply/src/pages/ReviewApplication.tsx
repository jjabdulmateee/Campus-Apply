import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, useSubmitApplication, getListMyApplicationsQueryKey, getGetApplicationsSummaryQueryKey, getGetMyDashboardQueryKey } from "@workspace/api-client-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getSupplementQuestions, type SupplementQuestion } from "@/lib/supplements";
import {
  ArrowLeft, CheckCircle, XCircle, Send, Loader2,
  User, GraduationCap, ClipboardList, BookOpen, PenLine, MessageSquare,
  Trophy, MapPin, Printer, Pencil,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReviewData {
  application: {
    id: number;
    universityId: number;
    universityName: string;
    programName: string;
    status: string;
    appliedAt?: string;
    submittedAt?: string;
  };
  university: {
    shortName?: string;
    name: string;
    applicationDeadline?: string;
    ranking?: number;
    city: string;
    province: string;
  } | null;
  program: {
    name: string;
    degree: string;
    department?: string;
    duration?: number;
    seats?: number;
  } | null;
  student: {
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth?: string;
    cnicNumber?: string;
    province?: string;
    city?: string;
    phoneNumber?: string;
    fatherName?: string;
    gender?: string;
    nationality?: string;
  } | null;
  academics: {
    id: number;
    institution: string;
    level: string;
    board?: string;
    passingYear: number;
    percentage?: string;
    gradeOrGpa?: string;
  }[];
  tests: {
    id: number;
    testName: string;
    score: string;
    maxScore?: string;
    testDate: string;
  }[];
  activities: { id: number; name: string; category: string; role: string }[];
  essays: {
    id: number;
    type: string;
    prompt: string;
    content?: string;
    wordCount: number;
  }[];
  answers: {
    id: number;
    questionKey: string;
    questionText: string;
    answer?: string;
  }[];
  validation: { canSubmit: boolean; missing: string[] };
}

type Tab = "profile" | "supplements" | "submit";

export default function ReviewApplication() {
  const params = useParams<{ id: string }>();
  const appId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: review, isLoading, refetch } = useQuery({
    queryKey: ["applicationReview", appId],
    queryFn: () => customFetch<ReviewData>(`/api/applications/${appId}/review`),
    enabled: !isNaN(appId),
  });

  // Populate answers from DB
  useEffect(() => {
    if (review?.answers) {
      const map: Record<string, string> = {};
      review.answers.forEach((a) => {
        map[a.questionKey] = a.answer ?? "";
      });
      setAnswers(map);
    }
  }, [review?.answers]);

  const questions: SupplementQuestion[] = review
    ? getSupplementQuestions(review.university?.shortName)
    : [];

  const saveAnswers = useCallback(async () => {
    if (!review) return;
    setSavingAnswers(true);
    try {
      await customFetch(`/api/applications/${appId}/answers`, {
        method: "PUT",
        body: JSON.stringify({
          answers: questions.map((q) => ({
            questionKey: q.key,
            questionText: q.question,
            answer: answers[q.key] ?? "",
          })),
        }),
      });
      toast({ title: "Answers saved" });
      refetch();
    } catch {
      toast({ title: "Failed to save answers", variant: "destructive" });
    } finally {
      setSavingAnswers(false);
    }
  }, [review, appId, questions, answers, toast, refetch]);

  const { mutate: submitApp, isPending: submitting } = useSubmitApplication({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMyApplicationsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetApplicationsSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetMyDashboardQueryKey() });
        setSubmitted(true);
      },
      onError: () => toast({ title: "Submission failed", variant: "destructive" }),
    },
  });

  // The server validator already covers required supplements (same rule set
  // used at submit time), so the list it returns is authoritative.
  const allMissing = review?.validation.missing ?? [];
  const canSubmit = allMissing.length === 0 && review?.application.status === "draft";

  if (submitted && review) {
    return <SubmittedConfirmation review={review} />;
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-5 max-w-3xl mx-auto">
          <Skeleton className="h-4 w-36" />
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
            <div className="flex items-start gap-4">
              <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-sky-100">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="flex-1 h-12 rounded-none" />)}
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!review) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-slate-400">Application not found.</p>
          <Link href="/applications" className="text-sky-600 mt-2 inline-block">Back to Applications</Link>
        </div>
      </AppLayout>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Your Profile", icon: User },
    { id: "supplements", label: "Supplement Questions", icon: MessageSquare },
    { id: "submit", label: "Review & Submit", icon: Send },
  ];

  const LEVEL_LABELS: Record<string, string> = {
    matric: "Matric (SSC)", intermediate: "Intermediate (HSSC)", a_levels: "A-Levels",
    o_levels: "O-Levels", bachelors: "Bachelors", other: "Other",
  };
  const CAT_LABELS: Record<string, string> = {
    sports: "Sports", arts: "Arts", community_service: "Community Service",
    academics: "Academics", religious: "Religious", leadership: "Leadership",
    work: "Work", other: "Other",
  };

  return (
    <AppLayout>
      <div className="space-y-5 max-w-3xl mx-auto">
        <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-sky-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Applications
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-sky-700">
                {(review.university?.shortName ?? review.university?.name ?? "U").slice(0, 4)}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-slate-900">{review.application.universityName}</h1>
              <p className="text-sm text-slate-500">{review.application.programName}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                {review.university && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {review.university.city}</span>
                )}
                {review.university?.ranking && (
                  <span className="flex items-center gap-1 text-amber-600"><Trophy className="w-3 h-3" /> Rank #{review.university.ranking}</span>
                )}
                {review.university?.applicationDeadline && (
                  <span>Deadline: {review.university.applicationDeadline}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold",
                review.application.status === "draft" ? "bg-amber-100 text-amber-700" :
                review.application.status === "submitted" ? "bg-blue-100 text-blue-700" :
                "bg-green-100 text-green-700"
              )}>
                {review.application.status.charAt(0).toUpperCase() + review.application.status.slice(1)}
              </span>
              {review.application.status !== "draft" && (
                <button
                  onClick={() => window.print()}
                  title="Print application"
                  className="p-2 rounded-xl border border-slate-200 hover:bg-sky-50 text-slate-500 hover:text-sky-600 transition-colors print:hidden"
                >
                  <Printer className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Print-only header */}
        <div className="print-header hidden">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-slate-900">Campus Apply</div>
              <div className="text-sm text-slate-500">Official Application — {new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-slate-800">{review.application.universityName}</div>
              <div className="text-sm text-slate-500">{review.application.programName}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-sky-100">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all",
                  activeTab === id
                    ? "bg-sky-50 text-sky-700 border-b-2 border-sky-600"
                    : "text-slate-500 hover:text-sky-600 hover:bg-sky-50/50"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                {/* Personal Info */}
                <Section icon={User} title="Personal Information" editHref="/profile">
                  {review.student ? (
                    <Grid>
                      <Field label="Full Name" value={`${review.student.firstName} ${review.student.lastName}`} />
                      <Field label="Email" value={review.student.email} />
                      <Field label="Date of Birth" value={review.student.dateOfBirth} />
                      <Field label="CNIC" value={review.student.cnicNumber} />
                      <Field label="Province" value={review.student.province} />
                      <Field label="City" value={review.student.city} />
                      <Field label="Phone" value={review.student.phoneNumber} />
                      <Field label="Father's Name" value={review.student.fatherName} />
                      <Field label="Nationality" value={review.student.nationality} />
                    </Grid>
                  ) : <Empty text="No profile data" />}
                </Section>

                {/* Education */}
                <Section icon={GraduationCap} title={`Education (${review.academics.length})`} editHref="/education">
                  {review.academics.length > 0 ? (
                    <div className="space-y-3">
                      {review.academics.map((a) => (
                        <div key={a.id} className="flex items-start gap-3 p-3 bg-sky-50/50 rounded-xl">
                          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-sky-700">
                            {a.level.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 text-sm">{a.institution}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {LEVEL_LABELS[a.level] ?? a.level} · {a.passingYear}
                              {a.board && ` · ${a.board}`}
                              {a.percentage && ` · ${a.percentage}%`}
                              {a.gradeOrGpa && ` · ${a.gradeOrGpa}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <Empty text="No education records" />}
                </Section>

                {/* Test Scores */}
                <Section icon={ClipboardList} title={`Test Scores (${review.tests.length})`} editHref="/testing">
                  {review.tests.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {review.tests.map((t) => (
                        <div key={t.id} className="px-4 py-3 bg-sky-50 rounded-xl">
                          <div className="text-xs font-semibold text-sky-700">{t.testName}</div>
                          <div className="text-lg font-bold text-slate-900">{t.score}</div>
                          {t.maxScore && <div className="text-xs text-slate-400">/ {t.maxScore}</div>}
                          <div className="text-xs text-slate-400 mt-1">{t.testDate}</div>
                        </div>
                      ))}
                    </div>
                  ) : <Empty text="No test scores" />}
                </Section>

                {/* Activities */}
                <Section icon={BookOpen} title={`Activities (${review.activities.length})`} editHref="/activities">
                  {review.activities.length > 0 ? (
                    <div className="space-y-2">
                      {review.activities.map((a) => (
                        <div key={a.id} className="flex items-center gap-3 text-sm">
                          <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 text-xs font-medium">
                            {CAT_LABELS[a.category] ?? a.category}
                          </span>
                          <span className="font-medium text-slate-800">{a.name}</span>
                          <span className="text-slate-400">— {a.role}</span>
                        </div>
                      ))}
                    </div>
                  ) : <Empty text="No activities listed" />}
                </Section>

                {/* Essays */}
                <Section icon={PenLine} title={`Essays (${review.essays.length})`} editHref="/writing">
                  {review.essays.length > 0 ? (
                    <div className="space-y-3">
                      {review.essays.map((e) => (
                        <div key={e.id} className="p-3 bg-sky-50/50 rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">
                              {e.type.replace(/_/g, " ")}
                            </span>
                            <span className={cn("text-xs font-medium",
                              e.wordCount >= 300 ? "text-green-600" : e.wordCount >= 100 ? "text-amber-600" : "text-red-500"
                            )}>
                              {e.wordCount} words
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-medium mb-1">{e.prompt}</div>
                          {e.content ? (
                            <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">{e.content}</p>
                          ) : (
                            <p className="text-sm text-slate-400 italic">Not written yet</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : <Empty text="No essays written" />}
                </Section>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setActiveTab("supplements")}
                    className="bg-sky-600 hover:bg-sky-700"
                  >
                    Next: Supplement Questions →
                  </Button>
                </div>
              </div>
            )}

            {/* Supplements Tab */}
            {activeTab === "supplements" && (
              <div className="space-y-6">
                <div className="text-sm text-slate-500">
                  Answer the following questions specific to{" "}
                  <span className="font-semibold text-slate-700">
                    {review.university?.shortName ?? review.application.universityName}
                  </span>
                  . Required questions are marked with an asterisk.
                </div>

                {questions.map((q) => {
                  const val = answers[q.key] ?? "";
                  const wordCount = val.trim() ? val.trim().split(/\s+/).filter(Boolean).length : 0;
                  const over = wordCount > q.maxWords;
                  return (
                    <div key={q.key} className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-800">
                        {q.question}
                        {q.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <textarea
                        value={val}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                        }
                        rows={5}
                        placeholder="Write your answer here..."
                        className={cn(
                          "w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors",
                          over ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white"
                        )}
                      />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Max {q.maxWords} words</span>
                        <span className={cn("font-medium", over ? "text-red-500" : wordCount > q.maxWords * 0.8 ? "text-amber-600" : "text-slate-400")}>
                          {wordCount} / {q.maxWords}
                        </span>
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" onClick={() => setActiveTab("profile")}>
                    ← Back to Profile
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={saveAnswers}
                      disabled={savingAnswers}
                      className="border-sky-200 text-sky-600 hover:bg-sky-50"
                    >
                      {savingAnswers ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      Save Answers
                    </Button>
                    <Button
                      onClick={async () => { await saveAnswers(); setActiveTab("submit"); }}
                      disabled={savingAnswers}
                      className="bg-sky-600 hover:bg-sky-700"
                    >
                      Next: Review & Submit →
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Tab */}
            {activeTab === "submit" && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Application Checklist</h3>
                  <p className="text-sm text-slate-500">All items below must be complete before submitting.</p>
                </div>

                <div className="space-y-2">
                  {[
                    { label: "Personal profile filled", ok: !!review.student?.firstName && !!review.student?.lastName },
                    { label: "At least one education record", ok: review.academics.length > 0 },
                    { label: "At least one test score", ok: review.tests.length > 0 },
                    {
                      label: "Personal statement (100+ words)",
                      ok: (review.essays.find((e) => e.type === "personal_statement")?.wordCount ?? 0) >= 100,
                    },
                    ...questions
                      .filter((q) => q.required)
                      .map((q) => ({
                        label: `Supplement: "${q.question.slice(0, 55)}…"`,
                        ok: !!(answers[q.key]?.trim()),
                      })),
                  ].map(({ label, ok }, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-sm",
                        ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700",
                      )}
                    >
                      {ok ? (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      {label}
                    </div>
                  ))}
                </div>

                {review.application.status !== "draft" && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
                    This application has already been submitted and cannot be modified.
                  </div>
                )}

                {review.application.status === "draft" && (
                  <div className="pt-2 flex items-center gap-4 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("supplements")}
                    >
                      ← Back to Supplements
                    </Button>
                    <Button
                      disabled={!canSubmit || submitting}
                      onClick={() => submitApp({ applicationId: appId })}
                      className={cn(
                        "gap-2 font-semibold",
                        canSubmit
                          ? "bg-sky-600 hover:bg-sky-700"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed",
                      )}
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Submit Application
                    </Button>
                    {!canSubmit && (
                      <span className="text-xs text-slate-400">
                        Complete all required items above to enable submission
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function SubmittedConfirmation({ review }: { review: ReviewData }) {
  const [, setLocation] = useLocation();

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto py-10">
        <div className="bg-white rounded-3xl border border-sky-100 shadow-sm p-8 text-center">
          {/* Animated checkmark */}
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 animate-[scale-in_0.4s_ease-out]">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Your application to{" "}
            <span className="font-semibold text-slate-700">{review.application.universityName}</span>{" "}
            for <span className="font-semibold text-slate-700">{review.application.programName}</span> has been
            submitted successfully.
          </p>

          <div className="bg-sky-50 rounded-xl p-4 text-left mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Application ID</span>
              <span className="font-mono font-semibold text-slate-800">#{review.application.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Status</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Submitted</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Submitted on</span>
              <span className="font-medium text-slate-700">{new Date().toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-sky-200 text-sky-600 hover:bg-sky-50"
              onClick={() => setLocation("/applications")}
            >
              My Applications
            </Button>
            <Button
              className="flex-1 bg-sky-600 hover:bg-sky-700"
              onClick={() => setLocation("/universities")}
            >
              Apply to More
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Section({ icon: Icon, title, children, editHref }: { icon: React.ElementType; title: string; children: React.ReactNode; editHref?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        </div>
        {editHref && (
          <Link
            href={editHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-sky-500 hover:text-sky-700 hover:underline"
          >
            <Pencil className="w-3 h-3" /> Edit
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-sky-50/50 rounded-xl p-3">
      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-slate-800">{value || <span className="text-slate-300 font-normal">—</span>}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-400 italic py-2">{text}</p>;
}
