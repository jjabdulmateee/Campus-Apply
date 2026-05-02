import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        mobileNumber: form.mobileNumber || undefined,
        password: form.password,
      });
      setLocation("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-sky-50/50 px-4 py-8">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-sky-200/30 blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-200/20 blur-3xl -z-10" />

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="text-2xl font-bold text-sky-700 tracking-tight">PakApply</div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Apply to Pakistan's top universities for free</p>
        </div>

        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-medium text-slate-700">Full name</Label>
              <Input
                id="fullName"
                type="text"
                value={form.fullName}
                onChange={set("fullName")}
                placeholder="Ahmed Khan"
                required
                autoComplete="name"
                className="border-slate-200 focus:border-sky-400 focus:ring-sky-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="border-slate-200 focus:border-sky-400 focus:ring-sky-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mobile" className="text-sm font-medium text-slate-700">
                Mobile number <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="mobile"
                type="tel"
                value={form.mobileNumber}
                onChange={set("mobileNumber")}
                placeholder="+92-300-0000000"
                autoComplete="tel"
                className="border-slate-200 focus:border-sky-400 focus:ring-sky-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                  className="border-slate-200 focus:border-sky-400 focus:ring-sky-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPw" className="text-sm font-medium text-slate-700">Confirm password</Label>
              <Input
                id="confirmPw"
                type={showPw ? "text" : "password"}
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                placeholder="Repeat your password"
                required
                autoComplete="new-password"
                className="border-slate-200 focus:border-sky-400 focus:ring-sky-400"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-700 h-10 rounded-xl font-semibold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-sky-50 text-center">
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
