import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  userId: number;
  studentId: string;
  email: string;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const JWT_SECRET =
  process.env.SESSION_SECRET ?? "pakapp-dev-secret-change-in-prod";

export function verifyJWT(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const token = auth.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET) as AuthUser;
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
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(auth.slice(7), JWT_SECRET) as AuthUser;
    } catch {
      // ignore invalid token in optional mode
    }
  }
  next();
}

/** Returns the real student ID if authenticated, falls back to demo account. */
export function getStudentId(req: Request): string {
  return req.user?.studentId ?? "demo-student-001";
}
