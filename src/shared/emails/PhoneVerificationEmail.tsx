import { EmailLayout } from "./layout";
import { Heading, Text } from "@react-email/components";
import * as React from "react";

export const PhoneVerificationEmail = ({ code }: { code: string }) => (
  <EmailLayout preview="Your phone verification code">
    <Heading as="h2">Phone Number Verification</Heading>
    <Text>
      Your OTP code is: <strong>{code}</strong>
    </Text>
    <Text>
      This code will expire in 5 minutes. Do not share it with anyone.
    </Text>
  </EmailLayout>
);
