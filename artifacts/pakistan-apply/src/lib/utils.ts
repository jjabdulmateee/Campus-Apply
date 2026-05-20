import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Build a browser URL for a stored object path (`/objects/uploads/…` or legacy forms). */
export function storageObjectUrl(storedPath: string | null | undefined): string | null {
  if (!storedPath?.trim()) return null;
  const p = storedPath.trim();
  if (p.startsWith("/objects/")) {
    return `/api/storage/objects/${p.slice("/objects/".length)}`;
  }
  if (p.startsWith("objects/")) {
    return `/api/storage/objects/${p.slice("objects/".length)}`;
  }
  return `/api/storage/objects/${p.replace(/^\//, "")}`;
}
