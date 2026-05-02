import AppLayout from "@/components/AppLayout";
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
import { PROVINCES, RELIGIONS } from "@/lib/constants";
import { Loader2, Save, User, MapPin, Phone, Users, CheckCircle2 } from "lucide-react";
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

// Profile completion sections config
const COMPLETION_SECTIONS = [
  { key: "legal_name", label: "Legal Name", icon: User, color: "sky", weight: 25 },
  { key: "address", label: "Address", icon: MapPin, color: "violet", weight: 25 },
  { key: "contact", label: "Contact", icon: Phone, color: "amber", weight: 25 },
  { key: "guardian", label: "Guardian", icon: Users, color: "emerald", weight: 25 },
] as const;

function computeSectionComplete(data: Partial<FormData>) {
  return {
    legal_name: !!(data.firstName && data.lastName),
    address: !!(data.province && data.city && data.address),
    contact: !!(data.phoneNumber && data.preferredContact),
    guardian: !!(data.guardianName && data.guardianRelation),
  };
}

export default function Profile() {
  const { data: profile, isLoading } = useGetMyProfile();
  const qc = useQueryClient();
  const { toast } = useToast();
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
  const completedSections = Object.values(sectionComplete).filter(Boolean).length;
  const totalPct = Math.round((completedSections / 4) * 100);
  const apiPct = profile?.profileCompletionPercent ?? 0;
  const displayPct = Math.max(totalPct, apiPct);

  const onSubmit = (data: FormData) => {
    update({ data });
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
        <div className="grid grid-cols-4 gap-2">
          {COMPLETION_SECTIONS.map(({ key, label, icon: Icon, color }) => {
            const done = sectionComplete[key];
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border",
                  done
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-slate-50 border-slate-200 text-slate-400",
                )}
              >
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="truncate">{label}</span>
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* ── Legal Name ── */}
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

          {/* ── Address ── */}
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

          {/* ── Contact ── */}
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

          {/* ── Demographics ── */}
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

          {/* ── Parent / Guardian ── */}
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

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-sky-600 hover:bg-sky-700 px-8 h-11 rounded-xl gap-2 font-semibold"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </Button>
          </div>
        </form>
      )}
    </AppLayout>
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
