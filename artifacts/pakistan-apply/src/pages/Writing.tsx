import AppLayout from "@/components/AppLayout";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetMyEssays,
  useCreateEssay,
  useUpdateEssay,
  useDeleteEssay,
  getGetMyEssaysQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, PenLine, Edit, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ESSAY_TYPES = [
  { value: "personal_statement", label: "Personal Statement" },
  { value: "supplemental", label: "Supplemental Essay" },
  { value: "short_answer", label: "Short Answer" },
];

const ESSAY_PROMPTS = [
  "Describe a challenge you've faced and how it shaped you.",
  "What accomplishment are you most proud of and why?",
  "Tell us about a person or experience that significantly influenced you.",
  "Why do you want to study your chosen field?",
  "Describe your academic and career goals.",
  "What makes you unique as a candidate?",
  "Custom prompt",
];

const schema = z.object({
  prompt: z.string().min(1, "Required"),
  content: z.string().optional(),
  type: z.enum(["personal_statement", "supplemental", "short_answer"]),
});
type FormData = z.infer<typeof schema>;

export default function Writing() {
  const { data: essays, isLoading } = useGetMyEssays();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { mutate: createEssay, isPending: creating } = useCreateEssay({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyEssaysQueryKey() });
        setOpen(false); reset();
        toast({ title: "Essay created" });
      },
    },
  });

  const { mutate: updateEssay, isPending: updating } = useUpdateEssay({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyEssaysQueryKey() });
        setOpen(false); reset(); setEditingId(null);
        toast({ title: "Essay saved" });
      },
    },
  });

  const { mutate: deleteEssay } = useDeleteEssay({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyEssaysQueryKey() });
        toast({ title: "Essay deleted" });
      },
    },
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const content = watch("content") ?? "";
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const openEdit = (essay: { id: number; prompt: string; content?: string | null; type: string }) => {
    setEditingId(essay.id);
    setValue("prompt", essay.prompt);
    setValue("content", essay.content ?? "");
    setValue("type", essay.type as FormData["type"]);
    setOpen(true);
  };

  const onSubmit = (data: FormData) => {
    if (editingId) {
      updateEssay({ essayId: editingId, data });
    } else {
      createEssay({ data });
    }
  };

  const typeLabel = (v: string) => ESSAY_TYPES.find((t) => t.value === v)?.label ?? v;
  const typeColors: Record<string, string> = {
    personal_statement: "bg-sky-100 text-sky-700",
    supplemental: "bg-purple-100 text-purple-700",
    short_answer: "bg-green-100 text-green-700",
  };

  return (
    <AppLayout title="Essays & Writing" subtitle="Write your personal statement and supplemental essays">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => { setEditingId(null); reset(); setOpen(true); }} className="bg-sky-600 hover:bg-sky-700 gap-2">
            <Plus className="w-4 h-4" /> New Essay
          </Button>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => <div key={i} className="h-28 bg-white rounded-2xl" />)}
          </div>
        ) : essays && essays.length > 0 ? (
          <div className="space-y-3">
            {essays.map((e) => (
              <div key={e.id} className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", typeColors[e.type] ?? "bg-slate-100 text-slate-600")}>
                        {typeLabel(e.type)}
                      </span>
                      {e.wordCount !== undefined && e.wordCount !== null && (
                        <span className="text-xs text-slate-400">{e.wordCount} words</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{e.prompt}</p>
                    {e.content && (
                      <p className="text-sm text-slate-400 mt-1.5 line-clamp-2">{e.content}</p>
                    )}
                    {!e.content && (
                      <p className="text-sm text-slate-300 italic mt-1.5">Not started yet</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(e)} className="p-2 rounded-lg hover:bg-sky-50 text-slate-300 hover:text-sky-500 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteEssay({ essayId: e.id })} className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-sky-200 p-12 text-center">
            <PenLine className="w-10 h-10 text-sky-200 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-slate-700 mb-1">No essays yet</h3>
            <p className="text-sm text-slate-400 mb-4">Write your personal statement and supplemental essays.</p>
            <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700 gap-2">
              <Plus className="w-4 h-4" /> Start Writing
            </Button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); reset(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Essay" : "New Essay"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Essay Type</Label>
                  <Select value={watch("type")} onValueChange={(v) => setValue("type", v as FormData["type"])}>
                    <SelectTrigger className="border-sky-100"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {ESSAY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Prompt Template</Label>
                  <Select onValueChange={(v) => { if (v !== "Custom prompt") setValue("prompt", v); }}>
                    <SelectTrigger className="border-sky-100"><SelectValue placeholder="Choose prompt..." /></SelectTrigger>
                    <SelectContent>
                      {ESSAY_PROMPTS.map((p) => <SelectItem key={p} value={p}>{p.length > 45 ? p.slice(0, 45) + "..." : p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Essay Prompt</Label>
                <Input {...register("prompt")} placeholder="Enter or edit the essay prompt..." className="border-sky-100" />
                {errors.prompt && <p className="text-xs text-red-500 mt-1">{errors.prompt.message}</p>}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Your Response</Label>
                  <span className="text-xs text-slate-400">{wordCount} words</span>
                </div>
                <Textarea
                  {...register("content")}
                  placeholder="Start writing your essay here..."
                  rows={12}
                  className="border-sky-100 resize-y font-sans text-sm leading-relaxed"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditingId(null); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={creating || updating} className="bg-sky-600 hover:bg-sky-700">
                {(creating || updating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? "Save Changes" : "Create Essay"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
