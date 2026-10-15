# System Explanations & Architecture Guide

Welcome to the **Loan App Safety Checker** system documentation. This document is written in clear, plain language to explain how every major piece of the system works, why specific technologies were chosen, how data moves through the pipeline, and how safety risk scores are calculated.

---

## 1. What is the Loan App Safety Checker?

In recent years, digital lending apps on mobile marketplaces have made personal loans accessible in minutes. However, a significant subset of predatory or unregulated lending apps engage in harmful behaviors:
- Exorbitant hidden fees and illegal 7-day loan repayment cycles.
- Unauthorized harvesting of user contact lists and photo galleries.
- Abusive debt collection, including threatening calls to borrowers' contacts.
- Obfuscated corporate ownership where developer names do not match licensed Non-Banking Financial Companies (NBFCs).

**Loan App Safety Checker** is an automated, evidence-backed investigative platform. It continuously evaluates loan apps listed on public mobile marketplaces (like Google Play), aggregates reviews and external regulatory notices, and applies transparent, versioned scoring rules to surface risk signals before borrowers install them.

> **Crucial Caveat:** This platform is an investigative research aid. It does **not** provide legal determinations, credit recommendations, or absolute guarantees of safety.

---

## 2. High-Level System Architecture & Data Flow

The platform is designed as a **modular monolith** with clean boundaries between collection, persistence, analysis, and presentation.

```
                    ┌───────────────────────────────┐
                    │       Google Play Store       │
                    │   (Public Listings & Reviews) │
                    └───────────────┬───────────────┘
                                    │ Bounded, Rate-Limited
                                    ▼
┌───────────────────────┐   ┌───────────────────────────────┐
│ External Evidence     │──▶│      Backend Collectors       │
│ (Regulators, News)    │   │  (play_store.py, evidence.py) │
└───────────────────────┘   └───────────────┬───────────────┘
                                            │ Normalization & Deduplication
                                            ▼
                            ┌───────────────────────────────┐
                            │    Relational Database        │
                            │   (PostgreSQL / SQLite)       │
                            │  Apps, Reviews, Evidence,     │
                            │  ScanRuns, RiskAssessments    │
                            └───────┬───────────────▲───────┘
                                    │               │
                         Persist    │ Run Heuristics│ Write
                         Raw Data   │ & NLP Themes  │ Scores
                                    ▼               │
                            ┌───────────────────────┴───────┐
                            │   Analysis & Scoring Engine   │
                            │   - Theme Classifier          │
                            │   - Review Anomaly Detector   │
                            │   - Deterministic Risk Engine │
                            └───────────────┬───────────────┘
                                            │
                                            ▼
                            ┌───────────────────────────────┐
                            │     FastAPI REST Service      │
                            │   - /api/v1/apps              │
                            │   - /api/v1/apps/{id}/evidence│
                            │   - /api/v1/scans/latest      │
                            └───────────────┬───────────────┘
                                            │ JSON Responses
                                            ▼
                            ┌───────────────────────────────┐
                            │   Next.js Analyst Dashboard   │
                            │   (Dark Financial UI, Radar,  │
                            │    Filters, Evidence Cards)   │
                            └───────────────────────────────┘
```

### The Step-by-Step Data Journey

1. **Triggering a Scan:**  
   A scan is launched either as a background CLI job (`python -m scripts.run_scan`) or through the authenticated admin endpoint (`POST /api/v1/admin/scans`). Scans are **never executed during a frontend webpage request**, keeping user interactions instantaneous and preventing rate-limit cascades.

2. **App Discovery:**  
   The collector searches specific, configured terms (e.g., `"instant personal loan"`, `"quick cash loan"`). Retrieved apps are parsed, normalized, and deduplicated using their unique Android package ID (e.g., `com.company.loanapp`).

3. **Bounded Review Extraction:**  
   A configurable sample of the latest reviews (e.g., 20–50 reviews per app) is fetched. To protect user privacy, personal identifiers (usernames, profile avatars) are stripped.

4. **External Evidence Collection:**  
   The system queries verified regulatory registries (such as registered NBFC lists) and external search providers. Every piece of external evidence records its source URL, publisher, access timestamp, and the specific claim it corroborates.

5. **Theme Extraction & Anomaly Detection:**  
   Review text is processed by a specialized financial risk classifier. It scans for patterns indicating harassment, extortion, contact harvesting, and predatory repayment cycles. It also detects anomalies, like bursts of identical 5-star reviews on the same day.

6. **Deterministic Risk Calculation:**  
   The risk scoring engine evaluates all collected signals using mathematical rules with fixed weights. It also calculates a separate **Evidence Sufficiency / Confidence Score** ($0.0$ to $1.0$). If there isn't enough data, it marks the app as `Insufficient evidence` rather than falsely declaring it safe.

7. **Storage & Delivery:**  
   All raw evidence, reviews, scan runs, and versioned score breakdowns are stored in PostgreSQL (or SQLite locally). FastAPI serves this data through typed Pydantic endpoints.

8. **User Visualization:**  
   The Next.js dashboard presents the findings using a high-contrast dark theme, intuitive risk badges, interactive charts, and traceable evidence citations.

---

## 3. Technology Choices & Rationale

