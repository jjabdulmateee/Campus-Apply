import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  useListUniversities,
  useGetUniversityStats,
  useGetFeaturedUniversities,
  useSaveCollege,
  useRemoveCollege,
  useListMyColleges,
  getListMyCollegesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Search, MapPin, Building2, Trophy, GraduationCap, Plus, Check, Loader2, RefreshCw, DollarSign, PenLine, Filter } from "lucide-react";
import { PROVINCES } from "@/lib/constants";

const DEADLINE_TYPE_OPTIONS = [
  { value: "_all", label: "All Deadlines" },
  { value: "early_action", label: "Early Action" },
  { value: "regular_decision", label: "Regular Decision" },
  { value: "rolling", label: "Rolling Admissions" },
];

export default function Universities() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [deadlineType, setDeadlineType] = useState<string>("");
  const [noFee, setNoFee] = useState(false);
  const [noEssay, setNoEssay] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const isTransfer = localStorage.getItem("pakapp_user_type") === "transfer";

  const { data: universities, isLoading } = useListUniversities({
    province: province || undefined,
    type: (type as "public" | "private" | "semi_government") || undefined,
    search: search || undefined,
    deadlineType: deadlineType || undefined,
    noFee: noFee ? "true" : undefined,
    noEssay: noEssay ? "true" : undefined,
  });

  const { data: stats } = useGetUniversityStats();
  const { data: featured } = useGetFeaturedUniversities();
  const { data: myColleges } = useListMyColleges();
  const savedIds = new Set((myColleges ?? []).map((c) => c.universityId));

  const qc = useQueryClient();
  const { toast } = useToast();
  const [savingId, setSavingId] = useState<number | null>(null);

  const { mutate: save } = useSaveCollege({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMyCollegesQueryKey() });
        setSavingId(null);
        toast({ title: "University saved", description: "Added to My Universities list." });
      },
      onError: () => { setSavingId(null); toast({ title: "Failed to save", variant: "destructive" }); },
    },
  });

  const { mutate: remove } = useRemoveCollege({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMyCollegesQueryKey() });
        setSavingId(null);
        toast({ title: "Removed from My Universities" });
      },
      onError: () => { setSavingId(null); toast({ title: "Failed to remove", variant: "destructive" }); },
    },
  });

  const handleSaveToggle = (universityId: number) => {
    setSavingId(universityId);
    if (savedIds.has(universityId)) {
      remove({ universityId });
    } else {
      save({ data: { universityId } });
    }
  };

  const activeFilterCount = [deadlineType, noFee, noEssay].filter(Boolean).length + (province ? 1 : 0) + (type ? 1 : 0);

  return (
    <AppLayout title="University Search" subtitle="Find and explore Pakistan's top universities">
      <div className="space-y-5">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Universities", value: stats.totalUniversities, color: "sky" },
              { label: "Admissions Open", value: stats.admissionOpenCount, color: "green" },
              { label: "Provinces", value: stats.byProvince.length, color: "violet" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-sky-100 p-4 text-center shadow-sm">
                <div className={cn(
                  "text-2xl font-bold",
                  s.color === "sky" ? "text-sky-700" : s.color === "green" ? "text-green-600" : "text-violet-600",
                )}>{s.value}</div>
                <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search + filter bar */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search universities, cities..."
                className="pl-9 border-sky-100 focus:border-sky-400"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "gap-1.5 border-sky-200 h-10",
                activeFilterCount > 0 && "bg-sky-50 border-sky-400 text-sky-700",
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select value={province || "_all"} onValueChange={(v) => setProvince(v === "_all" ? "" : v)}>
                  <SelectTrigger className="border-sky-100 h-9 text-sm">
                    <SelectValue placeholder="All Provinces" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Provinces</SelectItem>
                    {PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={type || "_all"} onValueChange={(v) => setType(v === "_all" ? "" : v)}>
                  <SelectTrigger className="border-sky-100 h-9 text-sm">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Types</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="semi_government">Semi-Govt</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={deadlineType || "_all"} onValueChange={(v) => setDeadlineType(v === "_all" ? "" : v)}>
                  <SelectTrigger className="border-sky-100 h-9 text-sm">
                    <SelectValue placeholder="All Deadlines" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEADLINE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  active={noFee}
                  onToggle={() => setNoFee((v) => !v)}
                  icon={DollarSign}
                  label="No Application Fee"
                />
                <ToggleChip
                  active={noEssay}
                  onToggle={() => setNoEssay((v) => !v)}
                  icon={PenLine}
                  label="No Essay Required"
                />
                {isTransfer && (
                  <ToggleChip
                    active={false}
                    onToggle={() => {}}
                    icon={RefreshCw}
                    label="Transfer Friendly (showing labels)"
                    disabled
                  />
                )}
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      setProvince(""); setType(""); setDeadlineType(""); setNoFee(false); setNoEssay(false);
                    }}
                    className="text-xs text-slate-400 hover:text-red-500 underline underline-offset-2"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Featured */}
        {!searchInput && !province && !type && !deadlineType && !noFee && !noEssay && featured && featured.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Featured Institutions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((u) => (
                <UniversityCard
                  key={u.id}
                  university={u}
                  featured
                  saved={savedIds.has(u.id)}
                  saving={savingId === u.id}
                  onSaveToggle={handleSaveToggle}
                  isTransfer={isTransfer}
                />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div>
          {(searchInput || province || type || deadlineType || noFee || noEssay) && (
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {isLoading ? "Searching..." : `${universities?.length ?? 0} result${universities?.length !== 1 ? "s" : ""}`}
            </h2>
          )}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-52 bg-white rounded-2xl animate-pulse border border-sky-50" />
              ))}
            </div>
          ) : universities && universities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {universities.map((u) => (
                <UniversityCard
                  key={u.id}
                  university={u}
                  saved={savedIds.has(u.id)}
                  saving={savingId === u.id}
                  onSaveToggle={handleSaveToggle}
                  isTransfer={isTransfer}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-sky-200 p-12 text-center">
              <GraduationCap className="w-10 h-10 text-sky-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No universities found. Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function ToggleChip({
  active, onToggle, icon: Icon, label, disabled,
}: {
  active: boolean;
  onToggle: () => void;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
        active
          ? "bg-sky-600 border-sky-600 text-white"
          : "bg-white border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-700",
        disabled && "opacity-50 cursor-default",
      )}
    >
      <Icon className="w-3 h-3" />
      {active && <Check className="w-3 h-3" />}
      {label}
    </button>
  );
}

