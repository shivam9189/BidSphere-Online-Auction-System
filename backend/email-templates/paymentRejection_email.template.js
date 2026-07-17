const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, "");

export const Payment_Rejection_Template = `
  <div style="font-family: Arial, sans-serif; padding: 20px; background: #f6f6f6;">
    <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; padding: 25px;">
      <h2 style="color: #e63946;">Payment Failed</h2>
      <p>Dear User,</p>

      <p>
        Unfortunately, your recent payment attempt was <strong>unsuccessful</strong>.
      </p>

      <p style="margin-top: 10px;">
        <strong>Reason:</strong> {reason}
      </p>

      <p>
        Please try again using a different payment method or ensure your bank/card allows online transactions.
      </p>
      <a href="${BACKEND_URL}/bidsphere/auctions/${'{auctionId}'}/finalpay" 
         style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: #1d3557; color: white; text-decoration: none; border-radius: 5px;">
         Retry Payment
      </a>

      <p style="margin-top: 20px;">
        If you need help, feel free to contact our support team.
      </p>

      <p>Regards,<br>BidSphere Team</p>
    </div>
  </div>
`;
