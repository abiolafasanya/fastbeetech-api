// import { Resend } from "@resend/node";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendResendMail({
  to,
  subject,
  html,
  from,
}: SendMailOptions) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }
  const sender = from || "no-reply@hexonest.com.ng";
  return resend.emails.send({
    from: sender,
    to,
    subject,
    html,
  });
}
