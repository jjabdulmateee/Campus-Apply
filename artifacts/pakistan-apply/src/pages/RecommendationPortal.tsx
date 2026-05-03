import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
  GraduationCap,
  PenLine,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ValidationState =
  | { status: "loading" }
  | { status: "invalid"; message: string }
  | { status: "already_used" }
  | {
      status: "ready";
      studentName: string;
      recommenderName: string;
      subjectTaught: string;
      relationship: string | null;
    };

type SubmitState = "idle" | "submitting" | "success" | "error";

function getToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

function getApiBase(): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api`;
}

export default function RecommendationPortal() {
  const token = getToken();
  const [validation, setValidation] = useState<ValidationState>({ status: "loading" });
  const [letterContent, setLetterContent] = useState("");
  const [yearsKnown, setYearsKnown] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setValidation({ status: "invalid", message: "No token found in this link." });
      return;
    }
    fetch(`${getApiBase()}/recommenders/portal/validate?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.status === 410) {
          setValidation({ status: "already_used" });
        } else if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setValidation({ status: "invalid", message: body.error ?? "Invalid link." });
        } else {
          const data = await res.json();
          setValidation({
            status: "ready",
            studentName: data.studentName,
            recommenderName: data.recommenderName,
            subjectTaught: data.subjectTaught,
            relationship: data.relationship,
          });
        }
      })
      .catch(() =>
        setValidation({ status: "invalid", message: "Unable to connect. Please try again." }),
      );
  }, [token]);

  const wordCount = letterContent.trim().split(/\s+/).filter(Boolean).length;
  const canSubmit =
    validation.status === "ready" &&
    wordCount >= 150 &&
    yearsKnown.trim().length > 0 &&
    submitState === "idle";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !token) return;
    setSubmitState("submitting");
    setErrorMsg("");
    try {
      const res = await fetch(`${getApiBase()}/recommenders/portal/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, letterContent, yearsKnown }),
      });
      if (res.status === 410) {
        setErrorMsg("This link has already been used — your letter was already submitted.");
        setSubmitState("error");
      } else if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.error ?? "Submission failed. Please try again.");
        setSubmitState("error");
      } else {
        setSubmitState("success");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setSubmitState("error");
    }
  }

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-sky-100 shadow-sm px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-black text-sky-600 text-lg">PakApply</span>
            <span className="text-slate-400 text-xs ml-2">Recommendation Portal</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center py-8 px-4">
        <div className="w-full max-w-2xl">
          {/* Loading */}
          {validation.status === "loading" && (
            <div className="bg-white rounded-3xl shadow-sm border border-sky-100 p-16 text-center">
              <Loader2 className="w-10 h-10 text-sky-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Validating your invitation link…</p>
            </div>
          )}

          {/* Invalid */}
          {validation.status === "invalid" && (
            <div className="bg-white rounded-3xl shadow-sm border border-red-100 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Invalid Link</h2>
              <p className="text-slate-500 text-sm leading-relaxed">{validation.message}</p>
              <p className="text-slate-400 text-xs mt-3">
                Please ask the student to send you a new invitation.
              </p>
            </div>
          )}

          {/* Already used */}
          {validation.status === "already_used" && (
            <div className="bg-white rounded-3xl shadow-sm border border-amber-100 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Link Already Used</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Your recommendation letter has already been submitted using this link.
                Thank you for your contribution — the student has been notified.
              </p>
            </div>
          )}

          {/* Success screen */}
          {submitState === "success" && validation.status === "ready" && (
            <div className="bg-white rounded-3xl shadow-sm border border-green-100 p-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Letter Submitted!</h2>
              <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
                Your recommendation for <strong>{validation.studentName}</strong> has been securely
                received. Thank you for helping shape their future.
              </p>
              <div className="mt-8 bg-sky-50 rounded-2xl p-4 text-xs text-sky-700 max-w-sm mx-auto">
                The student has been notified that your letter is ready.
                This portal link is now expired and cannot be used again.
              </div>
            </div>
          )}

          {/* Ready: form */}
          {validation.status === "ready" && submitState !== "success" && (
            <>
              {/* Intro card */}
              <div className="bg-white rounded-3xl shadow-sm border border-sky-100 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Recommendation Request
                    </h2>
                    <p className="text-xs text-slate-400">PakApply · Secure Submission Portal</p>
                  </div>
                </div>

                <div className="bg-sky-50 rounded-2xl p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs w-28 flex-shrink-0">From student:</span>
                    <span className="font-semibold text-slate-700">{validation.studentName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs w-28 flex-shrink-0">For teacher:</span>
                    <span className="font-semibold text-slate-700">{validation.recommenderName}</span>
                  </div>
                  {validation.subjectTaught && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs w-28 flex-shrink-0">Subject:</span>
                      <span className="text-slate-700">{validation.subjectTaught}</span>
                    </div>
                  )}
                  {validation.relationship && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs w-28 flex-shrink-0">Relationship:</span>
                      <span className="text-slate-700">{validation.relationship}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  By submitting this form you waive confidentiality — the student has already
                  agreed to FERPA waiver terms. Your response is securely stored and shared
                  only with the admissions office.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-sky-100 p-6 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <PenLine className="w-4 h-4 text-sky-600" />
                  <h3 className="text-sm font-bold text-slate-800">Recommendation Form</h3>
                </div>

                {/* Years known */}
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    How long have you known {validation.studentName}?
                    <span className="text-red-400 ml-0.5">*</span>
                  </Label>
                  <Input
                    value={yearsKnown}
                    onChange={(e) => setYearsKnown(e.target.value)}
                    placeholder="e.g. 2 years, since Grade 9…"
                    className="border-slate-200 focus:border-sky-400"
                  />
                </div>

                {/* Letter */}
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Recommendation Letter
                    <span className="text-red-400 ml-0.5">*</span>
                  </Label>
                  <Textarea
                    value={letterContent}
                    onChange={(e) => setLetterContent(e.target.value)}
                    placeholder={`Dear Admissions Committee,\n\nIt is my great pleasure to recommend ${validation.studentName}…`}
                    rows={14}
                    className="border-slate-200 focus:border-sky-400 resize-none text-sm leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[10px] text-slate-400">Minimum 150 words required</p>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        wordCount >= 150 ? "text-green-600" : "text-slate-400",
                      )}
                    >
                      {wordCount} / 150 words {wordCount >= 150 ? "✓" : ""}
                    </span>
                  </div>
                </div>

                {/* Guidelines */}
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 space-y-1">
                  <p className="font-semibold mb-1">Suggested content to include:</p>
                  <p>• Academic performance and intellectual curiosity</p>
                  <p>• Character, integrity, and leadership qualities</p>
                  <p>• Specific examples and anecdotes</p>
                  <p>• Overall suitability for higher education</p>
                </div>

                {/* Error */}
                {submitState === "error" && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{errorMsg}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full bg-sky-600 hover:bg-sky-700 rounded-2xl font-semibold h-12 text-base gap-2"
                >
                  {submitState === "submitting" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Submit Recommendation Letter
                    </>
                  )}
                </Button>

                <p className="text-[10px] text-center text-slate-400">
                  This link will expire after submission and cannot be reused.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
