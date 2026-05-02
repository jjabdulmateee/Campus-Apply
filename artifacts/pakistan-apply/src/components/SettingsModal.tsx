import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { customFetch } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import {
  Lock, Mail, Camera, Bell, Trash2, ChevronRight,
  Loader2, Eye, EyeOff, AlertTriangle, CheckCircle,
  User,
} from "lucide-react";

type Tab = "avatar" | "password" | "email" | "notifications" | "delete";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS: { id: Tab; label: string; icon: React.ElementType; danger?: boolean }[] = [
  { id: "avatar", label: "Profile Photo", icon: Camera },
  { id: "password", label: "Change Password", icon: Lock },
  { id: "email", label: "Change Email", icon: Mail },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "delete", label: "Delete Account", icon: Trash2, danger: true },
];

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>("avatar");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="flex h-[560px]">
          {/* Sidebar nav */}
          <div className="w-52 bg-slate-50 border-r border-slate-100 flex flex-col flex-shrink-0">
            <div className="px-4 py-5 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-800">Account Settings</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">Manage your account</p>
            </div>
            <nav className="flex-1 px-2 py-3 space-y-0.5">
              {NAV_ITEMS.map(({ id, label, icon: Icon, danger }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                    tab === id
                      ? danger
                        ? "bg-red-50 text-red-600"
                        : "bg-sky-600 text-white"
                      : danger
                        ? "text-red-500 hover:bg-red-50"
                        : "text-slate-600 hover:bg-white hover:shadow-sm",
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {tab === id && <ChevronRight className="w-3 h-3 opacity-60" />}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {tab === "avatar" && <AvatarTab onClose={onClose} />}
            {tab === "password" && <PasswordTab />}
            {tab === "email" && <EmailTab onClose={onClose} />}
            {tab === "notifications" && <NotificationsTab />}
            {tab === "delete" && <DeleteTab onClose={onClose} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-6 pt-6 pb-4 border-b border-slate-100">
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

/* ─── Avatar Tab ──────────────────────────────────────────────────────────── */
function AvatarTab({ onClose }: { onClose: () => void }) {
  const { user, setUserAvatar } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const token = localStorage.getItem("pakapp_token");

  const avatarSrc = preview ?? (user?.avatarUrl ? `/api/storage/objects/${user.avatarUrl}` : null);

  const handleFile = (file: File) => {
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Only JPG, PNG, or WebP images allowed", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be under 2MB", variant: "destructive" });
      return;
    }
    setPreview(URL.createObjectURL(file));
    uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const urlRes = await fetch("/api/account/avatar/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error((await urlRes.json()).error ?? "Upload URL failed");
      const { uploadURL, objectPath } = await urlRes.json();

      const putRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      const saveRes = await fetch("/api/account/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ objectPath }),
      });
      if (!saveRes.ok) throw new Error((await saveRes.json()).error ?? "Save failed");

      setUserAvatar(objectPath);
      toast({ title: "Profile photo updated" });
      onClose();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Upload failed", variant: "destructive" });
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <PanelHeader title="Profile Photo" subtitle="Upload a photo that will appear next to your name" />
      <div className="p-6 flex flex-col items-center gap-6">
        <div
          className="w-28 h-28 rounded-full border-4 border-sky-100 bg-sky-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-sky-300 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-sky-300" />
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        <div className="text-center space-y-1">
          <p className="text-sm text-slate-500">Click the photo above or use the button below</p>
          <p className="text-xs text-slate-400">JPG, PNG, or WebP · Max 2MB</p>
        </div>

        <Button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="bg-sky-600 hover:bg-sky-700 gap-2"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {uploading ? "Uploading…" : "Choose Photo"}
        </Button>
      </div>
    </div>
  );
}

/* ─── Password Tab ────────────────────────────────────────────────────────── */
const pwSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(8, "Must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Required"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match",
});

function PasswordTab() {
  const { toast } = useToast();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const token = localStorage.getItem("pakapp_token");

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(pwSchema),
  });

  const onSubmit = async (data: z.infer<typeof pwSchema>) => {
    setIsPending(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast({ title: "Password changed successfully" });
      reset();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div>
      <PanelHeader title="Change Password" subtitle="Choose a strong password with at least 8 characters" />
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div>
          <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Current Password</Label>
          <div className="relative">
            <Input type={showCurrent ? "text" : "password"} {...register("currentPassword")} placeholder="Enter current password" className="pr-10" />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.currentPassword && <p className="text-xs text-red-500 mt-1">{errors.currentPassword.message as string}</p>}
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-600 mb-1.5 block">New Password</Label>
          <div className="relative">
            <Input type={showNew ? "text" : "password"} {...register("newPassword")} placeholder="At least 8 characters" className="pr-10" />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword.message as string}</p>}
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Confirm New Password</Label>
          <Input type="password" {...register("confirmPassword")} placeholder="Repeat new password" />
          {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message as string}</p>}
        </div>
        <Button type="submit" disabled={isPending} className="w-full bg-sky-600 hover:bg-sky-700 gap-2">
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? "Saving…" : "Update Password"}
        </Button>
      </form>
    </div>
  );
}

