import nodemailer from "nodemailer";
import { logger } from "../lib/logger";

export async function sendVerificationEmail({
  to,
  fullName,
  token,
}: {
  to: string;
  fullName: string;
  token: string;
}) {
  const appUrl = getAppUrl();
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const hasSmtp =
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!hasSmtp) {
    logger.info(
      { to, fullName, verifyUrl },
      "VERIFICATION_EMAIL — SMTP not configured, link logged for dev use",
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: Number(process.env.SMTP_PORT ?? "587") === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  await transporter.sendMail({
    from: `PakApply <${from}>`,
    to,
    subject: "Verify your PakApply email address",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f0f9ff;border-radius:12px;">
        <div style="background:#fff;border-radius:12px;padding:32px;">
          <h1 style="color:#0284c7;margin:0 0 8px;">PakApply</h1>
          <p style="color:#64748b;font-size:13px;margin:0 0 24px;">Pakistan's College Application Portal</p>
          <p style="color:#1e293b;">Hi ${fullName},</p>
          <p style="color:#334155;line-height:1.6;">
            Welcome to PakApply! Please verify your email address to activate your account.
            This link will expire in <strong>24 hours</strong>.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${verifyUrl}"
               style="background:#0284c7;color:#fff;padding:14px 32px;border-radius:8px;
                      text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
              Verify Email Address
            </a>
          </div>
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
            <p style="color:#92400e;font-size:13px;margin:0;">
              If you did not create a PakApply account, you can safely ignore this email.
            </p>
          </div>
          <p style="color:#94a3b8;font-size:12px;">
            Or copy this link: ${verifyUrl}
          </p>
        </div>
      </div>
    `,
  });
}

function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(",")[0].trim();
    return `https://${domain}`;
  }
  return "http://localhost:80";
}

export async function sendRecommendationInvite({
  to,
  teacherName,
  studentName,
  token,
}: {
  to: string;
  teacherName: string;
  studentName: string;
  token: string;
}) {
  const portalUrl = `${getAppUrl()}/recommendation-portal?token=${token}`;

  const hasSmtp =
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!hasSmtp) {
    logger.info(
      { to, teacherName, studentName, portalUrl },
      "RECOMMENDATION_INVITE — SMTP not configured, link logged for dev use",
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: Number(process.env.SMTP_PORT ?? "587") === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  await transporter.sendMail({
    from: `PakApply <${from}>`,
    to,
    subject: `${studentName} has invited you to submit a recommendation on PakApply`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f0f9ff;border-radius:12px;">
        <div style="background:#fff;border-radius:12px;padding:32px;">
          <h1 style="color:#0284c7;margin:0 0 8px;">PakApply</h1>
          <p style="color:#64748b;font-size:13px;margin:0 0 24px;">Pakistan's College Application Portal</p>
          <p style="color:#1e293b;">Dear ${teacherName},</p>
          <p style="color:#334155;line-height:1.6;">
            <strong>${studentName}</strong> has requested a letter of recommendation from you
            through PakApply. This takes only a few minutes to complete.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${portalUrl}"
               style="background:#0284c7;color:#fff;padding:14px 32px;border-radius:8px;
                      text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
              Submit Recommendation Letter
            </a>
          </div>
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
            <p style="color:#92400e;font-size:13px;margin:0;">
              <strong>Important:</strong> This link is unique to you and can only be used once.
              After submission the link will expire automatically.
            </p>
          </div>
          <p style="color:#94a3b8;font-size:12px;">
            If you did not expect this request, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}
