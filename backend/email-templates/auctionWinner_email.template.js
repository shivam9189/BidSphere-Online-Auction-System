const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, "");

export const Auction_Winner_Email_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auction Winner</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0; padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            border: 1px solid #ddd;
        }
        .header {
            background-color: #673AB7;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 26px;
            font-weight: bold;
        }
        .content {
            padding: 25px; color: #333; line-height: 1.8;
        }
        .button {
            display: inline-block;
            padding: 12px 25px;
            margin: 10px 10px 0 0;
            background-color: #16a34a;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 16px;
        }
        .button:hover {
            background-color: #15803d;
        }
        .footer {
            background-color: #f4f4f4;
            padding: 15px;
            text-align: center;
            color: #777;
            font-size: 12px;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">🎉 You Won the Auction!</div>

        <div class="content">
            <p>Hello <strong>{name}</strong>,</p>

            <p>Congratulations! You have won the auction for:</p>
            <p><strong>Auction:</strong> {auctionName}</p>

            <p>Please complete your payment within <strong>24 hours</strong> to secure your winning bid.</p>

            <a href="${FRONTEND_URL}/auction/${'{auctionId}'}/pay" class="button">Pay Now</a>

            <p>If payment is not completed in time, the order will be cancelled and the item may be offered to the next highest bidder.</p>
            
            <p>You can also access the payment page from your <a href="${FRONTEND_URL}/buyer-dashboard">Bidder Dashboard</a>.</p>
        </div>

        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} BidSphere. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;