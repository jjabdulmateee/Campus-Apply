import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-sky-50/50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-sky-100/50 to-transparent pointer-events-none -z-10" />
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-sky-200/30 blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-200/20 blur-3xl pointer-events-none -z-10" />

      <main className="w-full max-w-6xl px-6 flex flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-sky-100 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <span className="text-sm font-medium text-sky-700">Admissions for Fall 2025 are open</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-4xl leading-[1.1]">
          Apply to Pakistan's top universities, <span className="text-sky-600">all in one place.</span>
        </h1>
        
        <p className="text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed">
          PakApply is the centralized college admissions portal for Pakistani students. Fill out your profile once, send it anywhere.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="h-12 px-8 inline-flex items-center justify-center rounded-full bg-sky-600 text-white font-semibold text-lg hover:bg-sky-700 transition-colors shadow-lg shadow-sky-600/20">
            Start Application
          </Link>
          <Button variant="outline" size="lg" className="h-12 px-8 rounded-full border-sky-200 text-sky-700 hover:bg-sky-50 font-semibold text-lg bg-white">
            Sign In
          </Button>
        </div>

        <div className="mt-20 pt-10 border-t border-sky-100/50 w-full">
          <p className="text-sm font-medium text-slate-400 mb-6 uppercase tracking-wider">Trusted by top institutions</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Placeholder logos */}
            <div className="text-2xl font-bold font-serif">LUMS</div>
            <div className="text-2xl font-bold tracking-tighter">NUST</div>
            <div className="text-2xl font-bold font-mono">FAST-NU</div>
            <div className="text-2xl font-bold">IBA</div>
            <div className="text-2xl font-bold">UET</div>
          </div>
        </div>
      </main>
    </div>
  );
}
