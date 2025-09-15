import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Img,
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
          padding: "24px",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.07)",
          maxWidth: 480,
          margin: "40px auto",
        }}
      >
        {/* Header (logo + brand) */}
        <Section style={{ textAlign: "center", marginBottom: 12 }}>
          <Img
            src="https://hexonest.com.ng/hexonest-logo-light.svg"
            alt="Hexonest Logo"
            width={160}
            height={40}
            style={{ display: "block", margin: "0 auto 12px auto" }}
          />
          {/* <Text style={{ fontSize: 18, fontWeight: 600, color: "#0e1a2b" }}>
            Hexonest
          </Text> */}
        </Section>

        <Section>{children}</Section>

        {/* Footer / contact */}
        <Section style={{ marginTop: 24, textAlign: "center" }}>
          <Text style={{ fontSize: 13, color: "#555" }}>
            Contact us: <span style={{ color: "#2563eb" }}>+2349134438510</span>{" "}
            |<span style={{ color: "#2563eb" }}> hexonestltd@gmail.com</span>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
