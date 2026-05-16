/**
 * lib/notifications/templates.ts
 *
 * Email template helpers for Ray's Weekly Scam Watch.
 * Does not require Resend to be configured — build-safe.
 * Templates return plain objects so they can be used with any email provider.
 */

export interface EmailTemplate {
  subject: string
  previewText: string
  /** Plain-text body */
  text: string
  /** Minimal HTML body (can be enhanced with a proper renderer later) */
  html: string
}

/**
 * Generate the weekly scam watch email template.
 * @param unsubscribeUrl - Full URL to the one-click unsubscribe endpoint.
 * @param checkUrl - URL to the new-check page.
 */
export function buildWeeklyScamWatchTemplate(
  unsubscribeUrl: string,
  checkUrl: string
): EmailTemplate {
  const subject = "Ray's Weekly Scam Watch"
  const previewText = 'Common scams and red flags to watch for this week.'

  const text = `Ray's Weekly Scam Watch
${previewText}

Hi,

Here are a few scam patterns Ray is watching this week:

1. Fake remote job checks
   Be careful with job offers that send a check for equipment and ask you to send money back. The check will bounce — and you will owe the full amount.

2. Toll or delivery payment links
   Watch for "final notice" texts that pressure you to pay through an unfamiliar link. Real toll agencies and couriers will never ask for card details via text.

3. Suspicious bills or fees
   Ask for itemization, written policy, and official payment channels before paying unexpected charges. Legitimate companies are happy to provide all three.

Ray's quick rule:
Before you click, pay, or reply — check it first.

Try a free check:
${checkUrl}

---
Ray can be wrong. Results are informational only. Always verify through official sources.

Unsubscribe: ${unsubscribeUrl}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#141414;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:13px;color:#4ade80;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">CheckRay</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">Ray's Weekly Scam Watch</h1>
              <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.45);">${previewText}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6;">Hi,</p>
              <p style="margin:0 0 24px;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6;">Here are a few scam patterns Ray is watching this week:</p>

              <!-- Item 1 -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.06);padding:16px 20px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#ffffff;">1. Fake remote job checks</p>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.6;">Be careful with job offers that send a check for equipment and ask you to send money back. The check will bounce — and you will owe the full amount.</p>
                  </td>
                </tr>
              </table>

              <!-- Item 2 -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.06);padding:16px 20px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#ffffff;">2. Toll or delivery payment links</p>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.6;">Watch for "final notice" texts that pressure you to pay through an unfamiliar link. Real toll agencies and couriers will never ask for card details via text.</p>
                  </td>
                </tr>
              </table>

              <!-- Item 3 -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.06);padding:16px 20px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#ffffff;">3. Suspicious bills or fees</p>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.6;">Ask for itemization, written policy, and official payment channels before paying unexpected charges. Legitimate companies are happy to provide all three.</p>
                  </td>
                </tr>
              </table>

              <!-- Ray tip -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td style="background:rgba(74,222,128,0.08);border-radius:12px;border:1px solid rgba(74,222,128,0.2);padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#4ade80;text-transform:uppercase;letter-spacing:0.05em;">Ray's quick rule</p>
                    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);line-height:1.6;">Before you click, pay, or reply — check it first.</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;">
                    <a href="${checkUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Check with Ray →</a>
                  </td>
                </tr>
              </table>

              <!-- Disclaimer -->
              <p style="margin:0 0 20px;font-size:11px;color:rgba(255,255,255,0.25);line-height:1.6;">Ray can be wrong. Results are informational only and not legal, financial, medical, or professional advice. Always verify important decisions through official sources.</p>

              <!-- Unsubscribe -->
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">
                You're receiving this because you opted in to Ray's Weekly Scam Watch.<br />
                <a href="${unsubscribeUrl}" style="color:rgba(255,255,255,0.35);text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, previewText, text, html }
}
