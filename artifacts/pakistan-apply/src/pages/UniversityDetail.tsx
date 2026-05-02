import AppLayout from "@/components/AppLayout";
import { Link, useParams } from "wouter";
import {
  useGetUniversity,
  useListPrograms,
  useCreateApplication,
  useListMyApplications,
  getListMyApplicationsQueryKey,
  getGetUniversityQueryKey,
  getListProgramsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  MapPin, Globe, Trophy, Building2, CalendarDays, ArrowLeft,
  GraduationCap, Clock, Users, CheckCircle, Loader2,
} from "lucide-react";
import { useState } from "react";

export default function UniversityDetail() {
  const params = useParams<{ id: string }>();
  const universityId = Number(params.id);
  const { data: university, isLoading } = useGetUniversity(universityId);
  const { data: programs } = useListPrograms(universityId);
  const { data: myApplications } = useListMyApplications();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [applyingTo, setApplyingTo] = useState<number | null>(null);

  const { mutate: apply, isPending } = useCreateApplication({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMyApplicationsQueryKey() });
        setApplyingTo(null);
        toast({ title: "Application started", description: "Check My Applications to continue." });
      },
      onError: () => toast({ title: "Failed to start application", variant: "destructive" }),
    },
  });

  const appliedProgramIds = new Set(myApplications?.map((a) => a.programId) ?? []);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-white rounded-2xl" />
          <div className="h-60 bg-white rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  if (!university) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-slate-400">University not found.</p>
          <Link href="/universities"><a className="text-sky-600 mt-3 inline-block">Back to search</a></Link>
        </div>
      </AppLayout>
    );
  }

  const typeLabel = university.type === "semi_government" ? "Semi-Government" : university.type.charAt(0).toUpperCase() + university.type.slice(1);

  return (
    <AppLayout>
      <div className="space-y-5">
        <Link href="/universities" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-sky-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Universities
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-sky-600">{(university.shortName ?? university.name).slice(0, 4)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{university.name}</h1>
                  {university.shortName && <div className="text-sm text-slate-400 mt-0.5">{university.shortName}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {university.admissionOpen ? (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Admissions Open</span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-500">Admissions Closed</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {university.city}, {university.province}</span>
                <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {typeLabel}</span>
                {university.established && <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> Est. {university.established}</span>}
                {university.ranking && <span className="flex items-center gap-1.5 text-amber-600"><Trophy className="w-4 h-4" /> Ranked #{university.ranking}</span>}
                {university.website && (
                  <a href={university.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sky-500 hover:text-sky-600">
                    <Globe className="w-4 h-4" /> Website
                  </a>
                )}
              </div>
              {university.description && (
                <p className="mt-4 text-sm text-slate-500 leading-relaxed">{university.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Programs */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Programs Offered {programs && <span className="text-sm font-normal text-slate-400">({programs.length})</span>}
          </h2>
          {programs && programs.length > 0 ? (
            <div className="space-y-3">
              {programs.map((p) => {
                const applied = appliedProgramIds.has(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl bg-sky-50/50 hover:bg-sky-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      {p.degree}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 text-sm">{p.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap gap-3">
                        {p.department && <span>{p.department}</span>}
                        {p.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.duration} years</span>}
                        {p.seats && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.seats} seats</span>}
                        {p.entryTest && <span>Entry: {p.entryTest}</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {applied ? (
                        <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" /> Applied
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isPending && applyingTo === p.id}
                          onClick={() => {
                            setApplyingTo(p.id);
                            apply({ data: { universityId: university.id, programId: p.id } });
                          }}
                          className="bg-sky-600 hover:bg-sky-700 text-xs"
                        >
                          {isPending && applyingTo === p.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : "Apply"
                          }
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              No programs listed yet. Check the university website for details.
            </div>
          )}
        </div>

        {/* Deadline */}
        {university.applicationDeadline && (
          <div className="bg-sky-600 rounded-2xl p-5 text-white flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-sm font-medium text-sky-200 mb-1">Application Deadline</div>
              <div className="text-xl font-bold">{university.applicationDeadline}</div>
            </div>
            <Link href="/applications" className="px-4 py-2 rounded-xl bg-white text-sky-600 font-semibold text-sm hover:bg-sky-50 transition-colors">
            View My Applications
          </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
