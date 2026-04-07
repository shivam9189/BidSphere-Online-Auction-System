export const Seller_Winner_Notification_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auction Sold</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f4f4f4;
            margin: 0; padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            overflow: hidden;
            border: 1px solid #ddd;
        }
        .header {
            background: #4CAF50;
            color: white;
            text-align: center;
            padding: 20px;
            font-size: 24px;
            font-weight: bold;
        }
        .content {
            padding: 25px;
            color: #333;
            line-height: 1.7;
        }
        .footer {
            background: #fafafa;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #777;
            border-top: 1px solid #ddd;
        }
        .amount-box {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            border: 1px solid #e0e0e0;
        }
        strong { color: #333; }
    </style>
</head>

<body>
    <div class="container">

        <div class="header">🎉 Your Item Has Been Sold!</div>

        <div class="content">

            <p>Hello <strong>{sellerName}</strong>,</p>

            <p>This bidder <strong>{winnerName}</strong> has won your auction for:</p>
            <p><strong>{auctionName}</strong></p>

            <div class="amount-box">
                <p><strong>Sale Amount:</strong> ₹{saleAmount}</p>
                <p><strong>Listing Fee:</strong> ₹{listingFee}</p>
                <p><strong>Net Earnings:</strong> <strong>₹{netEarnings}</strong></p>
            </div>

            <p>Our delivery partner will visit your address within <strong>1–2 days</strong> to pick up the item.</p>

            <p><strong>Pickup Address:</strong><br>
            {address}</p>

            <p>Once the buyer receives and confirms the delivery, your earnings will be released to your wallet/account.</p>

            <p>Thank you for selling with BidSphere!</p>

        </div>

        <div class="footer">
            © ${new Date().getFullYear()} BidSphere. All rights reserved.
        </div>

    </div>
</body>
</html>
`;