| Layer | Chosen Technology | Why We Chose It (and what we avoided) |
| :--- | :--- | :--- |
| **Backend Framework** | **FastAPI (Python 3.11+)** | High performance, automatic OpenAPI documentation, asynchronous I/O capabilities, and seamless integration with Python's data analysis libraries. |
| **Data Validation** | **Pydantic v2** | Guarantees strict data typing at API boundaries. Prevents silent data corruption from malformed external web responses. |
| **Database ORM** | **SQLAlchemy 2.0 & Alembic** | Industry-standard declarative relational modeling. Supports rock-solid migrations, complex foreign keys, and clean queries. |
| **Primary Database** | **PostgreSQL (or SQLite locally)** | Provides relational integrity, JSONB support for versioned score breakdowns, and ACID compliance. Allows zero-dependency local development via SQLite with identical model logic. |
| **Collector Stack** | **google-play-scraper & HTTPX** | Lightweight, direct HTTP-based metadata retrieval with async timeouts, exponential backoff, and strict concurrency limits. Avoids heavy browser automation (Selenium/Puppeteer) which consumes excessive memory and triggers anti-bot blocks. |
| **Frontend Framework** | **Next.js 14+ (TypeScript)** | Server-side rendering, type safety across API boundaries, robust routing, and optimal asset bundling. |
| **Styling & Icons** | **Tailwind CSS & Lucide Icons** | Utility-first CSS allows complete control over the bespoke dark financial analyst aesthetic. Lucide provides accessible, lightweight SVG iconography. |
| **Data Visualization** | **Recharts** | Declarative React charting library for score radars, rating trends, and complaint distribution bars. |

### Technologies Intentionally Excluded & Why
- **Redis & Celery:** A background scan for tens of apps does not require a distributed message broker. Standard background tasks and CLI scripts keep the architecture simple and eliminate operational overhead.
- **pgvector & Semantic Databases:** Pure vector embeddings for a small catalog add unnecessary operational burden and cost. Standard relational queries with full-text search and keyword-rule extraction provide deterministic, explainable results.
- **Neo4j / Graph Databases:** NetworkX within Python provides sufficient developer/lender relationship analysis in-memory without maintaining a separate graph server.
- **Generative LLMs as Decision Engines:** Large Language Models are non-deterministic, prone to hallucination, and cannot provide mathematically reproducible audit trails. All risk scoring in this system is strictly deterministic and rule-based.

---

## 4. How the Risk Score is Calculated

The scoring engine evaluates apps against a versioned ruleset (`v1.1.0`). The output is divided into two distinct dimensions:

### Dimension 1: The Risk Score ($0$ to $100$)

The risk score is a heuristic index where higher numbers indicate elevated risk signals. It is computed as:

$$\text{Risk Score} = \text{Clamp}\left(\sum_{\text{signals}} (\text{Weight} \times \text{Severity}) - \sum_{\text{mitigations}} \text{Bonus}, 0, 100\right)$$

#### Negative Risk Signals
1. **Harassment & Threats (`HARASS_01`, Weight: +30):**  
   Multiple borrower reviews reporting threatening phone calls, abusive WhatsApp messages, or intimidation of family members.
2. **Contact Harvesting & Privacy Abuse (`PRIV_01`, Weight: +25):**  
   Reports of the app accessing personal contacts, photo galleries, or sending automated messages to borrower contacts upon default.
3. **Short-Cycle & Hidden Deductions (`PRED_01`, Weight: +20):**  
   Discrepancies where the app advertises a 90-day loan but forces repayment in 7 days, or deducts 30–40% upfront as "processing fees".
4. **Missing or Inaccessible Privacy Policy (`POL_01`, Weight: +15):**  
   No valid HTTPS privacy policy provided on the store listing, or the URL returns a 404/dead page.
5. **Review Manipulation Anomalies (`REV_01`, Weight: +10):**  
   Suspicious distribution: e.g., hundreds of 1-star reviews citing scams juxtaposed with sudden bursts of generic 5-star reviews with identical phrasing.

#### Positive Mitigating Signals (Reduces Score)
1. **Verified Regulated Entity (`REG_01`, Deduction: -25):**  
   Developer or lending partner is verified against the official regulator registry (e.g., RBI registered NBFC list).
2. **Long-Standing Clean Track Record (`HIST_01`, Deduction: -10):**  
   App has been listed for over 2 years with high install volumes and low proportion of predatory complaints.

### Dimension 2: Evidence Sufficiency / Confidence ($0.0$ to $1.0$)

A key innovation of this system is that **absence of evidence is never treated as proof of safety**.

If an app was published yesterday, has only 3 reviews, and no external mentions, its calculated risk might be low simply because no complaints have surfaced yet. The **Evidence Sufficiency Score** measures how much data we actually have:
- **Review Sample Size:** Does the app have sufficient reviews to analyze?
- **Privacy Disclosures:** Is the privacy policy live and parsable?
- **Store Longevity:** Has the app existed long enough to accumulate an audit trail?
- **External Citations:** Have independent sources or regulators evaluated this entity?

### Classification Tiers

Based on both dimensions, an app is classified into one of four transparent categories:
- 🔵 **Insufficient evidence:** Confidence score $< 0.35$. Signals are too sparse to make a meaningful heuristic determination.
- 🟢 **Lower concern:** Risk Score $< 30$ and Confidence $\ge 0.35$.
- 🟡 **Caution:** $30 \le \text{Risk Score} < 65$ and Confidence $\ge 0.35$.
- 🔴 **High concern:** Risk Score $\ge 65$.

---

## 5. Deployment Overview

- **Frontend:** Deployed to **Vercel** with automatic preview branches, edge caching, and global CDN distribution.
- **Backend API:** Containerized or hosted on **Render / Railway**, running FastAPI behind Uvicorn.
- **Database:** Managed **PostgreSQL** (e.g. Supabase, Neon, or Render PostgreSQL).
- **Environment Variables:** All secrets (database URLs, admin tokens, external API keys) are strictly server-side and configured in hosting dashboards.
- **CORS:** Restricted strictly to the deployed frontend domain to prevent unauthorized web browsers from hitting administrative endpoints.
