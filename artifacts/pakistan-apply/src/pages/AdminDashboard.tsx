import { useState } from "react";
import { Link } from "wouter";
import {
  useGetAdminStats,
  useListAdminApplications,
  useListUniversities,
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  submitted: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  under_review: {
    label: "Under Review",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  accepted: {
    label: "Accepted",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  waitlisted: {
    label: "Waitlisted",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
  },
};

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const [universityId, setUniversityId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [sort, setSort] = useState<string>("");

  const { data: stats } = useGetAdminStats();
  const { data: listData, isLoading } = useListAdminApplications({
    search: search || undefined,
    universityId: universityId ? parseInt(universityId) : undefined,
    status: status || undefined,
    sort: sort || undefined,
  });
  const { data: universities } = useListUniversities({});

  const applications = listData?.applications ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin top bar */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">
              PakApply — Admissions Portal
            </div>
            <div className="text-xs text-slate-400">University Admin View</div>
          </div>
        </div>
        <Link href="/dashboard">
          <button className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800">
            ← Back to Student View
          </button>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={<Users className="w-5 h-5 text-sky-600" />}
            label="Total Applications"
            value={stats?.total ?? listData?.stats?.total ?? 0}
            bg="bg-sky-50"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            label="Pending Review"
            value={stats?.pending ?? listData?.stats?.pending ?? 0}
            bg="bg-amber-50"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
            label="Decisions Made"
            value={stats?.decided ?? listData?.stats?.decided ?? (stats ? stats.accepted + stats.rejected : 0)}
            bg="bg-green-50"
          />
        </div>

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
              <SelectTrigger className="w-44 h-9 text-sm">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <SelectValue placeholder="All Universities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Universities</SelectItem>
                {(universities ?? []).map((u: { id: number; name: string }) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40 h-9 text-sm">
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
                onClick={() => {
                  setSearch("");
                  setUniversityId("");
                  setStatus("");
                  setSort("");
                }}
                className="h-9 text-sm text-slate-500"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Applicant Queue
            </h2>
            <span className="text-xs text-slate-400">
              {applications.length} result
              {applications.length !== 1 ? "s" : ""}
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Loading applicants…
            </div>
          ) : applications.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No applications found</p>
              <p className="text-slate-300 text-xs mt-1">
                Students haven't submitted yet, or try different filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <div className="col-span-3">Applicant</div>
                <div className="col-span-3">University / Program</div>
                <div className="col-span-2">Province</div>
                <div className="col-span-1 text-center">Score</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-1"></div>
              </div>

              {applications.map((app) => {
                const sc = STATUS_CONFIG[app.status] ?? {
                  label: app.status,
                  color: "text-slate-600",
                  bg: "bg-slate-50 border-slate-200",
                };
                return (
                  <div
                    key={app.id}
                    className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="col-span-3 min-w-0">
                      <div className="font-semibold text-sm text-slate-800 truncate">
                        {app.studentName}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {app.email}
                      </div>
                      {app.cnicNumber && (
                        <div className="text-xs text-slate-300 font-mono mt-0.5">
                          {app.cnicNumber}
                        </div>
                      )}
                    </div>
                    <div className="col-span-3 min-w-0">
                      <div className="font-medium text-sm text-slate-700 truncate">
                        {app.universityShortName}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {app.programName}
                      </div>
                    </div>
                    <div className="col-span-2 text-sm text-slate-500">
                      {app.province ?? "—"}
                    </div>
                    <div className="col-span-1 text-center">
                      {app.aggregateScore > 0 ? (
                        <span
                          className={cn(
                            "text-xs font-bold",
                            app.aggregateScore >= 80
                              ? "text-green-600"
                              : app.aggregateScore >= 60
                                ? "text-amber-600"
                                : "text-slate-400",
                          )}
                        >
                          {app.aggregateScore}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <span
                        className={cn(
                          "text-xs font-semibold px-2.5 py-1 rounded-full border",
                          sc.bg,
                          sc.color,
                        )}
                      >
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", bg)}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
