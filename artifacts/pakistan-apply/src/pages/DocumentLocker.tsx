import { useRef, useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { useUpload } from "@/hooks/useUpload";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDocuments,
  useCreateDocument,
  useDeleteDocument,
  getListDocumentsQueryKey,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import {
  Upload,
  Trash2,
  CheckCircle2,
  FileText,
  Image,
  Loader2,
  ShieldCheck,
  Clock,
  AlertCircle,
} from "lucide-react";

type DocumentCategory =
  | "cnic_front"
  | "cnic_back"
  | "b_form"
  | "matric_marksheet"
  | "fsc_transcript"
  | "a_level_transcript"
  | "o_level_transcript"
  | "passport_photo"
  | "other";

interface CategoryDef {
  key: DocumentCategory;
  label: string;
  description: string;
  accepts: string;
  icon: "file" | "image";
}

const IDENTITY_DOCS: CategoryDef[] = [
  {
    key: "cnic_front",
    label: "CNIC / B-Form (Front)",
    description: "Front side of your CNIC or B-Form",
    accepts: "PDF, JPG, PNG",
    icon: "image",
  },
  {
    key: "cnic_back",
    label: "CNIC / B-Form (Back)",
    description: "Back side of your CNIC or B-Form",
    accepts: "PDF, JPG, PNG",
    icon: "image",
  },
];

const ACADEMIC_DOCS: CategoryDef[] = [
  {
    key: "matric_marksheet",
    label: "Matric / O-Level Marksheet",
    description: "Your official Matric or O-Level result card",
    accepts: "PDF, JPG, PNG",
    icon: "file",
  },
  {
    key: "fsc_transcript",
    label: "FSc / Intermediate Transcript",
    description: "FSc Part 1 & 2 or equivalent result",
    accepts: "PDF, JPG, PNG",
    icon: "file",
  },
  {
    key: "a_level_transcript",
    label: "A-Level Transcript",
    description: "Cambridge A-Level result slip (if applicable)",
    accepts: "PDF, JPG, PNG",
    icon: "file",
  },
];

const PHOTO_DOCS: CategoryDef[] = [
  {
    key: "passport_photo",
    label: "Passport-Sized Photograph",
    description: "Recent photo with white or blue background",
    accepts: "JPG, PNG",
    icon: "image",
  },
];

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_SIZE = 2 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadSlotProps {
  def: CategoryDef;
  existing: {
    id: number;
    fileName: string;
    fileSize: number;
    mimeType: string;
    isVerified: boolean;
    uploadedAt?: string | null;
  } | null;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

function UploadSlot({ def, existing, onDelete, isDeleting }: UploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { mutate: createDoc } = useCreateDocument({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      },
    },
  });

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: async (res) => {
      createDoc({
        data: {
          category: def.key,
          fileName: res.metadata.name,
          fileSize: res.metadata.size,
          mimeType: res.metadata.contentType,
          objectPath: res.objectPath,
        },
      });
      toast({ title: `${def.label} uploaded successfully` });
    },
    onError: (err) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleFile = useCallback(
    (file: File) => {
      setLocalError(null);
      if (!ALLOWED_TYPES.includes(file.type)) {
        setLocalError("Only PDF, JPG, and PNG files are allowed.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setLocalError("File size must not exceed 2MB.");
        return;
      }
      uploadFile(file);
    },
    [uploadFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const IconComponent = def.icon === "image" ? Image : FileText;

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0">
          <IconComponent className="w-5 h-5 text-sky-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-800">{def.label}</h3>
            {existing?.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            )}
            {existing && !existing.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                <Clock className="w-3 h-3" /> Pending Review
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-3">{def.description}</p>

          {existing ? (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sky-50 border border-sky-100">
              <CheckCircle2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-700 truncate">
                  {existing.fileName}
                </div>
                <div className="text-xs text-slate-400">
                  {formatSize(existing.fileSize)}
                  {existing.uploadedAt && (
                    <> · {new Date(existing.uploadedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</>
                  )}
                </div>
              </div>
              <button
                onClick={() => onDelete(existing.id)}
                disabled={isDeleting}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                title="Remove file"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ) : (
            <>
              <div
                onClick={() => !isUploading && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 cursor-pointer transition-all",
                  isDragging
                    ? "border-sky-400 bg-sky-50"
                    : "border-slate-200 hover:border-sky-300 hover:bg-sky-50/50",
                  isUploading && "pointer-events-none opacity-70",
                )}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
                    <div className="w-full max-w-32">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">Uploading…</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-slate-300" />
                    <span className="text-xs text-slate-500 font-medium">
                      Click to upload or drag &amp; drop
                    </span>
                    <span className="text-xs text-slate-400">{def.accepts} · Max 2MB</span>
                  </>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              {localError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {localError}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DocGroup({
  title,
  subtitle,
  defs,
  documents,
  deletingId,
  onDelete,
}: {
  title: string;
  subtitle: string;
  defs: CategoryDef[];
  documents: Array<{
    id: number;
    category: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    isVerified: boolean;
    uploadedAt?: string | null;
  }>;
  deletingId: number | null;
  onDelete: (id: number) => void;
}) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {defs.map((def) => {
          const existing = documents.find((d) => d.category === def.key) ?? null;
          return (
            <UploadSlot
              key={def.key}
              def={def}
              existing={existing}
              onDelete={onDelete}
              isDeleting={deletingId === existing?.id}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function DocumentLocker() {
  const { data: documents = [], isLoading } = useListDocuments();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { mutate: deleteDoc } = useDeleteDocument({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        setDeletingId(null);
        toast({ title: "Document removed" });
      },
      onError: () => {
        setDeletingId(null);
        toast({ title: "Failed to remove document", variant: "destructive" });
      },
    },
  });

  const handleDelete = (id: number) => {
    setDeletingId(id);
    deleteDoc({ id });
  };

  const uploadedCount = documents.length;
  const verifiedCount = documents.filter((d) => d.isVerified).length;
  const totalSlots = IDENTITY_DOCS.length + ACADEMIC_DOCS.length + PHOTO_DOCS.length;

  return (
    <AppLayout
      title="Document Locker"
      subtitle="Upload and manage your official documents for university applications"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Uploaded", value: uploadedCount, total: totalSlots, color: "sky" },
            { label: "Verified", value: verifiedCount, total: uploadedCount, color: "green" },
            { label: "Pending", value: uploadedCount - verifiedCount, total: null, color: "amber" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4 text-center"
            >
              <div
                className={cn(
                  "text-2xl font-bold",
                  s.color === "sky"
                    ? "text-sky-600"
                    : s.color === "green"
                      ? "text-green-600"
                      : "text-amber-600",
                )}
              >
                {s.value}
                {s.total !== null && (
                  <span className="text-sm font-normal text-slate-300">/{s.total}</span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-sky-50 border border-sky-100">
          <ShieldCheck className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-sky-700">
            Upload clear, legible scans. Files are securely stored and only shared with universities you apply to. Accepted formats: <strong>PDF, JPG, PNG</strong> · Max size: <strong>2MB</strong> per file.
          </p>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-white rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            <DocGroup
              title="Identity Documents"
              subtitle="CNIC or B-Form required for all applicants"
              defs={IDENTITY_DOCS}
              documents={documents}
              deletingId={deletingId}
              onDelete={handleDelete}
            />
            <DocGroup
              title="Academic Documents"
              subtitle="Official marksheets and transcripts"
              defs={ACADEMIC_DOCS}
              documents={documents}
              deletingId={deletingId}
              onDelete={handleDelete}
            />
            <DocGroup
              title="Photograph"
              subtitle="Passport-sized photo with plain background"
              defs={PHOTO_DOCS}
              documents={documents}
              deletingId={deletingId}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
