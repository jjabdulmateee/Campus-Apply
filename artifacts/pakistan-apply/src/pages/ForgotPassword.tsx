import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-sky-50/50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>
          <div className="text-2xl font-bold text-sky-700 tracking-tight mb-3">Campus Apply</div>
          <h1 className="text-2xl font-bold text-slate-900">Forgot password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your email and we&apos;ll send a reset link (logged to the API terminal in dev).
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
          {sent ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-slate-600">
                If an account exists for <strong>{email}</strong>, check the API server terminal for the reset link.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full">Return to sign in</Button>
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-sky-600 hover:bg-sky-700">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send reset link"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
