// // server/utils/sendEmail.tsx
import { render } from "@react-email/render";
import { Resend } from "resend";

import { EmailLog } from "../../module/emails/model";
import { User } from "../../module/user/model";

import { OnboardingEmail } from "../../shared/emails/OnboardingEmail";
import { VerifyEmail } from "../../shared/emails/VerifyEmail";
import { ResetPasswordEmail } from "../../shared/emails/ResetPasswordEmail";
import { PhoneVerificationEmail } from "../../shared/emails/PhoneVerificationEmail";
import { StoreCreatedEmail } from "../../shared/emails/StoreCreatedEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

// Define the type for email options
interface EmailOptions {
  to: string;
  type:
    | "onboarding"
    | "verify"
    | "reset-password"
    | "phone-verification"
    | "store-created";
  data: any;
}

export async function sendEmail({ to, type, data }: EmailOptions) {
  let html: string = "";
  let subject: string = "";
  
  try {
    // Build HTML + subject
    switch (type) {
      case "onboarding":
        html = await render(<OnboardingEmail name={data.name} />);
        subject = "Welcome to Marketplace!";
        break;
        case "verify":
          html = await render(
            <VerifyEmail
            name={data.name}
            verificationUrl={data.verificationUrl}
            />
          );
        subject = "Verify Your Email";
        break;
        case "reset-password":
        html = await render(<ResetPasswordEmail resetUrl={data.resetUrl} />);
        subject = "Reset Your Password";
        break;
        case "phone-verification":
        html = await render(<PhoneVerificationEmail code={data.code} />);
        subject = "Your Phone Verification Code";
        break;
      case "store-created":
        html = await render(
          <StoreCreatedEmail
            storeName={data.storeName}
            dashboardUrl={data.dashboardUrl}
          />
        );
        subject = "Your Store Has Been Created!";
        break;
        default:
          throw new Error(`Unsupported email type: ${type}`);
        }
        console.log("Resend initialized with API key:", process.env.RESEND_API_KEY);
        
        const result = await resend.emails.send({
          from: "Marketplace <onboarding@resend.dev>",
          to,
      subject,
      html,
    });

    // Log email

    // Try to find the user (optional)
    const user = await User.findOne({ email: to });

    await EmailLog.create({
      user: user?._id,
      to,
      type,
      subject,
      status: "sent",
      messageId: result?.data?.id,
    });

    console.info(`[EMAIL:SUCCESS] Sent "${type}" email to ${to}.`);

    return result;
  } catch (error: any) {
    const user = await User.findOne({ email: to });

    await EmailLog.create({
      user: user?._id,
      to,
      type,
      subject,
      status: "failed",
      error: error?.message || "Unknown error",
    });

    console.error(`[EMAIL:ERROR] Failed to send "${type}" email to ${to}.`, {
      error: error?.message || error,
    });

    throw error;
  }
}
