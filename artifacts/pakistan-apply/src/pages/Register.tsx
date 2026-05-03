import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, BookOpen, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type StudentType = "first_year" | "transfer" | "";

export default function Register() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [studentType, setStudentType] = useState<StudentType>("");
  const [previousCollege, setPreviousCollege] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const pwValid = form.password.length >= 8;
  const pwMatch = form.password === form.confirmPassword && form.confirmPassword !== "";
  const transferCollegeOk = studentType !== "transfer" || previousCollege.trim().length > 0;

  const canSubmit =
    !!studentType &&
    form.fullName.trim().length > 0 &&
    emailValid &&
    pwValid &&
    pwMatch &&
    transferCollegeOk &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        mobileNumber: form.mobileNumber || undefined,
        password: form.password,
      });
      localStorage.setItem("pakapp_user_type", studentType);
      if (previousCollege) localStorage.setItem("pakapp_previous_college", previousCollege);
      setLocation("/profile");
    } catch (err) {
      setError((err as Error).message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-sky-50 px-4 py-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-sky-100/60 blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-100/40 blur-3xl -z-10" />

      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <Link href="/" className="inline-block">
            <div className="text-2xl font-extrabold tracking-tight">Campus Apply</div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Apply to Pakistan's top universities for free</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ── Student type selection ── */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-2 block">
              I am a <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "first_year", label: "Fresh student account", sub: "Finished Intermediate / A-Levels", icon: BookOpen, color: "sky" },
                  { id: "transfer", label: "Transfer student account", sub: "Moving from another institution", icon: RefreshCw, color: "violet" },
                ] as const
              ).map(({ id, label, sub, icon: Icon, color }) => {
                const active = studentType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStudentType(id)}
                    className={cn(
                      "flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border-2 text-left transition-all duration-150 active:scale-[0.98]",
                      active
                        ? color === "sky"
                          ? "border-sky-500 bg-sky-50"
                          : "border-violet-500 bg-violet-50"
                        : "border-slate-200 hover:border-slate-300 bg-white",
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center",
                          active
                            ? color === "sky" ? "bg-sky-100" : "bg-violet-100"
                            : "bg-slate-100",
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-3.5 h-3.5",
                            active
                              ? color === "sky" ? "text-sky-600" : "text-violet-600"
                              : "text-slate-400",
                          )}
                        />
                      </div>
                      {active && (
                        <CheckCircle2
                          className={cn(
                            "w-4 h-4",
                            color === "sky" ? "text-sky-500" : "text-violet-500",
                          )}
                        />
                      )}
                    </div>
                    <div className={cn("text-xs font-semibold leading-tight", active ? (color === "sky" ? "text-sky-700" : "text-violet-700") : "text-slate-700")}>
                      {label}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-snug">{sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional: Previous college for transfer */}
          {studentType === "transfer" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 block">
                Current / Previous College Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={previousCollege}
                onChange={(e) => setPreviousCollege(e.target.value)}
                placeholder="e.g. University of Punjab"
                className="border-violet-200 focus:border-violet-400 focus:ring-violet-400"
                required
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 block">Full name</Label>
              <Input
                type="text"
                value={form.fullName}
                onChange={set("fullName")}
                placeholder="Ahmed Khan"
                required
                autoComplete="name"
                className="border-slate-200 focus:border-sky-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 block">Email address</Label>
              <div className="relative">
                <Input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className={cn(
                    "border-slate-200 focus:border-sky-400",
                    form.email && !emailValid && "border-red-300 focus:border-red-400",
                    form.email && emailValid && "border-green-300",
                  )}
                />
                {form.email && emailValid && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
              {form.email && !emailValid && (
                <p className="text-xs text-red-500">Enter a valid email address</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 block">
                Mobile number <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                type="tel"
                value={form.mobileNumber}
                onChange={set("mobileNumber")}
                placeholder="+92-300-0000000"
                autoComplete="tel"
                className="border-slate-200 focus:border-sky-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 block">Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                  className={cn(
                    "pr-10 border-slate-200 focus:border-sky-400",
                    form.password && !pwValid && "border-red-300",
                    form.password && pwValid && "border-green-300",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && !pwValid && (
                <p className="text-xs text-red-500">Password must be at least 8 characters</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 block">Confirm password</Label>
              <Input
                type={showPw ? "text" : "password"}
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                placeholder="Repeat your password"
                required
                autoComplete="new-password"
                className={cn(
                  "border-slate-200 focus:border-sky-400",
                  form.confirmPassword && !pwMatch && "border-red-300",
                  form.confirmPassword && pwMatch && "border-green-300",
                )}
              />
              {form.confirmPassword && !pwMatch && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "w-full h-11 rounded-2xl font-bold text-base transition-all",
                canSubmit
                  ? "bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/25"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed",
              )}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-sky-600 font-semibold hover:text-sky-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
