// API endpoint to subscribe Autumn FOMO buyers
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { firstName, email, source, paymentId } = req.body;
  if (!firstName || !email) return res.status(400).json({ error: 'First name and email required' });

  const results = { globalControl: false, mailerlite: false, certificateUrl: null };
  
  // Static certificate link
  const certificateUrl = 'https://drive.google.com/uc?export=download&id=1et_XftXKOkjq3KCFZlz1KFPBSpgaQY1o';

  try {
    // Global Control
    const gcApiKey = process.env.GLOBAL_CONTROL_API_KEY;
    if (gcApiKey) {
      const gcRes = await fetch('https://api.globalcontrol.io/api/ai/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': gcApiKey },
        body: JSON.stringify({ firstName, email, tag: 'Buyer-AutumnFOMO', tagId: '6aa41c474c80625f72dc99e6', source: source || 'autumn-fomo', certificateUrl })
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
      
      // Add to group if new subscriber
      const mlData = await mlRes.json().catch(() => ({}));
      if (mlData.data?.id) {
        await fetch(`https://connect.mailerlite.com/api/subscribers/${mlData.data.id}/groups/${mlGroupId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mlApiKey}` }
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
          text: `🎉 New Autumn FOMO Buyer!\n\nName: ${firstName}\nEmail: ${email}\nGC: ${results.globalControl ? '✅' : '❌'}\nML: ${results.mailerlite ? '✅' : '❌'}`,
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
