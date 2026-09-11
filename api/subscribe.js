// API endpoint to subscribe Autumn FOMO buyers to Global Control, MailerLite, and provide certificate
import fs from 'fs';
import path from 'path';

// Pre-generated certificates - these are uploaded to Google Drive and ready to use
const PRE_GENERATED_CERTIFICATES = {
  'Friend': 'https://drive.google.com/uc?export=download&id=13yfQBWQ9UdwkOyW7uzU2GxeDEjnAq7QM',
  'Valued Customer': 'https://drive.google.com/uc?export=download&id=1IdK5wMqoy2XgBD9JTjvjgpGlCp6fc_h_',
  'Beautiful Soul': 'https://drive.google.com/uc?export=download&id=1oveZJy_2WhpuQAscTt6Z8kj0YbXFpIdS',
  'Amazing Person': 'https://drive.google.com/uc?export=download&id=13FCZZGRTns6XLJk1BerOrL0PRGUJ01nO',
  'Wonderful You': 'https://drive.google.com/uc?export=download&id=1d7zsRmyl9O7WBgHHRms1S4n75uZ4KA7p'
};

// Default certificate if no match found
const DEFAULT_CERTIFICATE = 'https://drive.google.com/uc?export=download&id=1et_XftXKOkjq3KCFZlz1KFPBSpgaQY1o';

function getCertificateForName(firstName) {
  // Simple matching - pick a certificate based on name length or random
  const names = Object.keys(PRE_GENERATED_CERTIFICATES);
  
  // Use name length to pick a certificate (deterministic)
  const index = firstName.length % names.length;
  return PRE_GENERATED_CERTIFICATES[names[index]];
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, email, source, paymentId } = req.body;

  if (!firstName || !email) {
    return res.status(400).json({ error: 'First name and email are required' });
  }

  const results = {
    globalControl: false,
    mailerlite: false,
    certificate: false,
    certificateUrl: null,
    emailNotification: false
  };

  try {
    // 1. Get pre-generated certificate
    const certificateUrl = getCertificateForName(firstName);
    results.certificate = true;
    results.certificateUrl = certificateUrl;

    // 2. Add to Global Control
    const gcApiKey = process.env.GLOBAL_CONTROL_API_KEY;
    if (gcApiKey) {
      try {
        const gcResponse = await fetch('https://api.globalcontrol.io/api/ai/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': gcApiKey
          },
          body: JSON.stringify({
            firstName: firstName,
            email: email,
            tag: 'Buyer-AutumnFOMO',
            tagId: '6aa41c474c80625f72dc99e6',
            source: source || 'autumn-fomo',
            paymentId: paymentId || 'unknown',
            purchaseDate: new Date().toISOString(),
            certificateUrl: certificateUrl
          })
        });
        results.globalControl = gcResponse.ok;
      } catch (e) {
        console.error('Global Control error:', e);
      }
    }

    // 3. Add to MailerLite with certificate URL
    const mlApiKey = process.env.MAILERLITE_API_KEY;
    const mlGroupId = process.env.MAILERLITE_GROUP_ID || '198173448779859708';
    
    if (mlApiKey) {
      try {
        const subscriberData = {
          email: email,
          fields: {
            name: firstName,
            certificate_url: certificateUrl
          }
        };

        const mlResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mlApiKey}`
          },
          body: JSON.stringify(subscriberData)
        });
        
        const mlData = await mlResponse.json().catch(() => ({}));
        results.mailerlite = mlResponse.ok || mlResponse.status === 200;
        results.mailerliteStatus = mlResponse.status;
        results.mailerliteError = mlData.message || null;

        // Add subscriber to group
        if (results.mailerlite && mlData.data && mlData.data.id) {
          try {
            await fetch(`https://connect.mailerlite.com/api/subscribers/${mlData.data.id}/groups/${mlGroupId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mlApiKey}`
              }
            });
          } catch (groupError) {
            console.error('Group assignment error:', groupError);
          }
        }

        if (mlResponse.status === 409) {
          // Subscriber already exists, update them
          await fetch(`https://connect.mailerlite.com/api/subscribers/${email}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mlApiKey}`
            },
            body: JSON.stringify({
              fields: {
                name: firstName,
                certificate_url: certificateUrl
              }
            })
          });
        }
      } catch (e) {
        console.error('MailerLite error:', e);
      }
    }

    // 4. Send notification via Telegram
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = '8260968699';
    
    if (telegramToken) {
      try {
        const message = `🎉 <b>New Autumn FOMO Buyer!</b>

<b>Name:</b> ${firstName}
<b>Email:</b> ${email}
<b>Source:</b> ${source || 'autumn-fomo'}
<b>Payment ID:</b> ${paymentId || 'unknown'}
<b>Date:</b> ${new Date().toLocaleString('en-CA', { timeZone: 'America/Edmonton' })} MDT

Global Control: ${results.globalControl ? '✅' : '❌'}
MailerLite: ${results.mailerlite ? '✅' : '❌'}
Certificate: ${results.certificate ? '✅' : '❌'}
<a href="${certificateUrl}">View Certificate</a>

Note: Welcome email with certificate will be sent via MailerLite automation`;

        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
          })
        });
        results.emailNotification = true;
      } catch (e) {
        console.error('Telegram notification error:', e);
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Subscribed successfully - Welcome email with certificate will be sent via MailerLite',
      certificateUrl: certificateUrl,
      services: results
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error'
    });
  }
}
