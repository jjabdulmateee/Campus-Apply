import AppLayout from "@/components/AppLayout";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetMyActivities,
  useAddActivity,
  useDeleteActivity,
  getGetMyActivitiesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import { Plus, Trash2, BookOpen, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Required"),
  category: z.enum(["sports", "arts", "community_service", "academics", "religious", "leadership", "work", "other"]),
  role: z.string().min(1, "Required"),
  organization: z.string().optional(),
  startYear: z.number().int().optional(),
  endYear: z.number().int().optional(),
  hoursPerWeek: z.number().int().optional(),
  description: z.string().optional(),
  isCurrentlyActive: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

export default function Activities() {
  const { data: activities, isLoading } = useGetMyActivities();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { mutate: addActivity, isPending } = useAddActivity({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyActivitiesQueryKey() });
        setOpen(false);
        reset();
        toast({ title: "Activity added" });
      },
    },
  });

  const { mutate: deleteActivity } = useDeleteActivity({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyActivitiesQueryKey() });
        toast({ title: "Activity removed" });
      },
    },
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isCurrentlyActive: false },
  });

  const catLabel = (val: string) => ACTIVITY_CATEGORIES.find((c) => c.value === val)?.label ?? val;

  const catColors: Record<string, string> = {
    sports: "bg-green-100 text-green-700",
    arts: "bg-purple-100 text-purple-700",
    community_service: "bg-orange-100 text-orange-700",
    academics: "bg-blue-100 text-blue-700",
    religious: "bg-teal-100 text-teal-700",
    leadership: "bg-sky-100 text-sky-700",
    work: "bg-amber-100 text-amber-700",
    other: "bg-slate-100 text-slate-600",
  };

  return (
    <AppLayout title="Activities & Interests" subtitle="Showcase your extracurricular involvement and community participation">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700 gap-2">
            <Plus className="w-4 h-4" /> Add Activity
          </Button>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 bg-white rounded-2xl" />)}
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800">{a.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${catColors[a.category] ?? "bg-slate-100 text-slate-600"}`}>
                        {catLabel(a.category)}
                      </span>
                      {a.isCurrentlyActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-600">Active</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {a.role}{a.organization ? ` — ${a.organization}` : ""}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {a.startYear && `${a.startYear}${a.endYear ? ` – ${a.endYear}` : " – Present"}`}
                      {a.hoursPerWeek && ` · ${a.hoursPerWeek} hrs/week`}
                    </div>
                    {a.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{a.description}</p>}
                  </div>
                  <button onClick={() => deleteActivity({ activityId: a.id })}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-sky-200 p-12 text-center">
            <BookOpen className="w-10 h-10 text-sky-200 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-slate-700 mb-1">No activities yet</h3>
            <p className="text-sm text-slate-400 mb-4">Add sports, community service, clubs, or work experience.</p>
            <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700 gap-2">
              <Plus className="w-4 h-4" /> Add First Activity
            </Button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => addActivity({ data: d }))}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Activity Name</Label>
                  <Input {...register("name")} placeholder="Cricket Team" className="border-sky-100" />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Category</Label>
                  <Select onValueChange={(v) => setValue("category", v as FormData["category"])}>
                    <SelectTrigger className="border-sky-100"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Your Role</Label>
                  <Input {...register("role")} placeholder="Captain" className="border-sky-100" />
                  {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Organization</Label>
                  <Input {...register("organization")} placeholder="School / Club name" className="border-sky-100" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Start Year</Label>
                  <Input type="number" {...register("startYear", { valueAsNumber: true })} placeholder="2021" className="border-sky-100" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">End Year</Label>
                  <Input type="number" {...register("endYear", { valueAsNumber: true })} placeholder="2023" className="border-sky-100" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Hrs/Week</Label>
                  <Input type="number" {...register("hoursPerWeek", { valueAsNumber: true })} placeholder="5" className="border-sky-100" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</Label>
                <Textarea {...register("description")} placeholder="Briefly describe your involvement..." rows={3} className="border-sky-100 resize-none" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="active"
                  checked={watch("isCurrentlyActive")}
                  onCheckedChange={(v) => setValue("isCurrentlyActive", !!v)}
                />
                <Label htmlFor="active" className="text-sm text-slate-600 cursor-pointer">Currently active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-sky-600 hover:bg-sky-700">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Add Activity
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
