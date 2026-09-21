import { sendMail } from "@/lib/mail";
import {
  generateOtp,
  hashOtp,
  otpMatches,
  otpEmail,
  resetOtpEmail,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
} from "@/lib/otp";

export type OtpPurpose = "verify" | "reset";

type UserDoc = any; // eslint-disable-line @typescript-eslint/no-explicit-any

// One message for every failure. Distinguishing them — "no code pending",
// "wrong purpose", "too many attempts" — would turn this into an account oracle
// and undo F7.
const INVALID =
  "Invalid or expired code. Request a new one if you keep having trouble.";

// Stores a fresh code then mails it. Saving first means a failed send leaves a
// usable code behind rather than a code the user never receives.
export async function issueOtp(
  user: UserDoc,
  purpose: OtpPurpose
): Promise<{ sent: boolean; retryAfterMs: number }> {
  // The cooldown throttles repeats of the SAME request. A different purpose is
  // a different intent — someone who just registered must still be able to ask
  // for a password reset without waiting out the verification cooldown.
  const last = user.otpLastSentAt ? new Date(user.otpLastSentAt).getTime() : 0;
  const elapsed = Date.now() - last;
  if (elapsed < OTP_RESEND_COOLDOWN_MS && user.otpPurpose === purpose) {
    return { sent: false, retryAfterMs: OTP_RESEND_COOLDOWN_MS - elapsed };
  }

  const code = generateOtp();
  user.otpHash = await hashOtp(code);
  user.otpPurpose = purpose;
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  await user.save();

  const body = purpose === "reset" ? resetOtpEmail(code) : otpEmail(code);
  await sendMail({ to: user.email, ...body });
  return { sent: true, retryAfterMs: 0 };
}

export function clearOtp(user: UserDoc): void {
  user.otpHash = null;
  user.otpPurpose = null;
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
}

// The only place a code is checked, so the purpose comparison cannot be
// forgotten at a call site. Does NOT save — the caller saves once, together
// with whatever the code authorised.
export async function consumeOtp(
  user: UserDoc,
  code: string,
  purpose: OtpPurpose
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fail = async () => {
    await user.save();
    return { ok: false as const, error: INVALID };
  };

  if (!user.otpHash || !user.otpExpiresAt || user.otpPurpose !== purpose) {
    return { ok: false, error: INVALID };
  }
  if (new Date(user.otpExpiresAt) < new Date()) {
    clearOtp(user);
    return fail();
  }
  if ((user.otpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    clearOtp(user);
    return fail();
  }
  if (!(await otpMatches(String(code), user.otpHash))) {
    user.otpAttempts = (user.otpAttempts ?? 0) + 1;
    return fail();
  }

  clearOtp(user);
  return { ok: true };
}
