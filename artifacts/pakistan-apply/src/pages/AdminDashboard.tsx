import { useState } from "react";
import { Link } from "wouter";
import {
  useGetAdminStats,
  useListAdminApplications,
  useListUniversities,
  useListAdminSupportTickets,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import {
  Search,
  Filter,
  Users,
  Clock,
  CheckCircle2,
  ChevronRight,
  Building2,
  SortAsc,
  Ticket,
  ClipboardList,
  MessageSquare,
  Send,
  Loader2,
  XCircle,
  CalendarDays,
  TrendingUp,
  BadgeCheck,
  UserPlus,
  Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { downloadApplicationsCsv } from "@/lib/exportCsv";

type AdminTab = "applications" | "tickets";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  submitted:    { label: "Pending",      color: "text-amber-700",  bg: "bg-amber-50 border-amber-200"   },
  under_review: { label: "Under Review", color: "text-blue-700",   bg: "bg-blue-50 border-blue-200"     },
  accepted:     { label: "Accepted",     color: "text-green-700",  bg: "bg-green-50 border-green-200"   },
  rejected:     { label: "Rejected",     color: "text-red-700",    bg: "bg-red-50 border-red-200"       },
  waitlisted:   { label: "Waitlisted",   color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
};

const TICKET_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: "Open",        color: "text-amber-700", bg: "bg-amber-50 border-amber-200"  },
  in_progress: { label: "In Progress", color: "text-blue-700",  bg: "bg-blue-50 border-blue-200"    },
  resolved:    { label: "Resolved",    color: "text-green-700", bg: "bg-green-50 border-green-200"  },
};

