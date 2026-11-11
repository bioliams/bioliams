import "server-only";

/**
 * Best-effort email through Resend. Without RESEND_API_KEY it does nothing —
 * every message the app sends is also visible in the app, so email is a
 * courtesy, never the only channel. Failures are logged, not thrown: a status
 * change must not fail because a mail server did.
 */
export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "BioLIMS <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) console.error("Email not sent:", res.status, await res.text());
  } catch (err) {
    console.error("Email not sent:", err);
  }
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
