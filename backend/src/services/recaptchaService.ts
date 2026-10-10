import { config } from '../config';

// ---------------------------------------------------------------------------
// Google reCAPTCHA v2 verification. Keys come from .env only — no hardcoded
// production keys. When no secret is configured the check is skipped so the
// whole registration flow remains testable locally.
// ---------------------------------------------------------------------------

export async function verifyRecaptcha(token: string | undefined, ip: string): Promise<boolean> {
  if (!config.recaptcha.secretKey) {
    // reCAPTCHA not configured — allow through (documented dev behaviour)
    return true;
  }
  if (!token) return false;
  try {
    const params = new URLSearchParams({
      secret: config.recaptcha.secretKey,
      response: token,
      remoteip: ip,
    });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: params,
    });
    const json = (await res.json()) as { success: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}
