import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

// Cost 10 rather than the password hook's 12: the attempt cap is what actually
// stops guessing, and codes die in 10 minutes regardless.
const OTP_BCRYPT_COST = 10;

// randomInt is CSPRNG-backed — Math.random would make codes predictable.
export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, OTP_BCRYPT_COST);
}

export async function otpMatches(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export function otpEmail(code: string): { subject: string; html: string; text: string } {
  return {
    subject: `${code} is your Insightify verification code`,
    text: `Your Insightify verification code is ${code}. It expires in ${OTP_TTL_MS / 60000} minutes. If you did not request it, you can ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px">
  <h2 style="margin:0 0 16px">Verify your email</h2>
  <p style="margin:0 0 20px;color:#444">Enter this code to finish setting up your Insightify account:</p>
  <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:0 0 20px">${code}</p>
  <p style="margin:0;color:#666;font-size:13px">It expires in ${OTP_TTL_MS / 60000} minutes. If you did not request it, you can ignore this email.</p>
</div>`,
  };
}

export function resetOtpEmail(code: string): { subject: string; html: string; text: string } {
  return {
    subject: `${code} is your Insightify password reset code`,
    text: `Use the code ${code} to set a new Insightify password. It expires in ${OTP_TTL_MS / 60000} minutes. If you did not request this, ignore this email — your password has not changed.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px">
  <h2 style="margin:0 0 16px">Reset your password</h2>
  <p style="margin:0 0 20px;color:#444">Enter this code to choose a new password:</p>
  <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:0 0 20px">${code}</p>
  <p style="margin:0;color:#666;font-size:13px">It expires in ${OTP_TTL_MS / 60000} minutes. If you did not request this, ignore this email — your password has not changed.</p>
</div>`,
  };
}

export function noPasswordSetEmail(): { subject: string; html: string; text: string } {
  return {
    subject: "Signing in to Insightify",
    text: "Someone asked to reset the password for this Insightify account, but it signs in with Google and has no password set. Use 'Continue with Google' to sign in. If this wasn't you, you can ignore this email.",
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px">
  <h2 style="margin:0 0 16px">You haven't set a password</h2>
  <p style="margin:0 0 12px;color:#444">Someone asked to reset the password for this account, but it signs in with Google and has no password set.</p>
  <p style="margin:0 0 12px;color:#444">Use <strong>Continue with Google</strong> on the sign-in page instead.</p>
  <p style="margin:0;color:#666;font-size:13px">If this wasn't you, you can safely ignore this email.</p>
</div>`,
  };
}

export function accountExistsEmail(): { subject: string; html: string; text: string } {
  return {
    subject: "You already have an Insightify account",
    text: "Someone tried to register an Insightify account with this email address. You already have one, so nothing has changed. If this was you, sign in instead. If it wasn't, you can ignore this email.",
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px">
  <h2 style="margin:0 0 16px">You already have an account</h2>
  <p style="margin:0 0 12px;color:#444">Someone tried to register with this email address. You already have an Insightify account, so nothing has changed.</p>
  <p style="margin:0;color:#666;font-size:13px">If this was you, sign in instead. If it wasn't, you can safely ignore this email.</p>
</div>`,
  };
}
