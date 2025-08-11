import { EmailLayout } from "./layout";
import { Heading, Text, Link } from "@react-email/components";
import * as React from "react";

export const ResetPasswordEmail = ({ resetUrl }: { resetUrl: string }) => (
  <EmailLayout preview="Reset your password">
    <Heading as="h2">Reset Your Password</Heading>
    <Text>
      Click the button below to reset your password. This link will expire in 15
      minutes.
    </Text>
    <Link
      href={resetUrl}
      style={{
        background: "#ef4444",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: "6px",
        textDecoration: "none",
      }}
    >
      Reset Password
    </Link>
    <Text>
      If you didn’t request a password reset, you can ignore this email.
    </Text>
  </EmailLayout>
);
