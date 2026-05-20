import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-sky-50 to-white px-4">
      <div className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full bg-sky-100/40 blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-[360px] h-[360px] rounded-full bg-blue-100/30 blur-3xl -z-10" />

      <div className="w-full max-w-lg text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white border border-sky-100 shadow-sm mb-6">
          <span className="text-3xl font-bold text-sky-600 tracking-tight">404</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Page not found
        </h1>
        <p className="text-sm sm:text-base text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          Check the URL, or head back to your dashboard to continue your application.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button className="bg-sky-600 hover:bg-sky-700 gap-2 w-full sm:w-auto">
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/universities">
            <Button variant="outline" className="gap-2 w-full sm:w-auto border-sky-200">
              <Search className="w-4 h-4" />
              Browse Universities
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="gap-2 text-slate-500 w-full sm:w-auto"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </Button>
        </div>

        <p className="mt-10 text-xs text-slate-400">
          Campus Apply · Pakistan&apos;s Common Application Portal
        </p>
      </div>
    </div>
  );
}
