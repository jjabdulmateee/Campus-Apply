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
import { Loader2, Save } from "lucide-react";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  fatherName: z.string().optional(),
  email: z.string().email("Valid email required"),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  cnicNumber: z.string().optional(),
  nationality: z.string().optional(),
  religion: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

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
          firstName: profile.firstName,
          lastName: profile.lastName,
          fatherName: profile.fatherName ?? "",
          email: profile.email,
          phoneNumber: profile.phoneNumber ?? "",
          dateOfBirth: profile.dateOfBirth ?? "",
          gender: profile.gender as FormData["gender"],
          cnicNumber: profile.cnicNumber ?? "",
          nationality: profile.nationality ?? "",
          religion: profile.religion ?? "",
          province: profile.province ?? "",
          city: profile.city ?? "",
          address: profile.address ?? "",
        }
      : undefined,
  });

  const onSubmit = (data: FormData) => {
    update({ data });
  };

  return (
    <AppLayout title="Personal Profile" subtitle="Enter your personal details for your application">
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-sky-100 p-8 animate-pulse space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-10 bg-sky-50 rounded-xl" />)}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Section title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="First Name" error={errors.firstName?.message}>
                <Input {...register("firstName")} placeholder="Ali" className="border-sky-100 focus:border-sky-400" />
              </Field>
              <Field label="Last Name" error={errors.lastName?.message}>
                <Input {...register("lastName")} placeholder="Khan" className="border-sky-100 focus:border-sky-400" />
              </Field>
              <Field label="Father's Name">
                <Input {...register("fatherName")} placeholder="Mohammad Khan" className="border-sky-100 focus:border-sky-400" />
              </Field>
              <Field label="Date of Birth">
                <Input type="date" {...register("dateOfBirth")} className="border-sky-100 focus:border-sky-400" />
              </Field>
              <Field label="Gender">
                <Select value={watch("gender") ?? ""} onValueChange={(v) => setValue("gender", v as FormData["gender"])}>
                  <SelectTrigger className="border-sky-100 focus:border-sky-400">
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
              <Field label="CNIC Number">
                <Input {...register("cnicNumber")} placeholder="35201-1234567-8" className="border-sky-100 focus:border-sky-400" />
              </Field>
            </div>
          </Section>

          {/* Contact */}
          <Section title="Contact Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Email Address" error={errors.email?.message}>
                <Input {...register("email")} type="email" placeholder="ali@example.com" className="border-sky-100 focus:border-sky-400" />
              </Field>
              <Field label="Phone Number">
                <Input {...register("phoneNumber")} placeholder="+92 300 1234567" className="border-sky-100 focus:border-sky-400" />
              </Field>
              <Field label="Province">
                <Select value={watch("province") ?? ""} onValueChange={(v) => setValue("province", v)}>
                  <SelectTrigger className="border-sky-100">
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="City">
                <Input {...register("city")} placeholder="Lahore" className="border-sky-100 focus:border-sky-400" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Full Address">
                  <Input {...register("address")} placeholder="House 12, Street 5, DHA Phase 1" className="border-sky-100 focus:border-sky-400" />
                </Field>
              </div>
            </div>
          </Section>

          {/* Background */}
          <Section title="Background">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nationality">
                <Input {...register("nationality")} placeholder="Pakistani" className="border-sky-100 focus:border-sky-400" />
              </Field>
              <Field label="Religion">
                <Select value={watch("religion") ?? ""} onValueChange={(v) => setValue("religion", v)}>
                  <SelectTrigger className="border-sky-100">
                    <SelectValue placeholder="Select religion" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending} className="bg-sky-600 hover:bg-sky-700 px-8">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Profile
            </Button>
          </div>
        </form>
      )}
    </AppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-sky-50">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
