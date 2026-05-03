import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  ArrowLeft,
  Copy,
  CheckCircle2,
  Loader2,
  UserPlus,
  Mail,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface InviteResult {
  email: string;
  fullName: string;
  tempPassword: string;
  loginUrl: string;
}

export default function AdminPartnerInvite() {
  const { toast } = useToast();
  const [form, setForm] = useState({ fullName: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"pass" | "link" | null>(null);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const canSubmit = form.fullName.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("pakapp_token");
      const res = await fetch("/api/admin/partners/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName: form.fullName.trim(), email: form.email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create partner account");
      setResult(data);
      setForm({ fullName: "", email: "" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: "pass" | "link") => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Back */}
        <div className="mb-6">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Admin Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-sky-600 flex items-center justify-center shadow-lg shadow-sky-600/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Partner Invitation Tool</h1>
            <p className="text-sm text-slate-400 mt-0.5">Create a new University Admin account</p>
          </div>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-3 bg-sky-950/60 border border-sky-800 rounded-2xl p-4 mb-6">
          <AlertCircle className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-sky-300 leading-relaxed">
            This tool creates an <span className="font-semibold text-sky-200">admin-level</span> account for a new University Partner. 
            The generated credentials give full access to the admin portal — share them securely with the University official only.
          </p>
        </div>

        {/* Result card */}
        {result && (
          <div className="bg-slate-900 border border-green-700/50 rounded-2xl p-6 mb-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-400">Partner account created!</p>
                <p className="text-xs text-slate-400">{result.fullName} · {result.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-400 mb-1.5 block flex items-center gap-1.5">
                  <KeyRound className="w-3 h-3" />
                  Temporary Password
                </Label>
                <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-4 py-2.5">
                  <code className="flex-1 text-sm font-mono text-amber-400 tracking-wide">
                    {result.tempPassword}
                  </code>
                  <button
                    onClick={() => copyToClipboard(result.tempPassword, "pass")}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      copied === "pass" ? "text-green-400" : "text-slate-400 hover:text-white",
                    )}
                  >
                    {copied === "pass" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-400 mb-1.5 block flex items-center gap-1.5">
                  <Mail className="w-3 h-3" />
                  Login Link to Share
                </Label>
                <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-4 py-2.5">
                  <code className="flex-1 text-xs font-mono text-sky-300 truncate">
                    {result.loginUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(result.loginUrl, "link")}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors flex-shrink-0",
                      copied === "link" ? "text-green-400" : "text-slate-400 hover:text-white",
                    )}
                  >
                    {copied === "link" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3">
              <p className="text-xs text-amber-300 leading-relaxed">
                <span className="font-semibold">Important:</span> Share these credentials securely (e.g., via encrypted email or secure messaging). 
                The partner should change their password after first login.
              </p>
            </div>

            <Button
              onClick={() => setResult(null)}
              variant="outline"
              size="sm"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Invite Another Partner
            </Button>
          </div>
        )}

        {/* Form */}
        {!result && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-950/50 border border-red-800 text-sm text-red-300">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-400 block">
                  Full Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={form.fullName}
                  onChange={set("fullName")}
                  placeholder="Dr. Amjad Khan"
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-400 block">
                  Email Address <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="admissions@university.edu.pk"
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-500"
                />
                <p className="text-[11px] text-slate-500">
                  This will be their login email for the admin portal.
                </p>
              </div>

              <Button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "w-full h-11 font-bold transition-all",
                  canSubmit
                    ? "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed",
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Generate Partner Credentials
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