const CATEGORY_LABELS: Record<string, string> = {
  application_tips:    "Application Tips",
  document_uploads:    "Document Uploads",
  technical_issues:    "Technical Issues",
  university_specifics:"University Info",
  other:               "Other",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateShort(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>("applications");

  // Applications state
  const [search, setSearch]           = useState("");
  const [universityId, setUniversityId] = useState<string>("");
  const [status, setStatus]           = useState<string>("");
  const [sort, setSort]               = useState<string>("");

  const { data: stats }      = useGetAdminStats();
  const { data: listData, isLoading } = useListAdminApplications({
    search:       search       || undefined,
    universityId: universityId ? parseInt(universityId) : undefined,
    status:       status       || undefined,
    sort:         sort         || undefined,
  });
  const { data: universities } = useListUniversities({});

  // Tickets state
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>("");
  const { data: ticketsData, isLoading: ticketsLoading, refetch: refetchTickets } =
    useListAdminSupportTickets({ status: ticketStatusFilter as "open" | "in_progress" | "resolved" | undefined || undefined });

  const applications = listData?.applications ?? [];
  const tickets      = ticketsData?.tickets   ?? [];

  // Unresolved ticket count badge
  const openCount = (ticketsData?.tickets ?? []).filter((t) => t.status !== "resolved").length;

  // Active university name
  const selectedUni = universityId
    ? (universities ?? []).find((u: { id: number; name: string }) => String(u.id) === universityId)
    : null;

  // Per-status counts from current filtered results
  const filteredCounts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const handleExportCsv = () => {
    if (applications.length === 0) {
      toast({ title: "No applications to export", variant: "destructive" });
      return;
    }
    const prefix = selectedUni
      ? `applications-${selectedUni.name.replace(/\s+/g, "-").toLowerCase()}`
      : "applications-all";
    downloadApplicationsCsv(applications, prefix);
    toast({ title: `Exported ${applications.length} application${applications.length === 1 ? "" : "s"} to CSV` });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin top bar */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">Campus Apply — Admissions Portal</div>
            <div className="text-xs text-slate-400">
              {selectedUni ? `Viewing: ${selectedUni.name}` : "All Universities"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/partners/invite">
            <button className="flex items-center gap-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white transition-colors px-3 py-1.5 rounded-lg font-semibold">
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Invite Partner</span>
            </button>
          </Link>
          <Link href="/dashboard">
            <button className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800">
              ← Student View
            </button>
          </Link>
        </div>
      </div>

      {/* University context banner (when filtered) */}
      {selectedUni && (
        <div className="bg-sky-600 text-white px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-sm">
            <BadgeCheck className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">Filtered view:</span>
            <span>{selectedUni.name}</span>
          </div>
          <button
            onClick={() => setUniversityId("")}
            className="text-xs text-sky-200 hover:text-white transition-colors flex items-center gap-1"
          >
            <XCircle className="w-3.5 h-3.5" /> Clear filter
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Users className="w-5 h-5 text-sky-600" />}
            label="Total"
            value={universityId ? applications.length : (stats?.total ?? 0)}
            bg="bg-sky-50"
            sub={universityId ? "in this view" : "submitted"}
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            label="Pending"
            value={universityId ? (filteredCounts["submitted"] ?? 0) : (stats?.pending ?? 0)}
            bg="bg-amber-50"
            sub="awaiting review"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
            label="In Review"
            value={universityId ? (filteredCounts["under_review"] ?? 0) : (stats?.underReview ?? 0)}
            bg="bg-blue-50"
            sub="being evaluated"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
            label="Decisions"
            value={universityId
              ? ((filteredCounts["accepted"] ?? 0) + (filteredCounts["rejected"] ?? 0) + (filteredCounts["waitlisted"] ?? 0))
              : (stats ? stats.accepted + stats.rejected : 0)}
            bg="bg-green-50"
            sub="accepted + rejected"
          />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-slate-200/60 rounded-2xl mb-6 w-fit">
          <TabBtn
            active={activeTab === "applications"}
            onClick={() => setActiveTab("applications")}
            icon={<ClipboardList className="w-4 h-4" />}
            label="Applications"
          />
          <TabBtn
            active={activeTab === "tickets"}
            onClick={() => setActiveTab("tickets")}
            icon={<Ticket className="w-4 h-4" />}
            label="Support Tickets"
            badge={openCount > 0 ? openCount : undefined}
          />
        </div>

        {/* ── Applications panel ── */}
        {activeTab === "applications" && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by name, email, or CNIC…"
                    className="pl-9 h-9 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <Select value={universityId} onValueChange={setUniversityId}>
                  <SelectTrigger className={cn("w-48 h-9 text-sm", universityId && "border-sky-400 text-sky-700 bg-sky-50")}>
                    <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                    <SelectValue placeholder="All Universities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Universities</SelectItem>
                    {(universities ?? []).map((u: { id: number; name: string }) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className={cn("w-40 h-9 text-sm", status && "border-sky-400 text-sky-700 bg-sky-50")}>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="submitted">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="waitlisted">Waitlisted</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="w-36 h-9 text-sm">
                    <SortAsc className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    <SelectValue placeholder="Sort by…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Latest First</SelectItem>
                    <SelectItem value="name">Name A–Z</SelectItem>
                    <SelectItem value="score">Aggregate Score</SelectItem>
                  </SelectContent>
                </Select>

                {(search || universityId || status || sort) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSearch(""); setUniversityId(""); setStatus(""); setSort(""); }}
                    className="h-9 text-sm text-slate-500"
                  >
                    Clear filters
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  disabled={isLoading || applications.length === 0}
                  className="h-9 text-sm gap-1.5 ml-auto border-slate-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export to CSV
                </Button>
              </div>

              {/* Quick status filter pills */}
              {applications.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                  {(["submitted", "under_review", "accepted", "rejected", "waitlisted"] as const).map((s) => {
                    const count = filteredCounts[s] ?? 0;
                    if (count === 0) return null;
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <button
                        key={s}
                        onClick={() => setStatus(status === s ? "" : s)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
                          status === s
                            ? cn(cfg.bg, cfg.color, "ring-1 ring-offset-1 ring-sky-400")
                            : cn(cfg.bg, cfg.color, "hover:ring-1 hover:ring-offset-1 hover:ring-slate-300"),
                        )}
                      >
                        <span>{cfg.label}</span>
                        <span className="font-bold">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">
                  Applicant Queue
                  {selectedUni && (
                    <span className="ml-2 text-xs font-normal text-sky-600">— {selectedUni.name}</span>
                  )}
                </h2>
                <span className="text-xs text-slate-400">
                  {applications.length} result{applications.length !== 1 ? "s" : ""}
                </span>
              </div>

              {isLoading ? (
                <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading applicants…
                </div>
              ) : applications.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No applications found</p>
                  <p className="text-slate-300 text-xs mt-1">Students haven't submitted yet, or try different filters.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <div className="col-span-3">Applicant</div>
                    <div className="col-span-3">University / Program</div>
                    <div className="col-span-1">Province</div>
                    <div className="col-span-1 text-center">Score</div>
                    <div className="col-span-2 text-center">Submitted</div>
                    <div className="col-span-1 text-center">Status</div>
                    <div className="col-span-1"></div>
                  </div>

                  {applications.map((app) => {
                    const sc = STATUS_CONFIG[app.status] ?? { label: app.status, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" };
                    return (
                      <div key={app.id} className="group hover:bg-slate-50/60 transition-colors">
                        {/* Desktop row */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3.5 items-center">
                          <div className="col-span-3 min-w-0">
                            <div className="font-semibold text-sm text-slate-800 truncate">{app.studentName}</div>
                            <div className="text-xs text-slate-400 truncate">{app.email}</div>
                            {app.cnicNumber && <div className="text-xs text-slate-300 font-mono mt-0.5">{app.cnicNumber}</div>}
                          </div>
                          <div className="col-span-3 min-w-0">
                            <div className="font-medium text-sm text-slate-700 truncate">{app.universityShortName}</div>
                            <div className="text-xs text-slate-400 truncate">{app.programName}</div>
                          </div>
                          <div className="col-span-1 text-sm text-slate-500 truncate">{app.province ?? "—"}</div>
                          <div className="col-span-1 text-center">
                            {app.aggregateScore > 0 ? (
                              <span className={cn("text-xs font-bold",
                                app.aggregateScore >= 80 ? "text-green-600"
                                : app.aggregateScore >= 60 ? "text-amber-600"
                                : "text-slate-400",
                              )}>
                                {app.aggregateScore}%
                              </span>
                            ) : <span className="text-xs text-slate-300">—</span>}
                          </div>
                          <div className="col-span-2 text-center">
                            <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                              <CalendarDays className="w-3 h-3 text-slate-400" />
                              {fmtDate(app.submittedAt)}
                            </div>
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <span className={cn("text-xs font-semibold px-2 py-1 rounded-full border whitespace-nowrap", sc.bg, sc.color)}>
                              {sc.label}
                            </span>
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <Link href={`/admin/applications/${app.id}`}>
                              <button className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-sky-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </Link>
                          </div>
                        </div>

                        {/* Mobile card */}
                        <Link href={`/admin/applications/${app.id}`}>
                          <div className="md:hidden px-4 py-4 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-sky-700">
                              {(app.studentName ?? "?")[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <div className="font-semibold text-sm text-slate-800 truncate">{app.studentName}</div>
                                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0", sc.bg, sc.color)}>
                                  {sc.label}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 truncate">{app.universityShortName} · {app.programName}</div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                                {app.aggregateScore > 0 && (
                                  <span className={cn("font-semibold", app.aggregateScore >= 80 ? "text-green-600" : app.aggregateScore >= 60 ? "text-amber-600" : "text-slate-400")}>
                                    {app.aggregateScore}%
                                  </span>
                                )}
                                <span>{fmtDateShort(app.submittedAt)}</span>
                                {app.province && <span>{app.province}</span>}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Support Tickets panel ── */}
        {activeTab === "tickets" && (
          <SupportTicketsPanel
            tickets={tickets}
            isLoading={ticketsLoading}
            statusFilter={ticketStatusFilter}
            onFilterChange={setTicketStatusFilter}
            onRefresh={refetchTickets}
          />
        )}
      </div>
    </div>
  );
}

// ── Support Tickets Panel ──────────────────────────────────────────────────
type Ticket = {
  id: number;
  studentName: string;
  studentEmail: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  adminReply?: string | null;
  adminName?: string | null;
  repliedAt?: string | null;
  createdAt?: string;
};

function SupportTicketsPanel({
  tickets,
  isLoading,
  statusFilter,
  onFilterChange,
  onRefresh,
}: {
  tickets: Ticket[];
  isLoading: boolean;
  statusFilter: string;
  onFilterChange: (v: string) => void;
  onRefresh: () => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div>
      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={onFilterChange}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          {statusFilter && (
            <Button variant="ghost" size="sm" onClick={() => onFilterChange("")} className="h-9 text-sm text-slate-500">
              Clear
            </Button>
          )}
          <span className="ml-auto text-xs text-slate-400">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Student Support Tickets</h2>
          <button onClick={onRefresh} className="text-xs text-slate-400 hover:text-sky-600 transition-colors">Refresh</button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading tickets…
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No support tickets found</p>
            <p className="text-slate-300 text-xs mt-1">Students haven't submitted any questions yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {tickets.map((ticket) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                isExpanded={expandedId === ticket.id}
                onToggle={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketRow({
  ticket,
  isExpanded,
  onToggle,
  onRefresh,
}: {
  ticket: Ticket;
  isExpanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const sc = TICKET_STATUS[ticket.status] ?? TICKET_STATUS.open;
  const { toast } = useToast();
  const [reply, setReply]       = useState(ticket.adminReply ?? "");
  const [replyStatus, setReplyStatus] = useState<"open" | "in_progress" | "resolved">(
    (ticket.status as "open" | "in_progress" | "resolved") ?? "resolved",
  );
  const [saving, setSaving] = useState(false);

  const handleReply = async () => {
    if (!reply.trim()) { toast({ title: "Reply cannot be empty", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticket.id}/reply`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply, status: replyStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast({ title: "Reply sent" });
      onRefresh();
      onToggle();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hover:bg-slate-50/40 transition-colors">
      {/* Row header */}
      <div
        className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center cursor-pointer"
        onClick={onToggle}
      >
        <div className="col-span-3 min-w-0">
          <div className="font-semibold text-sm text-slate-800 truncate">{ticket.studentName}</div>
          <div className="text-xs text-slate-400 truncate">{ticket.studentEmail}</div>
        </div>
        <div className="col-span-4 min-w-0">
          <div className="text-sm text-slate-700 truncate font-medium">{ticket.subject}</div>
          <div className="text-xs text-slate-400">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</div>
        </div>
        <div className="col-span-2 text-xs text-slate-400">
          {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : "—"}
        </div>
        <div className="col-span-2 flex">
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", sc.bg, sc.color)}>
            {sc.label}
          </span>
        </div>
        <div className="col-span-1 flex justify-end text-slate-400">
          {isExpanded ? <ChevronRight className="w-4 h-4 rotate-90" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded reply panel */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-slate-50 pt-4 space-y-4">
          {/* Student message */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-500 mb-2">Student Message</div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
          </div>

          {/* Existing reply */}
          {ticket.adminReply && (
            <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
              <div className="text-xs font-semibold text-sky-600 mb-2">
                Previous Reply {ticket.adminName ? `by ${ticket.adminName}` : ""}
                {ticket.repliedAt ? ` · ${new Date(ticket.repliedAt).toLocaleDateString("en-PK")}` : ""}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{ticket.adminReply}</p>
            </div>
          )}

          {/* Reply form */}
          <div className="space-y-3">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write your reply to the student…"
              className="min-h-24 text-sm resize-none rounded-xl"
            />
            <div className="flex items-center gap-3">
              <Select
                value={replyStatus}
                onValueChange={(v) => setReplyStatus(v as "open" | "in_progress" | "resolved")}
              >
                <SelectTrigger className="w-44 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Keep Open</SelectItem>
                  <SelectItem value="in_progress">Mark In Progress</SelectItem>
                  <SelectItem value="resolved">Mark Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleReply}
                disabled={saving}
                size="sm"
                className="gap-1.5 bg-sky-600 hover:bg-sky-700 ml-auto"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {saving ? "Sending…" : "Send Reply"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function TabBtn({
  active, onClick, icon, label, badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all relative",
        active ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700",
      )}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

function StatCard({
  icon, label, value, bg, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
  sub?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 shadow-sm p-4 flex items-start gap-3", bg)}>
      <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0 shadow-sm">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black text-slate-800 leading-none">{value}</div>
        <div className="text-xs font-semibold text-slate-600 mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
