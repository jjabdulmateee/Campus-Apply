import type { AdminApplicationRow } from "@workspace/api-client-react";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Pending",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  waitlisted: "Waitlisted",
  withdrawn: "Withdrawn",
};

function escapeCsvField(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build CSV from scoped admin application rows and trigger a browser download. */
export function downloadApplicationsCsv(
  applications: AdminApplicationRow[],
  filenamePrefix = "applications",
): void {
  const headers = ["Name", "Email", "CNIC", "FSC Percentage", "Application Status"];
  const rows = applications.map((app) => [
    app.studentName,
    app.email ?? "",
    app.cnicNumber ?? "",
    app.fscPercentage != null && app.fscPercentage !== "" ? `${app.fscPercentage}%` : "",
    STATUS_LABELS[app.status] ?? app.status,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${filenamePrefix}-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
