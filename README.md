# LeadScout

Har niche ke liye real-world business leads dhoondne wala tool — jaisa Artora,
ek deployable Next.js web app jo Vercel par live ho sakta hai.

## Ye kaise kaam karta hai

1. User niche (e.g. "dentists") aur location (e.g. "Lahore") daalta hai.
2. Backend **Google Places API** se real, currently-listed businesses nikaalta hai
   — naam, address, phone, website, rating.
3. Agar business ki website hai, backend **Hunter.io** se us domain ke public
   contact emails (decision-makers) dhoondta hai.
4. Results screen par cards mein aate hain, aur CSV export ho sakte hain.

Ye do legit, ToS-compliant APIs use karta hai — LinkedIn ya kisi bhi site ko
scrape nahi karta. Scraping LinkedIn/Google jaisi sites unke terms of service
todta hai aur account ban + legal risk ka sabab ban sakta hai, isliye ye tool
jaan-boojh kar official APIs par based hai.

## Setup (local)

```bash
npm install
cp .env.example .env.local
# .env.local mein apni keys daalo
npm run dev
```

`http://localhost:3000` par khul jayega.

## API keys kahan se milengi

- **Google Places API** (zaroori): [Google Cloud Console](https://console.cloud.google.com/)
  → "Places API" enable karo → API key banao. Free tier har month kaafi
  requests deta hai; usage-based billing hai, card lagana padega.
- **Hunter.io API** (optional — sirf contact emails ke liye): [hunter.io](https://hunter.io)
  par free account banao, 25 searches/month free milti hain. Bina isके
  business data phir bhi milega, bas contact emails nahi aayenge.

## Vercel par deploy karna (Artora jaisa live link)

1. Ye code GitHub repo mein push karo.
2. [vercel.com](https://vercel.com) par jao → "New Project" → apna repo import karo.
3. Deploy karne se pehle "Environment Variables" mein:
   - `GOOGLE_PLACES_API_KEY`
   - `HUNTER_API_KEY` (optional)
4. Deploy dabao. 2 minute mein live link mil jayega jo tum kisi ke saath
   share kar sakte ho.

## Important — legal/ethical use

- Sirf woh contact info dikhaye jati hai jo publicly discoverable hai
  (business ki apni website ke domain se, Hunter.io ke zariye).
- Kisi bhi lead ko contact karte waqt apne mulk ke data-privacy aur
  anti-spam laws (jaise CAN-SPAM, GDPR agar EU leads hain) follow karo.
- Google Places aur Hunter.io ke apne usage terms hain — dono ki free/paid
  limits check kar lo agar scale par use karna hai.

## Extend karne ke ideas

- Location ko lat/lng radius search mein badal sakte ho (zyada precise).
- Results ko database mein save karke duplicate-check add kar sakte ho.
- Hunter ki jagah Apollo.io ya Clearbit jaise doosre legit enrichment
  providers plug kar sakte ho.
