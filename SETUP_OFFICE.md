# Quick Setup Guide for Office Laptop

Follow these simple steps when you open Antigravity IDE on your office laptop:

---

### Step 1: Clone the Repository
Open Terminal on your office laptop and run:
```bash
git clone https://github.com/iftekkhar/DSE.git
cd DSE
```

---

### Step 2: Install Dependencies & Copy `.env`
```bash
npm install
cp .env.example .env
```

---

### Step 3: Start the Backend & Frontend

#### Terminal Tab 1 (Backend Engine):
```bash
npm start
```
*(The backend will automatically create the SQLite database `data/dse.db`, ingest the 20-year master price history dataset, and seed all 440 company audited fundamentals).*

#### Terminal Tab 2 (Frontend Dashboard):
```bash
npm run dev
```

---

### 🌐 Accessing the App
- **Local Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Local API Engine:** [http://localhost:5001](http://localhost:5001)

### 🤖 Antigravity IDE Integration
When you open this folder (`DSE`) in **Antigravity IDE** on your office laptop with your account:
- The AI will automatically read [`AGENTS.md`](file:///AGENTS.md) and know the entire history, architecture, strict commercial grade rules, scrapers, and database layout.
- You can immediately ask: *"continue where we left off"* or give your next directive.
