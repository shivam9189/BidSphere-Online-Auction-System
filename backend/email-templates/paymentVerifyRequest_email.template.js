
export const PAYMENT_Verification_Request_Sent_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Verification Request Sent</title>
    <style>
        body { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0; }
        .container {
            max-width: 600px; margin:30px auto; background:#fff;
            border-radius:8px; border:1px solid #ddd;
            box-shadow:0 4px 15px rgba(0,0,0,0.1);
        }
        .header {
            background:#2196F3; color:#fff; padding:20px;
            text-align:center; font-size:26px; font-weight:bold;
        }
        .content { padding:25px; line-height:1.8; color:#333; }
        .info-box {
            margin:20px 0; padding:15px; background:#e3f2fd;
            border:1px dashed #2196F3; border-radius:5px; font-size:16px;
        }
        .footer {
            background:#f4f4f4; padding:15px; text-align:center;
            color:#777; border-top:1px solid #ddd; font-size:12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">Payment Verification Request Sent</div>

        <div class="content">
            <p>Hello <strong>{name}</strong>,</p>

            <p>Your payment verification request for the following auction has been submitted:</p>
            <p><strong>Auction:</strong> {auctionName}</p>

            <div class="info-box">
                <p><strong>Status:</strong> Pending Admin Review</p>
                <p><strong>Your payment request is for: </strong>{reqFor}</p>
            </div>

            <p>Our team will review the payment details shortly. You will receive a confirmation email once the verification is completed.</p>

            <p>No additional action is required from you at the moment. If there are any issues with the payment details, we will notify you.</p>
        </div>

        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} BidSphere. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;