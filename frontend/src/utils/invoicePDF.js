import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function generateInvoicePDF(auctionData, userData, deliveryData) {
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '190mm'; // A4 width with 10mm margins each side
  tempDiv.style.maxHeight = '277mm'; // A4 height with 10mm margins each side
  tempDiv.style.padding = '8mm'; 
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.fontSize = '10pt'; 
  tempDiv.style.lineHeight = '1.4'; 
  tempDiv.style.color = '#000';
  tempDiv.style.fontFamily = 'Arial, sans-serif';
  tempDiv.style.margin = '0'; 
  tempDiv.style.overflow = 'hidden'; // Prevent overflow

  const invoiceDate = new Date().toLocaleDateString();
  const invoiceNumber = `INV-${Date.now()}`;
  
  tempDiv.innerHTML = `
    <div style="width: 100%; height: 100%;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #000;">
        <h1 style="font-size: 20pt; font-weight: bold; margin: 0; color: #000;">INVOICE</h1>
        <p style="font-size: 10pt; margin: 2px 0; color: #666;">BidSphere Online Auction System</p>
      </div>

      <!-- Invoice Info -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
        <div style="width: 48%;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px; color: #000;">Invoice Details</h3>
          <p style="margin: 3px 0; font-size: 9pt;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p style="margin: 3px 0; font-size: 9pt;"><strong>Date:</strong> ${invoiceDate}</p>
          <p style="margin: 3px 0; font-size: 9pt;"><strong>Auction ID:</strong> ${auctionData._id || 'N/A'}</p>
        </div>
        <div style="width: 48%; text-align: right;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px; color: #000;">Payment Status</h3>
          <p style="margin: 3px 0; font-size: 9pt; color: #28a745; font-weight: bold;">✓ PAID</p>
        </div>
      </div>

      <!-- Bill To and Seller Info -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
        <div style="width: 48%;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px; color: #000;">Bill To</h3>
          <p style="margin: 3px 0; font-size: 9pt;"><strong>${userData?.fullname || userData?.username || 'Buyer'}</strong></p>
          <p style="margin: 3px 0; font-size: 9pt;">${deliveryData?.street || 'N/A'}</p>
          <p style="margin: 3px 0; font-size: 9pt;">${deliveryData?.city || 'N/A'}, ${deliveryData?.state || 'N/A'} ${deliveryData?.postalCode || 'N/A'}</p>
          <p style="margin: 3px 0; font-size: 9pt;">${deliveryData?.country || 'N/A'}</p>
          <p style="margin: 3px 0; font-size: 9pt;">Phone: ${deliveryData?.phone || 'N/A'}</p>
        </div>
        <div style="width: 48%;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px; color: #000;">Seller Information</h3>
          <p style="margin: 3px 0; font-size: 9pt;"><strong>${auctionData.sellerId?.fullname || auctionData.sellerId?.username || 'Seller'}</strong></p>
          <p style="margin: 3px 0; font-size: 9pt;">Email: ${auctionData.sellerId?.email || 'N/A'}</p>
          <p style="margin: 3px 0; font-size: 9pt;">Phone: ${auctionData.sellerId?.phone || 'N/A'}</p>
        </div>
      </div>

      <!-- Item Details -->
      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 10px; color: #000;">Auction Item Details</h3>
        <div style="display: flex; gap: 15px; margin-bottom: 15px;">
          <div style="width: 120px; height: 120px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; background-color: #f9f9f9;">
            ${auctionData.item?.images?.[0] ? 
              `<img src="${auctionData.item.images[0]}" style="max-width: 100%; max-height: 100%; object-fit: cover;" alt="Item Image" />` : 
              '<div style="text-align: center; color: #999;">No Image Available</div>'
            }
          </div>
          <div style="flex: 1;">
            <h4 style="font-size: 14pt; font-weight: bold; margin: 0 0 8px 0; color: #000;">${auctionData.title || 'Untitled Auction'}</h4>
            <p style="margin: 3px 0; font-size: 9pt; color: #666;"><strong>Description:</strong> ${auctionData.item?.description || auctionData.description || 'No description available'}</p>
            <p style="margin: 3px 0; font-size: 9pt; color: #666;"><strong>Category:</strong> ${auctionData.item?.category || 'N/A'}</p>
            <p style="margin: 3px 0; font-size: 9pt; color: #666;"><strong>Condition:</strong> ${auctionData.item?.condition || 'N/A'}</p>
            <p style="margin: 3px 0; font-size: 9pt; color: #666;"><strong>Auction Ended:</strong> ${auctionData.endTime ? new Date(auctionData.endTime).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>
      </div>

      <!-- Pricing Table -->
      <div style="margin-bottom: 15px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <thead>
            <tr style="border-bottom: 2px solid #000;">
              <th style="padding: 8px; text-align: left; font-size: 9pt; background-color: #f5f5f5;">Description</th>
              <th style="padding: 8px; text-align: right; font-size: 9pt; background-color: #f5f5f5;">Quantity</th>
              <th style="padding: 8px; text-align: right; font-size: 9pt; background-color: #f5f5f5;">Unit Price</th>
              <th style="padding: 8px; text-align: right; font-size: 9pt; background-color: #f5f5f5;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px; font-size: 9pt;">${auctionData.title || 'Auction Item'}</td>
              <td style="padding: 8px; text-align: right; font-size: 9pt;">1</td>
              <td style="padding: 8px; text-align: right; font-size: 9pt;">₹${auctionData.final || auctionData.currentBid || '0'}</td>
              <td style="padding: 8px; text-align: right; font-size: 9pt;">₹${auctionData.final || auctionData.currentBid || '0'}</td>
            </tr>
          </tbody>
        </table>

        <!-- Totals -->
        <div style="text-align: right;">
          <div style="display: inline-block; width: 250px;">
            <div style="display: flex; justify-content: space-between; padding: 3px 0; font-size: 9pt;">
              <span>Subtotal:</span>
              <span>₹${auctionData.final || auctionData.currentBid || '0'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 3px 0; font-size: 9pt;">
              <span>Tax:</span>
              <span>₹0</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 2px solid #000; font-weight: bold; font-size: 10pt;">
              <span>Total Paid:</span>
              <span>₹${auctionData.final || auctionData.currentBid || '0'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Terms and Conditions -->
      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 8px; color: #000;">Terms and Conditions</h3>
        <ul style="font-size: 8pt; margin: 0; padding-left: 20px; color: #666;">
          <li style="margin-bottom: 5px;">This invoice confirms successful payment for the auction item. Delivery will be made to the address specified above. All sales are final. No returns or exchanges accepted. The item will be delivered within 5-7 business days. For any queries, please contact our support team.</li>
        </ul>
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd;">
        <p style="margin: 3px 0; font-size: 8pt; color: #666;">Thank you for your purchase!</p>
        <p style="margin: 3px 0; font-size: 8pt; color: #666;">BidSphere Online Auction System | bidsphere.auction@gmail.com | https://bid-sphere-online-auction-system.vercel.app</p>
      </div>
    </div>
  `;

  document.body.appendChild(tempDiv);

  const filename = `invoice_${auctionData.title?.replace(/\s+/g, "_")}_${invoiceNumber}.pdf`;

  // Use html2canvas and jsPDF
  html2canvas(tempDiv, {
    scale: 2,
    useCORS: true,
    logging: false,
    width: tempDiv.scrollWidth,
    height: tempDiv.scrollHeight,
    windowWidth: tempDiv.scrollWidth,
    windowHeight: tempDiv.scrollHeight
  }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10; // 10mm margin
    const usableWidth = pageWidth - (margin * 2);
    const usableHeight = pageHeight - (margin * 2);
    
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let finalImgWidth = imgWidth;
    let finalImgHeight = imgHeight;
    
    if (imgHeight > usableHeight) {
      finalImgHeight = usableHeight;
      finalImgWidth = (canvas.width * finalImgHeight) / canvas.height;
    }
    
    const xPos = (pageWidth - finalImgWidth) / 2;
    const yPos = margin;
    
    pdf.addImage(imgData, 'PNG', xPos, yPos, finalImgWidth, finalImgHeight);
    pdf.save(filename);
    document.body.removeChild(tempDiv);
  }).catch(error => {
    console.error('Error generating PDF:', error);
    document.body.removeChild(tempDiv);
  });
}