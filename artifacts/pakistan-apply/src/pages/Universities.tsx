import AppLayout from "@/components/AppLayout";
import { useState } from "react";
import { Link } from "wouter";
import {
  useListUniversities,
  useGetUniversityStats,
  useGetFeaturedUniversities,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, MapPin, Building2, Trophy, ExternalLink, GraduationCap } from "lucide-react";
import { PROVINCES } from "@/lib/constants";

export default function Universities() {
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState<string>("");
  const [type, setType] = useState<string>("");

  const { data: universities, isLoading } = useListUniversities({
    province: province || undefined,
    type: (type as "public" | "private" | "semi_government") || undefined,
    search: search || undefined,
  });

  const { data: stats } = useGetUniversityStats();
  const { data: featured } = useGetFeaturedUniversities();

  return (
    <AppLayout title="University Search" subtitle="Find and explore Pakistan's top universities">
      <div className="space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-sky-100 p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-sky-700">{stats.totalUniversities}</div>
              <div className="text-xs text-slate-400 mt-1">Universities</div>
            </div>
            <div className="bg-white rounded-2xl border border-sky-100 p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-sky-700">{stats.admissionOpenCount}</div>
              <div className="text-xs text-slate-400 mt-1">Admissions Open</div>
            </div>
            <div className="bg-white rounded-2xl border border-sky-100 p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-sky-700">{stats.byProvince.length}</div>
              <div className="text-xs text-slate-400 mt-1">Provinces</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search universities..."
                className="pl-9 border-sky-100 focus:border-sky-400"
              />
            </div>
            <Select value={province || "_all"} onValueChange={(v) => setProvince(v === "_all" ? "" : v)}>
              <SelectTrigger className="w-full md:w-44 border-sky-100">
                <SelectValue placeholder="All Provinces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Provinces</SelectItem>
                {PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type || "_all"} onValueChange={(v) => setType(v === "_all" ? "" : v)}>
              <SelectTrigger className="w-full md:w-36 border-sky-100">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Types</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="semi_government">Semi-Govt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Featured */}
        {!search && !province && !type && featured && featured.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Featured Institutions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((u) => <UniversityCard key={u.id} university={u} featured />)}
            </div>
          </div>
        )}

        {/* All results */}
        <div>
          {(search || province || type) && (
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {isLoading ? "Searching..." : `${universities?.length ?? 0} results`}
            </h2>
          )}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-sky-50" />
              ))}
            </div>
          ) : universities && universities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {universities.map((u) => <UniversityCard key={u.id} university={u} />)}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-sky-200 p-12 text-center">
              <GraduationCap className="w-10 h-10 text-sky-200 mx-auto mb-3" />
              <p className="text-slate-500">No universities found. Try adjusting your search.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function UniversityCard({
  university: u,
  featured,
}: {
  university: {
    id: number;
    name: string;
    shortName?: string | null;
    city: string;
    province: string;
    type: string;
    ranking?: number | null;
    programCount?: number | null;
    applicationDeadline?: string | null;
    admissionOpen?: boolean | null;
    isFeatured?: boolean | null;
    description?: string | null;
  };
  featured?: boolean;
}) {
  const typeColors: Record<string, string> = {
    public: "bg-green-100 text-green-700",
    private: "bg-purple-100 text-purple-700",
    semi_government: "bg-amber-100 text-amber-700",
  };

  return (
    <Link href={`/universities/${u.id}`} className="block bg-white rounded-2xl border border-sky-100 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-200 p-5 group">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-sky-600">{(u.shortName ?? u.name).slice(0, 4)}</span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {u.admissionOpen ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Open</span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Closed</span>
            )}
            {u.ranking && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <Trophy className="w-3 h-3" /> #{u.ranking}
              </div>
            )}
          </div>
        </div>

        <h3 className="font-semibold text-slate-800 group-hover:text-sky-700 transition-colors leading-snug">
          {u.name}
        </h3>

        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
          <MapPin className="w-3 h-3" /> {u.city}, {u.province}
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", typeColors[u.type] ?? "bg-slate-100 text-slate-600")}>
            {u.type === "semi_government" ? "Semi-Govt" : u.type.charAt(0).toUpperCase() + u.type.slice(1)}
          </span>
          {u.programCount !== undefined && u.programCount !== null && u.programCount > 0 && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {u.programCount} programs
            </span>
          )}
        </div>

        {u.applicationDeadline && (
          <div className="mt-3 pt-3 border-t border-sky-50 text-xs text-slate-400">
            Deadline: <span className="text-slate-600 font-medium">{u.applicationDeadline}</span>
          </div>
        )}
    </Link>
  );
}
