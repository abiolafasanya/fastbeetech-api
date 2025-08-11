import { EmailLayout } from "./layout";
import { Heading, Text, Link } from "@react-email/components";
import * as React from "react";

export const StoreCreatedEmail = ({
  storeName,
  dashboardUrl,
}: {
  storeName: string;
  dashboardUrl: string;
}) => (
  <EmailLayout preview="Your store has been created!">
    <Heading as="h2">🎉 Store Created: {storeName}</Heading>
    <Text>
      Your store is now live. You can manage listings, view inquiries, and track
      analytics.
    </Text>
    <Link
      href={dashboardUrl}
      style={{
        background: "#10b981",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: "6px",
        textDecoration: "none",
      }}
    >
      Go to Dashboard
    </Link>
  </EmailLayout>
);