function UniversityCard({
  university: u,
  featured,
  saved,
  saving,
  onSaveToggle,
  isTransfer,
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
    deadlineType?: string | null;
    applicationFeeRequired?: boolean | null;
    essayRequired?: boolean | null;
    acceptsTransfer?: boolean | null;
    admissionOpen?: boolean | null;
    isFeatured?: boolean | null;
    description?: string | null;
  };
  featured?: boolean;
  saved: boolean;
  saving: boolean;
  onSaveToggle: (id: number) => void;
  isTransfer: boolean;
}) {
  const typeColors: Record<string, string> = {
    public: "bg-green-100 text-green-700",
    private: "bg-purple-100 text-purple-700",
    semi_government: "bg-amber-100 text-amber-700",
  };

  const deadlineLabel =
    u.deadlineType === "early_action"
      ? "Early Action"
      : u.deadlineType === "regular_decision"
        ? "Regular Decision"
        : u.deadlineType === "rolling"
          ? "Rolling"
          : null;

  return (
    <div className="relative bg-white rounded-2xl border border-sky-100 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-200 p-5 group flex flex-col">
      {/* Save button */}
      <button
        onClick={(e) => { e.preventDefault(); onSaveToggle(u.id); }}
        disabled={saving}
        title={saved ? "Remove from My Universities" : "Add to My Universities"}
        className={cn(
          "absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center border transition-all z-10",
          saved
            ? "bg-sky-600 border-sky-600 text-white hover:bg-red-500 hover:border-red-500"
            : "bg-sky-50 border-sky-200 text-sky-500 hover:bg-sky-100 hover:border-sky-400",
        )}
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : saved ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Plus className="w-3.5 h-3.5" />
        )}
      </button>

      <Link href={`/universities/${u.id}`} className="flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-3 pr-10">
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-sky-600">{(u.shortName ?? u.name).slice(0, 4)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5 flex-wrap">
              {u.admissionOpen ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Open</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">Closed</span>
              )}
              {isTransfer && u.acceptsTransfer && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5" /> Transfer
                </span>
              )}
              {deadlineLabel && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700">{deadlineLabel}</span>
              )}
            </div>
          </div>
        </div>

        <h3 className="font-semibold text-slate-800 group-hover:text-sky-700 transition-colors leading-snug text-sm">
          {u.name}
        </h3>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
          <MapPin className="w-3 h-3" /> {u.city}, {u.province}
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", typeColors[u.type] ?? "bg-slate-100 text-slate-600")}>
            {u.type === "semi_government" ? "Semi-Govt" : u.type.charAt(0).toUpperCase() + u.type.slice(1)}
          </span>
          {u.ranking && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <Trophy className="w-3 h-3" /> #{u.ranking}
            </span>
          )}
          {u.programCount != null && u.programCount > 0 && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {u.programCount} programs
            </span>
          )}
        </div>

        {/* Fee / essay badges */}
        {(u.applicationFeeRequired === false || u.essayRequired === false) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {u.applicationFeeRequired === false && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                No Fee
              </span>
            )}
            {u.essayRequired === false && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                No Essay
              </span>
            )}
          </div>
        )}

        {u.applicationDeadline && (
          <div className="mt-auto pt-3 border-t border-sky-50 text-xs text-slate-400 mt-3">
            Deadline: <span className="text-slate-600 font-medium">{u.applicationDeadline}</span>
          </div>
        )}
      </Link>
    </div>
  );
}
