# Summer FOMO Monitoring & Automation Plan

## 1. Website Health Monitoring

### Daily Checks (Automated)
- [ ] Main sales page loads (200 OK)
- [ ] Thank you page loads (200 OK)
- [ ] Day 1 content pages load (200 OK)
- [ ] Payment buttons render (PayPal + Stripe)
- [ ] All images load correctly

### Weekly Checks (Manual Review)
- [ ] Test complete purchase flow (PayPal)
- [ ] Test complete purchase flow (Stripe)
- [ ] Verify email capture works
- [ ] Check Global Control integration
- [ ] Review MailerLite subscriber additions

## 2. Payment Notification System

### Immediate Notifications Required
When a payment comes in, I MUST:

1. **Send Telegram alert to Noella** with:
   - Buyer name
   - Email address
   - Payment amount
   - Payment method (PayPal/Stripe)
   - Timestamp

2. **Add to Global Control** automatically:
   - Create contact with tag "Buyer-SummerFOMO"
   - Include purchase date and payment ID
   - Source: "summer-fomo"

3. **Add to MailerLite** automatically:
   - Add to "Summer FOMO - Buyers" group
   - Trigger welcome email automation

## 3. Environment Variables Needed

The following must be set in Vercel dashboard:

```
GLOBAL_CONTROL_API_KEY=22ca9c9ace3a479190713bf8b29f09d108fd7588322c9077294463f158f5c823
MAILERLITE_API_KEY=[Need to get from MailerLite]
TELEGRAM_BOT_TOKEN=[Need to create bot]
```

## 4. Monitoring Commands

### Check all pages:
```bash
for page in "" "thank-you.html" "day-1-complete.html" "welcome-day-1.html"; do
  curl -sI "https://summer-fomo.vercel.app/$page" | grep HTTP
done
```

### Check payment buttons:
```bash
curl -s "https://summer-fomo.vercel.app" | grep -E "paypal|stripe"
```

## 5. Action Items

- [ ] Set up Vercel environment variables
- [ ] Create Telegram bot for notifications
- [ ] Test end-to-end purchase flow
- [ ] Verify Global Control contact creation
- [ ] Confirm MailerLite automation triggers
- [ ] Schedule weekly monitoring check
