import AppLayout from "@/components/AppLayout";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetMyTestScores,
  useAddTestScore,
  useDeleteTestScore,
  getGetMyTestScoresQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TEST_NAMES } from "@/lib/constants";
import { Plus, Trash2, ClipboardList, Loader2 } from "lucide-react";

const schema = z.object({
  testName: z.enum(["SAT", "ACT", "IELTS", "TOEFL", "NTS", "ECAT", "MDCAT", "HAT", "other"]),
  score: z.string().min(1, "Required"),
  maxScore: z.string().optional(),
  testDate: z.string().min(1, "Required"),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const TEST_MAX: Record<string, string> = {
  SAT: "1600", ACT: "36", IELTS: "9.0", TOEFL: "120",
  NTS: "100", ECAT: "400", MDCAT: "200", HAT: "100",
};

export default function Testing() {
  const { data: scores, isLoading } = useGetMyTestScores();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { mutate: addScore, isPending } = useAddTestScore({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyTestScoresQueryKey() });
        setOpen(false);
        reset();
        toast({ title: "Test score added" });
      },
    },
  });

  const { mutate: deleteScore } = useDeleteTestScore({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyTestScoresQueryKey() });
        toast({ title: "Test score removed" });
      },
    },
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const selectedTest = watch("testName");

  const onSubmit = (data: FormData) => {
    addScore({ data: { ...data, maxScore: data.maxScore || TEST_MAX[data.testName] || undefined } });
  };

  const testLabel = (val: string) => TEST_NAMES.find((t) => t.value === val)?.label ?? val;

  return (
    <AppLayout title="Test Scores" subtitle="Add your entry test results — ECAT, MDCAT, NTS, SAT, IELTS, and more">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700 gap-2">
            <Plus className="w-4 h-4" /> Add Test Score
          </Button>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1,2].map(i => <div key={i} className="h-20 bg-white rounded-2xl" />)}
          </div>
        ) : scores && scores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scores.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                      {s.testName}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{testLabel(s.testName)}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{s.testDate}</div>
                    </div>
                  </div>
                  <button onClick={() => deleteScore({ scoreId: s.id })}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-3xl font-bold text-sky-700">{s.score}</span>
                  {s.maxScore && <span className="text-slate-400 mb-1">/ {s.maxScore}</span>}
                </div>
                {s.notes && <p className="text-xs text-slate-400 mt-2">{s.notes}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-sky-200 p-12 text-center">
            <ClipboardList className="w-10 h-10 text-sky-200 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-slate-700 mb-1">No test scores yet</h3>
            <p className="text-sm text-slate-400 mb-4">Add your ECAT, MDCAT, NTS, SAT, or other test results.</p>
            <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700 gap-2">
              <Plus className="w-4 h-4" /> Add First Score
            </Button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Test Score</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Test Name</Label>
                <Select onValueChange={(v) => setValue("testName", v as FormData["testName"])}>
                  <SelectTrigger className="border-sky-100">
                    <SelectValue placeholder="Select test" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_NAMES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.testName && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Your Score</Label>
                  <Input {...register("score")} placeholder={selectedTest ? `e.g. ${TEST_MAX[selectedTest] ? Math.round(Number(TEST_MAX[selectedTest]) * 0.85) : "85"}` : "Score"} className="border-sky-100" />
                  {errors.score && <p className="text-xs text-red-500 mt-1">{errors.score.message}</p>}
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Max Score</Label>
                  <Input {...register("maxScore")} placeholder={selectedTest ? TEST_MAX[selectedTest] : "Max"} className="border-sky-100" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Test Date</Label>
                <Input type="date" {...register("testDate")} className="border-sky-100" />
                {errors.testDate && <p className="text-xs text-red-500 mt-1">{errors.testDate.message}</p>}
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Notes (optional)</Label>
                <Textarea {...register("notes")} placeholder="e.g. First attempt, retaking in March" className="border-sky-100 resize-none" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-sky-600 hover:bg-sky-700">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Add Score
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
