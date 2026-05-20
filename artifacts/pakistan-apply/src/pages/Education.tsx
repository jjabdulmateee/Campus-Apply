import AppLayout from "@/components/AppLayout";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetMyAcademics,
  useAddAcademicRecord,
  useUpdateAcademicRecord,
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
import { useUpload } from "@/hooks/useUpload";
import {
  ACADEMIC_LEVELS,
  MATRIC_FSC_BOARDS,
  CAMBRIDGE_EDEXCEL_BOARDS,
  BOARDS,
  MATRIC_GROUPS,
  INTER_GROUPS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  GraduationCap,
  Loader2,
  Info,
  Building2,
  CheckCircle2,
  Trophy,
  BookOpen,
  Upload,
  Pencil,
  FileText,
} from "lucide-react";

// ── Pakistani institutions ────────────────────────────────────────────────────
const SCHOOL_SUGGESTIONS = [
  "Lahore Grammar School (LGS)", "Aitchison College", "Beaconhouse School System",
  "City School", "Foundation Public School", "Roots International Schools",
  "Divisional Public School (DPS)", "Army Public School (APS)", "Cadet College Hasanabdal",
  "Cadet College Kohat", "PAF College Sargodha", "Fazaia Inter College",
  "Punjab College", "Superior College", "Garrison Academy", "Headstart School",
  "Froebel's International School", "Nixor College", "Cedar College",
  "St. Patrick's High School", "St. Joseph's Convent School", "Govt. Islamia High School",
  "Govt. College University (GCU) Lahore", "Forman Christian College", "Kinnaird College",
  "LACAS", "Allied School", "The Smart School", "Bloomfield Hall School",
];

const COLLEGE_SUGGESTIONS = [
  "University of Punjab", "University of Karachi", "University of Peshawar",
  "Quaid-i-Azam University", "University of Sindh", "COMSATS University Islamabad",
  "FAST-NUCES", "UET Lahore", "UET Peshawar", "NED University", "Mehran UET",
  "Air University", "Bahria University", "Iqra University", "Virtual University of Pakistan",
  "Riphah International University", "Capital University of Science and Technology (CUST)",
  "University of Management and Technology (UMT)", "Lahore School of Economics",
  "Institute of Business Administration (IBA) Karachi",
];

// ── Honors / Courses constants ────────────────────────────────────────────────
const RECOGNITION_LEVELS = ["School", "Divisional", "Regional", "National", "International"] as const;
const HONOR_GRADE_LEVELS = ["Grade 9 / SSC-I", "Grade 10 / SSC-II / O-Level", "Grade 11 / HSSC-I / AS-Level", "Grade 12 / HSSC-II / A-Level"] as const;
const COURSE_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
  "English", "Urdu", "Islamiyat", "Pakistan Studies", "Economics",
  "Business Studies", "Accounting", "History", "Geography", "Art", "Other",
] as const;
const COURSE_LEVELS = ["HSSC-I (11th)", "HSSC-II (12th)", "SSC-I (9th)", "SSC-II (10th)", "O-Level", "AS-Level", "A-Level"] as const;

// ── Types ─────────────────────────────────────────────────────────────────────
interface HonorEntry {
  title: string;
  gradeLevel: string;
  recognitionLevel: string;
}
interface CourseEntry {
  subject: string;
  courseLevel: string;
  grade: string;
}

