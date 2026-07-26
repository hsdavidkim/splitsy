import "server-only";
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "Splitsy <onboarding@resend.dev>";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Send an email. If RESEND_API_KEY isn't configured, this no-ops but logs the
 * subject + any action link so flows still work in local/dev without email.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  link?: string;
}): Promise<{ sent: boolean }> {
  if (!resend) {
    console.log(
      `[email] (not sent — no RESEND_API_KEY) to=${opts.to} subject="${opts.subject}"` +
        (opts.link ? ` link=${opts.link}` : "")
    );
    return { sent: false };
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { sent: true };
  } catch (e) {
    console.error("[email] send failed:", e);
    return { sent: false };
  }
}

// --- Branded HTML layout -----------------------------------------------------

const BRAND = "#0d9488";
const INK = "#10151c";
const MUTED = "#6b7684";
const BORDER = "#e4e7ec";
const BG = "#f6f7f9";

/** Wraps content in a responsive, email-client-safe branded shell. */
function layout(opts: {
  preheader: string;
  heading: string;
  body: string; // inner HTML for the card body
}): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${opts.heading}</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
  <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${opts.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${BRAND};border-radius:10px;width:34px;height:34px;text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#ffffff;">S</td>
                  <td style="padding-left:10px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:${BRAND};">Splitsy</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border:1px solid ${BORDER};border-radius:16px;padding:32px;">
              <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;color:${INK};">${opts.heading}</h1>
              ${opts.body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${MUTED};">
              Splitsy — modular expense splitting.<br />
              If you weren't expecting this email, you can safely ignore it.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Bulletproof-ish CTA button. */
function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
    <tr>
      <td align="center" style="border-radius:10px;background:${BRAND};">
        <a href="${href}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function para(html: string): string {
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${MUTED};">${html}</p>`;
}

function fallbackLink(href: string): string {
  return `<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">Or paste this link into your browser:<br /><a href="${href}" style="color:${BRAND};word-break:break-all;">${href}</a></p>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

// --- Template + send helpers -------------------------------------------------

export async function sendVerificationEmail(to: string, link: string) {
  const html = layout({
    preheader: "Confirm your email to finish setting up Splitsy.",
    heading: "Confirm your email",
    body:
      para("Welcome to Splitsy! Tap the button below to confirm your email address and finish setting up your account.") +
      button(link, "Confirm email") +
      para("This link expires in 7 days.") +
      fallbackLink(link),
  });
  return sendEmail({ to, subject: "Confirm your email · Splitsy", html, link });
}

export async function sendPasswordResetEmail(to: string, link: string) {
  const html = layout({
    preheader: "Reset your Splitsy password.",
    heading: "Reset your password",
    body:
      para("We received a request to reset your Splitsy password. Tap below to choose a new one.") +
      button(link, "Reset password") +
      para("This link expires in 1 hour. If you didn't request this, you can ignore this email — your password won't change.") +
      fallbackLink(link),
  });
  return sendEmail({ to, subject: "Reset your password · Splitsy", html, link });
}

export async function sendGroupInviteEmail(opts: {
  to: string;
  groupName: string;
  inviterName: string;
  link: string;
  existingUser: boolean;
}) {
  const group = escapeHtml(opts.groupName);
  const inviter = escapeHtml(opts.inviterName);
  const html = layout({
    preheader: `${inviter} invited you to the "${group}" group on Splitsy.`,
    heading: `You're invited to join ${group}`,
    body:
      para(`<strong style="color:${INK};">${inviter}</strong> invited you to split shared expenses in <strong style="color:${INK};">${group}</strong> on Splitsy.`) +
      button(
        opts.link,
        opts.existingUser ? "View the group" : "Accept invitation"
      ) +
      para(
        opts.existingUser
          ? "You already have a Splitsy account — just log in to see the group."
          : "You'll set a password and join the group in one step. No separate sign-up needed."
      ) +
      para("This invitation expires in 7 days.") +
      fallbackLink(opts.link),
  });
  return sendEmail({
    to: opts.to,
    // Subject is plain text — use the raw (unescaped) names here.
    subject: `${opts.inviterName} invited you to ${opts.groupName} · Splitsy`,
    html,
    link: opts.link,
  });
}

/** Exposed for a local preview route (renders the invite email in a browser). */
export function renderInvitePreview() {
  return layout({
    preheader: 'Alex invited you to the "Apartment" group on Splitsy.',
    heading: "You're invited to join Apartment",
    body:
      para(`<strong style="color:${INK};">Alex Rivera</strong> invited you to split shared expenses in <strong style="color:${INK};">Apartment</strong> on Splitsy.`) +
      button("https://example.com/invite/preview", "Accept invitation") +
      para("You'll set a password and join the group in one step. No separate sign-up needed.") +
      para("This invitation expires in 7 days.") +
      fallbackLink("https://example.com/invite/preview"),
  });
}
