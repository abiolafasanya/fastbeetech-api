import fs from "fs";
import path from "path";
import React from "react";
import { render } from "@react-email/render";
import InternshipStatusEmail from "../src/shared/emails/InternshipStatusEmail";

async function main() {
  const outDir = path.resolve(__dirname, "..", "tmp");
  fs.mkdirSync(outDir, { recursive: true });

  const html = await render(
    <InternshipStatusEmail name="Ada" status="Accepted" />
  );

  const outPath = path.join(outDir, "internship-preview.html");
  fs.writeFileSync(outPath, html, "utf8");
  console.log(`Wrote preview to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
