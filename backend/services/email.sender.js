import { Verification_Email_Template } from "../email-templates/verify_email.template.js"
import { Welcome_Email_Template } from "../email-templates/welcome_email.template.js"
import { Outbid_Email_Template } from "../email-templates/outbid_email.template.js"
import { Reset_Password_Email_Template } from "../email-templates/restPwd_email.template.js" 
import { Auction_Winner_Email_Template } from "../email-templates/auctionWinner_email.template.js"
import { COD_Selected_Email_Template } from "../email-templates/cod_email.template.js"
import { UPI_Selected_Email_Template } from "../email-templates/upi_email.template.js"
import { Payment_Verified_Email_Template } from "../email-templates/paymentVerification_email.template.js"
import { Payment_Rejection_Template } from "../email-templates/paymentRejection_email.template.js"
import { PAYMENT_Verification_Request_Sent_Template } from "../email-templates/paymentVerifyRequest_email.template.js"
import { Seller_Winner_Notification_Template } from "../email-templates/sellerNotification_email.template.js"
import QRCode from "qrcode";
import dotenv from "dotenv";
dotenv.config();
// const SendVerificationCode = async (email, verificationCode) => {
//     try {
//         const response = await transporter.sendMail({
//             from: process.env.BREVO_FROM_EMAIL,
//             to: email,
//             subject: "Verify your Email, Welcome to BidSphere",
//             html: Verification_Email_Template.replace("{verificationCode}", verificationCode),
//         });

