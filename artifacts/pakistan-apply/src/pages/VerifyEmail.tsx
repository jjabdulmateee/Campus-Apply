import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, CheckCircle2, XCircle, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Status = "loading" | "success" | "already_verified" | "expired" | "invalid" | "no_token";

function getToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

function getApiBase(): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api`;
}

export default function VerifyEmail() {
  const token = getToken();
  const [status, setStatus] = useState<Status>(token ? "loading" : "no_token");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token) return;

    fetch(`${getApiBase()}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setStatus(data.alreadyVerified ? "already_verified" : "success");
        } else {
          const body = await res.json().catch(() => ({}));
          if (body.error?.includes("expired")) {
            setStatus("expired");
          } else {
            setStatus("invalid");
          }
        }
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleResend = async () => {
    setResending(true);
    try {
      const authToken = localStorage.getItem("pakapp_token");
      if (!authToken) {
        toast({ title: "Please log in first to resend a verification email.", variant: "destructive" });
        return;
      }
      const res = await fetch(`${getApiBase()}/auth/send-verification`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setResent(true);
        toast({ title: "Verification email sent", description: "Check your inbox (and spam folder)." });
      } else {
        const body = await res.json().catch(() => ({}));
        toast({ title: body.error ?? "Failed to resend", variant: "destructive" });
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center px-4">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-sky-200/30 blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-200/20 blur-3xl -z-10" />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="text-2xl font-bold text-sky-700 tracking-tight">PakApply</div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 text-sky-400 animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-bold text-slate-800">Verifying your email…</h2>
              <p className="text-sm text-slate-400 mt-2">Please wait a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Email Verified!</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Your email address has been successfully verified. Your account is now fully activated.
              </p>
              <Button
                className="mt-6 bg-sky-600 hover:bg-sky-700 w-full h-10 rounded-xl font-semibold"
                onClick={() => setLocation(user ? "/dashboard" : "/login")}
              >
                {user ? "Go to Dashboard" : "Sign In"}
              </Button>
            </>
          )}

          {status === "already_verified" && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-sky-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Already Verified</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Your email address was already verified. You're all set!
              </p>
              <Button
                className="mt-6 bg-sky-600 hover:bg-sky-700 w-full h-10 rounded-xl font-semibold"
                onClick={() => setLocation(user ? "/dashboard" : "/login")}
              >
                {user ? "Go to Dashboard" : "Sign In"}
              </Button>
            </>
          )}

          {status === "expired" && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Link Expired</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                This verification link has expired. Verification links are valid for 24 hours.
                Please request a new one.
              </p>
              <Button
                onClick={handleResend}
                disabled={resending || resent}
                className="mt-6 bg-sky-600 hover:bg-sky-700 w-full h-10 rounded-xl font-semibold gap-2"
              >
                {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {resent ? "Email Sent!" : resending ? "Sending…" : "Resend Verification Email"}
              </Button>
            </>
          )}

          {(status === "invalid" || status === "no_token") && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {status === "no_token" ? "No Token Found" : "Invalid Link"}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                {status === "no_token"
                  ? "This page requires a verification token. Check your email for the verification link."
                  : "This verification link is invalid. Please request a new one from your account."}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  onClick={handleResend}
                  disabled={resending || resent || !localStorage.getItem("pakapp_token")}
                  className="bg-sky-600 hover:bg-sky-700 w-full h-10 rounded-xl font-semibold gap-2"
                >
                  {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {resent ? "Email Sent!" : resending ? "Sending…" : "Resend Verification Email"}
                </Button>
                <Link href="/login" className="text-sm text-sky-600 hover:text-sky-700 font-medium">
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
