const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, "");
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, "");

export const Outbid_Email_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Outbid Notification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            color: #333;
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
            background-color: #1a73e8;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 26px;
            font-weight: bold;
        }
        .content {
            padding: 25px;
            line-height: 1.8;
        }
        .auction-title {
            font-size: 18px;
            color: #444;
            margin-bottom: 10px;
        }
        .item-name {
            font-size: 20px;
            font-weight: bold;
            color: #1a73e8;
        }
        .button {
            display: inline-block;
            padding: 12px 25px;
            margin: 20px 0;
            background-color: #1a73e8;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        .button:hover {
            background-color: #155ab6;
        }
        .footer {
            background-color: #f4f4f4;
            padding: 15px;
            text-align: center;
            color: #777;
            font-size: 12px;
            border-top: 1px solid #ddd;
        }
        p {
            margin: 0 0 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">Outbid Notification</div>
        <div class="content">
            <p>Dear User,</p>
            
            <p>You’ve been <strong>outbid</strong> in the auction:</p>
            <p class="auction-title">{auctionTitle}</p>
            
            <p>for the item:</p>
            <p class="item-name">{itemName}</p>

            <p>The new highest bid is: <strong>${'{currentBid}'}</strong>.</p>
            <p>Your maximum auto-bid limit: <strong>${'{maxLimit}'}</strong>.</p>

            <p>If you’d like to increase your auto-bid limit or place a new bid, click below:</p>
            <a href="${BACKEND_URL}/bidsphere/${'{auctionId}'}/bid/editauto/${'{autobidId}'}"
               class="button" target="_blank" rel="noopener noreferrer">
                Edit Auto-Bid
            </a>

            <p>Thank you for using <strong>BidSphere</strong>. Stay in the game and keep bidding!</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} BidSphere. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;