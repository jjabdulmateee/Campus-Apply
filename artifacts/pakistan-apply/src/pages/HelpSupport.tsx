import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useListMyTickets } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  HelpCircle, Search, ChevronDown, ChevronUp,
  MessageSquare, Ticket, Calculator, CheckCircle,
  XCircle, Clock, Loader2, BookOpen, Upload,
  Wrench, GraduationCap, Send, LifeBuoy,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = "faq" | "contact" | "tickets" | "eligibility";

// ── FAQ data ───────────────────────────────────────────────────────────────
const FAQ_CATEGORIES = [
  { id: "application_tips", label: "Application Tips", icon: BookOpen, color: "text-sky-600", bg: "bg-sky-50" },
  { id: "document_uploads", label: "Document Uploads", icon: Upload, color: "text-violet-600", bg: "bg-violet-50" },
  { id: "technical_issues", label: "Technical Issues", icon: Wrench, color: "text-amber-600", bg: "bg-amber-50" },
  { id: "university_specifics", label: "University Info", icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50" },
] as const;

const FAQ_ITEMS = [
  {
    category: "application_tips",
    q: "How do I start my application?",
    a: "Go to University Search in the sidebar, find your chosen institution, and click 'Apply Now'. Complete your Profile, Education, Test Scores, and Essays sections first — a complete profile speeds up processing.",
  },
  {
    category: "application_tips",
    q: "Can I apply to multiple universities at once?",
    a: "Yes! PakApply supports parallel applications. Each application is tracked separately under My Applications. You can apply to as many universities as you like within their deadlines.",
  },
  {
    category: "application_tips",
    q: "What is the typical application deadline?",
    a: "Deadlines vary by university. Most Pakistani public universities open admissions in August–September for the Fall intake. Private universities may have rolling admissions. Always check the specific university page for accurate dates.",
  },
  {
    category: "application_tips",
    q: "Can I edit my application after submitting?",
    a: "Once submitted, you cannot directly edit your application. Contact the university admissions office or submit a support ticket here — our team can guide you on the next steps.",
  },
  {
    category: "application_tips",
    q: "Will I be notified when my application status changes?",
    a: "Yes, if you have 'Application Status Updates' enabled in Account Settings → Notifications. You can toggle this preference any time without affecting your application.",
  },
  {
    category: "document_uploads",
    q: "What documents do I need to upload?",
    a: "Standard requirements: CNIC front & back (or B-Form for minors), Matric certificate + marksheet, FSc transcript, and a recent passport-size photo. Some programs may also require a MDCAT/NTS result, domicile, or character certificate.",
  },
  {
    category: "document_uploads",
    q: "What file formats and sizes are accepted?",
    a: "Documents: PDF, JPG, or PNG — each under 10 MB. Profile photo (avatar): JPG, PNG, or WebP — under 2 MB. Compress large PDFs at ilovepdf.com if needed.",
  },
  {
    category: "document_uploads",
    q: "My document upload is failing. What should I do?",
    a: "Check that your file is under the size limit and in an accepted format. Try a different browser, clear your cache (Ctrl+Shift+Delete), and retry. If the problem persists, submit a support ticket with a screenshot of the error.",
  },
  {
    category: "document_uploads",
    q: "Can I replace an already-uploaded document?",
    a: "Yes. In Document Locker, find the document category and upload a new file — it will replace the previous version. Make sure the new file is legible and correct before uploading.",
  },
  {
    category: "technical_issues",
    q: "I forgot my password. How do I reset it?",
    a: "From the login page, click 'Forgot password?' to initiate a reset. If that option isn't available yet, open Account Settings → Change Password once logged in, or submit a support ticket for a manual reset.",
  },
  {
    category: "technical_issues",
    q: "My submitted application doesn't appear in My Applications.",
    a: "Wait a few seconds and refresh the page. If it still doesn't appear after a minute, submit a support ticket. Please include your email address and the university name you applied to.",
  },
  {
    category: "technical_issues",
    q: "The portal is running slowly.",
    a: "Try clearing your browser cache (Ctrl+Shift+Delete → All Time → Cached images and files). Switch to a different browser (Chrome or Firefox recommended). Ensure you have a stable internet connection.",
  },
  {
    category: "technical_issues",
    q: "How do I update my email address or password?",
    a: "Click the gear icon at the bottom of the sidebar to open Account Settings. Select 'Change Email' or 'Change Password'. Both actions require your current password for security, and will sign you out afterwards.",
  },
  {
    category: "university_specifics",
    q: "How is the aggregate percentage calculated?",
    a: "Standard formula used by most Pakistani universities: (Matric % × 40%) + (FSc % × 60%). Medical universities (MBBS/BDS) often use: (Matric % × 10%) + (FSc % × 40%) + (MDCAT % × 50%). Use the Eligibility Checker tab for instant calculations.",
  },
  {
    category: "university_specifics",
    q: "What is the difference between merit-based and self-finance seats?",
    a: "Merit seats are awarded to top-scoring applicants at the subsidised government fee. Self-finance seats are available at higher fees and have lower merit cutoffs — useful if your aggregate falls just below the open merit threshold.",
  },
  {
    category: "university_specifics",
    q: "Can overseas Pakistanis apply through PakApply?",
    a: "Yes. Most public universities reserve a dedicated Overseas Pakistani quota. You may need to provide a valid NICOP or foreign passport in addition to your academic documents. Check the specific university page for quota details.",
  },
  {
    category: "university_specifics",
    q: "Is NTS GAT required for undergraduate admissions?",
    a: "NTS GAT is primarily required for postgraduate (MS/M.Phil/PhD) programs. For undergraduate programs, MDCAT is required for medical fields, while engineering universities often conduct their own entry tests or use FSc marks directly.",
  },
];

// ── Eligibility data ───────────────────────────────────────────────────────
const UNI_THRESHOLDS = [
  { name: "NUST Islamabad", program: "Engineering / CS", cutoff: 80, formula: "standard" },
  { name: "LUMS Lahore", program: "BSc (Hons)", cutoff: 72, formula: "standard" },
  { name: "GIKI Topi", program: "Engineering", cutoff: 72, formula: "standard" },
  { name: "UET Lahore", program: "Engineering", cutoff: 70, formula: "standard" },
  { name: "FAST NUCES", program: "CS / SE", cutoff: 65, formula: "standard" },
  { name: "Air University", program: "Engineering / CS", cutoff: 65, formula: "standard" },
  { name: "NED University", program: "Engineering", cutoff: 65, formula: "standard" },
  { name: "COMSATS University", program: "All Programs", cutoff: 60, formula: "standard" },
  { name: "Punjab University", program: "BS Programs", cutoff: 55, formula: "standard" },
  { name: "MUET Jamshoro", program: "Engineering", cutoff: 60, formula: "standard" },
  { name: "University of Karachi", program: "BS Programs", cutoff: 55, formula: "standard" },
  { name: "Mehran UET", program: "Engineering", cutoff: 60, formula: "standard" },
];

// ── Status config ──────────────────────────────────────────────────────────
const TICKET_STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  open: { label: "Open", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
  in_progress: { label: "In Progress", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Loader2 },
  resolved: { label: "Resolved", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle },
};

const CATEGORY_LABELS: Record<string, string> = {
  application_tips: "Application Tips",
  document_uploads: "Document Uploads",
  technical_issues: "Technical Issues",
  university_specifics: "University Info",
  other: "Other",
};

// ── Main page ──────────────────────────────────────────────────────────────
export default function HelpSupport() {
  const [tab, setTab] = useState<Tab>("faq");

  const TAB_ITEMS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "faq", label: "FAQ", icon: HelpCircle },
    { id: "contact", label: "Contact Support", icon: MessageSquare },
    { id: "tickets", label: "My Tickets", icon: Ticket },
    { id: "eligibility", label: "Eligibility Checker", icon: Calculator },
  ];

  return (
    <AppLayout title="Help & Support" subtitle="Find answers, check eligibility, and get in touch with our team">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mb-6">
        {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              tab === id
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === "faq" && <FAQTab />}
      {tab === "contact" && <ContactTab onSubmitted={() => setTab("tickets")} />}
      {tab === "tickets" && <MyTicketsTab />}
      {tab === "eligibility" && <EligibilityTab />}
    </AppLayout>
  );
}

