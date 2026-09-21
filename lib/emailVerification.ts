import { sendMail } from "@/lib/mail";
import {
  generateOtp,
  hashOtp,
  otpEmail,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
} from "@/lib/otp";

type UserDoc = any; // eslint-disable-line @typescript-eslint/no-explicit-any

// Stores a fresh code then mails it. Saving first means a failed send leaves a
// usable code behind rather than a code the user never receives.
export async function issueEmailOtp(
  user: UserDoc
): Promise<{ sent: boolean; retryAfterMs: number }> {
  const last = user.otpLastSentAt ? new Date(user.otpLastSentAt).getTime() : 0;
  const elapsed = Date.now() - last;
  if (elapsed < OTP_RESEND_COOLDOWN_MS) {
    return { sent: false, retryAfterMs: OTP_RESEND_COOLDOWN_MS - elapsed };
  }

  const code = generateOtp();
  user.otpHash = await hashOtp(code);
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  await user.save();

  await sendMail({ to: user.email, ...otpEmail(code) });
  return { sent: true, retryAfterMs: 0 };
}

export function clearOtp(user: UserDoc): void {
  user.otpHash = null;
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
}
