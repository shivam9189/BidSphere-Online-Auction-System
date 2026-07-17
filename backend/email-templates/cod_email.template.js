export const COD_Selected_Email_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>COD Confirmed</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background:#f4f4f4; }
        .container {
            max-width: 600px; margin: 30px auto; background: #fff;
            border-radius: 8px; border: 1px solid #ddd;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .header {
            background:#FF9800; color:#fff; padding:20px;
            text-align:center; font-size:26px; font-weight:bold;
        }
        .content { padding:25px; line-height:1.8; color:#333; }
        .footer {
            padding:15px; background:#f4f4f4; text-align:center;
            font-size:12px; color:#777; border-top:1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">COD Confirmed</div>

        <div class="content">
            <p>Hello <strong>{name}</strong>,</p>

            <p>Your payment method has been set to <strong>Cash on Delivery (COD)</strong> for:</p>
            <p><strong>Auction:</strong> {auctionName}</p>

            <p>Your order is now confirmed and your item is being prepared for delivery.</p>
            <p>You will receive tracking updates soon.</p>
        </div>

        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} BidSphere. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

