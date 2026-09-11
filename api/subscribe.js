// API endpoint to subscribe Autumn FOMO buyers to Global Control, MailerLite, and generate certificate
import { google } from 'googleapis';
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
    // 1. Use Google Drive Certificate Link
    // Certificate stored at: https://drive.google.com/file/d/1et_XftXKOkjq3KCFZlz1KFPBSpgaQY1o/view
    const certificateUrl = 'https://drive.google.com/uc?export=download&id=1et_XftXKOkjq3KCFZlz1KFPBSpgaQY1o';
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
    const mlGroupId = process.env.MAILERLITE_GROUP_ID || '198173448779859708'; // Autumn Fomo - Buyers
    
    console.log('MailerLite API Key exists:', !!mlApiKey);
    console.log('MailerLite API Key length:', mlApiKey ? mlApiKey.length : 0);
    console.log('MailerLite Group ID:', mlGroupId);
    
    if (mlApiKey) {
      try {
        const subscriberData = {
          email: email,
          fields: {
            name: firstName,
            certificate_url: certificateUrl || ''
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
            const groupResponse = await fetch(`https://connect.mailerlite.com/api/subscribers/${mlData.data.id}/groups/${mlGroupId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mlApiKey}`
              }
            });
            console.log('Group assignment status:', groupResponse.status);
          } catch (groupError) {
            console.error('Group assignment error:', groupError);
          }
        }

        if (mlResponse.status === 409) {
          // Subscriber already exists, update them
          const updateResponse = await fetch(`https://connect.mailerlite.com/api/subscribers/${email}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mlApiKey}`
            },
            body: JSON.stringify({
              fields: {
                name: firstName,
                certificate_url: certificateUrl || ''
              }
            })
          });
          const updateData = await updateResponse.json().catch(() => ({}));
          results.mailerlite = updateResponse.ok || updateResponse.status === 200;
          results.mailerliteStatus = updateResponse.status;
          results.mailerliteError = updateData.message || null;
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
${certificateUrl ? `<a href="${certificateUrl}">View Certificate</a>` : ''}

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

    if (results.globalControl || results.mailerlite) {
      return res.status(200).json({ 
        success: true, 
        message: 'Subscribed successfully - MailerLite will send welcome email with certificate',
        certificateUrl: certificateUrl,
        services: results
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to subscribe to any service'
      });
    }

  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error'
    });
  }
}

// Generate personalized certificate and upload to Google Drive
async function generateAndUploadCertificate(firstName) {
  // For now, return a placeholder certificate URL
  // The actual certificate generation with text overlay requires a more complex setup
  // We'll create a simple text-based certificate or use a pre-generated template
  
  const outputDir = path.join('/tmp', 'certificates');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, `autumn-fomo-certificate-${Date.now()}.jpg`);
  
  // Copy template and we'll add text later
  const templatePath = path.join(process.cwd(), 'public', 'autumn-certificate-template.jpg');
  
  // Check if template exists
  if (!fs.existsSync(templatePath)) {
    console.log('Certificate template not found, skipping certificate generation');
    return null;
  }
  
  fs.copyFileSync(templatePath, outputPath);
  
  // Try to upload to Google Drive, but don't fail if it doesn't work
  try {
    const driveUrl = await uploadToGoogleDrive(outputPath, firstName);
    // Clean up temp file
    fs.unlinkSync(outputPath);
    return driveUrl;
  } catch (error) {
    console.log('Google Drive upload failed, returning local path:', error.message);
    // Clean up temp file
    fs.unlinkSync(outputPath);
    // Return a default certificate URL or null
    return null;
  }
}

// Upload file to Google Drive and make it publicly viewable
async function uploadToGoogleDrive(filePath, firstName) {
  const credentialsBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  
  let credentials;
  if (credentialsBase64) {
    const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf8');
    credentials = JSON.parse(credentialsJson);
  } else {
    const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || '/root/.openclaw/workspace/credentials/gemini-notebook-service-account.json';
    credentials = require(credentialsPath);
  }
  
  // Use domain-wide delegation to impersonate Noella's account
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
    clientOptions: {
      subject: 'noellachasedesignz@gmail.com'
    }
  });
  
  const drive = google.drive({ version: 'v3', auth });
  
  // Find or create Autumn FOMO Certificates folder
  const folderName = 'Autumn FOMO Certificates';
  let folderId = null;
  
  const folderResponse = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
    spaces: 'drive',
    fields: 'files(id, name)'
  });
  
  if (folderResponse.data.files.length > 0) {
    folderId = folderResponse.data.files[0].id;
  } else {
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };
    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id'
    });
    folderId = folder.data.id;
  }
  
  // Share folder with Noella's personal email
  try {
    await drive.permissions.create({
      fileId: folderId,
      resource: {
        role: 'writer',
        type: 'user',
        emailAddress: 'noellachasedesignz@gmail.com'
      },
      sendNotificationEmail: false
    });
  } catch (e) {
    console.log('Folder may already be shared');
  }
  
  // Upload certificate file
  const fileMetadata = {
    name: `Autumn-FOMO-Certificate-${firstName}-${Date.now()}.jpg`,
    parents: [folderId]
  };
  
  const media = {
    mimeType: 'image/jpeg',
    body: fs.createReadStream(filePath)
  };
  
  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id'
  });
  
  // Make file publicly viewable
  await drive.permissions.create({
    fileId: file.data.id,
    resource: {
      role: 'reader',
      type: 'anyone'
    }
  });
  
  return `https://drive.google.com/file/d/${file.data.id}/view?usp=sharing`;
}
