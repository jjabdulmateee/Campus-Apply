import AppLayout from "@/components/AppLayout";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetMyAcademics,
  useAddAcademicRecord,
  useDeleteAcademicRecord,
  getGetMyAcademicsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ACADEMIC_LEVELS,
  MATRIC_FSC_BOARDS,
  CAMBRIDGE_EDEXCEL_BOARDS,
  BOARDS,
  MATRIC_GROUPS,
  INTER_GROUPS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Plus, Trash2, GraduationCap, Loader2, Info, Building2, CheckCircle2 } from "lucide-react";

// ── Pakistani high school / college suggestions ─────────────────────────────
const SCHOOL_SUGGESTIONS = [
  "Lahore Grammar School (LGS)",
  "Aitchison College",
  "Beaconhouse School System",
  "City School",
  "Foundation Public School",
  "Roots International Schools",
  "Divisional Public School (DPS)",
  "Army Public School (APS)",
  "Cadet College Hasanabdal",
  "Cadet College Kohat",
  "PAF College Sargodha",
  "Fazaia Inter College",
  "Punjab College",
  "Superior College",
  "Garrison Academy",
  "Headstart School",
  "Froebel's International School",
  "Nixor College",
  "Cedar College",
  "St. Patrick's High School",
  "St. Joseph's Convent School",
  "Govt. Islamia High School",
  "Govt. College University (GCU) Lahore",
  "Forman Christian College",
  "Kinnaird College",
  "LACAS",
  "Allied School",
  "The Smart School",
  "Bloomfield Hall School",
];

const COLLEGE_SUGGESTIONS = [
  "University of Punjab",
  "University of Karachi",
  "University of Peshawar",
  "Quaid-i-Azam University",
  "University of Sindh",
  "COMSATS University Islamabad",
  "FAST-NUCES",
  "UET Lahore",
  "UET Peshawar",
  "NED University",
  "Mehran UET",
  "Air University",
  "Bahria University",
  "Iqra University",
  "Virtual University of Pakistan",
  "Riphah International University",
  "Capital University of Science and Technology (CUST)",
  "University of Management and Technology (UMT)",
  "Lahore School of Economics",
  "Institute of Business Administration (IBA) Karachi",
];

