import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
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
import { Plus, Trash2, GraduationCap, Loader2, Info } from "lucide-react";

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

export default function Education() {
  const { data: records, isLoading } = useGetMyAcademics();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

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
  const obtainedMarks = watch("obtainedMarks");
  const totalMarks = watch("totalMarks");

  const isMatricOrFsc = selectedLevel === "matric" || selectedLevel === "intermediate";
  const isOALevel = selectedLevel === "o_levels" || selectedLevel === "a_levels";
  const boardList = isOALevel ? CAMBRIDGE_EDEXCEL_BOARDS : isMatricOrFsc ? MATRIC_FSC_BOARDS : BOARDS;
  const subjectGroups = selectedLevel === "matric" ? MATRIC_GROUPS : selectedLevel === "intermediate" ? INTER_GROUPS : null;

  useEffect(() => {
    if (obtainedMarks && totalMarks && totalMarks > 0) {
      const pct = parseFloat(((obtainedMarks / totalMarks) * 100).toFixed(2));
      setValue("percentage", pct);
    }
  }, [obtainedMarks, totalMarks, setValue]);

  const levelLabel = (val: string) => ACADEMIC_LEVELS.find((l) => l.value === val)?.label ?? val;

  const onSubmit = (data: FormData) => {
    addRecord({ data });
  };

  return (
    <AppLayout title="Education" subtitle="Add your academic history — Matric, Intermediate, A-Levels, and beyond">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {records ? `${records.length} record${records.length !== 1 ? "s" : ""} added` : ""}
          </p>
          <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700 gap-2">
            <Plus className="w-4 h-4" /> Add Record
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => <div key={i} className="h-28 bg-white rounded-2xl" />)}
          </div>
        ) : records && records.length > 0 ? (
          <div className="space-y-3">
            {records.map((rec) => (
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
                      {rec.board && (
                        <div className="text-xs text-sky-600 font-medium mt-0.5">{rec.board}</div>
                      )}
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
                      <Chip label={rec.level === "o_levels" || rec.level === "a_levels" ? "IBCC Equiv." : "Percentage"} value={`${rec.percentage}%`} />
                    )}
                    {rec.gradeOrGpa && <Chip label="Grade/GPA" value={rec.gradeOrGpa} />}
                    {rec.obtainedMarks && rec.totalMarks && (
                      <Chip label="Marks" value={`${rec.obtainedMarks}/${rec.totalMarks}`} />
                    )}
                    {rec.subjects && (
                      <Chip label="Group/Subjects" value={rec.subjects} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState onAdd={() => setOpen(true)} />
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Academic Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-4 py-4">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Institution / School Name</Label>
                <Input {...register("institution")} placeholder="e.g. Lahore Grammar School" className="border-sky-100" />
                {errors.institution && <p className="text-xs text-red-500 mt-1">{errors.institution.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Level</Label>
                  <Select
                    value={selectedLevel ?? ""}
                    onValueChange={(v) => {
                      setValue("level", v as FormData["level"]);
                      setValue("board", undefined);
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

              {selectedLevel && (
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
                      <Input
                        type="number"
                        {...register("totalMarks", { valueAsNumber: true })}
                        placeholder="1100"
                        className="border-sky-100"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Obtained</Label>
                      <Input
                        type="number"
                        {...register("obtainedMarks", { valueAsNumber: true })}
                        placeholder="980"
                        className="border-sky-100"
                      />
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
                      For O/A-Level students, enter your <strong>IBCC equivalency percentage</strong> in the field
                      below. This is issued by the Inter Board Committee of Chairmen after verification.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">IBCC Equivalency %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register("percentage", { valueAsNumber: true })}
                        placeholder="e.g. 87.36"
                        className="border-sky-100"
                      />
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
                    <Input
                      type="number"
                      step="0.01"
                      {...register("percentage", { valueAsNumber: true })}
                      placeholder="e.g. 3.75"
                      className="border-sky-100"
                    />
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
