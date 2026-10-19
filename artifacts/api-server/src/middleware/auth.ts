import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE_NAME } from "../lib/sessionCookie";

export interface AuthUser {
  userId: number;
  studentId: string | null;
  email: string;
  fullName: string;
  role: "student" | "admin" | "counselor";
  universityId?: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const _jwtSecret =
  process.env.JWT_SECRET ?? process.env.SESSION_SECRET;

if (!_jwtSecret) {
  throw new Error(
    "JWT_SECRET is required. Set it in your .env file at the repo root. " +
      "Generate a value with: " +
      'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
  );
}

export const JWT_SECRET: string = _jwtSecret;

function readSessionToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  return typeof cookieToken === "string" && cookieToken.length > 0
    ? cookieToken
    : undefined;
}

function verifySessionToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}

export function verifyJWT(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = readSessionToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    req.user = verifySessionToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalJWT(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = readSessionToken(req);
  if (token) {
    try {
      req.user = verifySessionToken(token);
    } catch {
      // ignore invalid token in optional mode
    }
  }
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = readSessionToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const user = verifySessionToken(token);
    if (user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Strict guard for student-owned resources (profile, documents, applications,
 * uploads). Requires a valid session AND a student account with a studentId —
 * admins and counselors are rejected with 403 instead of falling through to a
 * thrown error. There is intentionally no demo/default-student fallback.
 */
export function requireStudent(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  verifyJWT(req, res, () => {
    if (req.user?.role !== "student" || !req.user.studentId) {
      res.status(403).json({ error: "Student account required" });
      return;
    }
    next();
  });
}

export function requireCounselor(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = readSessionToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const user = verifySessionToken(token);
    if (user.role !== "counselor") {
      res.status(403).json({ error: "Counselor access required" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Returns the authenticated student's ID.
 *
 * Throws if the request was not authenticated. Always mount routes that call
 * this helper behind `verifyJWT` (or `requireAdmin`) — never `optionalJWT`.
 */
export function getStudentId(req: Request): string {
  const sid = req.user?.studentId;
  if (!sid) {
    throw new Error(
      "getStudentId() called without an authenticated user. " +
        "Mount this route behind verifyJWT.",
    );
  }
  return sid;
}