// ── Form schema ───────────────────────────────────────────────────────────────
const schema = z.object({
  institution: z.string().min(1, "Required"),
  level: z.enum(["matric", "intermediate", "a_levels", "o_levels", "bachelors", "other"]),
  board: z.string().optional(),
  passingYear: z.number().int().min(1990).max(2030),
  totalMarks: z.number().optional(),
  obtainedMarks: z.number().optional(),
  fscPart1Marks: z.number().optional(),
  fscPart2Marks: z.number().optional(),
  percentage: z.number().optional(),
  gradeOrGpa: z.string().optional(),
  subjects: z.string().optional(),
  classSize: z.number().optional(),
  classRank: z.number().optional(),
  classRankType: z.enum(["none", "exact"]).optional(),
  gpaScale: z.enum(["percentage", "marks_1100", "marks_1050", "gpa_4", "gpa_5"]).optional(),
  transcriptDocUrl: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ── GPA Scale label helper ────────────────────────────────────────────────────
function gpaScaleLabel(v: string) {
  switch (v) {
    case "percentage": return "Percentage (e.g. 89.5%)";
    case "marks_1100": return "Marks out of 1100 (FSc standard)";
    case "marks_1050": return "Marks out of 1050 (Matric standard)";
    case "gpa_4":      return "GPA on 4.0 scale";
    case "gpa_5":      return "GPA on 5.0 scale";
    default:           return v;
  }
}

// ── Searchable institution combobox ──────────────────────────────────────────
function InstitutionCombobox({
  value, onChange, suggestions, placeholder, error,
}: { value: string; onChange: (v: string) => void; suggestions: string[]; placeholder: string; error?: string; }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    if (!value.trim()) return suggestions.slice(0, 8);
    return suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase())).slice(0, 8);
  }, [value, suggestions]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <Input value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        placeholder={placeholder} className={cn("border-sky-100", error && "border-red-300")} autoComplete="off" />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {filtered.map((s) => (
            <button key={s} type="button" className="w-full text-left px-4 py-2.5 text-sm hover:bg-sky-50 text-slate-700 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); onChange(s); setOpen(false); }}>{s}</button>
          ))}
          {value && !filtered.some((f) => f.toLowerCase() === value.toLowerCase()) && (
            <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100 italic">Type to search or enter a custom name</div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Transcript Upload Slot ────────────────────────────────────────────────────
function TranscriptUploadSlot({
  existingUrl, onUploaded,
}: { existingUrl: string | undefined | null; onUploaded: (path: string) => void; }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (res) => { onUploaded(res.objectPath); toast({ title: "Transcript uploaded" }); },
    onError: (err) => { toast({ title: err.message, variant: "destructive" }); },
  });
  const filename = existingUrl ? existingUrl.split("/").pop()?.split("?")[0] ?? "transcript" : null;
  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all",
        existingUrl ? "border-green-300 bg-green-50/30 hover:border-green-400" : "border-slate-200 hover:border-sky-300 hover:bg-sky-50/30",
        isUploading && "pointer-events-none opacity-60",
      )}
      onClick={() => !isUploading && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", existingUrl ? "bg-green-100" : "bg-slate-100")}>
        {existingUrl ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Upload className="w-4 h-4 text-slate-400" />}
      </div>
      <div className="flex-1 min-w-0">
        {isUploading ? (
          <div>
            <p className="text-xs font-medium text-sky-700">Uploading… {progress}%</p>
            <div className="w-full h-1 bg-sky-100 rounded-full mt-1"><div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        ) : existingUrl ? (
          <div>
            <p className="text-xs font-semibold text-green-700">Transcript uploaded</p>
            <p className="text-xs text-slate-400 truncate">{filename}</p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-slate-700">Upload transcript / result card</p>
            <p className="text-xs text-slate-400">PDF, JPG, PNG · Max 2MB</p>
          </div>
        )}
      </div>
      {existingUrl && <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Education() {
  const search = useSearch();
  const { data: records, isLoading } = useGetMyAcademics();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [honors, setHonors] = useState<HonorEntry[]>([]);
  const [courses, setCourses] = useState<CourseEntry[]>([]);
  const activeTab = new URLSearchParams(search).get("tab") === "courses" ? "courses" : "history";

  const isTransfer = localStorage.getItem("pakapp_user_type") === "transfer";

  const onMutateSuccess = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetMyAcademicsQueryKey() });
    setOpen(false);
    setEditingId(null);
    reset();
    setHonors([]);
    setCourses([]);
  }, [qc]);

  const { mutate: addRecord, isPending: isAdding } = useAddAcademicRecord({
    mutation: {
      onSuccess: () => { onMutateSuccess(); toast({ title: "Academic record added", description: "Your education history has been saved." }); },
    },
  });
  const { mutate: updateRecord, isPending: isUpdating } = useUpdateAcademicRecord({
    mutation: {
      onSuccess: () => { onMutateSuccess(); toast({ title: "Record updated" }); },
    },
  });
  const { mutate: deleteRecord } = useDeleteAcademicRecord({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetMyAcademicsQueryKey() }); toast({ title: "Record removed" }); },
    },
  });

  const isPending = isAdding || isUpdating;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { passingYear: new Date().getFullYear() },
  });

  const selectedLevel = watch("level");
  const institution = watch("institution") ?? "";
  const obtainedMarks = watch("obtainedMarks");
  const totalMarks = watch("totalMarks");
  const fscPart1Marks = watch("fscPart1Marks");
  const fscPart2Marks = watch("fscPart2Marks");
  const classRankType = watch("classRankType");
  const transcriptDocUrl = watch("transcriptDocUrl");
  const courseField = watch("subjects");

  const isMatricOrFsc = selectedLevel === "matric" || selectedLevel === "intermediate";
  const isOALevel = selectedLevel === "o_levels" || selectedLevel === "a_levels";
  const isBachelors = selectedLevel === "bachelors" || selectedLevel === "other";
  const boardList = isOALevel ? CAMBRIDGE_EDEXCEL_BOARDS : isMatricOrFsc ? MATRIC_FSC_BOARDS : BOARDS;
  const subjectGroups = selectedLevel === "matric" ? MATRIC_GROUPS : selectedLevel === "intermediate" ? INTER_GROUPS : null;
  const suggestions = isBachelors ? COLLEGE_SUGGESTIONS : (isMatricOrFsc || isOALevel) ? SCHOOL_SUGGESTIONS : [...SCHOOL_SUGGESTIONS, ...COLLEGE_SUGGESTIONS];

  useEffect(() => {
    if (selectedLevel === "intermediate") {
      const p1 = Number(fscPart1Marks) || 0;
      const p2 = Number(fscPart2Marks) || 0;
      const obtained = p1 + p2;
      setValue("totalMarks", 1100);
      setValue("obtainedMarks", obtained > 0 ? obtained : undefined);
      if (obtained > 0) {
        setValue("percentage", parseFloat(((obtained / 1100) * 100).toFixed(2)));
      }
      return;
    }
    if (obtainedMarks && totalMarks && totalMarks > 0) {
      const pct = parseFloat(((obtainedMarks / totalMarks) * 100).toFixed(2));
      setValue("percentage", pct);
    }
  }, [selectedLevel, fscPart1Marks, fscPart2Marks, obtainedMarks, totalMarks, setValue]);

  const levelLabel = (val: string) => ACADEMIC_LEVELS.find((l) => l.value === val)?.label ?? val;

  const openAdd = () => {
    setEditingId(null);
    reset({ passingYear: new Date().getFullYear(), classRankType: "none" });
    setHonors([]);
    setCourses([]);
    setOpen(true);
  };

  const openEdit = (rec: typeof records extends (infer R)[] | undefined ? R : never) => {
    if (!rec) return;
    setEditingId(rec.id);
    reset({
      institution: rec.institution,
      level: rec.level as FormData["level"],
      board: rec.board ?? undefined,
      passingYear: rec.passingYear,
      totalMarks: rec.totalMarks ?? undefined,
      obtainedMarks: rec.obtainedMarks ?? undefined,
      fscPart1Marks: rec.fscPart1Marks ?? undefined,
      fscPart2Marks: rec.fscPart2Marks ?? undefined,
      percentage: rec.percentage != null ? Number(rec.percentage) : undefined,
      gradeOrGpa: rec.gradeOrGpa ?? undefined,
      subjects: rec.subjects ?? undefined,
      classSize: rec.classSize ?? undefined,
      classRank: rec.classRank ?? undefined,
      classRankType: (rec.classRankType as FormData["classRankType"]) ?? undefined,
      gpaScale: (rec.gpaScale as FormData["gpaScale"]) ?? undefined,
      transcriptDocUrl: rec.transcriptDocUrl ?? undefined,
    });
    try { setHonors(rec.honors ? (JSON.parse(rec.honors) as HonorEntry[]) : []); } catch { setHonors([]); }
    try { setCourses(rec.coursesJson ? (JSON.parse(rec.coursesJson) as CourseEntry[]) : []); } catch { setCourses([]); }
    setOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const normalizedCourses = courses.map((course) => ({
      subject: course.subject,
      courseLevel: course.courseLevel,
      grade: course.grade,
      credits: (course as CourseEntry & { credits?: string }).credits ?? "",
    }));
    let payload = {
      ...data,
      honors: honors.length > 0 ? JSON.stringify(honors) : undefined,
      coursesJson: normalizedCourses.length > 0 ? JSON.stringify(normalizedCourses) : undefined,
    };
    if (data.level === "intermediate") {
      const p1 = Number(data.fscPart1Marks) || 0;
      const p2 = Number(data.fscPart2Marks) || 0;
      payload = {
        ...payload,
        totalMarks: 1100,
        obtainedMarks: p1 + p2,
        fscPart1Marks: p1 || undefined,
        fscPart2Marks: p2 || undefined,
        percentage: p1 + p2 > 0 ? parseFloat((((p1 + p2) / 1100) * 100).toFixed(2)) : undefined,
        gpaScale: payload.gpaScale ?? "marks_1100",
      };
    }
    if (editingId !== null) {
      updateRecord({ recordId: editingId, data: payload });
    } else {
      addRecord({ data: payload });
    }
  };

  // Categorize
  const schoolRecords = (records ?? []).filter((r) =>
    r.level === "matric" || r.level === "intermediate" || r.level === "o_levels" || r.level === "a_levels",
  );
  const collegeRecords = (records ?? []).filter((r) => r.level === "bachelors" || r.level === "other");

  const hasMatric = schoolRecords.some((r) => r.level === "matric" || r.level === "o_levels");
  const hasInter  = schoolRecords.some((r) => r.level === "intermediate" || r.level === "a_levels");
  const completionSteps = [
    { label: "Matric / O-Levels", done: hasMatric },
    { label: "FSc / A-Levels", done: hasInter },
    ...(isTransfer ? [{ label: "Previous College", done: collegeRecords.length > 0 }] : []),
  ];
  const donePct = Math.round((completionSteps.filter((s) => s.done).length / completionSteps.length) * 100);

  // ── Honors helpers ──────────────────────────────────────────────────────────
  const addHonor = () => {
    if (honors.length >= 5) return;
    setHonors([...honors, { title: "", gradeLevel: "", recognitionLevel: "" }]);
  };
  const updateHonor = (i: number, field: keyof HonorEntry, value: string) =>
    setHonors(honors.map((h, idx) => idx === i ? { ...h, [field]: value } : h));
  const removeHonor = (i: number) => setHonors(honors.filter((_, idx) => idx !== i));

  // ── Course helpers ──────────────────────────────────────────────────────────
  const addCourse = () => setCourses([...courses, { subject: "", courseLevel: "", grade: "" }]);
  const updateCourse = (i: number, field: keyof CourseEntry, value: string) =>
    setCourses(courses.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  const removeCourse = (i: number) => setCourses(courses.filter((_, idx) => idx !== i));

  return (
    <AppLayout title="Education" subtitle="Add your academic history — Matric, Intermediate, A-Levels, and beyond">
      <div className="space-y-5">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
          <a href="/education?tab=history" className={activeTab === "history" ? "flex-1 rounded-xl bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm" : "flex-1 rounded-xl px-4 py-2 text-sm font-medium text-slate-500"}>
            School History
          </a>
          <a href="/education/courses?tab=courses" className={activeTab === "courses" ? "flex-1 rounded-xl bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm" : "flex-1 rounded-xl px-4 py-2 text-sm font-medium text-slate-500"}>
            Self-Report Table
          </a>
        </div>

        {activeTab === "history" && (
        <>
        {/* Completion bar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">Education Completion</span>
            <span className={cn("text-xs font-bold", donePct === 100 ? "text-green-600" : "text-amber-600")}>{donePct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div className={cn("h-full rounded-full transition-all duration-500", donePct === 100 ? "bg-green-500" : "bg-sky-500")}
              style={{ width: `${donePct}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {completionSteps.map((step) => (
              <div key={step.label} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                step.done ? "bg-green-50 border-green-200 text-green-700" : "bg-slate-50 border-slate-200 text-slate-400")}>
                <CheckCircle2 className={cn("w-3 h-3", step.done ? "text-green-500" : "text-slate-300")} />
                {step.label}
              </div>
            ))}
          </div>
        </div>

        {/* Transfer: Previous Universities */}
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
              <Button size="sm"
                onClick={() => { reset({ level: "bachelors", passingYear: new Date().getFullYear() }); setHonors([]); setCourses([]); setEditingId(null); setOpen(true); }}
                className="bg-violet-600 hover:bg-violet-700 gap-1.5 h-8 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add College
              </Button>
            </div>
            {collegeRecords.length === 0 ? (
              <div className="p-10 text-center">
                <Building2 className="w-8 h-8 text-violet-200 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600 mb-1">No previous colleges added</p>
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
                    </div>
                    <button onClick={() => openEdit(rec)} className="p-2 rounded-lg hover:bg-sky-50 text-slate-300 hover:text-sky-500 transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteRecord({ recordId: rec.id })} className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* School records header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400 font-medium">
            {schoolRecords.length > 0 ? `${schoolRecords.length} school record${schoolRecords.length !== 1 ? "s" : ""}` : "No school records yet"}
          </p>
          <Button onClick={openAdd} className="bg-sky-600 hover:bg-sky-700 gap-2">
            <Plus className="w-4 h-4" /> Add Record
          </Button>
        </div>

        {/* Records list */}
        {isLoading ? (
          <div className="space-y-3 animate-pulse">{[1, 2].map((i) => <div key={i} className="h-28 bg-white rounded-2xl" />)}</div>
        ) : schoolRecords.length > 0 ? (
          <div className="space-y-3">
            {schoolRecords.map((rec) => {
              let parsedHonors: HonorEntry[] = [];
              let parsedCourses: CourseEntry[] = [];
              try { parsedHonors = rec.honors ? (JSON.parse(rec.honors) as HonorEntry[]) : []; } catch { /* empty */ }
              try { parsedCourses = rec.coursesJson ? (JSON.parse(rec.coursesJson) as CourseEntry[]) : []; } catch { /* empty */ }
              return (
                <div key={rec.id} className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-sky-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-800">{rec.institution}</div>
                          <div className="text-sm text-slate-500 mt-0.5">{levelLabel(rec.level)} — {rec.passingYear}</div>
                          {rec.board && <div className="text-xs text-sky-600 font-medium mt-0.5">{rec.board}</div>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(rec)} className="p-2 rounded-lg hover:bg-sky-50 text-slate-300 hover:text-sky-500 transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => deleteRecord({ recordId: rec.id })} className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {rec.percentage && <Chip label={rec.level === "o_levels" || rec.level === "a_levels" ? "IBCC Equiv." : "Percentage"} value={`${rec.percentage}%`} />}
                        {rec.gradeOrGpa && <Chip label="Grade/GPA" value={rec.gradeOrGpa} />}
                        {rec.obtainedMarks && rec.totalMarks && <Chip label="Marks" value={`${rec.obtainedMarks}/${rec.totalMarks}`} />}
                        {rec.level === "intermediate" && rec.fscPart1Marks != null && rec.fscPart2Marks != null && (
                          <Chip label="FSc Parts" value={`${rec.fscPart1Marks} + ${rec.fscPart2Marks}`} />
                        )}
                        {rec.subjects && <Chip label="Group/Subjects" value={rec.subjects} />}
                        {rec.classRank && rec.classRankType === "exact" && <Chip label="Class Rank" value={`#${rec.classRank}${rec.classSize ? ` / ${rec.classSize}` : ""}`} />}
                        {rec.gpaScale && <Chip label="Scale" value={gpaScaleLabel(rec.gpaScale)} />}
                      </div>
                      {parsedHonors.length > 0 && (
                        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          {parsedHonors.map((h, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium">{h.title}</span>
                          ))}
                        </div>
                      )}
                      {parsedCourses.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-xs text-indigo-600 font-medium">{parsedCourses.length} course{parsedCourses.length !== 1 ? "s" : ""} self-reported</span>
                        </div>
                      )}
                      {rec.transcriptDocUrl && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-xs text-green-600 font-medium">Transcript uploaded</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState onAdd={openAdd} />
        )}
        </>
        )}

        {activeTab === "courses" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <div>
                <div className="text-sm font-semibold text-slate-800">Self-Report Table</div>
                <div className="text-xs text-slate-400">Courses & Grades</div>
              </div>
            </div>
            <div className="border border-indigo-100 rounded-xl p-4 space-y-3 bg-indigo-50/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-700">Courses & Grades</span>
                  <span className="text-xs text-slate-400">self-reported</span>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addCourse} className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <Plus className="w-3 h-3" /> Add Course
                </Button>
              </div>
              {courses.length === 0 ? <p className="text-xs text-slate-400 text-center py-2">No courses added — report individual subject grades for this qualification.</p> : null}
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { reset(); setEditingId(null); setHonors([]); setCourses([]); } }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Academic Record" : "Add Academic Record"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-5 py-4">

              {/* Level + Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Level</Label>
                  <Select value={selectedLevel ?? ""} onValueChange={(v) => { setValue("level", v as FormData["level"]); setValue("board", undefined); setValue("institution", ""); }}>
                    <SelectTrigger className="border-sky-100"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>{ACADEMIC_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.level && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Passing Year</Label>
                  <Input type="number" {...register("passingYear", { valueAsNumber: true })} placeholder="2024" className="border-sky-100" />
                  {errors.passingYear && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
              </div>

              {/* Institution */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">{isBachelors ? "College / University Name" : "School / Institution Name"}</Label>
                <InstitutionCombobox value={institution} onChange={(v) => setValue("institution", v)} suggestions={suggestions}
                  placeholder={isBachelors ? "e.g. University of Punjab" : "e.g. Lahore Grammar School"} error={errors.institution?.message} />
              </div>

              {/* Board */}
              {selectedLevel && !isBachelors && (
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">{isOALevel ? "Examining Body" : "BISE Board"}</Label>
                  <Select value={watch("board") ?? ""} onValueChange={(v) => setValue("board", v)}>
                    <SelectTrigger className="border-sky-100"><SelectValue placeholder={isOALevel ? "Select examining body" : "Select BISE board"} /></SelectTrigger>
                    <SelectContent>{boardList.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {/* Subject Group */}
              {subjectGroups ? (
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Subject Group</Label>
                  <Select value={watch("subjects") ?? ""} onValueChange={(v) => setValue("subjects", v)}>
                    <SelectTrigger className="border-sky-100"><SelectValue placeholder="Select group" /></SelectTrigger>
                    <SelectContent>{subjectGroups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Subjects</Label>
                  <Input {...register("subjects")} placeholder="e.g. Physics, Maths, Chemistry" className="border-sky-100" />
                </div>
              )}

              {/* GPA Scale */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Grading Scale</Label>
                <Select value={watch("gpaScale") ?? ""} onValueChange={(v) => setValue("gpaScale", v as FormData["gpaScale"])}>
                  <SelectTrigger className="border-sky-100"><SelectValue placeholder="Select grading scale" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="marks_1100">Marks / 1100 (FSc standard)</SelectItem>
                    <SelectItem value="marks_1050">Marks / 1050 (Matric standard)</SelectItem>
                    <SelectItem value="gpa_4">GPA on 4.0 scale</SelectItem>
                    <SelectItem value="gpa_5">GPA on 5.0 scale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Marks / GPA */}
              {selectedLevel === "intermediate" ? (
                <>
                  <div className="bg-sky-50 rounded-xl p-3 flex gap-2">
                    <Info className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-sky-700">
                      Enter your <strong>FSc Part-I</strong> and <strong>Part-II</strong> obtained marks. Total and percentage are calculated automatically (out of 1100).
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">FSc Part-I Marks</Label>
                      <Input type="number" {...register("fscPart1Marks", { valueAsNumber: true })} placeholder="e.g. 480" className="border-sky-100" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">FSc Part-II Marks</Label>
                      <Input type="number" {...register("fscPart2Marks", { valueAsNumber: true })} placeholder="e.g. 490" className="border-sky-100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Total Marks</Label>
                      <Input type="number" value={1100} readOnly className="border-sky-100 bg-slate-50" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Percentage</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register("percentage", { valueAsNumber: true })}
                        readOnly
                        className="border-sky-100 bg-sky-50"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Grade</Label>
                    <Input {...register("gradeOrGpa")} placeholder="e.g. A+" className="border-sky-100" />
                  </div>
                </>
              ) : isMatricOrFsc ? (
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
                      <Input type="number" step="0.01" {...register("percentage", { valueAsNumber: true })} placeholder="auto"
                        className="border-sky-100 bg-sky-50" readOnly={!!(obtainedMarks && totalMarks)} />
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
                    <p className="text-xs text-sky-700">For O/A-Level students, enter your <strong>IBCC equivalency percentage</strong> issued by the Inter Board Committee of Chairmen.</p>
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

              {/* Class Rank & Size */}
              <div className="border border-slate-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-700">Class Rank (Optional)</span>
                  <span className="text-xs text-slate-400">As reported on your transcript</span>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Rank Type</Label>
                  <Select value={watch("classRankType") ?? ""} onValueChange={(v) => setValue("classRankType", v as FormData["classRankType"])}>
                    <SelectTrigger className="border-sky-100"><SelectValue placeholder="Select rank type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not ranked / Not applicable</SelectItem>
                      <SelectItem value="exact">Exact rank available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {classRankType === "exact" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">My Rank</Label>
                      <Input type="number" {...register("classRank", { valueAsNumber: true })} placeholder="e.g. 5" className="border-sky-100" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Class Size</Label>
                      <Input type="number" {...register("classSize", { valueAsNumber: true })} placeholder="e.g. 120" className="border-sky-100" />
                    </div>
                  </div>
                )}
              </div>

              {/* Academic Honors */}
              <div className="border border-amber-100 rounded-xl p-4 space-y-3 bg-amber-50/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-700">Academic Honors</span>
                    <span className="text-xs text-slate-400">up to 5</span>
                  </div>
                  {honors.length < 5 && (
                    <Button type="button" size="sm" variant="outline" onClick={addHonor} className="h-7 text-xs gap-1 border-amber-200 text-amber-700 hover:bg-amber-50">
                      <Plus className="w-3 h-3" /> Add Honor
                    </Button>
                  )}
                </div>
                {honors.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">No honors added — click "Add Honor" to include awards, scholarships, or recognitions.</p>
                )}
                {honors.map((h, i) => (
                  <div key={i} className="bg-white rounded-xl border border-amber-100 p-3 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-amber-700">Honor #{i + 1}</span>
                      <button type="button" onClick={() => removeHonor(i)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <Input value={h.title} onChange={(e) => updateHonor(i, "title", e.target.value)}
                      placeholder="Honor / Award title (e.g. Provincial Science Olympiad – 1st Place)" className="border-sky-100 text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={h.gradeLevel} onValueChange={(v) => updateHonor(i, "gradeLevel", v)}>
                        <SelectTrigger className="border-sky-100 text-xs h-9"><SelectValue placeholder="Grade level" /></SelectTrigger>
                        <SelectContent>{HONOR_GRADE_LEVELS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={h.recognitionLevel} onValueChange={(v) => updateHonor(i, "recognitionLevel", v)}>
                        <SelectTrigger className="border-sky-100 text-xs h-9"><SelectValue placeholder="Recognition level" /></SelectTrigger>
                        <SelectContent>{RECOGNITION_LEVELS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Courses & Grades (Self-Report Table) */}
              <div className="border border-indigo-100 rounded-xl p-4 space-y-3 bg-indigo-50/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-700">Courses & Grades</span>
                    <span className="text-xs text-slate-400">self-reported</span>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addCourse} className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                    <Plus className="w-3 h-3" /> Add Course
                  </Button>
                </div>
                {courses.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">No courses added — report individual subject grades for this qualification.</p>
                )}
                {courses.length > 0 && (
                  <div className="rounded-xl overflow-hidden border border-indigo-100">
                    <table className="w-full text-xs">
                      <thead className="bg-indigo-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-indigo-700 w-[38%]">Subject</th>
                          <th className="text-left px-3 py-2 font-semibold text-indigo-700 w-[32%]">Course Level</th>
                          <th className="text-left px-3 py-2 font-semibold text-indigo-700">Grade/Marks</th>
                          <th className="text-left px-3 py-2 font-semibold text-indigo-700">Credits/Weight</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-50">
                        {courses.map((c, i) => (
                          <tr key={i} className="bg-white">
                            <td className="px-2 py-1.5">
                              <Select value={c.subject} onValueChange={(v) => updateCourse(i, "subject", v)}>
                                <SelectTrigger className="border-sky-100 h-8 text-xs"><SelectValue placeholder="Select subject" /></SelectTrigger>
                                <SelectContent>{COURSE_SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                              </Select>
                            </td>
                            <td className="px-2 py-1.5">
                              <Select value={c.courseLevel} onValueChange={(v) => updateCourse(i, "courseLevel", v)}>
                                <SelectTrigger className="border-sky-100 h-8 text-xs"><SelectValue placeholder="Level" /></SelectTrigger>
                                <SelectContent>{COURSE_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                              </Select>
                            </td>
                            <td className="px-2 py-1.5">
                              <Input value={c.grade} onChange={(e) => updateCourse(i, "grade", e.target.value)}
                                placeholder="A / 95% / A*" className="border-sky-100 h-8 text-xs" />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                value={(c as CourseEntry & { credits?: string }).credits ?? ""}
                                onChange={(e) => updateCourse(i, "credits" as never, e.target.value)}
                                placeholder="1.0"
                                className="border-sky-100 h-8 text-xs"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button type="button" onClick={() => removeCourse(i)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Transcript Document Upload */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-2 block">Transcript / Result Card</Label>
                <TranscriptUploadSlot
                  existingUrl={transcriptDocUrl}
                  onUploaded={(path) => setValue("transcriptDocUrl", path)}
                />
              </div>

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); setEditingId(null); setHonors([]); setCourses([]); }}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-sky-600 hover:bg-sky-700">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editingId !== null ? "Update Record" : "Save Record"}
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
