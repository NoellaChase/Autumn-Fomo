# Autumn FOMO - Environment Variables Setup

## Required Environment Variables for Vercel

Add these in your Vercel Dashboard:
**Project Settings → Environment Variables**

### 1. Stripe (Payment Processing)
```
STRIPE_SECRET_KEY=sk_live_...
```
- Get from: https://dashboard.stripe.com/apikeys
- Use your LIVE secret key (starts with sk_live_)

### 2. Global Control (CRM)
```
GLOBAL_CONTROL_API_KEY=22ca9c...c823
```
- Your existing API key for Global Control

### 3. MailerLite (Email Automation)
```
MAILERLITE_API_KEY=eyJ0eX...y1C4
```
- Get from: https://dashboard.mailerlite.com/integrations/api

### 4. MailerLite Group ID
```
MAILERLITE_GROUP_ID=192286166200878181
```
- This is your "Autumn FOMO - Buyers" group ID
- Find it in MailerLite: Subscribers → Groups → Click group → URL shows ID

### 5. Google Drive (Certificate Storage)
```
GOOGLE_SERVICE_ACCOUNT_PATH=/root/.openclaw/workspace/credentials/gemini-notebook-service-account.json
```
- Path to your service account credentials file
- This file already exists and has Drive API access

### 6. Telegram (Notifications)
```
TELEGRAM_BOT_TOKEN=your_bot_token
```
- Optional: Get from @BotFather on Telegram
- Without this, you won't get purchase notifications

## How to Add Environment Variables

1. Go to https://vercel.com/dashboard
2. Find "autumn-fomo" project
3. Click **Settings** tab
4. Click **Environment Variables** in left menu
5. Add each variable (name + value)
6. Click **Save**
7. **Redeploy**: Go to Deployments → Click "..." on latest → "Redeploy"

## Certificate Flow (After Setup)

When someone buys Autumn FOMO:

1. ✅ Stripe processes payment
2. ✅ Success page calls subscribe.js API
3. ✅ Certificate generated with buyer's name
4. ✅ Certificate uploaded to Google Drive (public link)
5. ✅ Buyer added to Global Control (with certificate URL)
6. ✅ Buyer added to MailerLite (with certificate_url field)
7. ✅ MailerLite sends Day 1 email with `{{certificate_url}}` link
8. ✅ You get Telegram notification

## Testing

After setup, test with a $0.01 purchase:
1. Use Stripe test mode (or real $1.99 purchase)
2. Check Google Drive → "Autumn FOMO Certificates" folder
3. Check MailerLite subscriber has certificate_url field
4. Check Global Control contact has certificate URL
5. Check you get Telegram notification

## Troubleshooting

**Certificate not generating?**
- Check GOOGLE_SERVICE_ACCOUNT_PATH is correct
- Verify service account has Google Drive API access
- Check Vercel function logs for errors

**MailerLite not receiving certificate URL?**
- Verify MAILERLITE_API_KEY is correct
- Check that certificate_url field exists in MailerLite
- Check Vercel function logs

**Google Drive folder not found?**
- The API will auto-create "Autumn FOMO Certificates" folder
- Service account needs Drive API permission
