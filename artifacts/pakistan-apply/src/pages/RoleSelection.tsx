import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { CheckCircle2, BookOpen, RefreshCw, Briefcase, Users } from "lucide-react";

type Role = "first_year" | "transfer" | "professional" | "parent";

interface RoleCard {
  id: Role;
  label: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const ROLES: RoleCard[] = [
  {
    id: "first_year",
    label: "First-year student",
    description: "Applying right after Intermediate / A-Levels",
    icon: BookOpen,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
  },
  {
    id: "transfer",
    label: "Transfer student",
    description: "Moving from another university or program",
    icon: RefreshCw,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    id: "professional",
    label: "Education professional",
    description: "Counselor, teacher, or school administrator",
    icon: Briefcase,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    id: "parent",
    label: "Parent or other adult",
    description: "Supporting a student through the process",
    icon: Users,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
];

const ROLE_STORAGE_KEY = "pakapp_user_type";

export default function RoleSelection() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<Role | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    localStorage.setItem(ROLE_STORAGE_KEY, selected);
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white relative overflow-hidden px-6 py-10">
      {/* Background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-sky-100/60 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">Campus Apply</div>
          <div className="mt-6 mb-2">
            <h1 className="text-2xl font-extrabold text-slate-900">
              Which best describes you?
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              We'll personalise your experience based on your role.
            </p>
          </div>
        </div>

        {/* Role cards */}
        <div className="flex flex-col gap-3 mb-6">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const isSelected = selected === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelected(role.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-150 active:scale-[0.99]",
                  isSelected
                    ? "border-sky-500 bg-sky-50/60 shadow-sm shadow-sky-100"
                    : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/30",
                )}
              >
                {/* Icon */}
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", role.iconBg)}>
                  <Icon className={cn("w-5 h-5", role.iconColor)} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-semibold", isSelected ? "text-sky-700" : "text-slate-800")}>
                    {role.label}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 leading-snug">{role.description}</div>
                </div>

                {/* Check indicator */}
                <div className="flex-shrink-0">
                  {isSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-sky-500" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!selected}
          className={cn(
            "w-full py-3.5 rounded-2xl font-bold text-base transition-all duration-200",
            selected
              ? "bg-sky-600 text-white hover:bg-sky-700 shadow-lg shadow-sky-600/25 active:scale-[0.98]"
              : "bg-slate-100 text-slate-400 cursor-not-allowed",
          )}
        >
          Continue
        </button>

        <p className="text-center text-xs text-slate-400 mt-4">
          You can change this later in Account Settings.
        </p>
      </div>
    </div>
  );
}
