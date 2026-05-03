import AppLayout from "@/components/AppLayout";
import { useState, useEffect, useRef, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, PenLine, ArrowLeft, Loader2, CheckCircle, Cloud, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

const WORD_LIMIT = 650;
const AUTOSAVE_DELAY_MS = 1500;

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
];

const schema = z.object({
  prompt: z.string().min(1, "Required"),
  content: z.string().optional(),
  type: z.enum(["personal_statement", "supplemental", "short_answer"]),
});
type FormData = z.infer<typeof schema>;

type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function Writing() {
  const { data: essays, isLoading } = useGetMyEssays();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoSaveRef = useRef(false);

  const { mutate: createEssay, isPending: creating } = useCreateEssay({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyEssaysQueryKey() });
        setEditingId(null);
        reset();
        toast({ title: "Essay created" });
      },
    },
  });

  const { mutate: updateEssay, isPending: updating } = useUpdateEssay({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyEssaysQueryKey() });
        if (isAutoSaveRef.current) {
          setAutoSaveStatus("saved");
          isAutoSaveRef.current = false;
        } else {
          setEditingId(null);
          reset();
          toast({ title: "Essay saved" });
        }
      },
      onError: () => {
        if (isAutoSaveRef.current) {
          setAutoSaveStatus("error");
          isAutoSaveRef.current = false;
        }
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

  const { register, handleSubmit, setValue, watch, reset, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const content = watch("content") ?? "";
  const wordCount = countWords(content);
  const wordPct = Math.min((wordCount / WORD_LIMIT) * 100, 100);
  const isOver = wordCount > WORD_LIMIT;
  const isNearLimit = wordCount >= Math.floor(WORD_LIMIT * 0.9) && !isOver;
  const isOnTrack = wordCount > 0 && !isNearLimit && !isOver;

  const triggerAutoSave = useCallback(() => {
    if (typeof editingId !== "number") return;
    const values = getValues();
    if (!values.prompt || isOver) return;

    setAutoSaveStatus("saving");
    isAutoSaveRef.current = true;
    updateEssay({ essayId: editingId, data: values });
  }, [editingId, getValues, isOver, updateEssay]);

  useEffect(() => {
    if (typeof editingId !== "number") return;
    if (content === "") return;

    setAutoSaveStatus("pending");

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      triggerAutoSave();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [content, editingId, triggerAutoSave]);

  const openNew = () => {
    reset({ type: "personal_statement" as const, prompt: "", content: "" });
    setAutoSaveStatus("idle");
    setEditingId("new");
  };

  const openEdit = (essay: { id: number; prompt: string; content?: string | null; type: string }) => {
    setValue("prompt", essay.prompt);
    setValue("content", essay.content ?? "");
    setValue("type", essay.type as FormData["type"]);
    setAutoSaveStatus("idle");
    setEditingId(essay.id);
  };

  const onSubmit = (data: FormData) => {
    if (editingId === "new") {
      createEssay({ data });
    } else if (typeof editingId === "number") {
      isAutoSaveRef.current = false;
      updateEssay({ essayId: editingId, data });
    }
  };

  const typeLabel = (v: string) => ESSAY_TYPES.find((t) => t.value === v)?.label ?? v;
  const typeColors: Record<string, string> = {
    personal_statement: "bg-sky-100 text-sky-700",
    supplemental: "bg-purple-100 text-purple-700",
    short_answer: "bg-green-100 text-green-700",
  };

  if (editingId !== null) {
    const isNew = editingId === "new";
    const isSaving = creating || (updating && !isAutoSaveRef.current);

    return (
      <AppLayout title={isNew ? "New Essay" : "Edit Essay"} subtitle="Write clearly and authentically — admissions officers value genuine voices">
        <div className="space-y-4 max-w-3xl">
          <button
            onClick={() => { setEditingId(null); reset(); }}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-sky-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to essays
          </button>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Essay Type</Label>
                  <Select
                    value={watch("type") ?? ""}
                    onValueChange={(v) => setValue("type", v as FormData["type"])}
                  >
                    <SelectTrigger className="border-sky-100">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESSAY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Use Prompt Template</Label>
                  <Select onValueChange={(v) => setValue("prompt", v)}>
                    <SelectTrigger className="border-sky-100">
                      <SelectValue placeholder="Choose a prompt…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESSAY_PROMPTS.map((p) => (
                        <SelectItem key={p} value={p}>{p.length > 48 ? p.slice(0, 48) + "…" : p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Essay Prompt / Question</Label>
                <Input
                  {...register("prompt")}
                  placeholder="Enter or edit the essay prompt..."
                  className="border-sky-100"
                />
                {errors.prompt && <p className="text-xs text-red-500 mt-1">{errors.prompt.message}</p>}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs font-semibold text-slate-600">Your Response</Label>
                <div className="flex items-center gap-3">
                  {/* Auto-save indicator — only for existing essays */}
                  {!isNew && (
                    <AutoSaveIndicator status={autoSaveStatus} />
                  )}
                  {isOver && (
                    <span className="text-xs font-medium text-red-500">{wordCount - WORD_LIMIT} words over limit</span>
                  )}
                  <span className={cn(
                    "text-xs font-semibold tabular-nums",
                    isOver ? "text-red-500" : isNearLimit ? "text-amber-500" : wordCount > 0 ? "text-sky-600" : "text-slate-400"
                  )}>
                    {wordCount} / {WORD_LIMIT} words
                  </span>
                </div>
              </div>

              <div className="mb-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isOver ? "bg-red-500" : isNearLimit ? "bg-amber-400" : "bg-sky-500"
                  )}
                  style={{ width: `${wordPct}%` }}
                />
              </div>

              <Textarea
                {...register("content")}
                placeholder="Start writing your essay here..."
                rows={18}
                className={cn(
                  "border-sky-100 resize-y font-sans text-sm leading-relaxed",
                  isOver && "border-red-300 focus:border-red-400"
                )}
              />

              {wordCount > 0 && !isOver && (
                <div className={cn(
                  "mt-2 flex items-center gap-1.5 text-xs",
                  isNearLimit ? "text-amber-600" : isOnTrack ? "text-sky-600" : "text-slate-400"
                )}>
                  {isOnTrack && <CheckCircle className="w-3.5 h-3.5" />}
                  {isNearLimit
                    ? `${WORD_LIMIT - wordCount} words remaining — you're almost at the limit.`
                    : `${WORD_LIMIT - wordCount} words remaining`}
                </div>
              )}
              {isOver && (
                <p className="mt-2 text-xs text-red-500">
                  Please reduce by {wordCount - WORD_LIMIT} words before saving.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => { setEditingId(null); reset(); }}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
              <Button
                type="submit"
                disabled={isSaving || isOver}
                className="bg-sky-600 hover:bg-sky-700 px-8"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isNew ? "Create Essay" : "Save & Close"}
              </Button>
            </div>
          </form>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Essays & Writing" subtitle="Write your personal statement and supplemental essays">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {essays ? `${essays.length} essay${essays.length !== 1 ? "s" : ""} created` : ""}
          </p>
          <Button onClick={openNew} className="bg-sky-600 hover:bg-sky-700 gap-2">
            <Plus className="w-4 h-4" /> New Essay
          </Button>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => <div key={i} className="h-28 bg-white rounded-2xl" />)}
          </div>
        ) : essays && essays.length > 0 ? (
          <div className="space-y-3">
            {essays.map((e) => {
              const wc = e.wordCount ?? 0;
              const pct = Math.min((wc / WORD_LIMIT) * 100, 100);
              const hasContent = wc > 0;
              return (
                <div key={e.id} className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", typeColors[e.type] ?? "bg-slate-100 text-slate-600")}>
                          {typeLabel(e.type)}
                        </span>
                        {hasContent ? (
                          <span className={cn("text-xs font-medium", wc > WORD_LIMIT ? "text-red-500" : wc >= WORD_LIMIT * 0.9 ? "text-amber-500" : "text-sky-600")}>
                            {wc} / {WORD_LIMIT} words
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 italic">Not started</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800 line-clamp-1">{e.prompt}</p>
                      {e.content && (
                        <p className="text-sm text-slate-400 mt-1.5 line-clamp-2">{e.content}</p>
                      )}
                      {hasContent && (
                        <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", wc > WORD_LIMIT ? "bg-red-400" : wc >= WORD_LIMIT * 0.9 ? "bg-amber-400" : "bg-sky-400")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(e)}
                        className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-600 text-xs font-medium hover:bg-sky-100 transition-colors"
                      >
                        {hasContent ? "Edit" : "Start Writing"}
                      </button>
                      <button
                        onClick={() => deleteEssay({ essayId: e.id })}
                        className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-sky-200 p-12 text-center">
            <PenLine className="w-10 h-10 text-sky-200 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-slate-700 mb-1">No essays yet</h3>
            <p className="text-sm text-slate-400 mb-1">Write your personal statement (max {WORD_LIMIT} words)</p>
            <p className="text-sm text-slate-400 mb-4">and any supplemental essays required by universities.</p>
            <Button onClick={openNew} className="bg-sky-600 hover:bg-sky-700 gap-2">
              <Plus className="w-4 h-4" /> Start Writing
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function AutoSaveIndicator({ status }: { status: AutoSaveStatus }) {
  if (status === "idle") return null;

  if (status === "pending") {
    return (
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <Cloud className="w-3.5 h-3.5" />
        Unsaved changes
      </span>
    );
  }

  if (status === "saving") {
    return (
      <span className="flex items-center gap-1 text-xs text-sky-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Saving…
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle className="w-3.5 h-3.5" />
        All changes saved
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-xs text-red-500">
        <CloudOff className="w-3.5 h-3.5" />
        Auto-save failed
      </span>
    );
  }

  return null;
}
