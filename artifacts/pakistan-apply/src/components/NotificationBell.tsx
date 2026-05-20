import { useState, useRef, useEffect, useCallback } from "react";
import { Bell, X, CheckCheck, Loader2, GraduationCap, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

interface AppNotification {
  id: number;
  user_id: number;
  student_id: string | null;
  type: string;
  title: string;
  message: string;
  application_id: number | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

async function fetchNotifications(): Promise<NotificationsResponse> {
  const res = await fetch("/api/notifications", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

async function markAllRead(): Promise<void> {
  await fetch("/api/notifications/read-all", {
    method: "PUT",
    credentials: "include",
  });
}

async function markOneRead(id: number): Promise<void> {
  await fetch(`/api/notifications/${id}/read`, {
    method: "PUT",
    credentials: "include",
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function notifIcon(type: string) {
  if (type === "accepted") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (type === "rejected") return <X className="w-4 h-4 text-red-400" />;
  if (type === "waitlisted") return <Clock className="w-4 h-4 text-amber-500" />;
  return <GraduationCap className="w-4 h-4 text-sky-500" />;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
    retry: false,
  });

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllRead();
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }, [qc]);

  const handleMarkOneRead = useCallback(
    async (id: number) => {
      await markOneRead(id);
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    [qc],
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative p-2 rounded-xl transition-all",
          open ? "bg-sky-100 text-sky-700" : "hover:bg-sky-50 text-slate-500 hover:text-sky-600",
        )}
        aria-label="Notifications"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-sky-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-sky-50">
            <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
                <Bell className="w-7 h-7 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) handleMarkOneRead(n.id);
                  }}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors",
                    n.is_read ? "bg-white hover:bg-slate-50" : "bg-sky-50/60 hover:bg-sky-50",
                  )}
                >
                  <div className="w-7 h-7 rounded-lg bg-white border border-sky-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                    {notifIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-xs font-semibold leading-tight", n.is_read ? "text-slate-600" : "text-slate-800")}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-slate-300">{timeAgo(n.created_at)}</span>
                      {n.application_id && n.type === "accepted" && (
                        <Link
                          href="/applications"
                          onClick={() => setOpen(false)}
                          className="text-[10px] font-semibold text-sky-600 hover:text-sky-700"
                        >
                          View letter →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
              <Link
                href="/applications"
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                View all applications →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
