import { useState, useEffect, useRef } from "react";
import { useValidateCollegeSubmission, useSubmitCollegeApplication } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  User,
  ClipboardList,
  PenLine,
  CreditCard,
  FileSignature,
  Loader2,
  ChevronRight,
  ShieldCheck,
  BadgeCheck,
  Banknote,
  Sparkles,
} from "lucide-react";

interface SubmitModalProps {
  universityId: number;
  universityName: string;
  feeRequired: boolean | null | undefined;
  programId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

function Confetti() {
  const pieces = useRef(
    Array.from({ length: 90 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${(Math.random() * 1.8).toFixed(2)}s`,
      duration: `${(1.8 + Math.random() * 2).toFixed(2)}s`,
      color: ["#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#f97316", "#ec4899"][i % 7],
      size: `${5 + Math.floor(Math.random() * 7)}px`,
      round: Math.random() > 0.45,
    })),
  ).current;

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-12px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(105vh) rotate(740deg); opacity: 0; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[60]">
        {pieces.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: p.left,
              top: "-12px",
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.round ? "50%" : "2px",
              animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
            }}
          />
        ))}
      </div>
    </>
  );
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
        done
          ? "bg-sky-500 border-sky-500 text-white"
          : active
            ? "bg-white border-sky-500 text-sky-600 ring-4 ring-sky-100"
            : "bg-white border-slate-200 text-slate-300",
      )}
    >
      {done ? <CheckCircle2 className="w-4 h-4" /> : n}
    </div>
  );
}

export default function SubmitModal({
  universityId,
  universityName,
  feeRequired,
  programId,
  onClose,
  onSuccess,
}: SubmitModalProps) {
  const { toast } = useToast();
  const hasFee = !!feeRequired;
  const totalSteps = hasFee ? 3 : 2;

  const [step, setStep] = useState(1);
  const [paymentDone, setPaymentDone] = useState(false);
  const [signature, setSignature] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [receiptRef, setReceiptRef] = useState<string | null>(null);
  const [receiptAmount, setReceiptAmount] = useState<number | null>(null);

  const { data: validation, isLoading: validating } = useValidateCollegeSubmission(universityId);

  const { mutate: submit, isPending: submitting } = useSubmitCollegeApplication({
    mutation: {
      onSuccess: (data) => {
        const payload = data as { paymentTransactionRef?: string | null; paymentAmountPkr?: number | null };
        setReceiptRef(payload.paymentTransactionRef ?? null);
        setReceiptAmount(payload.paymentAmountPkr ?? (hasFee ? 2000 : null));
        setSubmitted(true);
        onSuccess();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast({ title: msg ?? "Submission failed", variant: "destructive" });
      },
    },
  });

  const stepLabels = hasFee
    ? ["Review", "Payment", "Sign & Submit"]
    : ["Review", "Sign & Submit"];

  const stepIcons = hasFee
    ? [ClipboardList, CreditCard, FileSignature]
    : [ClipboardList, FileSignature];

  // The validate endpoint also returns the canonical application id so the
  // student can jump to the full application to answer program supplements.
  const linkedApplicationId = (validation as { applicationId?: number } | undefined)?.applicationId;
  const tests = (validation?.tests ?? []) as Array<{ testName: string; score: string; maxScore?: string; testDate: string }>;
  const essays = (validation?.essays ?? []) as Array<{ type: string; prompt: string; wordCount: number }>;
  const profile = validation?.profile as Record<string, string | null | undefined> | null;
  const psEssay = essays.find((e) => e.type === "personal_statement");

  function handleFinalSubmit() {
    if (!signature.trim()) {
      toast({ title: "Please type your full name to sign", variant: "destructive" });
      return;
    }
    submit({
      universityId,
      data: {
        signature: signature.trim(),
        paymentSimulated: paymentDone,
        ...(programId ? { programId } : {}),
      },
    });
  }

  if (submitted) {
    return (
      <>
        <Confetti />
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Application Submitted!</h2>
            <p className="text-slate-500 text-sm mb-2">
              Your application to <span className="font-semibold text-sky-700">{universityName}</span> has been
              officially submitted.
            </p>
            <p className="text-xs text-slate-400 mb-6">
              A snapshot of your profile, test scores, and essay has been saved. Your application status is now
              "Submitted" in My Colleges.
            </p>
            {receiptRef && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                  Simulated Fee Payment (Demo Mode)
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Transaction reference</span>
                  <span className="font-mono font-semibold text-slate-800">{receiptRef}</span>
                </div>
                {receiptAmount != null && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-slate-500">Amount</span>
                    <span className="font-semibold text-slate-800">
                      PKR {receiptAmount.toLocaleString("en-PK")}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-6 text-left space-y-1">
              <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                <BadgeCheck className="w-4 h-4" /> What happens next?
              </div>
              <ul className="text-xs text-green-700 space-y-1 mt-2 pl-1">
                <li>• The university will review your application</li>
                <li>• You may be called for an entry test or interview</li>
                <li>• Check your email for confirmation</li>
              </ul>
            </div>
            <Button
              onClick={onClose}
              className="w-full bg-sky-600 hover:bg-sky-700 rounded-xl font-semibold"
            >
              Back to My Colleges
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-sky-50 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">Submit to {universityName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Step {step} of {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="px-6 py-4 flex-shrink-0">
          <div className="flex items-center">
            {stepLabels.map((label, i) => {
              const StepIcon = stepIcons[i];
              const stepNum = i + 1;
              const isDone = step > stepNum;
              const isActive = step === stepNum;
              return (
                <div key={label} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <StepDot n={stepNum} active={isActive} done={isDone} />
                    <span
                      className={cn(
                        "text-[10px] font-semibold whitespace-nowrap",
                        isActive ? "text-sky-600" : isDone ? "text-sky-400" : "text-slate-300",
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div
                      className={cn("flex-1 h-0.5 mb-4 mx-1", isDone ? "bg-sky-400" : "bg-slate-100")}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {/* ── STEP 1: Review ── */}
          {step === 1 && (
            <div className="space-y-4">
              {validating ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Eligibility */}
                  {validation && !validation.canSubmit && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        Complete these before submitting
                      </div>
                      <ul className="space-y-1.5">
                        {validation.missing.map((m) => (
                          <li key={m} className="flex items-start gap-2 text-xs text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                            {m}
                          </li>
                        ))}
                      </ul>
                      {linkedApplicationId && (
                        <a
                          href={`/applications/${linkedApplicationId}/review`}
                          className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-sky-700 hover:text-sky-800"
                        >
                          Open full application to complete these
                          <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {validation?.canSubmit && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <p className="text-sm font-semibold text-green-700">
                        Your application is complete and ready to submit!
                      </p>
                    </div>
                  )}

                  {/* Profile Summary */}
                  <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-sky-600" />
                      <span className="text-sm font-semibold text-slate-700">Personal Profile</span>
                      <span className="ml-auto text-xs font-bold text-sky-600">
                        {validation?.profileCompletionPercent ?? 0}% complete
                      </span>
                    </div>
                    {profile ? (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                        {profile.firstName && (
                          <div>
                            <span className="text-slate-400">Name: </span>
                            {profile.firstName} {profile.lastName}
                          </div>
                        )}
                        {profile.dateOfBirth && (
                          <div>
                            <span className="text-slate-400">DOB: </span>
                            {profile.dateOfBirth}
                          </div>
                        )}
                        {profile.email && (
                          <div className="col-span-2">
                            <span className="text-slate-400">Email: </span>
                            {profile.email}
                          </div>
                        )}
                        {profile.city && (
                          <div>
                            <span className="text-slate-400">City: </span>
                            {profile.city}, {profile.province}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No profile data found</p>
                    )}
                  </div>

                  {/* Test Scores */}
                  <div className="bg-white rounded-2xl p-4 border border-sky-100">
                    <div className="flex items-center gap-2 mb-3">
                      <ClipboardList className="w-4 h-4 text-sky-600" />
                      <span className="text-sm font-semibold text-slate-700">
                        Test Scores ({tests.length})
                      </span>
                    </div>
                    {tests.length > 0 ? (
                      <div className="space-y-2">
                        {tests.map((t, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{t.testName}</span>
                            <span className="text-slate-500">
                              {t.score}{t.maxScore ? ` / ${t.maxScore}` : ""} · {t.testDate}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-red-500">No test scores added</p>
                    )}
                  </div>

                  {/* Essay */}
                  <div className="bg-white rounded-2xl p-4 border border-sky-100">
                    <div className="flex items-center gap-2 mb-3">
                      <PenLine className="w-4 h-4 text-sky-600" />
                      <span className="text-sm font-semibold text-slate-700">Personal Statement</span>
                    </div>
                    {psEssay ? (
                      <div>
                        <div className="text-xs font-medium text-slate-600 mb-1 line-clamp-1">
                          {psEssay.prompt}
                        </div>
                        <div
                          className={cn(
                            "text-xs font-semibold",
                            psEssay.wordCount >= 250 ? "text-green-600" : "text-red-500",
                          )}
                        >
                          {psEssay.wordCount} words {psEssay.wordCount >= 250 ? "✓" : "(need 250+)"}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500">No personal statement written</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 2 (fee): Payment ── */}
          {hasFee && step === 2 && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-800 text-sm">
                    Simulated Fee Payment (Demo Mode)
                  </span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  No real money is collected. This step shows the university fee breakdown and issues a
                  demo transaction reference when you submit.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-sky-100 p-5 space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Fee breakdown — {universityName}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">University application fee</span>
                    <span className="font-semibold text-slate-800">PKR 2,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Campus Apply processing fee</span>
                    <span className="font-semibold text-slate-800">PKR 0</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-700">Total due (demo)</span>
                    <span className="font-bold text-slate-900">PKR 2,000</span>
                  </div>
                </div>

                {paymentDone ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-green-800">
                        Demo payment recorded
                      </div>
                      <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
                        A transaction reference will be generated and saved on your application when you
                        sign and submit.
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setPaymentDone(true)}
                    className="w-full bg-sky-600 hover:bg-sky-700 rounded-xl font-semibold"
                  >
                    Simulate PKR 2,000 payment
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── LAST STEP: Signature ── */}
          {step === totalSteps && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  <span className="font-semibold text-sky-800 text-sm">
                    FERPA Waiver & Academic Integrity Agreement
                  </span>
                </div>
                <p className="text-xs text-sky-700 leading-relaxed">
                  By signing below, I certify that all information in this application is accurate and
                  complete. I understand that any misrepresentation may result in disqualification. I
                  waive my right to view confidential letters of recommendation submitted on my behalf.
                  I agree to the terms of the Electronic Submission Agreement.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-sky-100 p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    Digital Signature — Type your full legal name exactly as it appears on your CNIC
                  </label>
                  <Input
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="e.g. Muhammad Ali Khan"
                    className="border-sky-200 focus:border-sky-400 text-sm font-medium"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    This serves as your electronic signature and legal consent.
                  </p>
                </div>

                {signature.trim().length >= 3 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-serif text-slate-700 text-base italic text-center tracking-wide">
                    {signature}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-sky-50 flex justify-between items-center flex-shrink-0">
          <Button
            variant="ghost"
            onClick={step === 1 ? onClose : () => setStep((s) => s - 1)}
            className="text-slate-500 hover:text-slate-700"
            disabled={submitting}
          >
            {step === 1 ? "Cancel" : "← Back"}
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={
                validating ||
                (step === 1 && !validation?.canSubmit) ||
                (hasFee && step === 2 && !paymentDone)
              }
              className="bg-sky-600 hover:bg-sky-700 rounded-xl gap-1.5 font-semibold"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinalSubmit}
              disabled={submitting || signature.trim().length < 3}
              className="bg-green-600 hover:bg-green-700 rounded-xl gap-1.5 font-semibold min-w-[140px]"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <FileSignature className="w-4 h-4" />
                  Submit Application
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
