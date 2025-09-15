import { Heading, Section, Text, Img } from "@react-email/components";
import { EmailLayout } from "./layout";

export const InternshipStatusEmail = ({
  name,
  status,
}: {
  name: string;
  status: string;
}) => {
  const preview = `Your internship application status: ${status}`;

  return (
    <EmailLayout preview={preview}>
      <Section>
        <Text>Hi {name},</Text>
        <Text style={{ marginTop: 8 }}>
          Your internship application status is now:
        </Text>
        <Heading
          as="h3"
          style={{
            fontSize: 18,
            color: "#2563eb",
            fontWeight: 600,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          {status?.toUpperCase()}
        </Heading>

        <Text>
          Thank you for applying to Hexonest! We appreciate your interest and
          will be in touch soon.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default InternshipStatusEmail;
