// API endpoint to subscribe Autumn FOMO buyers to Global Control, MailerLite, and generate certificate
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

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
    // 1. Generate Personalized Certificate and Upload to Google Drive
    // This runs asynchronously - we'll return immediately and process in background
    generateAndUploadCertificate(firstName).then(certificateUrl => {
      console.log('Certificate generated:', certificateUrl);
      
      // Update Global Control with certificate URL
      updateGlobalControlWithCertificate(email, certificateUrl);
      
      // Update MailerLite with certificate URL
      updateMailerLiteWithCertificate(email, certificateUrl);
    }).catch(err => {
      console.error('Certificate generation failed:', err);
    });

    // Use a temporary certificate URL until generation completes
    const tempCertificateUrl = 'https://drive.google.com/uc?export=download&id=1et_XftXKOkjq3KCFZlz1KFPBSpgaQY1o';

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
            certificateUrl: tempCertificateUrl
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
            certificate_url: tempCertificateUrl
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
                certificate_url: tempCertificateUrl
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
Certificate: ⏳ Generating...

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
      message: 'Subscribed successfully - Certificate is being generated and will be emailed shortly',
      certificateUrl: tempCertificateUrl,
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

// Background functions
async function generateAndUploadCertificate(firstName) {
  return new Promise((resolve, reject) => {
    const outputDir = path.join('/tmp', 'certificates');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const safeName = firstName.replace(/[^a-zA-Z0-9]/g, '_');
    const outputPath = path.join(outputDir, `certificate_${safeName}_${Date.now()}.jpg`);
    
    const pythonScript = '/root/.openclaw/workspace/autumn-fomo/certificate/generate_personalized_certificate.py';
    const pythonProcess = spawn('python3', [pythonScript, firstName, outputPath]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Certificate generation failed: ${stderr}`));
        return;
      }
      
      if (!fs.existsSync(outputPath)) {
        reject(new Error('Certificate file was not created'));
        return;
      }
      
      try {
        const driveUrl = await uploadToGoogleDrive(outputPath, firstName);
        fs.unlinkSync(outputPath);
        resolve(driveUrl);
      } catch (error) {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(error);
      }
    });
  });
}

async function uploadToGoogleDrive(filePath, firstName) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', ['-c', `
import sys
sys.path.insert(0, '/root/.openclaw/workspace/autumn-fomo')
from drive_oauth_upload import upload_certificate_to_drive
result = upload_certificate_to_drive('${filePath}', '${firstName.replace(/'/g, "\\'")}')
print(result['direct_link'])
`]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Drive upload failed: ${stderr}`));
        return;
      }
      
      const driveUrl = stdout.trim();
      if (driveUrl && driveUrl.startsWith('http')) {
        resolve(driveUrl);
      } else {
        reject(new Error('Invalid drive URL returned'));
      }
    });
  });
}

async function updateGlobalControlWithCertificate(email, certificateUrl) {
  const gcApiKey = process.env.GLOBAL_CONTROL_API_KEY;
  if (!gcApiKey) return;
  
  try {
    // Note: This would need the contact ID to update
    // For now, we'll log it
    console.log(`Would update GC contact ${email} with certificate: ${certificateUrl}`);
  } catch (e) {
    console.error('Failed to update GC with certificate:', e);
  }
}

async function updateMailerLiteWithCertificate(email, certificateUrl) {
  const mlApiKey = process.env.MAILERLITE_API_KEY;
  if (!mlApiKey) return;
  
  try {
    await fetch(`https://connect.mailerlite.com/api/subscribers/${email}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mlApiKey}`
      },
      body: JSON.stringify({
        fields: {
          certificate_url: certificateUrl
        }
      })
    });
    console.log(`Updated MailerLite subscriber ${email} with certificate`);
  } catch (e) {
    console.error('Failed to update MailerLite with certificate:', e);
  }
}
