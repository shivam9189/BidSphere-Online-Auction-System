import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST,
    port: 465,
    secure: true,
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});


transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP Error:", error);
  } else {
    console.log("SMTP Server is ready");
  }
});


export default transporter;