// ── Form schema ──────────────────────────────────────────────────────────────
const schema = z.object({
  institution: z.string().min(1, "Required"),
  level: z.enum(["matric", "intermediate", "a_levels", "o_levels", "bachelors", "other"]),
  board: z.string().optional(),
  passingYear: z.number().int().min(1990).max(2030),
  totalMarks: z.number().optional(),
  obtainedMarks: z.number().optional(),
  percentage: z.number().optional(),
  gradeOrGpa: z.string().optional(),
  subjects: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ── Searchable institution combobox ──────────────────────────────────────────
function InstitutionCombobox({
  value,
  onChange,
  suggestions,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value.trim()) return suggestions.slice(0, 8);
    return suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase())).slice(0, 8);
  }, [value, suggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={cn("border-sky-100", error && "border-red-300")}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-sky-50 text-slate-700 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); onChange(s); setOpen(false); }}
            >
              {s}
            </button>
          ))}
          {value && !filtered.some((f) => f.toLowerCase() === value.toLowerCase()) && (
            <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100 italic">
              Type to search or enter a custom name
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Education() {
  const { data: records, isLoading } = useGetMyAcademics();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const isTransfer = localStorage.getItem("pakapp_user_type") === "transfer";

  const { mutate: addRecord, isPending } = useAddAcademicRecord({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyAcademicsQueryKey() });
        setOpen(false);
        reset();
        toast({ title: "Academic record added", description: "Your education history has been saved." });
      },
    },
  });

  const { mutate: deleteRecord } = useDeleteAcademicRecord({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyAcademicsQueryKey() });
        toast({ title: "Record removed" });
      },
    },
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { passingYear: new Date().getFullYear() },
  });

  const selectedLevel = watch("level");
  const institution = watch("institution") ?? "";
  const obtainedMarks = watch("obtainedMarks");
  const totalMarks = watch("totalMarks");

  const isMatricOrFsc = selectedLevel === "matric" || selectedLevel === "intermediate";
  const isOALevel = selectedLevel === "o_levels" || selectedLevel === "a_levels";
  const isBachelors = selectedLevel === "bachelors" || selectedLevel === "other";
  const boardList = isOALevel ? CAMBRIDGE_EDEXCEL_BOARDS : isMatricOrFsc ? MATRIC_FSC_BOARDS : BOARDS;
  const subjectGroups = selectedLevel === "matric" ? MATRIC_GROUPS : selectedLevel === "intermediate" ? INTER_GROUPS : null;

  const suggestions =
    isBachelors ? COLLEGE_SUGGESTIONS
    : (isMatricOrFsc || isOALevel) ? SCHOOL_SUGGESTIONS
    : [...SCHOOL_SUGGESTIONS, ...COLLEGE_SUGGESTIONS];

  useEffect(() => {
    if (obtainedMarks && totalMarks && totalMarks > 0) {
      const pct = parseFloat(((obtainedMarks / totalMarks) * 100).toFixed(2));
      setValue("percentage", pct);
    }
  }, [obtainedMarks, totalMarks, setValue]);

  const levelLabel = (val: string) => ACADEMIC_LEVELS.find((l) => l.value === val)?.label ?? val;

  // Categorize records
  const schoolRecords = (records ?? []).filter(
    (r) => r.level === "matric" || r.level === "intermediate" || r.level === "o_levels" || r.level === "a_levels",
  );
  const collegeRecords = (records ?? []).filter(
    (r) => r.level === "bachelors" || r.level === "other",
  );

  const onSubmit = (data: FormData) => {
    addRecord({ data });
  };

  // Completion indicator
  const hasMatric = schoolRecords.some((r) => r.level === "matric" || r.level === "o_levels");
  const hasInter = schoolRecords.some((r) => r.level === "intermediate" || r.level === "a_levels");
  const completionSteps = [
    { label: "Matric / O-Levels", done: hasMatric },
    { label: "FSc / A-Levels", done: hasInter },
    ...(isTransfer ? [{ label: "Previous College", done: collegeRecords.length > 0 }] : []),
  ];
  const donePct = Math.round((completionSteps.filter((s) => s.done).length / completionSteps.length) * 100);

  return (
    <AppLayout title="Education" subtitle="Add your academic history — Matric, Intermediate, A-Levels, and beyond">
      <div className="space-y-5">

        {/* Completion bar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">Education Completion</span>
            <span className={cn(
              "text-xs font-bold",
              donePct === 100 ? "text-green-600" : "text-amber-600",
            )}>{donePct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className={cn("h-full rounded-full transition-all duration-500", donePct === 100 ? "bg-green-500" : "bg-sky-500")}
              style={{ width: `${donePct}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {completionSteps.map((step) => (
              <div
                key={step.label}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                  step.done
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-slate-50 border-slate-200 text-slate-400",
                )}
              >
                <CheckCircle2 className={cn("w-3 h-3", step.done ? "text-green-500" : "text-slate-300")} />
                {step.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Transfer: Previous Universities section ── */}
        {isTransfer && (
          <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-violet-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-violet-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-slate-800">Previous Universities / Colleges</h2>
                <p className="text-xs text-slate-400">Required for transfer applicants</p>
              </div>
              <Button
                size="sm"
                onClick={() => { reset({ level: "bachelors", passingYear: new Date().getFullYear() }); setOpen(true); }}
                className="bg-violet-600 hover:bg-violet-700 gap-1.5 h-8 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add College
              </Button>
            </div>

            {collegeRecords.length === 0 ? (
              <div className="p-10 text-center">
                <Building2 className="w-8 h-8 text-violet-200 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600 mb-1">No previous colleges added</p>
                <p className="text-xs text-slate-400">Add the university or college you are transferring from</p>
              </div>
            ) : (
              <div className="divide-y divide-violet-50">
                {collegeRecords.map((rec) => (
                  <div key={rec.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800">{rec.institution}</div>
                      <div className="text-xs text-slate-400">{levelLabel(rec.level)} — {rec.passingYear}</div>
                      {rec.percentage && (
                        <div className="text-xs text-violet-600 font-medium mt-0.5">
                          {rec.gradeOrGpa ? `CGPA: ${rec.gradeOrGpa}` : `${rec.percentage}%`}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteRecord({ recordId: rec.id })}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── School records header ── */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400 font-medium">
            {schoolRecords.length > 0
              ? `${schoolRecords.length} school record${schoolRecords.length !== 1 ? "s" : ""} added`
              : "No school records yet"}
          </p>
          <Button
            onClick={() => { reset({ passingYear: new Date().getFullYear() }); setOpen(true); }}
            className="bg-sky-600 hover:bg-sky-700 gap-2"
          >
            <Plus className="w-4 h-4" /> Add Record
          </Button>
        </div>

        {/* Records list */}
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => <div key={i} className="h-28 bg-white rounded-2xl" />)}
          </div>
        ) : schoolRecords.length > 0 ? (
          <div className="space-y-3">
            {schoolRecords.map((rec) => (
              <div key={rec.id} className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">{rec.institution}</div>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {levelLabel(rec.level)} — {rec.passingYear}
                      </div>
                      {rec.board && <div className="text-xs text-sky-600 font-medium mt-0.5">{rec.board}</div>}
                    </div>
                    <button
                      onClick={() => deleteRecord({ recordId: rec.id })}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rec.percentage && (
                      <Chip
                        label={rec.level === "o_levels" || rec.level === "a_levels" ? "IBCC Equiv." : "Percentage"}
                        value={`${rec.percentage}%`}
                      />
                    )}
                    {rec.gradeOrGpa && <Chip label="Grade/GPA" value={rec.gradeOrGpa} />}
                    {rec.obtainedMarks && rec.totalMarks && (
                      <Chip label="Marks" value={`${rec.obtainedMarks}/${rec.totalMarks}`} />
                    )}
                    {rec.subjects && <Chip label="Group/Subjects" value={rec.subjects} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState onAdd={() => { reset({ passingYear: new Date().getFullYear() }); setOpen(true); }} />
        )}
      </div>

      {/* ── Add Record Dialog ── */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Academic Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-4 py-4">

              {/* Level selector first — determines suggestions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Level</Label>
                  <Select
                    value={selectedLevel ?? ""}
                    onValueChange={(v) => {
                      setValue("level", v as FormData["level"]);
                      setValue("board", undefined);
                      setValue("institution", "");
                    }}
                  >
                    <SelectTrigger className="border-sky-100">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACADEMIC_LEVELS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.level && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Passing Year</Label>
                  <Input
                    type="number"
                    {...register("passingYear", { valueAsNumber: true })}
                    placeholder="2024"
                    className="border-sky-100"
                  />
                  {errors.passingYear && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
              </div>

              {/* Searchable institution */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  {isBachelors ? "College / University Name" : "School / Institution Name"}
                </Label>
                <InstitutionCombobox
                  value={institution}
                  onChange={(v) => setValue("institution", v)}
                  suggestions={suggestions}
                  placeholder={isBachelors ? "e.g. University of Punjab" : "e.g. Lahore Grammar School"}
                  error={errors.institution?.message}
                />
              </div>

              {selectedLevel && !isBachelors && (
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    {isOALevel ? "Examining Body" : "BISE Board"}
                  </Label>
                  <Select value={watch("board") ?? ""} onValueChange={(v) => setValue("board", v)}>
                    <SelectTrigger className="border-sky-100">
                      <SelectValue placeholder={isOALevel ? "Select examining body" : "Select BISE board"} />
                    </SelectTrigger>
                    <SelectContent>
                      {boardList.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {subjectGroups && (
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Subject Group</Label>
                  <Select value={watch("subjects") ?? ""} onValueChange={(v) => setValue("subjects", v)}>
                    <SelectTrigger className="border-sky-100">
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectGroups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!subjectGroups && (
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Subjects</Label>
                  <Input
                    {...register("subjects")}
                    placeholder="e.g. Physics, Maths, Chemistry"
                    className="border-sky-100"
                  />
                </div>
              )}

              {isMatricOrFsc ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Total Marks</Label>
                      <Input type="number" {...register("totalMarks", { valueAsNumber: true })} placeholder="1100" className="border-sky-100" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Obtained</Label>
                      <Input type="number" {...register("obtainedMarks", { valueAsNumber: true })} placeholder="980" className="border-sky-100" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Percentage</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register("percentage", { valueAsNumber: true })}
                        placeholder="auto"
                        className="border-sky-100 bg-sky-50"
                        readOnly={!!(obtainedMarks && totalMarks)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Grade</Label>
                    <Input {...register("gradeOrGpa")} placeholder="e.g. A+" className="border-sky-100" />
                  </div>
                </>
              ) : isOALevel ? (
                <>
                  <div className="bg-sky-50 rounded-xl p-3 flex gap-2">
                    <Info className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-sky-700">
                      For O/A-Level students, enter your <strong>IBCC equivalency percentage</strong> issued by the Inter Board Committee of Chairmen.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">IBCC Equivalency %</Label>
                      <Input type="number" step="0.01" {...register("percentage", { valueAsNumber: true })} placeholder="e.g. 87.36" className="border-sky-100" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Overall Grade</Label>
                      <Input {...register("gradeOrGpa")} placeholder="e.g. 3A* 2A" className="border-sky-100" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">CGPA / Percentage</Label>
                    <Input type="number" step="0.01" {...register("percentage", { valueAsNumber: true })} placeholder="e.g. 3.75" className="border-sky-100" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Grade / Division</Label>
                    <Input {...register("gradeOrGpa")} placeholder="e.g. First Division" className="border-sky-100" />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-sky-600 hover:bg-sky-700">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-100 text-xs">
      <span className="text-slate-400">{label}: </span>
      <span className="font-semibold text-sky-700">{value}</span>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-sky-200 p-12 text-center">
      <GraduationCap className="w-10 h-10 text-sky-200 mx-auto mb-4" />
      <h3 className="text-base font-semibold text-slate-700 mb-1">No academic records yet</h3>
      <p className="text-sm text-slate-400 mb-4">Add your Matric, Intermediate, O-Levels, or A-Levels qualifications.</p>
      <Button onClick={onAdd} className="bg-sky-600 hover:bg-sky-700 gap-2">
        <Plus className="w-4 h-4" /> Add First Record
      </Button>
    </div>
  );
}
