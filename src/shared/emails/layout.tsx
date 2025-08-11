import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export const EmailLayout = ({
  children,
  preview,
}: {
  children: React.ReactNode;
  preview: string;
}) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Body
      style={{ backgroundColor: "#f9fafb", fontFamily: "Arial, sans-serif" }}
    >
      <Container
        style={{
          padding: "20px",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <Section>{children}</Section>
        <Section style={{ marginTop: "20px", fontSize: "12px", color: "#888" }}>
          <Text>Fastbeetech Inc. • Nigeria</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
