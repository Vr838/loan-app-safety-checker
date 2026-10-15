# Demo Walkthrough Guide for Reviewers

This walkthrough guides reviewers and evaluators through verifying the **Loan App Safety Checker** application locally or on a deployed instance.

---

## Prerequisites & One-Command Quickstart

Ensure you have **Python 3.11+** and **Node.js 18+** installed.

### 1. Start the Backend API & Database
```bash
# Navigate to backend directory
cd backend

# Create virtual environment and activate
python3 -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt -r requirements-dev.txt

# Run database migrations
alembic upgrade head

# Seed the pre-packaged labeled demo dataset
python ../scripts/seed_demo_data.py

# Launch FastAPI development server
uvicorn app.main:app --reload --port 8000
```
*API is now live at `http://localhost:8000`. Test `http://localhost:8000/health` or `http://localhost:8000/docs`.*

### 2. Start the Next.js Dashboard
In a second terminal window:
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
*Dashboard is now running at `http://localhost:3000`.*

---

## Verification Steps for Reviewers

### Step 1: Health & System Verification
1. Open your browser and navigate to `http://localhost:8000/health`.
2. Confirm the JSON response indicates `"status": "ok"` and `"database_connected": true`.
3. Open `http://localhost:8000/docs` to view the interactive OpenAPI documentation.

### Step 2: Analyst Dashboard Overview
1. Open `http://localhost:3000` in your browser.
2. Observe the polished dark financial intelligence dashboard:
   - **Overview Metric Cards:** Inspect total apps analyzed (4 apps), risk category counters, and scan coverage stats.
   - **Last Scan Status:** Confirm the latest scan timestamp and successful completion badge are visible.

### Step 3: Search, Filter, and Sort Controls
1. **Search Test:** In the search input, type `"Bajaj"`. Observe that only the verified NBFC app appears. Clear the search.
2. **Category Filter Test:** Click the **"High concern"** filter button. Observe that only apps exhibiting predatory signals (such as `Speedy Rupee`) remain visible.
3. **Reset Filters:** Click **"All Categories"** to restore the full catalog.
4. **Sort Test:** Toggle the sorting dropdown between **"Highest Risk"**, **"Lowest Risk"**, and **"Highest Rating"**. Observe instant reordering.

### Step 4: Investigating a "High Concern" App
1. Locate **"Speedy Rupee - Instant Quick Cash"** (`com.speedyloan.instantcredit`) and click **"Inspect App"** or the row card.
2. In the detailed investigation view:
   - **Risk Gauge:** Observe the score of `88.0 / 100` with the `High concern` badge.
   - **Evidence Sufficiency / Confidence:** Confirm the confidence score (`0.74 - High`) is displayed with the exact explanation.
   - **Complaint Theme Breakdown:** Review the bar chart highlighting detected themes (8 Harassment complaints, 6 Privacy abuse complaints, 7 Predatory 7-day reports).
   - **Triggered Indicators:** Expand the negative indicators list to see specific citations attributed to Google Play reviews and State Cyber Cell advisories.
   - **Verifiable Evidence:** Check the linked public advisory from the State Cyber Cell.

### Step 5: Investigating "Insufficient Evidence"
1. Return to the list and select **"QuickPeso: Emergency Cash Loan"** (`com.quickpeso.earlycash`).
2. Observe the transparent handling:
   - The app has a 5.0 star rating but only 3 ratings and no external audit trail.
   - The system displays the `Insufficient evidence` badge.
   - The sufficiency meter explains: *"Sample contains only 2 reviews and 3 ratings... System cannot make a reliable heuristic assessment."*
   - Demonstrates that lack of complaints is never conflated with verified safety.

### Step 6: Testing the Protected Scan Trigger
1. On the dashboard, click **"Trigger Scan"** in the top navigation bar.
2. Enter an invalid token (e.g. `bad-token`) and submit. Observe the error notification (`401 Unauthorized`).
3. Enter the configured development token (`dev-secret-admin-token-replace-in-prod`) and click **"Run Scan"**.
4. Observe the confirmation that the scan job was accepted into the background without freezing the UI.

### Step 7: Automated Test Suite Verification
In the backend terminal, run:
```bash
pytest -v
```
Observe that all 23 tests pass in under 30 seconds with 100% mocked network calls.
