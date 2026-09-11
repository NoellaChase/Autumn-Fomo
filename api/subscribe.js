// API endpoint to subscribe Autumn FOMO buyers to Global Control, MailerLite, and provide certificate

// Pre-generated certificates - uploaded to Google Drive and ready to use
const PRE_GENERATED_CERTIFICATES = {
  'Friend': 'https://drive.google.com/uc?export=download&id=13yfQBWQ9UdwkOyW7uzU2GxeDEjnAq7QM',
  'Valued Customer': 'https://drive.google.com/uc?export=download&id=1IdK5wMqoy2XgBD9JTjvjgpGlCp6fc_h_',
  'Beautiful Soul': 'https://drive.google.com/uc?export=download&id=1oveZJy_2WhpuQAscTt6Z8kj0YbXFpIdS',
  'Amazing Person': 'https://drive.google.com/uc?export=download&id=13FCZZGRTns6XLJk1BerOrL0PRGUJ01nO',
  'Wonderful You': 'https://drive.google.com/uc?export=download&id=1d7zsRmyl9O7WBgHHRms1S4n75uZ4KA7p'
};

// Default certificate if needed
const DEFAULT_CERTIFICATE = 'https://drive.google.com/uc?export=download&id=1et_XftXKOkjq3KCFZlz1KFPBSpgaQY1o';

function getCertificateForName(firstName) {
  const names = Object.keys(PRE_GENERATED_CERTIFICATES);
  const index = firstName.length % names.length;
  return PRE_GENERATED_CERTIFICATES[names[index]];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { firstName, email, source, paymentId } = req.body;
  if (!firstName || !email) return res.status(400).json({ error: 'First name and email required' });

  const results = { globalControl: false, mailerlite: false, certificateUrl: null };
  
  const certificateUrl = getCertificateForName(firstName);

  try {
    // Global Control
    const gcApiKey = process.env.GLOBAL_CONTROL_API_KEY;
    if (gcApiKey) {
      const gcRes = await fetch('https://api.globalcontrol.io/api/ai/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': gcApiKey },
        body: JSON.stringify({ 
          firstName, 
          email, 
          tag: 'Buyer-AutumnFOMO', 
          tagId: '6aa41c474c80625f72dc99e6', 
          source: source || 'autumn-fomo',
          paymentId: paymentId || 'unknown',
          purchaseDate: new Date().toISOString(),
          certificateUrl 
        })
      });
      results.globalControl = gcRes.ok;
    }

    // MailerLite
    const mlApiKey = process.env.MAILERLITE_API_KEY;
    const mlGroupId = process.env.MAILERLITE_GROUP_ID || '198173448779859708';
    if (mlApiKey) {
      const mlRes = await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mlApiKey}` },
        body: JSON.stringify({ email, fields: { name: firstName, certificate_url: certificateUrl } })
      });
      results.mailerlite = mlRes.ok || mlRes.status === 200;
      
      const mlData = await mlRes.json().catch(() => ({}));
      if (mlData.data?.id) {
        await fetch(`https://connect.mailerlite.com/api/subscribers/${mlData.data.id}/groups/${mlGroupId}`, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mlApiKey}` }
        });
      }
    }

    // Telegram notification
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    if (telegramToken) {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: '8260968699',
          text: `🎉 New Autumn FOMO Buyer!\n\nName: ${firstName}\nEmail: ${email}\nCertificate: <a href="${certificateUrl}">View</a>\nGC: ${results.globalControl ? '✅' : '❌'}\nML: ${results.mailerlite ? '✅' : '❌'}`,
          parse_mode: 'HTML'
        })
      });
    }

    return res.status(200).json({ success: true, certificateUrl, services: results });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
