const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createInstagramPDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([1080, 1080]);
  
  // Load and embed the background image
  const imagePath = path.join(__dirname, '../day1-assets/instagram-template.jpg');
  const imageBytes = fs.readFileSync(imagePath);
  const image = await pdfDoc.embedJpg(imageBytes);
  
  // Draw the image as background
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: 1080,
    height: 1080
  });
  
  // No editable fields - buyers can add their own text using Canva, Photoshop, or other tools
  
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(__dirname, '../day1-assets/instagram-permission-slip.pdf'), pdfBytes);
  console.log('Created: instagram-permission-slip.pdf');
}

async function createFacebookPDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([1080, 1080]);
  
  // Load and embed the background image
  const imagePath = path.join(__dirname, '../day1-assets/facebook-template.jpg');
  const imageBytes = fs.readFileSync(imagePath);
  const image = await pdfDoc.embedJpg(imageBytes);
  
  // Draw the image as background
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: 1080,
    height: 1080
  });
  
  // No editable fields - buyers can add their own text using Canva, Photoshop, or other tools
  
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(__dirname, '../day1-assets/facebook-permission-slip.pdf'), pdfBytes);
  console.log('Created: facebook-permission-slip.pdf');
}

async function createCertificatePDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  
  const { width, height } = page.getSize();
  
  // Title
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  page.drawText('OFFICIAL PERMISSION CERTIFICATE', {
    x: 50,
    y: height - 100,
    size: 28,
    font: titleFont,
    color: rgb(0.78, 0.69, 0.22) // Gold color
  });
  
  // Subtitle
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText('Summer FOMO - Day 1', {
    x: 50,
    y: height - 140,
    size: 16,
    font: font,
    color: rgb(0.4, 0.4, 0.4)
  });
  
  // Permissions list
  const permissions = [
    '* Do absolutely nothing today',
    '* Skip the party without guilt',
    '* Stay home and enjoy the quiet',
    '* Ignore FOMO completely',
    '* Rest without apology'
  ];
  
  let yPos = height - 220;
  permissions.forEach(permission => {
    page.drawText(permission, {
      x: 80,
      y: yPos,
      size: 14,
      font: font,
      color: rgb(0.2, 0.2, 0.2)
    });
    yPos -= 35;
  });
  
  // Name label (static text only - buyers can add their own name)
  page.drawText('This certificate is granted to:', {
    x: 50,
    y: yPos - 30,
    size: 12,
    font: font,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  // Draw a line for buyers to write their name (no editable field)
  page.drawLine({
    start: { x: 50, y: yPos - 70 },
    end: { x: 562, y: yPos - 70 },
    thickness: 1,
    color: rgb(0.78, 0.69, 0.22)
  });
  
  // Signature
  page.drawText('Noella Chase', {
    x: 50,
    y: 150,
    size: 24,
    font: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    color: rgb(0.78, 0.69, 0.22)
  });
  
  page.drawText('Permission Granted', {
    x: 50,
    y: 120,
    size: 12,
    font: font,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(__dirname, '../certificate/officially-doing-nothing-certificate.pdf'), pdfBytes);
  console.log('Created: officially-doing-nothing-certificate.pdf');
}

async function main() {
  try {
    await createInstagramPDF();
    await createFacebookPDF();
    await createCertificatePDF();
    console.log('\nAll PDFs created successfully!');
  } catch (error) {
    console.error('Error creating PDFs:', error);
  }
}

main();
