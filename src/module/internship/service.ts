import { sendResendMail } from "../../common/utils/resendEmail";
import path from "path";
// import ejs from "ejs";

export async function sendConfirmationMail(
  email: string,
  name: string,
  status: string
) {
  const subject = `Your Internship Application Status: ${status}`;
  // const templatePath = path.join(
  //   __dirname,
  //   "../../common/templates/internshipStatusEmail.ejs"
  // );
  // const html = await ejs.renderFile(templatePath, {
  //   name,
  //   status,
  // });
  await sendResendMail({
    to: email,
    subject,
    html: "",
    // html: await render(<InternshipStatusEmail name={name} status={status} />),
    from: "no-reply@hexonest.com.ng",
  });
  return true;
}
