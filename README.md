# 📈 DSE Stock Analytics & Live Auto-Scraper Dashboard

A modern, institutional-grade analytics dashboard for the **Dhaka Stock Exchange (DSE)** featuring automated scoring, real-time live scrapers, and 9 AM – 6 PM BST auto-refresh schedules.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/iftekkhar/DSE)

---

## ⚡ 1-Click Cloud Deployment (100% Free)

Deploy the standalone backend scraper & API to **Render.com** (Free Tier):

👉 **[Click Here to Deploy Backend on Render](https://render.com/deploy?repo=https://github.com/iftekkhar/DSE)**

- **Auto-Scraping**: Pre-configured to automatically scrape DSE market feeds every hour from **9:00 AM to 6:00 PM Bangladesh Standard Time (BST / Asia/Dhaka)** (`0 9-18 * * *`).
- **Endpoints**:
  - `GET /` — API Status & Healthcheck
  - `GET /api/stocks` — All listed equities with live metrics & fallback tagging
  - `POST /api/scrape` — Instant live sync
  - `GET /api/history/:symbol` — Recorded historical snapshots

---

## 💻 Running the Frontend Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/iftekkhar/DSE.git
   cd DSE
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your live backend URL in `.env`:
   ```env
   VITE_API_URL=https://<YOUR_RENDER_APP_NAME>.onrender.com
   ```
4. Start the frontend dev server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

