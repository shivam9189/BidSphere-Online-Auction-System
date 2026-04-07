
export const Payment_Verified_Email_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Verified</title>
    <style>
        body { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0; }
        .container {
            max-width:600px; margin:30px auto; background:#fff;
            border-radius:8px; border:1px solid #ddd;
            box-shadow:0 4px 15px rgba(0,0,0,0.1);
        }
        .header {
            background:#2196F3; color:#fff; padding:20px;
            text-align:center; font-size:26px; font-weight:bold;
        }
        .content { padding:25px; color:#333; line-height:1.8; }
        .footer {
            background:#f4f4f4; padding:15px; text-align:center;
            font-size:12px; color:#777; border-top:1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">✔ Payment Verified</div>

        <div class="content">
            <p>Hello <strong>{name}</strong>,</p>

            <p>Your UPI payment has been successfully verified for:</p>
            <p><strong>Auction:</strong> {auctionName}</p>

            <p>Your order is now confirmed and will be shipped soon.</p>
        </div>

        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} BidSphere. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

