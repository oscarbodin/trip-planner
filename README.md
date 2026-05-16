# Trip Planner — Cloudflare Pages

A travel itinerary site backed by Cloudflare Pages + D1 (SQLite). Update your trip data anytime by uploading a CSV from the admin page.

## Project Structure

```
trip-planner/
├── wrangler.toml            # Cloudflare config
├── schema.sql               # D1 database schema
├── sample.csv               # Example CSV to test with
├── public/
│   ├── index.html           # Main itinerary view
│   └── admin.html           # CSV upload admin page
└── functions/
    └── api/
        ├── stops.js         # GET /api/stops
        └── upload.js        # POST /api/upload
```

## First-time Setup

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Create the D1 database

```bash
wrangler d1 create trip-planner-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "trip-planner-db"
database_id = "PASTE_YOUR_ID_HERE"   # ← here
```

### 3. Apply the schema

```bash
wrangler d1 execute trip-planner-db --file=schema.sql
```

### 4. Deploy to Cloudflare Pages

```bash
wrangler pages deploy public --project-name trip-planner
```

> On first deploy, Wrangler will ask you to create a new Pages project. Accept the defaults.

### 5. Connect D1 to your Pages project

Go to **Cloudflare Dashboard → Pages → trip-planner → Settings → Functions → D1 database bindings** and add:

| Variable name | D1 database       |
|---------------|-------------------|
| `DB`          | trip-planner-db   |

### 6. Set the admin secret

```bash
wrangler pages secret put ADMIN_SECRET
# Enter a strong password when prompted
```

This protects the `/api/upload` endpoint. You'll enter this password on the admin page.

---

## Uploading your trip data

1. Fill in `sample.csv` (or make your own) with your stops.
2. Go to `https://your-site.pages.dev/admin.html`
3. Enter your admin secret and drop the CSV file.
4. Click **Upload & Replace All Stops**.

> ⚠️ Each upload replaces **all** existing stops. Keep your CSV as the source of truth.

---

## Local development

Run everything locally with:

```bash
wrangler pages dev public --d1=DB=trip-planner-db
```

Then visit `http://localhost:8788` for the main site and `/admin.html` for the admin page.

For local D1, apply the schema once:

```bash
wrangler d1 execute trip-planner-db --local --file=schema.sql
```

And import sample data by uploading via the admin page with your secret.

---

## CSV column reference

| Column                 | Example                          | Notes                                 |
|------------------------|----------------------------------|---------------------------------------|
| `order`                | `1`                              | Required. Sets display order.         |
| `name`                 | `Hotel Bellagio`                 | Required.                             |
| `type`                 | `Hotel`                          | Hotel / Airbnb / Campsite / etc.      |
| `address`              | `Via Como 7, Italy`              | Links to Google Maps automatically.   |
| `checkin`              | `2026-07-10 15:00`               | ISO date + time.                      |
| `checkout`             | `2026-07-12 11:00`               | ISO date + time.                      |
| `nights`               | `2`                              | Can leave blank; purely informational.|
| `cancellation_deadline`| `2026-07-05`                     | Shows warning if deadline is close.   |
| `price`                | `240`                            | Numeric, no symbols.                  |
| `currency`             | `EUR`                            | EUR / SEK / CHF / USD / GBP etc.      |
| `payment_status`       | `Paid`                           | Paid / Pay on arrival / Partially paid|
| `booking_ref`          | `BK-9284712`                     | Copyable button on card.              |
| `booking_url`          | `https://booking.com/...`        | Opens in new tab.                     |
| `phone`                | `+39 031 123456`                 | Clickable tel: link.                  |
| `distance_to_next_km`  | `85`                             | Shows connector between cards.        |
| `notes`                | `Breakfast included, code: 1234` | Free text. Wrap in quotes if it contains commas. |
| `image_url`            | `https://…/photo.jpg`            | Any public image URL.                 |

### Tips for editing CSV in Excel / Numbers / LibreOffice

- Save as **CSV UTF-8** (not regular CSV) to preserve special characters like ä, ö, ü.
- Wrap any field containing a comma in double quotes: `"Parking included, pets allowed"`
- Date format must be `YYYY-MM-DD` or `YYYY-MM-DD HH:MM`.
