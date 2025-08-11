import { EmailLayout } from "./layout";
import { Heading, Text, Link } from "@react-email/components";
import * as React from "react";

export const VerifyEmail = ({
  name,
  verificationUrl,
}: {
  name: string;
  verificationUrl: string;
}) => (
  <EmailLayout preview="Verify your email to get started">
    <Heading as="h2">Hello {name}, confirm your email</Heading>
    <Text>
      Click the button below to verify your email address and activate your
      account.
    </Text>
    <Link
      href={verificationUrl}
      style={{
        background: "#2563eb",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: "6px",
        textDecoration: "none",
      }}
    >
      Verify Email
    </Link>
  </EmailLayout>
);