//         console.log("Verification Email send successfully", response);
//     } catch (error) {
//         console.log("catch error", error);
//     }
// }

 const SendVerificationCode = async (email, verificationCode) => {
  try {
    const body = {
      sender: { email: process.env.BREVO_FROM_EMAIL },
      to: [{ email }],
      subject: "Verify your Email, Welcome to BidSphere",
      htmlContent: Verification_Email_Template.replace("{verificationCode}", verificationCode)
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    console.log("Verification email sent:", await response.json());

  } catch (error) {
    console.log("Email error:", error);
  }
};

// const WelcomeEmail = async (email, name) => {
//     try {
//         const response = await transporter.sendMail({
//             from: process.env.BREVO_FROM_EMAIL,
//             to: email,
//             subject: "Welcome to BidSphere",
//             html:  Welcome_Email_Template.replace("{name}", name)
//         });

//         console.log("Welcome Email send successfully", response);
//     } catch (error) {
//         console.log("catch error", error);
//     }
// }

const WelcomeEmail = async (email, name) => {
  try {
    const body = {
      sender: { email: process.env.BREVO_FROM_EMAIL },
      to: [{ email }],
      subject: "Welcome to BidSphere",
      htmlContent: Welcome_Email_Template.replace("{name}", name)
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    console.log("Welcome email sent:", await response.json());
  } catch (error) {
    console.log("catch error", error);
  }
};


// const SendOutBidEmail= async (email, itemName, currentBid, maxLimit, auctionId, title) =>{
//     try{
//         const htmlContent = Outbid_Email_Template
//             .replace("{itemName}", itemName)
//             .replace("{auctionTitle}", title)
//             .replace("{currentBid}", currentBid)
//             .replace("{maxLimit}", maxLimit)
//             .replaceAll("{auctionId}", auctionId);

//         const response = await transporter.sendMail({
//           from: process.env.BREVO_FROM_EMAIL,
//           to: email,
//           subject: `You've Been Outbid on ${itemName} in ${title} - BidSphere`,
//           html: htmlContent,
//         });

//         console.log("Outbid email sent successfully", response);
//     } catch (error) {
//         console.log("Error sending outbid email", error);
//     }
// }

const SendOutBidEmail = async (email, itemName, currentBid, maxLimit, auctionId, title) => {
  try {
    const htmlContent = Outbid_Email_Template
      .replace("{itemName}", itemName)
      .replace("{auctionTitle}", title)
      .replace("{currentBid}", currentBid)
      .replace("{maxLimit}", maxLimit)
      .replaceAll("{auctionId}", auctionId);

    const body = {
      sender: { email: process.env.BREVO_FROM_EMAIL },
      to: [{ email }],
      subject: `You've Been Outbid on ${itemName} in ${title} - BidSphere`,
      htmlContent
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    console.log("Outbid email sent:", await response.json());
  } catch (error) {
    console.log("Error sending outbid email:", error);
  }
};


// const SendResetPwdEmail = async (email, resetPwdLink) => {
//   try {
//     const response = await transporter.sendMail({
//       from: process.env.BREVO_FROM_EMAIL,
//       to: email,
//       subject: "Reset your BidSphere Password",
//       html: Reset_Password_Email_Template.replace("{resetLink}", resetPwdLink)
//     });

//     console.log("Email sent successfully", response);
//   } catch (error) {
//     console.log("catch error", error);
//   }
// };

const SendResetPwdEmail = async (email, resetPwdLink) => {
  try {
    const body = {
      sender: { email: process.env.BREVO_FROM_EMAIL },
      to: [{ email }],
      subject: "Reset your BidSphere Password",
      htmlContent: Reset_Password_Email_Template.replace("{resetLink}", resetPwdLink)
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    console.log("Reset password email sent:", await response.json());
  } catch (error) {
    console.log("catch error", error);
  }
};


// const SendAuctionWinnerEmail = async (email, name, auctionName) => {
//     try {
//         const htmlContent = Auction_Winner_Email_Template
//             .replace("{name}", name)
//             .replace("{auctionName}", auctionName)

//         const response = await transporter.sendMail({
//             from: process.env.BREVO_FROM_EMAIL,
//             to: email,
//             subject: "You Won the Auction! Choose Your Payment Method",
//             html: htmlContent,
//         });

//         console.log("Auction winner mail sent successfully:", response);
//     } catch (error) {
//         console.log("Auction winner mail error:", error);
//     }
// };

const SendAuctionWinnerEmail = async (email, name, auctionName, auctionId) => {
  try {
    const htmlContent = Auction_Winner_Email_Template
      .replace("{name}", name)
      .replace("{auctionName}", auctionName)
      .replaceAll("{auctionId}", auctionId);

    const body = {
      sender: { email: process.env.BREVO_FROM_EMAIL },
      to: [{ email }],
      subject: "You Won the Auction! Choose Your Payment Method",
      htmlContent
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    console.log("Auction winner email sent:", await response.json());
  } catch (error) {
    console.log("Auction winner mail error:", error);
  }
};


// const SendCODSelectedEmail = async (email, name, auctionName) => {
//     try {
//         const htmlContent = COD_Selected_Email_Template
//             .replace("{name}", name)
//             .replace("{auctionName}", auctionName);

//         const response = await transporter.sendMail({
//             from: process.env.BREVO_FROM_EMAIL,
//             to: email,
//             subject: "COD Payment Confirmed – Your Order is Out for Delivery",
//             html: htmlContent,
//         });

//         console.log("COD selected email sent successfully:", response);
//     } catch (error) {
//         console.log("COD selected email error:", error);
//     }
// };

const SendCODSelectedEmail = async (email, name, auctionName) => {
  try {
    const htmlContent = COD_Selected_Email_Template
      .replace("{name}", name)
      .replace("{auctionName}", auctionName);

    const body = {
      sender: { email: process.env.BREVO_FROM_EMAIL },
      to: [{ email }],
      subject: "COD Payment Confirmed – Your Order is Out for Delivery",
      htmlContent
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    console.log("COD selected email sent:", await response.json());
  } catch (error) {
    console.log("COD selected email error:", error);
  }
};


// const SendUPISelectedEmail = async (email, name, auctionName, upiLink, amount) => {
//     try {
//         const qrBuffer = await QRCode.toBuffer(upiLink);

//         const htmlContent = UPI_Selected_Email_Template
//             .replace("{name}", name)
//             .replace("{auctionName}", auctionName)
//             .replace("{upiLink}", upiLink)
//             .replace("{amount}", amount)
//             .replace("{qrCode}", `<img src="cid:qrimage@bidsphere" />`);

//         const response = await transporter.sendMail({
//             from: process.env.BREVO_FROM_EMAIL,
//             to: email,
//             subject: "UPI Payment Details for Your Auction Order",
//             html: htmlContent,
//             attachments: [
//                 {
//                     filename: "qr.png",
//                     content: qrBuffer,
//                     cid: "qrimage@bidsphere"
//                 }
//             ]
//         });

//         console.log("UPI selected email sent successfully:", response);
//     } catch (error) {
//         console.log("UPI selected email error:", error);
//     }
// };

const SendUPISelectedEmail = async (email, name, auctionName, upiLink, amount) => {
  try {
    const qrBuffer = await QRCode.toBuffer(upiLink);
    const qrBase64 = qrBuffer.toString("base64");

    const htmlContent = UPI_Selected_Email_Template
      .replace("{name}", name)
      .replace("{auctionName}", auctionName)
      .replace("{upiLink}", upiLink)
      .replace("{amount}", amount)
      .replace("{qrCode}", `<img src="cid:qrimage@bidsphere" />`);

    const body = {
      sender: { email: process.env.BREVO_FROM_EMAIL },
      to: [{ email }],
      subject: "UPI Payment Details for Your Auction Order",
      htmlContent,
      attachment: [
        {
          name: "qr.png",
          content: qrBase64,
        }
      ]
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    console.log("UPI selected email sent:", await response.json());
  } catch (error) {
    console.log("UPI selected email error:", error);
  }
};


// const SendPaymentVerifiedEmail = async (email, name, auctionName) => {
//     try {
//         const htmlContent = Payment_Verified_Email_Template
//             .replace("{name}", name)
//             .replace("{auctionName}", auctionName)

//         const response = await transporter.sendMail({
//             from: process.env.BREVO_FROM_EMAIL,
//             to: email,
//             subject: "Payment Verified – Your Order is Confirmed",
//             html: htmlContent,
//         });

//         console.log("Payment verified email sent successfully:", response);
//     } catch (error) {
//         console.log("Payment verified email error:", error);
//     }
// };

const SendPaymentVerifiedEmail = async (email, name, auctionName) => {
  try {
    const htmlContent = Payment_Verified_Email_Template
      .replace("{name}", name)
      .replace("{auctionName}", auctionName);

    const body = {
      sender: { email: process.env.BREVO_FROM_EMAIL },
      to: [{ email }],
      subject: "Payment Verified – Your Order is Confirmed",
      htmlContent
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    console.log("Payment verified email sent:", await response.json());
  } catch (error) {
    console.log("Payment verified email error:", error);
  }
};


// const SendPaymentRejection = async (email, reason) => {
//     try {
//         const htmlContent = Payment_Rejection_Template
//             .replace("{reason}", reason)

//         const response = await transporter.sendMail({
//             from: process.env.BREVO_FROM_EMAIL,
//             to: email,
//             subject: "Payment Failed – Action Required",
//             html: htmlContent,
//         });

//         console.log("Payment rejection email sent successfully", response);
//     } catch (error) {
//         console.log("Error sending payment rejection email:", error);
//     }
// };

const SendPaymentRejection = async (email, reason) => {
  try {
    const htmlContent = Payment_Rejection_Template.replace("{reason}", reason);

    const body = {
      sender: { email: process.env.BREVO_FROM_EMAIL },
      to: [{ email }],
      subject: "Payment Failed – Action Required",
      htmlContent
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    console.log("Payment rejection email sent:", await response.json());
  } catch (error) {
    console.log("Error sending payment rejection email:", error);
  }
};


// const SendPaymentVerificationRequestSent = async (email, name, auctionName, reqFor) => {
//   try {
//     const htmlContent = PAYMENT_Verification_Request_Sent_Template
//       .replace("{name}", name)
//       .replace("{auctionName}", auctionName)
//       .replace("{reqFor}", reqFor)
      
//     const response = await transporter.sendMail({
//       from: process.env.BREVO_FROM_EMAIL,
//       to: email,
//       subject: "Payment Verification Request Received",
//       html: htmlContent,
//     });

//     console.log("Payment verification-request email sent successfully", response);
//   } catch (error) {
//     console.log("Error sending payment verification-request email:", error);
//   }
// };

const SendPaymentVerificationRequestSent = async (email, name, auctionName, reqFor) => {
  try {
    const htmlContent = PAYMENT_Verification_Request_Sent_Template
      .replace("{name}", name)
      .replace("{auctionName}", auctionName)
      .replace("{reqFor}", reqFor);

    const body = {
      sender: { email: process.env.BREVO_FROM_EMAIL },
      to: [{ email }],
      subject: "Payment Verification Request Received",
      htmlContent
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    console.log("Payment verification-request email sent:", await response.json());
  } catch (error) {
    console.log("Error sending payment verification-request email:", error);
  }
};

const SendSellerWinnerNotification = async (
  email,
  sellerName,
  winnerName,
  auctionName,
  saleAmount,
  listingFee,
  netEarnings,
  address
) => {
  try {
    const htmlContent = Seller_Winner_Notification_Template
      .replace("{sellerName}", sellerName)
      .replace("{winnerName}", winnerName)
      .replace("{auctionName}", auctionName)
      .replace("{saleAmount}", saleAmount)
      .replace("{listingFee}", listingFee)
      .replace("{netEarnings}", netEarnings)
      .replace("{address}", address);

    const body = {
      sender: { email: process.env.BREVO_FROM_EMAIL },
      to: [{ email }],
      subject: "Your Auction Item Has Been Sold!",
      htmlContent,
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("Seller Auction Sold email sent:", await response.json());
  } catch (error) {
    console.log("Error sending seller auction sold email:", error);
  }
};



export { 
    SendVerificationCode, 
    WelcomeEmail, 
    SendOutBidEmail, 
    SendResetPwdEmail, 
    SendAuctionWinnerEmail, 
    SendCODSelectedEmail, 
    SendUPISelectedEmail, 
    SendPaymentVerifiedEmail,
    SendPaymentRejection,
    SendPaymentVerificationRequestSent,
    SendSellerWinnerNotification
 };