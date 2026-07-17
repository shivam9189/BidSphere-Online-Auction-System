export const UPI_Selected_Email_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UPI Payment Details</title>
    <style>
        body { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0; }
        .container {
            max-width: 600px; margin:30px auto; background:#fff;
            border-radius:8px; border:1px solid #ddd;
            box-shadow:0 4px 15px rgba(0,0,0,0.1);
        }
        .header {
            background:#4CAF50; color:#fff; padding:20px;
            text-align:center; font-size:26px; font-weight:bold;
        }
        .content { padding:25px; line-height:1.8; color:#333; }
        .upi-box {
            margin:20px 0; padding:15px; background:#e8f5e9;
            border:1px dashed #4CAF50; border-radius:5px; font-size:18px;
        }
        .qr-section {
            margin-top: 20px;
            text-align: center;
        }
        .qr-section img {
            width: 220px;
            height: 220px;
        }
        .footer {
            background:#f4f4f4; padding:15px; text-align:center;
            color:#777; border-top:1px solid #ddd; font-size:12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">UPI Payment Required</div>

        <div class="content">
            <p>Hello <strong>{name}</strong>,</p>

            <p>You have selected <strong>UPI Payment</strong> for:</p>
            <p><strong>Auction:</strong> {auctionName}</p>

            <div class="upi-box">
                <p><strong>UPI LINK:</strong> {upiLink}</p>
                <p><strong>Amount:</strong> ₹{amount}</p>
                <p><strong>Time Limit:</strong> 24 hours</p>
            </div>

            <div class="qr-section">
                <p><strong>Scan this QR to Pay:</strong></p>
                {qrCode}
            </div>

            <p>Please complete your payment and upload the screenshot/transaction ID on your dashboard.</p>
        </div>

        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} BidSphere. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;