import AppLayout from "@/components/AppLayout";
import { useState } from "react";
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
import { ACADEMIC_LEVELS, BOARDS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Plus, Trash2, GraduationCap, Loader2 } from "lucide-react";

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
        toast({ title: "Record added" });
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

  const onSubmit = (data: FormData) => {
    addRecord({ data });
  };

  const levelLabel = (val: string) => ACADEMIC_LEVELS.find((l) => l.value === val)?.label ?? val;

  return (
    <AppLayout title="Education" subtitle="Add your academic history — Matric, Intermediate, A-Levels, and beyond">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700 gap-2">
            <Plus className="w-4 h-4" /> Add Record
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => <div key={i} className="h-24 bg-white rounded-2xl" />)}
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
                      <div className="text-sm text-slate-500 mt-0.5">{levelLabel(rec.level)} — {rec.passingYear}</div>
                      {rec.board && <div className="text-xs text-slate-400 mt-0.5">{rec.board}</div>}
                    </div>
                    <button
                      onClick={() => deleteRecord({ recordId: rec.id })}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {rec.percentage && (
                      <Chip label="Percentage" value={`${rec.percentage}%`} />
                    )}
                    {rec.gradeOrGpa && <Chip label="Grade/GPA" value={rec.gradeOrGpa} />}
                    {rec.obtainedMarks && rec.totalMarks && (
                      <Chip label="Marks" value={`${rec.obtainedMarks}/${rec.totalMarks}`} />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Academic Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-4 py-4">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Institution Name</Label>
                <Input {...register("institution")} placeholder="Lahore Grammar School" className="border-sky-100" />
                {errors.institution && <p className="text-xs text-red-500 mt-1">{errors.institution.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Level</Label>
                  <Select onValueChange={(v) => setValue("level", v as FormData["level"])}>
                    <SelectTrigger className="border-sky-100">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACADEMIC_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Passing Year</Label>
                  <Input type="number" {...register("passingYear", { valueAsNumber: true })} placeholder="2023" className="border-sky-100" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Board / Examining Body</Label>
                <Select onValueChange={(v) => setValue("board", v)}>
                  <SelectTrigger className="border-sky-100">
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">%</Label>
                  <Input type="number" step="0.01" {...register("percentage", { valueAsNumber: true })} placeholder="89.1" className="border-sky-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Grade / GPA</Label>
                  <Input {...register("gradeOrGpa")} placeholder="A+" className="border-sky-100" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Subjects</Label>
                  <Input {...register("subjects")} placeholder="Physics, Maths..." className="border-sky-100" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-sky-600 hover:bg-sky-700">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Add Record
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
    <div className="px-2.5 py-1 rounded-lg bg-sky-50 text-xs">
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
      <p className="text-sm text-slate-400 mb-4">Add your Matric, Intermediate, or other qualifications.</p>
      <Button onClick={onAdd} className="bg-sky-600 hover:bg-sky-700 gap-2">
        <Plus className="w-4 h-4" /> Add First Record
      </Button>
    </div>
  );
}
