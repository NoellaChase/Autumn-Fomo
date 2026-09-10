# Google Analytics Setup for Summer FOMO

## Step 1: Create Google Analytics Account

1. Go to https://analytics.google.com
2. Sign in with **noellachasedesignz@gmail.com**
3. Click **Start measuring**
4. Account name: "Noella Chase Designz"
5. Property name: "Summer FOMO"
6. Time zone: America/Edmonton
7. Currency: CAD

## Step 2: Set Up Data Stream

1. Choose **Web**
2. Website URL: `https://summer-fomo.vercel.app`
3. Stream name: "Summer FOMO Sales Page"
4. Click **Create stream**

## Step 3: Get Tracking Code

After creating the stream, you'll see a **Measurement ID** (looks like `G-XXXXXXXXXX`)

Copy this ID — you'll need it.

## Step 4: Add Tracking Code to Website

I will add this code to your `index.html`:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## Step 5: Track Events

I can also track:
- Button clicks (PayPal, Stripe)
- Page views (Thank you page)
- Form submissions

## What You'll See

Once set up, you'll be able to monitor:
- Real-time visitors
- Total page views
- Traffic sources (where visitors come from)
- Button clicks
- Geographic location of visitors
- Device types (mobile/desktop)

---

**Next Step:** Create the Google Analytics account and send me the Measurement ID (G-XXXXXXXXXX). I'll add the tracking code and redeploy!