/* ─── Email Tab ───────────────────────────────────────────────────────────── */
const emailSchema = z.object({
  newEmail: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password required"),
});

function EmailTab({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const token = localStorage.getItem("pakapp_token");

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(emailSchema),
  });

  const onSubmit = async (data: z.infer<typeof emailSchema>) => {
    setIsPending(true);
    try {
      const res = await fetch("/api/account/change-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast({ title: "Email updated", description: "Please log in again with your new email." });
      logout();
      onClose();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div>
      <PanelHeader title="Change Email" subtitle="Your new email will be used to log in" />
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="bg-sky-50 rounded-xl p-3 text-xs text-slate-600">
          Current email: <span className="font-semibold text-slate-800">{user?.email}</span>
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-600 mb-1.5 block">New Email Address</Label>
          <Input type="email" {...register("newEmail")} placeholder="new@example.com" />
          {errors.newEmail && <p className="text-xs text-red-500 mt-1">{errors.newEmail.message as string}</p>}
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Confirm with Password</Label>
          <Input type="password" {...register("password")} placeholder="Your current password" />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message as string}</p>}
        </div>
        <Button type="submit" disabled={isPending} className="w-full bg-sky-600 hover:bg-sky-700 gap-2">
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? "Saving…" : "Update Email"}
        </Button>
      </form>
    </div>
  );
}

/* ─── Notifications Tab ───────────────────────────────────────────────────── */
interface Prefs { emailOnStatusChange: boolean; deadlineReminders: boolean; weeklyDigest: boolean; }

function NotificationsTab() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("pakapp_token");

  const load = async () => {
    try {
      const res = await fetch("/api/account/preferences", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPrefs(await res.json());
    } finally {
      setLoading(false);
    }
  };

  if (loading && !prefs) { load(); }

  const toggle = async (key: keyof Prefs) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      const res = await fetch("/api/account/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [key]: updated[key] }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Preferences saved" });
    } catch {
      setPrefs(prefs);
      toast({ title: "Failed to save preferences", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const PREF_ITEMS: { key: keyof Prefs; label: string; description: string }[] = [
    { key: "emailOnStatusChange", label: "Application Status Updates", description: "Receive an email when an admin accepts, rejects, or requests more information on your application." },
    { key: "deadlineReminders", label: "Deadline Reminders", description: "Get reminded 7 days and 1 day before a university application deadline." },
    { key: "weeklyDigest", label: "Weekly Digest", description: "A weekly summary of your application progress and upcoming deadlines." },
  ];

  return (
    <div>
      <PanelHeader title="Notification Preferences" subtitle="Control what emails you receive from PakApply" />
      <div className="p-6 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          PREF_ITEMS.map(({ key, label, description }) => (
            <div key={key} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-800">{label}</div>
                <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</div>
              </div>
              <button
                disabled={saving}
                onClick={() => toggle(key)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 mt-0.5",
                  prefs?.[key] ? "bg-sky-600" : "bg-slate-300",
                  saving && "opacity-60",
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                  prefs?.[key] ? "translate-x-4" : "translate-x-0.5",
                )} />
              </button>
            </div>
          ))
        )}
        {!loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
            <CheckCircle className="w-3.5 h-3.5 text-sky-500" />
            Changes are saved automatically
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Delete Tab ──────────────────────────────────────────────────────────── */
function DeleteTab({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const token = localStorage.getItem("pakapp_token");

  const handleDelete = async () => {
    if (!password) { toast({ title: "Enter your password to confirm", variant: "destructive" }); return; }
    setIsPending(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Deletion failed");
      toast({ title: "Account deleted", description: "Your account and all data have been permanently removed." });
      logout();
      onClose();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Deletion failed", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div>
      <PanelHeader title="Delete Account" subtitle="This action is permanent and cannot be undone" />
      <div className="p-6 space-y-5">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-semibold mb-1">This will permanently delete:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs text-red-600">
              <li>Your account and login credentials</li>
              <li>All applications and supplement answers</li>
              <li>All academic records, test scores, activities, and essays</li>
              <li>All uploaded documents</li>
            </ul>
          </div>
        </div>

        <div className="text-sm text-slate-600">
          Account: <span className="font-semibold text-slate-800">{user?.email}</span>
        </div>

        {!confirmed ? (
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 gap-2"
            onClick={() => setConfirmed(true)}
          >
            <Trash2 className="w-4 h-4" />
            I understand — show deletion form
          </Button>
        ) : (
          <div className="space-y-4 border border-red-200 rounded-xl p-4 bg-red-50/50">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Enter your password to confirm</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your current password"
                className="border-red-200 focus:border-red-400"
              />
            </div>
            <Button
              onClick={handleDelete}
              disabled={isPending || !password}
              className="w-full bg-red-600 hover:bg-red-700 gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isPending ? "Deleting…" : "Permanently Delete My Account"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
