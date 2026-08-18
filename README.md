# Artora LeadScout

Har niche ke liye real-world business leads dhoondne wala tool — login/signup,
daily credits system, aur teen custom-input dropdowns (niche, area, business
type) ke saath. Bilkul free tools par based hai, koi card nahi chahiye.

## Ye kaise kaam karta hai

1. User account banata hai (email + password), har account ko roz **1000
   free credits** milte hain (raat 12 baje UTC reset hote hain).
2. User teen dropdowns bharta hai — Service niche, Area, Business type —
   har field mein "Custom" option bhi hai jahan apna khud ka likh sakte ho.
3. **Scan** dabane par 10 results milte hain, **100 credits** consume hote
   hain. **Explore more** dabane par agle 10 results milte hain, sirf
   **10 credits** consume hote hain.
4. Backend **OpenStreetMap (Nominatim + Overpass API)** se real businesses
   nikaalta hai — naam, address, phone, website, social media handles
   (jahan OSM par listed hon). Ye 100% free hai.
5. Agar business ki website hai, backend **Hunter.io** se us domain ke
   public contact emails dhoondta hai (optional, free tier).

## Setup — 2 cheezein chahiye (dono free, no card)

### 1. Supabase (auth + credits ke liye)

1. [supabase.com](https://supabase.com) par free account banao (email se,
   card nahi chahiye).
2. "New Project" banao, koi bhi naam do, database password set karo.
3. Project ready hone ke baad, left sidebar mein **SQL Editor** kholo, aur
   ye poora query paste karke **Run** dabao:

```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  credits integer default 1000,
  credits_date date default current_date
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
```

4. Left sidebar mein **Project Settings → API** kholo. Yahan se teen cheezein
   copy karo:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (⚠️ secret, kabhi frontend mein mat use karna) →
     `SUPABASE_SERVICE_ROLE_KEY`
5. **Authentication → Providers → Email** mein jao aur "Confirm email"
   ko band kar do agar chahte ho users turant sign up ke baad login kar
   sakein bina email verify kiye (testing ke liye aasan hai; production
   mein on rakhna better hai).

### 2. Hunter.io (optional — contact emails ke liye)

[hunter.io](https://hunter.io) par free account banao — "Sign up with
email" wala option use karo (Google signup professional email maangta hai,
email/password wala nahi maangta). Dashboard → API section se key mil
jayegi. 25 searches/month free hain. Iske bina bhi app chalega, bas contact
emails nahi milenge.

## Setup (local test)

```bash
npm install
cp .env.example .env.local
# .env.local mein apni Supabase + Hunter keys daalo
npm run dev
```

`http://localhost:3000` par khul jayega.

## Vercel par deploy karna (live link)

1. Code GitHub repo mein push karo (poora `app/`, `lib/`, `components/`
   folder structure ke saath — files root mein flat mat rakho).
2. [vercel.com](https://vercel.com) par "New Project" → repo import karo.
3. "Environment Variables" mein ye 4 daalo:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `HUNTER_API_KEY` (optional)
4. Deploy dabao. 2 minute mein live link milega.

## Free vs paid — trade-off

OpenStreetMap ka data Google Maps jitna complete nahi hai. Bade shehron
mein theek chalega, chhote shehron mein kam results ya missing phone
numbers mil sakte hain. Jab kabhi budget ho, Google Places API se swap
kiya ja sakta hai zyada accurate data ke liye.

## Important — legal/ethical use

- Sirf woh contact info dikhaye jati hai jo publicly discoverable hai.
- Kisi bhi lead ko contact karte waqt apne mulk ke data-privacy aur
  anti-spam laws follow karo.
- OpenStreetMap aur Hunter.io ke apne usage terms hain.

## Extend karne ke ideas

- Credits ka amount/reset time `lib/credits.js` mein change ho sakta hai.
- Search cost (100) aur explore cost (10) `app/api/leads/route.js` ke
  upar `SCAN_COST` / `EXPLORE_COST` mein change ho sakte hain.
- Jab budget ho, Google Places API add karke ratings/reviews bhi mil
  sakte hain.
