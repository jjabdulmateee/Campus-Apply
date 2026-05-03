import AppLayout from "@/components/AppLayout";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetMyProfile, useUpdateMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/useUpload";
import { PROVINCES, RELIGIONS } from "@/lib/constants";
import { Loader2, Save, User, MapPin, Phone, Users, CheckCircle2, ShieldCheck, Upload, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Required"),
  fatherName: z.string().optional(),
  email: z.string().email("Valid email required"),
  phoneNumber: z.string().optional(),
  preferredContact: z.enum(["email", "sms", "phone"]).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  cnicNumber: z.string().optional(),
  nationality: z.string().optional(),
  religion: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  guardianName: z.string().optional(),
  guardianRelation: z.string().optional(),
  guardianEmail: z.string().email("Valid email required").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const COMPLETION_SECTIONS = [
  { key: "legal_name", label: "Legal Name", icon: User, color: "sky" },
  { key: "address", label: "Address", icon: MapPin, color: "violet" },
  { key: "contact", label: "Contact", icon: Phone, color: "amber" },
  { key: "guardian", label: "Guardian", icon: Users, color: "emerald" },
  { key: "documents", label: "Documents", icon: ShieldCheck, color: "blue" },
] as const;

const MOBILE_STEPS = [
  { key: "legal_name",  label: "Name",       shortLabel: "Name",   icon: User },
  { key: "address",     label: "Address",     shortLabel: "Addr",   icon: MapPin },
  { key: "contact",     label: "Contact",     shortLabel: "Contact",icon: Phone },
  { key: "demographics",label: "Background",  shortLabel: "BG",     icon: User },
  { key: "guardian",    label: "Guardian",    shortLabel: "Guardian",icon: Users },
  { key: "documents",   label: "Documents",   shortLabel: "Docs",   icon: ShieldCheck },
] as const;

type MobileStepKey = (typeof MOBILE_STEPS)[number]["key"];

const STEP_REQUIRED: Record<MobileStepKey, { field: keyof FormData; label: string }[]> = {
  legal_name: [
    { field: "firstName", label: "First Name" },
    { field: "lastName", label: "Last Name" },
  ],
  address: [
    { field: "province", label: "Province" },
    { field: "city", label: "City" },
    { field: "address", label: "Street Address" },
  ],
  contact: [
    { field: "phoneNumber", label: "Phone Number" },
    { field: "preferredContact", label: "Preferred Contact Method" },
  ],
  demographics: [],
  guardian: [],
  documents: [],
};

type SectionStatus = "not_started" | "in_progress" | "complete";

function classify(items: boolean[]): SectionStatus {
  const done = items.filter(Boolean).length;
  if (done === items.length && done > 0) return "complete";
  if (done > 0) return "in_progress";
  return "not_started";
}

function computeSectionComplete(data: Partial<FormData>) {
  return {
    legal_name: !!(data.firstName && data.lastName),
    address: !!(data.province && data.city && data.address),
    contact: !!(data.phoneNumber && data.preferredContact),
    guardian: !!(data.guardianName && data.guardianRelation),
  };
}

function computeSectionStatus(data: Partial<FormData>): Record<string, SectionStatus> {
  return {
    legal_name: classify([!!data.firstName?.trim(), !!data.lastName?.trim()]),
    address: classify([!!data.province, !!data.city?.trim(), !!data.address?.trim()]),
    contact: classify([!!data.phoneNumber?.trim(), !!data.preferredContact]),
    guardian: classify([!!data.guardianName?.trim(), !!data.guardianRelation]),
  };
}

export default function Profile() {
  const { data: profile, isLoading } = useGetMyProfile();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [mobileStep, setMobileStep] = useState<MobileStepKey>("legal_name");

  const { mutate: update, isPending } = useUpdateMyProfile({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        toast({ title: "Profile saved", description: "Your personal information has been updated." });
      },
      onError: () => {
        toast({ title: "Save failed", variant: "destructive" });
      },
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: profile
      ? {
          firstName: profile.firstName ?? "",
          middleName: profile.middleName ?? "",
          lastName: profile.lastName ?? "",
          fatherName: profile.fatherName ?? "",
          email: profile.email ?? "",
          phoneNumber: profile.phoneNumber ?? "",
          preferredContact: (profile.preferredContact as FormData["preferredContact"]) ?? undefined,
          dateOfBirth: profile.dateOfBirth ?? "",
          gender: profile.gender as FormData["gender"],
          cnicNumber: profile.cnicNumber ?? "",
          nationality: profile.nationality ?? "",
          religion: profile.religion ?? "",
          province: profile.province ?? "",
          city: profile.city ?? "",
          address: profile.address ?? "",
          zipCode: profile.zipCode ?? "",
          guardianName: profile.guardianName ?? "",
          guardianRelation: profile.guardianRelation ?? "",
          guardianEmail: profile.guardianEmail ?? "",
        }
      : undefined,
  });

  const formValues = watch();
  const sectionComplete = computeSectionComplete(formValues);
  const docsComplete = !!(profile?.cnicDocumentUrl && profile?.transcriptUrl);
  const completedSections =
    Object.values(sectionComplete).filter(Boolean).length + (docsComplete ? 1 : 0);
  const totalPct = Math.round((completedSections / 5) * 100);
  const apiPct = profile?.profileCompletionPercent ?? 0;
  const displayPct = Math.max(totalPct, apiPct);

  const onSubmit = (data: FormData) => {
    update({ data });
  };

  const handleDocUploaded = (field: "cnicDocumentUrl" | "transcriptUrl") => (objectPath: string) => {
    update({
      data: {
        firstName: profile?.firstName ?? "",
        lastName: profile?.lastName ?? "",
        email: profile?.email ?? "",
        [field]: objectPath,
      },
    });
  };

  const stepIndex = MOBILE_STEPS.findIndex((s) => s.key === mobileStep);
  const isLastStep = stepIndex === MOBILE_STEPS.length - 1;
  const isFirstStep = stepIndex === 0;

  const sectionStatusMap = computeSectionStatus(formValues);

  const stepStatus: Record<MobileStepKey, SectionStatus> = {
    legal_name: sectionStatusMap.legal_name,
    address: sectionStatusMap.address,
    contact: sectionStatusMap.contact,
    demographics: "not_started",
    guardian: sectionStatusMap.guardian,
    documents: docsComplete ? "complete" : "not_started",
  };

  const handleNext = () => {
    const required = STEP_REQUIRED[mobileStep];
    const values = watch();
    const missing = required.filter(({ field }) => !values[field]);
    if (missing.length > 0) {
      toast({
        title: "Required fields missing",
        description: `Please complete: ${missing.map((f) => f.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    update({ data: values });
    setMobileStep(MOBILE_STEPS[stepIndex + 1].key);
  };

  return (
    <AppLayout title="Personal Profile" subtitle="Complete your profile to strengthen your applications">
      {/* Completion progress bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-bold text-slate-800">Profile Completion</div>
            <div className="text-xs text-slate-400 mt-0.5">Fill in all sections for a complete application</div>
          </div>
          <div className={cn(
            "text-2xl font-black",
            displayPct >= 80 ? "text-green-600" : displayPct >= 50 ? "text-amber-600" : "text-slate-400",
          )}>
            {displayPct}%
          </div>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              displayPct >= 80 ? "bg-green-500" : displayPct >= 50 ? "bg-amber-500" : "bg-sky-500",
            )}
            style={{ width: `${displayPct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {COMPLETION_SECTIONS.map(({ key, label, icon: Icon }) => {
            const st = key === "documents"
              ? (docsComplete ? "complete" : "not_started")
              : (sectionStatusMap[key] ?? "not_started");
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border",
                  st === "complete"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : st === "in_progress"
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-slate-50 border-slate-200 text-slate-400",
                )}
              >
                {st === "complete" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                ) : st === "in_progress" ? (
                  <div className="w-3 h-3 rounded-full border-2 border-amber-500 flex-shrink-0" />
                ) : (
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="truncate">
                  {st === "complete" ? label : st === "in_progress" ? label : label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
              <div className="h-4 w-32 bg-slate-100 rounded mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-slate-100 rounded-xl" />
                <div className="h-10 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── Step Navigator ── */}
          <div className="mb-5">
            {/* Step pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {MOBILE_STEPS.map((step, idx) => {
                const st = stepStatus[step.key];
                const done = st === "complete";
                const inProgress = st === "in_progress";
                const active = mobileStep === step.key;
                return (
                  <button
                    key={step.key}
                    onClick={() => setMobileStep(step.key)}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                      active
                        ? "bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-200"
                        : done
                        ? "bg-green-50 border-green-200 text-green-700"
                        : inProgress
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-white border-slate-200 text-slate-500",
                    )}
                  >
                    {done && !active ? (
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    ) : inProgress && !active ? (
                      <div className="w-3 h-3 rounded-full border-2 border-amber-500 flex-shrink-0" />
                    ) : (
                      <span className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                        active ? "bg-white/20" : "bg-slate-100 text-slate-500",
                      )}>
                        {idx + 1}
                      </span>
                    )}
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* ── Legal Name ── */}
            <div className={cn(mobileStep !== "legal_name" && "hidden")}>
              <Section title="Legal Name" icon={User} iconColor="text-sky-600" iconBg="bg-sky-50" complete={sectionComplete.legal_name}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="First Name" error={errors.firstName?.message} required>
                    <Input {...register("firstName")} placeholder="Ali" className="border-slate-200 focus:border-sky-400" />
                  </Field>
                  <Field label="Middle Name (optional)">
                    <Input {...register("middleName")} placeholder="Raza" className="border-slate-200 focus:border-sky-400" />
                  </Field>
                  <Field label="Last Name" error={errors.lastName?.message} required>
                    <Input {...register("lastName")} placeholder="Khan" className="border-slate-200 focus:border-sky-400" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Field label="Father's Name">
                    <Input {...register("fatherName")} placeholder="Mohammad Khan" className="border-slate-200 focus:border-sky-400" />
                  </Field>
                  <Field label="CNIC / B-Form Number">
                    <Input {...register("cnicNumber")} placeholder="35201-1234567-8" className="border-slate-200 focus:border-sky-400" />
                  </Field>
                </div>
              </Section>
            </div>

            {/* ── Address ── */}
            <div className={cn(mobileStep !== "address" && "hidden")}>
              <Section title="Home Address" icon={MapPin} iconColor="text-violet-600" iconBg="bg-violet-50" complete={sectionComplete.address}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Province" required>
                    <Select value={watch("province") ?? ""} onValueChange={(v) => setValue("province", v)}>
                      <SelectTrigger className="border-slate-200 focus:border-sky-400">
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="City" required>
                    <Input {...register("city")} placeholder="Lahore" className="border-slate-200 focus:border-sky-400" />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Street Address" required>
                      <Input {...register("address")} placeholder="House 12, Street 5, DHA Phase 1" className="border-slate-200 focus:border-sky-400" />
                    </Field>
                  </div>
                  <Field label="Postal / ZIP Code">
                    <Input {...register("zipCode")} placeholder="54000" className="border-slate-200 focus:border-sky-400" />
                  </Field>
                </div>
              </Section>
            </div>

            {/* ── Contact ── */}
            <div className={cn(mobileStep !== "contact" && "hidden")}>
              <Section title="Contact Information" icon={Phone} iconColor="text-amber-600" iconBg="bg-amber-50" complete={sectionComplete.contact}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Email Address" error={errors.email?.message} required>
                    <Input {...register("email")} type="email" placeholder="ali@example.com" className="border-slate-200 focus:border-sky-400" />
                  </Field>
                  <Field label="Phone Number" required>
                    <Input {...register("phoneNumber")} placeholder="+92 300 1234567" className="border-slate-200 focus:border-sky-400" />
                  </Field>
                  <Field label="Preferred Contact Method" required>
                    <Select
                      value={watch("preferredContact") ?? ""}
                      onValueChange={(v) => setValue("preferredContact", v as FormData["preferredContact"])}
                    >
                      <SelectTrigger className="border-slate-200 focus:border-sky-400">
                        <SelectValue placeholder="How should we reach you?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS / Text</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>
            </div>

            {/* ── Demographics ── */}
            <div className={cn(mobileStep !== "demographics" && "hidden")}>
              <Section title="Demographics" complete={false}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Date of Birth">
                    <Input type="date" {...register("dateOfBirth")} className="border-slate-200 focus:border-sky-400" />
                  </Field>
                  <Field label="Gender">
                    <Select value={watch("gender") ?? ""} onValueChange={(v) => setValue("gender", v as FormData["gender"])}>
                      <SelectTrigger className="border-slate-200 focus:border-sky-400">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Nationality">
                    <Input {...register("nationality")} placeholder="Pakistani" className="border-slate-200 focus:border-sky-400" />
                  </Field>
                  <Field label="Religion">
                    <Select value={watch("religion") ?? ""} onValueChange={(v) => setValue("religion", v)}>
                      <SelectTrigger className="border-slate-200 focus:border-sky-400">
                        <SelectValue placeholder="Select religion" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>
            </div>

            {/* ── Parent / Guardian ── */}
            <div className={cn(mobileStep !== "guardian" && "hidden")}>
              <Section title="Parent / Guardian" icon={Users} iconColor="text-emerald-600" iconBg="bg-emerald-50" complete={sectionComplete.guardian}>
                <p className="text-xs text-slate-400 mb-4">
                  Provide your primary parent or guardian's contact details. This information may be used by universities for admission correspondence.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Full Name" required>
                    <Input {...register("guardianName")} placeholder="Mohammad Khan" className="border-slate-200 focus:border-sky-400" />
                  </Field>
                  <Field label="Relation" required>
                    <Select value={watch("guardianRelation") ?? ""} onValueChange={(v) => setValue("guardianRelation", v)}>
                      <SelectTrigger className="border-slate-200 focus:border-sky-400">
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Father">Father</SelectItem>
                        <SelectItem value="Mother">Mother</SelectItem>
                        <SelectItem value="Guardian">Guardian</SelectItem>
                        <SelectItem value="Sibling">Sibling</SelectItem>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Email Address" error={errors.guardianEmail?.message}>
                    <Input {...register("guardianEmail")} type="email" placeholder="parent@example.com" className="border-slate-200 focus:border-sky-400" />
                  </Field>
                </div>
              </Section>
            </div>

            {mobileStep !== "documents" && (
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {!isFirstStep && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMobileStep(MOBILE_STEPS[stepIndex - 1].key)}
                      className="gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </Button>
                  )}
                  {isFirstStep && <div />}
                </div>

                <div className="flex gap-2 ml-auto">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-sky-600 hover:bg-sky-700 px-6 h-10 rounded-xl gap-2 font-semibold"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </Button>
                  {!isLastStep && (
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={handleNext}
                      className="gap-1 h-10"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </form>

          <div className={cn(mobileStep !== "documents" && "hidden")}>
            <Section
              title="Verification Documents"
              icon={ShieldCheck}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
              complete={docsComplete}
            >
              <p className="text-xs text-slate-400 mb-5">
                Upload your identity and academic documents. These are required by universities to verify your application before admission.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DocumentUploadSlot
                  label="CNIC / B-Form"
                  description="Front side of your CNIC or B-Form (identity document)"
                  existingUrl={profile?.cnicDocumentUrl ?? null}
                  onUploaded={handleDocUploaded("cnicDocumentUrl")}
                />
                <DocumentUploadSlot
                  label="Academic Transcript"
                  description="Matric/FSc transcript or most recent academic result"
                  existingUrl={profile?.transcriptUrl ?? null}
                  onUploaded={handleDocUploaded("transcriptUrl")}
                />
              </div>
              {docsComplete && (
                <div className="mt-4 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Both documents uploaded. Your identity and transcript are verified for applications.
                </div>
              )}
            </Section>

            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMobileStep(MOBILE_STEPS[stepIndex - 1].key)}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

function DocumentUploadSlot({
  label,
  description,
  existingUrl,
  onUploaded,
}: {
  label: string;
  description: string;
  existingUrl: string | null | undefined;
  onUploaded: (objectPath: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (res) => onUploaded(res.objectPath),
  });

  const filename = existingUrl
    ? existingUrl.split("/").pop()?.split("?")[0] ?? "document"
    : null;

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-3 text-center transition-all cursor-pointer group",
        existingUrl
          ? "border-green-300 bg-green-50/30 hover:border-green-400"
          : "border-slate-200 hover:border-sky-300 hover:bg-sky-50/30",
        isUploading && "pointer-events-none",
      )}
      onClick={() => !isUploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadFile(f);
          e.target.value = "";
        }}
      />

      {isUploading ? (
        <>
          <Loader2 className="w-9 h-9 text-sky-500 animate-spin" />
          <div className="text-xs text-slate-500">Uploading... {progress}%</div>
          <div className="w-full max-w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : existingUrl ? (
        <>
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div className="text-xs font-bold text-green-700">Uploaded</div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-40">{filename}</div>
          </div>
          <div className="text-[10px] text-sky-600 group-hover:underline">Click to replace</div>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
            {label.includes("Transcript") ? (
              <FileText className="w-6 h-6 text-slate-400 group-hover:text-sky-500 transition-colors" />
            ) : (
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-sky-500 transition-colors" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700">{label}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{description}</div>
          </div>
          <div className="text-[10px] text-slate-400">PDF, JPG, PNG · max 2MB</div>
        </>
      )}
    </div>
  );
}

function Section({
  title, icon: Icon, iconColor, iconBg, complete, children,
}: {
  title: string;
  icon?: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  complete: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3">
        {Icon && (
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", iconBg ?? "bg-slate-50")}>
            <Icon className={cn("w-4 h-4", iconColor ?? "text-slate-500")} />
          </div>
        )}
        <h2 className="text-sm font-bold text-slate-800 flex-1">{title}</h2>
        {complete && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({
  label, children, error, required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