// ── FAQ Tab ────────────────────────────────────────────────────────────────
function FAQTab() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const matchesCat = !activeCat || item.category === activeCat;
      const matchesSearch = !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [search, activeCat]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search frequently asked questions…"
          className="pl-10 h-11 text-sm rounded-xl border-slate-200"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCat(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
            !activeCat ? "bg-sky-600 text-white border-sky-600" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300",
          )}
        >
          All topics
        </button>
        {FAQ_CATEGORIES.map(({ id, label, icon: Icon, color, bg }) => (
          <button
            key={id}
            onClick={() => setActiveCat(activeCat === id ? null : id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5",
              activeCat === id
                ? `${bg} ${color} border-current`
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Accordion */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No FAQs match your search.</p>
          <p className="text-xs mt-1">Try different keywords or browse by category.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item, idx) => {
            const id = `${item.category}-${idx}`;
            const isOpen = openId === id;
            const cat = FAQ_CATEGORIES.find((c) => c.id === item.category);
            return (
              <div key={id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <button
                  className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-50/60 transition-colors"
                  onClick={() => setOpenId(isOpen ? null : id)}
                >
                  {cat && (
                    <span className={cn("mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center", cat.bg)}>
                      <cat.icon className={cn("w-3 h-3", cat.color)} />
                    </span>
                  )}
                  <span className="flex-1 text-sm font-medium text-slate-800">{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center pt-2">
        Can't find your answer? Use the <strong>Contact Support</strong> tab to reach our team.
      </p>
    </div>
  );
}

// ── Contact Tab ────────────────────────────────────────────────────────────
const contactSchema = z.object({
  category: z.enum(["application_tips", "document_uploads", "technical_issues", "university_specifics", "other"]),
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  message: z.string().min(10, "Please provide at least 10 characters").max(2000, "Message too long"),
});

function ContactTab({ onSubmitted }: { onSubmitted: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const token = localStorage.getItem("pakapp_token");

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: { category: "other", subject: "", message: "" },
  });

  const category = watch("category");

  const onSubmit = async (data: z.infer<typeof contactSchema>) => {
    setIsPending(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit");
      toast({ title: "Support ticket submitted", description: "We'll respond within 1–2 business days." });
      reset();
      queryClient.invalidateQueries({ queryKey: ["/support/tickets"] });
      onSubmitted();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Submission failed", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Submit a Support Ticket</h3>
            <p className="text-xs text-slate-400">We respond within 1–2 business days</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Topic Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setValue("category", v as z.infer<typeof contactSchema>["category"])}
            >
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="application_tips">Application Tips</SelectItem>
                <SelectItem value="document_uploads">Document Uploads</SelectItem>
                <SelectItem value="technical_issues">Technical Issues</SelectItem>
                <SelectItem value="university_specifics">University Info</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Subject</Label>
            <Input {...register("subject")} placeholder="Brief description of your issue" className="h-10 rounded-xl text-sm" />
            {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject.message as string}</p>}
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Message</Label>
            <Textarea
              {...register("message")}
              placeholder="Describe your issue in detail. Include your university name, program, or any error messages you've seen."
              className="min-h-32 rounded-xl text-sm resize-none"
            />
            {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message.message as string}</p>}
          </div>

          <Button type="submit" disabled={isPending} className="w-full bg-sky-600 hover:bg-sky-700 gap-2 h-10">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isPending ? "Submitting…" : "Submit Ticket"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── My Tickets Tab ─────────────────────────────────────────────────────────
function MyTicketsTab() {
  const { data, isLoading } = useListMyTickets();
  const tickets = data?.tickets ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-20">
        <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No support tickets yet</p>
        <p className="text-slate-400 text-sm mt-1">Use the Contact Support tab to submit a question.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => {
        const sc = TICKET_STATUS[ticket.status] ?? TICKET_STATUS.open;
        const StatusIcon = sc.icon;
        return (
          <div key={ticket.id} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1", sc.bg, sc.color)}>
                    <StatusIcon className="w-3 h-3" />
                    {sc.label}
                  </span>
                  <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                    {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 truncate">{ticket.subject}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Submitted {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </p>
              </div>
            </div>

            <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed">
              {ticket.message}
            </div>

            {ticket.adminReply && (
              <div className="mt-3 p-3 bg-sky-50 rounded-xl border border-sky-100">
                <div className="text-xs font-semibold text-sky-700 mb-1">
                  Support Team {ticket.adminName ? `(${ticket.adminName})` : ""} replied:
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{ticket.adminReply}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Eligibility Checker Tab ────────────────────────────────────────────────
type Formula = "standard" | "medical";

function EligibilityTab() {
  const [matric, setMatric] = useState("");
  const [fsc, setFsc] = useState("");
  const [mdcat, setMdcat] = useState("");
  const [formula, setFormula] = useState<Formula>("standard");
  const [checked, setChecked] = useState(false);

  const aggregate = useMemo(() => {
    const m = parseFloat(matric);
    const f = parseFloat(fsc);
    if (isNaN(m) || isNaN(f)) return null;
    if (m < 0 || m > 100 || f < 0 || f > 100) return null;
    if (formula === "standard") {
      return Math.round((m * 0.4 + f * 0.6) * 10) / 10;
    }
    const md = parseFloat(mdcat);
    if (isNaN(md) || md < 0 || md > 100) return null;
    return Math.round((m * 0.1 + f * 0.4 + md * 0.5) * 10) / 10;
  }, [matric, fsc, mdcat, formula]);

  const handleCheck = () => {
    if (aggregate !== null) setChecked(true);
  };

  return (
    <div className="space-y-6">
      {/* Calculator */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Aggregate Calculator</h3>
            <p className="text-xs text-slate-400">Enter your marks to check eligibility</p>
          </div>
        </div>

        {/* Formula selector */}
        <div className="flex gap-2 mb-5">
          {(["standard", "medical"] as Formula[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFormula(f); setChecked(false); }}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all",
                formula === f
                  ? "bg-sky-600 text-white border-sky-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-sky-300",
              )}
            >
              {f === "standard" ? "Standard (Matric 40% + FSc 60%)" : "Medical (Matric 10% + FSc 40% + MDCAT 50%)"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Matric Percentage (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={matric}
              onChange={(e) => { setMatric(e.target.value); setChecked(false); }}
              placeholder="e.g. 87.5"
              className="h-10 rounded-xl text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">FSc / Intermediate (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={fsc}
              onChange={(e) => { setFsc(e.target.value); setChecked(false); }}
              placeholder="e.g. 91.2"
              className="h-10 rounded-xl text-sm"
            />
          </div>
        </div>

        {formula === "medical" && (
          <div className="mb-4">
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">MDCAT Score (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={mdcat}
              onChange={(e) => { setMdcat(e.target.value); setChecked(false); }}
              placeholder="e.g. 78.0"
              className="h-10 rounded-xl text-sm max-w-xs"
            />
          </div>
        )}

        {aggregate !== null && (
          <div className="mb-4 p-4 bg-sky-50 rounded-xl border border-sky-100 flex items-center gap-4">
            <div className="flex-1">
              <div className="text-xs text-sky-600 font-medium mb-0.5">Your Calculated Aggregate</div>
              <div className="text-3xl font-black text-sky-700">{aggregate}%</div>
            </div>
            <div className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-full",
              aggregate >= 80 ? "bg-green-100 text-green-700" :
              aggregate >= 65 ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700",
            )}>
              {aggregate >= 80 ? "Excellent" : aggregate >= 65 ? "Good" : "Below Average"}
            </div>
          </div>
        )}

        <Button
          onClick={handleCheck}
          disabled={aggregate === null}
          className="w-full bg-sky-600 hover:bg-sky-700 gap-2"
        >
          <Calculator className="w-4 h-4" />
          Check University Eligibility
        </Button>
      </div>

      {/* Results table */}
      {checked && aggregate !== null && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h4 className="text-sm font-bold text-slate-800">University Eligibility Results</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Based on approximate minimum aggregate cutoffs — verify with each university directly.
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {/* Header */}
            <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <div className="col-span-5">University</div>
              <div className="col-span-4">Program</div>
              <div className="col-span-2 text-center">Min. Agg.</div>
              <div className="col-span-1 text-center">Status</div>
            </div>
            {UNI_THRESHOLDS.map((uni) => {
              const eligible = aggregate >= uni.cutoff;
              return (
                <div key={uni.name} className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-slate-50/50">
                  <div className="col-span-5 text-sm font-medium text-slate-800">{uni.name}</div>
                  <div className="col-span-4 text-xs text-slate-500">{uni.program}</div>
                  <div className="col-span-2 text-center text-xs font-bold text-slate-600">{uni.cutoff}%</div>
                  <div className="col-span-1 flex justify-center">
                    {eligible ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
            ⚠️ Cutoffs are indicative only and change each year based on merit. Always confirm with the official university admissions office.
          </div>
        </div>
      )}
    </div>
  );
}
