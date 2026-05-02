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
import { TEST_NAMES, NTS_TEST_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Plus, Trash2, ClipboardList, Loader2 } from "lucide-react";

const schema = z.object({
  testName: z.enum(["SAT", "ACT", "IELTS", "TOEFL", "NTS", "ECAT", "MDCAT", "HAT", "other"]),
  score: z.string().min(1, "Required"),
  maxScore: z.string().optional(),
  testDate: z.string().min(1, "Required"),
  notes: z.string().optional(),
  satMath: z.string().optional(),
  satVerbal: z.string().optional(),
  ieltsListening: z.string().optional(),
  ieltsReading: z.string().optional(),
  ieltsWriting: z.string().optional(),
  ieltsSpeaking: z.string().optional(),
  ntsType: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const TEST_MAX: Record<string, string> = {
  SAT: "1600", ACT: "36", IELTS: "9.0", TOEFL: "120",
  NTS: "100", ECAT: "400", MDCAT: "200", HAT: "100",
};

const TEST_CATEGORY: Record<string, "local" | "intl"> = {
  ECAT: "local", MDCAT: "local", NTS: "local", HAT: "local",
  SAT: "intl", ACT: "intl", IELTS: "intl", TOEFL: "intl",
};

function buildNotesAndScore(data: FormData): { score: string; notes: string | undefined } {
  if (data.testName === "SAT" && data.satMath && data.satVerbal) {
    const total = String(Number(data.satMath) + Number(data.satVerbal));
    const notes = `Math: ${data.satMath}, R&W: ${data.satVerbal}`;
    return { score: total, notes };
  }
  if (data.testName === "IELTS" && data.ieltsListening) {
    const notes = `L:${data.ieltsListening} R:${data.ieltsReading} W:${data.ieltsWriting} S:${data.ieltsSpeaking}`;
    return { score: data.score, notes };
  }
  if (data.testName === "NTS" && data.ntsType) {
    return { score: data.score, notes: data.ntsType + (data.notes ? ` — ${data.notes}` : "") };
  }
  return { score: data.score, notes: data.notes };
}

function parseSubscores(testName: string, notes: string | null | undefined): Record<string, string> {
  if (!notes) return {};
  if (testName === "SAT") {
    const m = notes.match(/Math:\s*([\d.]+),\s*R&W:\s*([\d.]+)/);
    if (m) return { Math: m[1], "R&W": m[2] };
  }
  if (testName === "IELTS") {
    const m = notes.match(/L:([\d.]+)\s+R:([\d.]+)\s+W:([\d.]+)\s+S:([\d.]+)/);
    if (m) return { L: m[1], R: m[2], W: m[3], S: m[4] };
  }
  return {};
}

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
        toast({ title: "Test score saved" });
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
  const satMath = watch("satMath");
  const satVerbal = watch("satVerbal");
  const satTotal = satMath && satVerbal ? Number(satMath) + Number(satVerbal) : null;

  const onSubmit = (data: FormData) => {
    const { score, notes } = buildNotesAndScore(data);
    addScore({
      data: {
        testName: data.testName,
        score,
        maxScore: data.maxScore || TEST_MAX[data.testName] || undefined,
        testDate: data.testDate,
        notes,
      },
    });
  };

  const testLabel = (val: string) => TEST_NAMES.find((t) => t.value === val)?.label ?? val;

  const localTests = scores?.filter((s) => TEST_CATEGORY[s.testName] === "local");
  const intlTests = scores?.filter((s) => TEST_CATEGORY[s.testName] === "intl");

  return (
    <AppLayout title="Test Scores" subtitle="Add your entry test results — ECAT, MDCAT, NTS, SAT, IELTS, and more">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700 gap-2">
            <Plus className="w-4 h-4" /> Add Test Score
          </Button>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 bg-white rounded-2xl" />)}
          </div>
        ) : scores && scores.length > 0 ? (
          <>
            {localTests && localTests.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Local Entry Tests</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {localTests.map((s) => <ScoreCard key={s.id} score={s} onDelete={() => deleteScore({ scoreId: s.id })} testLabel={testLabel} />)}
                </div>
              </section>
            )}
            {intlTests && intlTests.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">International Tests</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {intlTests.map((s) => <ScoreCard key={s.id} score={s} onDelete={() => deleteScore({ scoreId: s.id })} testLabel={testLabel} />)}
                </div>
              </section>
            )}
            {scores.filter(s => !TEST_CATEGORY[s.testName]).length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Other Tests</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scores.filter(s => !TEST_CATEGORY[s.testName]).map((s) => <ScoreCard key={s.id} score={s} onDelete={() => deleteScore({ scoreId: s.id })} testLabel={testLabel} />)}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-sky-200 p-12 text-center">
            <ClipboardList className="w-10 h-10 text-sky-200 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-slate-700 mb-1">No test scores yet</h3>
            <p className="text-sm text-slate-400 mb-4">Add your ECAT, MDCAT, NTS, SAT, IELTS, or other test results.</p>
            <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700 gap-2">
              <Plus className="w-4 h-4" /> Add First Score
            </Button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Test Score</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Test Name</Label>
                  <Select onValueChange={(v) => { setValue("testName", v as FormData["testName"]); setValue("score", ""); }}>
                    <SelectTrigger className="border-sky-100">
                      <SelectValue placeholder="Select test" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">Local Entry Tests</div>
                      {TEST_NAMES.filter(t => ["ECAT", "MDCAT", "NTS", "HAT"].includes(t.value)).map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                      <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">International Tests</div>
                      {TEST_NAMES.filter(t => ["SAT", "ACT", "IELTS", "TOEFL"].includes(t.value)).map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                      <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">Other</div>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.testName && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
              </div>

              {selectedTest && <SpecializedFields test={selectedTest} register={register} watch={watch} setValue={setValue} errors={errors} satTotal={satTotal} />}

              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Test Date</Label>
                <Input type="date" {...register("testDate")} className="border-sky-100" />
                {errors.testDate && <p className="text-xs text-red-500 mt-1">{errors.testDate.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-sky-600 hover:bg-sky-700">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Score
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function SpecializedFields({
  test,
  register,
  watch,
  setValue,
  errors,
  satTotal,
}: {
  test: string;
  register: ReturnType<typeof useForm<FormData>>["register"];
  watch: ReturnType<typeof useForm<FormData>>["watch"];
  setValue: ReturnType<typeof useForm<FormData>>["setValue"];
  errors: ReturnType<typeof useForm<FormData>>["formState"]["errors"];
  satTotal: number | null;
}) {
  if (test === "SAT") {
    return (
      <div className="space-y-3">
        <div className="bg-sky-50 rounded-xl p-3 text-xs text-sky-700 font-medium">
          SAT — Max 1600 (800 Math + 800 Evidence-Based R&W)
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Math Score (200–800)</Label>
            <Input {...register("satMath")} type="number" min={200} max={800} placeholder="750" className="border-sky-100" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Reading & Writing (200–800)</Label>
            <Input {...register("satVerbal")} type="number" min={200} max={800} placeholder="720" className="border-sky-100" />
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Total Score</Label>
          <div className="flex items-center h-10 px-3 border border-sky-100 bg-sky-50 rounded-md text-sm font-bold text-sky-700">
            {satTotal ?? "—"} / 1600
          </div>
          <input type="hidden" {...register("score")} value={satTotal?.toString() ?? ""} />
        </div>
      </div>
    );
  }

  if (test === "IELTS") {
    const bands = [
      { key: "ieltsListening", label: "Listening" },
      { key: "ieltsReading", label: "Reading" },
      { key: "ieltsWriting", label: "Writing" },
      { key: "ieltsSpeaking", label: "Speaking" },
    ] as const;
    return (
      <div className="space-y-3">
        <div className="bg-sky-50 rounded-xl p-3 text-xs text-sky-700 font-medium">
          IELTS — Each band scored 0–9 (Overall band = average, rounded to nearest 0.5)
        </div>
        <div className="grid grid-cols-2 gap-3">
          {bands.map(({ key, label }) => (
            <div key={key}>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">{label}</Label>
              <Input {...register(key)} type="number" step="0.5" min={0} max={9} placeholder="7.5" className="border-sky-100" />
            </div>
          ))}
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Overall Band Score</Label>
          <Input {...register("score")} type="number" step="0.5" min={0} max={9} placeholder="7.0" className="border-sky-100" />
          {errors.score && <p className="text-xs text-red-500 mt-1">{errors.score.message}</p>}
        </div>
      </div>
    );
  }

  if (test === "NTS") {
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">NTS Test Type</Label>
          <Select value={watch("ntsType") ?? ""} onValueChange={(v) => setValue("ntsType", v)}>
            <SelectTrigger className="border-sky-100">
              <SelectValue placeholder="Select NTS test type" />
            </SelectTrigger>
            <SelectContent>
              {NTS_TEST_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Score (out of 100)</Label>
            <Input {...register("score")} type="number" min={0} max={100} placeholder="75" className="border-sky-100" />
            {errors.score && <p className="text-xs text-red-500 mt-1">{errors.score.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Percentile (optional)</Label>
            <Input {...register("notes")} type="number" min={0} max={100} placeholder="85" className="border-sky-100" />
          </div>
        </div>
      </div>
    );
  }

  if (test === "MDCAT") {
    return (
      <div className="space-y-3">
        <div className="bg-sky-50 rounded-xl p-3 text-xs text-sky-700 font-medium">
          MDCAT — Total 200 marks (Biology 68, Chemistry 54, Physics 54, English 18, Logical 6)
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Score (out of 200)</Label>
            <Input {...register("score")} type="number" min={0} max={200} placeholder="175" className="border-sky-100" />
            {errors.score && <p className="text-xs text-red-500 mt-1">{errors.score.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Percentile (optional)</Label>
            <Textarea {...register("notes")} placeholder="e.g. 95th percentile" rows={1} className="border-sky-100 resize-none" />
          </div>
        </div>
      </div>
    );
  }

  if (test === "ECAT") {
    return (
      <div className="space-y-3">
        <div className="bg-sky-50 rounded-xl p-3 text-xs text-sky-700 font-medium">
          ECAT — Total 400 marks (Mathematics 100, Physics 80, Chemistry 80, English 40, CS/Biology 100)
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Score (out of 400)</Label>
            <Input {...register("score")} type="number" min={0} max={400} placeholder="320" className="border-sky-100" />
            {errors.score && <p className="text-xs text-red-500 mt-1">{errors.score.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Percentile (optional)</Label>
            <Textarea {...register("notes")} placeholder="e.g. 80th percentile" rows={1} className="border-sky-100 resize-none" />
          </div>
        </div>
      </div>
    );
  }

  if (test === "ACT") {
    return (
      <div className="space-y-3">
        <div className="bg-sky-50 rounded-xl p-3 text-xs text-sky-700 font-medium">
          ACT — Composite score 1–36 (average of English, Math, Reading, Science)
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Composite Score (1–36)</Label>
            <Input {...register("score")} type="number" min={1} max={36} placeholder="30" className="border-sky-100" />
            {errors.score && <p className="text-xs text-red-500 mt-1">{errors.score.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Notes (optional)</Label>
            <Textarea {...register("notes")} placeholder="e.g. English: 32, Math: 29..." rows={1} className="border-sky-100 resize-none" />
          </div>
        </div>
      </div>
    );
  }

  if (test === "TOEFL") {
    return (
      <div className="space-y-3">
        <div className="bg-sky-50 rounded-xl p-3 text-xs text-sky-700 font-medium">
          TOEFL iBT — Total score 0–120 (Reading + Listening + Speaking + Writing, 0–30 each)
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Total Score (0–120)</Label>
            <Input {...register("score")} type="number" min={0} max={120} placeholder="100" className="border-sky-100" />
            {errors.score && <p className="text-xs text-red-500 mt-1">{errors.score.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Notes (optional)</Label>
            <Textarea {...register("notes")} placeholder="e.g. R:27 L:28 S:22 W:23" rows={1} className="border-sky-100 resize-none" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Your Score</Label>
        <Input {...register("score")} placeholder="Score" className="border-sky-100" />
        {errors.score && <p className="text-xs text-red-500 mt-1">{errors.score.message}</p>}
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Max Score</Label>
        <Input {...register("maxScore")} placeholder="Max" className="border-sky-100" />
      </div>
    </div>
  );
}

function ScoreCard({
  score,
  onDelete,
  testLabel,
}: {
  score: { id: number; testName: string; score: string; maxScore?: string | null; testDate: string; notes?: string | null };
  onDelete: () => void;
  testLabel: (v: string) => string;
}) {
  const subscores = parseSubscores(score.testName, score.notes);
  const hasSubscores = Object.keys(subscores).length > 0;
  const bgColors: Record<string, string> = {
    MDCAT: "bg-rose-600", ECAT: "bg-indigo-600", NTS: "bg-emerald-600",
    SAT: "bg-sky-600", ACT: "bg-violet-600", IELTS: "bg-amber-600",
    TOEFL: "bg-blue-600", HAT: "bg-teal-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-11 h-11 rounded-xl text-white flex items-center justify-center font-bold text-xs flex-shrink-0", bgColors[score.testName] ?? "bg-slate-600")}>
            {score.testName.slice(0, 5)}
          </div>
          <div>
            <div className="font-semibold text-slate-800">{testLabel(score.testName)}</div>
            <div className="text-xs text-slate-400 mt-0.5">{score.testDate}</div>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-4 flex items-end gap-1">
        <span className="text-3xl font-bold text-sky-700">{score.score}</span>
        {score.maxScore && <span className="text-slate-400 mb-0.5 text-sm">/ {score.maxScore}</span>}
      </div>
      {hasSubscores && (
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(subscores).map(([k, v]) => (
            <span key={k} className="px-2 py-0.5 bg-sky-50 rounded-md text-xs text-sky-700 font-medium">
              {k}: {v}
            </span>
          ))}
        </div>
      )}
      {!hasSubscores && score.notes && (
        <p className="text-xs text-slate-400 mt-2">{score.notes}</p>
      )}
    </div>
  );
}
