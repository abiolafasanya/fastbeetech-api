import { EmailLayout } from "./layout";
import { Heading, Text } from "@react-email/components";
import * as React from "react";

export const OnboardingEmail = ({ name }: { name: string }) => (
  <EmailLayout preview="Welcome to Marketplace!">
    <Heading as="h2">Hi {name}, welcome to Marketplace 🎉</Heading>
    <Text>
      We're excited to have you on board. Start exploring products, services,
      and more today.
    </Text>
  </EmailLayout>
);
