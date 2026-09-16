import PDFDocument from 'pdfkit';
import { formatPKR, formatDateTimePST } from '@eliteship/shared';

export class PdfService {
  /**
   * Generates a clean, professional logistics consignment receipt as a PDF stream
   */
  static generateShipmentReceipt(shipment: any, settings: any): PDFKit.PDFDocument {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    const companyName = settings?.companyName || 'Euroshub Logistics';
    const companyPhone = settings?.companyPhone || '+92 21 111 354 837';
    const companyEmail = settings?.companyEmail || 'support@euroshub.com';
    const companyAddress = settings?.companyAddress || 'Cargo Complex, Port Qasim, Karachi, Pakistan';

    // 1. Header & Branding
    doc
      .rect(40, 40, 515, 65)
      .fill('#0f172a'); // Navy background header

    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(companyName.toUpperCase(), 55, 52);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text('CONSIGNMENT NOTE & OFFICIAL SHIPPING RECEIPT', 55, 76);

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#cbd5e1')
      .text(`Email: ${companyEmail} | Phone: ${companyPhone}`, 55, 88);

    // 2. Tracking & Meta Bar
    doc
      .rect(40, 115, 515, 45)
      .fill('#f8fafc')
      .stroke('#e2e8f0');

    doc
      .fillColor('#64748b')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('TRACKING NUMBER', 55, 125)
      .fillColor('#0f172a')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(shipment.trackingNumber, 55, 137);

    doc
      .fillColor('#64748b')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('BOOKING DATE', 250, 125)
      .fillColor('#0f172a')
      .fontSize(10)
      .font('Helvetica')
      .text(formatDateTimePST(shipment.createdAt), 250, 138);

    doc
      .fillColor('#64748b')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('SERVICE / PAYMENT', 400, 125)
      .fillColor('#0f172a')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`${shipment.serviceType} | ${shipment.paymentType}`, 400, 138);

    // 3. Sender vs Receiver Columns
    // Sender Box
    doc
      .rect(40, 175, 250, 130)
      .fill('#ffffff')
      .stroke('#cbd5e1');

    doc
      .rect(40, 175, 250, 24)
      .fill('#f1f5f9');

    doc
      .fillColor('#1e293b')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('FROM / SENDER DETAILS', 50, 182);

    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(shipment.senderName, 50, 208)
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#475569')
      .text(`Phone: ${shipment.senderPhone}`, 50, 222)
      .text(`City: ${shipment.senderCity}`, 50, 236)
      .text(`Address: ${shipment.senderAddress}`, 50, 250, { width: 230 })
      .text(shipment.senderAddressExtra || '', 50, 280, { width: 230 });

    // Receiver Box
    doc
      .rect(305, 175, 250, 130)
      .fill('#ffffff')
      .stroke('#cbd5e1');

    doc
      .rect(305, 175, 250, 24)
      .fill('#f1f5f9');

    doc
      .fillColor('#1e293b')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('TO / RECEIVER DETAILS', 315, 182);

    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(shipment.receiverName, 315, 208)
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#475569')
      .text(`Phone: ${shipment.receiverPhone}`, 315, 222)
      .text(`City: ${shipment.receiverCity}`, 315, 236)
      .text(`Address: ${shipment.receiverAddress}`, 315, 250, { width: 230 })
      .text(shipment.receiverAddressExtra || '', 315, 280, { width: 230 });

    // 4. Package Specifications
    doc
      .rect(40, 320, 515, 75)
      .fill('#ffffff')
      .stroke('#cbd5e1');

    doc
      .rect(40, 320, 515, 24)
      .fill('#f1f5f9');

    doc
      .fillColor('#1e293b')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('PACKAGE SPECIFICATIONS & HANDLING', 50, 327);

    doc
      .fillColor('#475569')
      .font('Helvetica')
      .fontSize(9)
      .text(`Type: ${shipment.packageType}`, 50, 352)
      .text(`Weight: ${shipment.weightKg} kg`, 180, 352)
      .text(`Fragile: ${shipment.isFragile ? 'YES (Handle with Care)' : 'No'}`, 320, 352)
      .text(
        `Dimensions: ${shipment.lengthCm || '-'} x ${shipment.widthCm || '-'} x ${shipment.heightCm || '-'} cm`,
        50,
        370
      )
      .text(`Declared Value: ${formatPKR(shipment.declaredValue)}`, 320, 370);

    // 5. Financial / Pricing Breakdown Table
    const snapshot = shipment.pricingSnapshot;
    const payment = shipment.payment;

    doc
      .rect(40, 410, 515, 160)
      .fill('#ffffff')
      .stroke('#cbd5e1');

    doc
      .rect(40, 410, 515, 24)
      .fill('#0f172a');

    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('CHARGES & PAYMENT DETAILS', 50, 417);

    const startY = 445;
    const rowGap = 20;

    const rows = [
      ['Base Freight Charge', formatPKR(snapshot?.baseFee || 0)],
      ['Weight Surcharge (Overweight)', formatPKR(snapshot?.weightSurcharge || 0)],
      ['Cash on Delivery (COD) Processing Fee', formatPKR(snapshot?.codFee || 0)],
      ['Total Shipping Fee', formatPKR(snapshot?.totalFee || 0)],
    ];

    rows.forEach(([label, val], idx) => {
      doc
        .font(idx === 3 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .fillColor('#1e293b')
        .text(label, 50, startY + idx * rowGap)
        .text(val, 430, startY + idx * rowGap, { align: 'right', width: 110 });
    });

    // COD Highlight Banner
    if (shipment.paymentType === 'COD') {
      doc
        .rect(40, 530, 515, 30)
        .fill('#fef3c7'); // Amber tint

      doc
        .fillColor('#92400e')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('COD AMOUNT TO COLLECT FROM RECEIVER:', 50, 540)
        .text(formatPKR(payment?.amountExpected || 0), 430, 540, { align: 'right', width: 110 });
    } else {
      doc
        .rect(40, 530, 515, 30)
        .fill('#ecfdf5'); // Green tint

      doc
        .fillColor('#065f46')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('PREPAID SHIPMENT — NO CASH TO COLLECT AT DESTINATION', 50, 540);
    }

    // 6. Footer Terms & Signature Box
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#94a3b8')
      .text(
        `Terms & Conditions: EliteShip liability for damaged or missing parcels is limited to the declared value or standard limits per contract. Generated on ${new Date().toISOString()} via ${companyName}.`,
        40,
        590,
        { width: 515 }
      );

    // Signature boxes
    doc
      .rect(40, 620, 240, 50)
      .stroke('#cbd5e1');
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#64748b')
      .text('Sender / Dispatcher Signature:', 50, 628);

    doc
      .rect(315, 620, 240, 50)
      .stroke('#cbd5e1');
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#64748b')
      .text('Driver / Receiver Signature:', 325, 628);

    doc.end();
    return doc;
  }
}
