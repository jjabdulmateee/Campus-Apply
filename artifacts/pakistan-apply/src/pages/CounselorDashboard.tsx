import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useUpload } from "@/hooks/useUpload";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Users, FileText, CheckCircle2, LogOut } from "lucide-react";

interface AssignedStudent {
  assignmentId: number;
  studentId: string;
  studentName: string;
  email: string;
  schoolReportObjectPath: string | null;
  assignedAt: string | null;
}

export default function CounselorDashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [students, setStudents] = useState<AssignedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingStudentRef = useRef<string | null>(null);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: async (res) => {
      const studentId = pendingStudentRef.current;
      if (!studentId) return;
      try {
        const metaRes = await fetch(`/api/counselor/students/${studentId}/school-report`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            objectPath: res.objectPath,
            fileName: res.metadata.name,
            fileSize: res.metadata.size,
            mimeType: res.metadata.contentType,
          }),
        });
        const data = await metaRes.json();
        if (!metaRes.ok) throw new Error(data.error ?? "Upload failed");
        toast({ title: "School report uploaded" });
        setStudents((prev) =>
          prev.map((s) =>
            s.studentId === studentId ? { ...s, schoolReportObjectPath: res.objectPath } : s,
          ),
        );
      } catch (err) {
        toast({ title: (err as Error).message, variant: "destructive" });
      } finally {
        setUploadingFor(null);
        pendingStudentRef.current = null;
      }
    },
    onError: (err) => {
      toast({ title: err.message, variant: "destructive" });
      setUploadingFor(null);
      pendingStudentRef.current = null;
    },
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/counselor/students", {
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load students");
        setStudents(data.students ?? []);
      })
      .catch((err) => toast({ title: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [isAuthenticated, toast]);

  const handleUploadClick = (studentId: string) => {
    pendingStudentRef.current = studentId;
    setUploadingFor(studentId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-emerald-50/40">
      <header className="bg-white border-b border-emerald-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-emerald-900">Counselor Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome, {user?.fullName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { logout(); setLocation("/login"); }} className="gap-2">
          <LogOut className="w-4 h-4" /> Sign out
        </Button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-slate-800">Assigned Students</h2>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileChange}
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-emerald-200 p-12 text-center">
            <Users className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No students have assigned you as their counselor yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((s) => (
              <div key={s.assignmentId} className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800">{s.studentName}</div>
                  <div className="text-sm text-slate-500">{s.email}</div>
                  {s.schoolReportObjectPath && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-green-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      School report on file
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={s.schoolReportObjectPath ? "outline" : "default"}
                  className={s.schoolReportObjectPath ? "" : "bg-emerald-600 hover:bg-emerald-700 gap-1.5"}
                  disabled={isUploading && uploadingFor === s.studentId}
                  onClick={() => handleUploadClick(s.studentId)}
                >
                  {isUploading && uploadingFor === s.studentId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {s.schoolReportObjectPath ? <FileText className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                      {s.schoolReportObjectPath ? "Replace Report" : "Upload Report"}
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          Need help? <Link href="/help" className="text-emerald-600 hover:underline">Contact support</Link>
        </p>
      </main>
    </div>
  );
}
