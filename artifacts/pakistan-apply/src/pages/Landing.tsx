import { Link } from "wouter";
import { GraduationCap, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white relative overflow-hidden px-6">
      {/* Background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[700px] h-[700px] rounded-full bg-sky-100/70 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-sky-50/60 blur-3xl" />
      </div>

      <main className="w-full max-w-md flex flex-col items-center text-center">
        {/* Logo mark */}
        <div className="mb-8 w-16 h-16 rounded-2xl bg-sky-600 flex items-center justify-center shadow-lg shadow-sky-600/30">
          <GraduationCap className="w-9 h-9 text-white" />
        </div>

        {/* Wordmark */}
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Pak<span className="text-sky-600">Apply</span>
        </div>

        <p className="text-xs font-semibold text-sky-600 uppercase tracking-widest mb-8">
          Pakistan's Common Application
        </p>

        {/* Headline */}
        <h1 className="text-4xl font-extrabold text-slate-900 leading-[1.15] mb-4">
          One application.<br />
          <span className="text-sky-600">Every top university.</span>
        </h1>

        <p className="text-base text-slate-500 mb-10 leading-relaxed max-w-sm">
          Complete your profile once and apply to LUMS, NUST, FAST-NU, IBA, UET, and more — all from a single place.
        </p>

        {/* CTAs */}
        <div className="w-full flex flex-col gap-3">
          <Link
            href="/register"
            className="w-full h-13 px-6 py-3.5 inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 text-white font-bold text-base hover:bg-sky-700 active:scale-[0.98] transition-all shadow-lg shadow-sky-600/25"
          >
            Create an Account
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="w-full h-13 px-6 py-3.5 inline-flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-slate-800 font-bold text-base hover:border-sky-300 hover:bg-sky-50 active:scale-[0.98] transition-all"
          >
            Sign In
          </Link>
        </div>

        {/* Trust strip */}
        <div className="mt-12 pt-8 border-t border-slate-100 w-full">
          <p className="text-xs text-slate-400 mb-4 uppercase tracking-widest font-medium">
            Accepted by
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 opacity-50">
            {["LUMS", "NUST", "FAST-NU", "IBA", "UET"].map((uni) => (
              <span key={uni} className="text-sm font-bold text-slate-600">
                {uni}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
