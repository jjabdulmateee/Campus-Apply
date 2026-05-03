import { useRoute } from "wouter";
import { useGetApplication } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Printer, Share2, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function AcceptanceLetter() {
  const [, params] = useRoute("/acceptance-letter/:id");
  const id = parseInt(params?.id ?? "0");
  const { data, isLoading, error } = useGetApplication(id);
  const { toast } = useToast();

  const handlePrint = () => window.print();

  const handleShare = () => {
    const text = `I just got accepted to ${data?.universityName ?? "a top university"} via PakApply! 🎉 #PakApply #Accepted`;
    if (navigator.share) {
      navigator.share({ title: "My Acceptance Letter", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() =>
        toast({ title: "Copied to clipboard!", description: "Share your achievement on social media." }),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  if (error || !data || data.status !== "accepted") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-sky-50">
        <p className="text-slate-500 text-sm">Acceptance letter not available.</p>
        <Link href="/applications">
          <Button variant="outline">Back to Applications</Button>
        </Link>
      </div>
    );
  }

  const app = data;
  const studentName = "Student";
  const today = new Date().toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-sky-50 py-8 px-4 print:bg-white print:py-0 print:px-0">
      {/* Print/Share controls — hidden when printing */}
      <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link href="/applications">
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-sky-600">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button
            onClick={handleShare}
            variant="outline"
            size="sm"
            className="border-sky-200 text-sky-600 hover:bg-sky-50"
          >
            <Share2 className="w-4 h-4 mr-1.5" />
            Share
          </Button>
          <Button
            onClick={handlePrint}
            size="sm"
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Letter body */}
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-sky-100 overflow-hidden print:shadow-none print:rounded-none print:border-none">
        {/* Decorative header */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-10 py-8 text-white text-center print:py-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center ring-2 ring-white/30">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Congratulations!</h1>
          <p className="mt-2 text-sky-100 text-sm">You have been accepted</p>
        </div>

        {/* Watermark stripe */}
        <div className="h-1.5 bg-gradient-to-r from-sky-400 via-green-400 to-blue-500" />

        {/* Letter content */}
        <div className="px-10 py-8 space-y-5 print:px-8 print:py-6">
          {/* University name + crest placeholder */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">From</p>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">{app.universityName}</h2>
              <p className="text-sm text-slate-400">{app.programName}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-black text-sky-700">
                {(app.universityName ?? "U").slice(0, 3).toUpperCase()}
              </span>
            </div>
          </div>

          <hr className="border-sky-50" />

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Issued to</p>
            <p className="text-2xl font-bold text-slate-900">{studentName}</p>
          </div>

          <div className="bg-sky-50 rounded-2xl p-5 space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed">
              Dear <span className="font-semibold">{studentName}</span>,
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              On behalf of the admissions committee of{" "}
              <span className="font-semibold text-sky-700">{app.universityName}</span>, we are
              delighted to inform you that your application to the{" "}
              <span className="font-semibold">{app.programName}</span> programme has been
              reviewed and you have been{" "}
              <span className="font-bold text-green-600">officially accepted</span>.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              This offer of admission reflects our confidence in your academic potential and we look
              forward to welcoming you to our university community. Please log in to the PakApply
              portal to complete your enrollment formalities.
            </p>
            {(app as unknown as Record<string, unknown>).decisionReason ? (
              <p className="text-sm text-slate-600 italic">
                Admissions note: &ldquo;{String((app as unknown as Record<string, unknown>).decisionReason)}&rdquo;
              </p>
            ) : null}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Admission Status", value: "Accepted", accent: "text-green-600" },
              { label: "Programme", value: app.programName },
              { label: "Date Issued", value: today },
              { label: "Reference", value: `APP-${String(app.id).padStart(6, "0")}` },
            ].map(({ label, value, accent }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">
                  {label}
                </p>
                <p className={`text-sm font-bold truncate ${accent ?? "text-slate-800"}`}>{value}</p>
              </div>
            ))}
          </div>

          <hr className="border-sky-50" />

          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Generated by PakApply · pakapply.pk</span>
            <span>{today}</span>
          </div>
        </div>

        {/* Footer stripe */}
        <div className="h-2 bg-gradient-to-r from-sky-600 to-blue-700" />
      </div>

      {/* Celebration banner */}
      <div className="max-w-2xl mx-auto mt-6 bg-gradient-to-r from-green-50 to-sky-50 border border-green-200 rounded-2xl p-5 flex items-center gap-4 print:hidden">
        <div className="text-3xl">🎉</div>
        <div>
          <p className="text-sm font-bold text-slate-800">Share your success!</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Let your friends and family know about your achievement.
          </p>
        </div>
        <Button
          onClick={handleShare}
          size="sm"
          className="ml-auto bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
        >
          <Share2 className="w-4 h-4 mr-1.5" />
          Share
        </Button>
      </div>
    </div>
  );
}
