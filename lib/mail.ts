import { Resend } from "resend";

// Constructed lazily so a missing key breaks sending, not app startup.
let client: Resend | null = null;

const MAIL_FROM =
  process.env.MAIL_FROM || "Insightify <insightify@saugat030.com.np>";

function getClient(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    client = new Resend(key);
  }
  return client;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const { data, error } = await getClient().emails.send({
    from: MAIL_FROM,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  if (error) {
    // Surfaced to the caller so a failed send fails the request rather than
    // silently leaving the user without a code.
    throw new Error(`Resend rejected the message: ${error.message}`);
  }
  if (!data?.id) throw new Error("Resend returned no message id");
}
