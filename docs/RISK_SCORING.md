# Risk Scoring Methodology & Worked Examples

**Engine Version:** `v1.1.0`
**Status:** Implemented & Deterministic

This document specifies the exact mathematical rules, weights, thresholds, confidence metrics, and worked examples implemented in `backend/app/analysis/risk.py`.

---

## 1. Core Principles

1. **Deterministic & Reproducible:** Given the identical set of store metadata, reviews, and evidence, the scoring algorithm will *always* compute the exact same score and indicator breakdown.
2. **Separation of Risk from Confidence:** Risk score ($0$ to $100$) indicates the intensity of observable negative signals. Confidence / Evidence Sufficiency ($0.0$ to $1.0$) measures data availability.
3. **Never Treat Silence as Safety:** An app with 0 reviews and no public history will not receive a "Lower concern" rating. It will be classified as `Insufficient evidence`.
4. **Counter-Evidence & Mitigations:** Verified regulatory registrations (e.g. licensed NBFCs) and long adoption histories provide explicit mathematical deductions against raw risk.
5. **No Black-Box LLM Judging:** Risk determinations do not rely on generative LLMs. All scores derive from auditable mathematical rules with explicit citations.

---

## 2. Mathematical Formulation

The final risk score is bounded within $[0.0, 100.0]$:

$$\text{Risk Score} = \max\left(0.0, \min\left(100.0, \sum \text{Risk Penalties} - \sum \text{Mitigation Bonuses}\right)\right)$$

### 2.1 Penalties (Negative Risk Signals)

| Rule ID | Signal Name | Max Weight | Calculation Condition | Citation / Source |
| :--- | :--- | :--- | :--- | :--- |
| `HARASS_01` | Harassment & Coercion | **+30.0** | $\min(30.0, 30.0 \times \frac{\text{harass\_count}}{\max(3, N \times 0.15)})$ | Sampled user reviews citing threats, abusive calls, or shaming contacts |
| `PRIV_01` | Contact Harvesting & Privacy Abuse | **+25.0** | $\min(25.0, 25.0 \times \frac{\text{priv\_count}}{\max(2, N \times 0.10)})$ | User reviews citing stolen contact books, gallery access, or blackmailed contacts |
| `PRED_01` | Predatory Terms & Upfront Deductions | **+20.0** | $\min(20.0, 20.0 \times \frac{\text{pred\_count}}{\max(2, N \times 0.10)})$ | Reports of 7-day extortion or 30-40% hidden upfront processing deductions |
| `POL_01` | Insecure / Missing Privacy Policy | **+15.0** | Flat +15.0 if `privacy_policy_url` is missing or non-HTTPS | Store listing metadata |
| `REV_01` | Review Manipulation Anomalies | **+10.0** | Flat +10.0 if bimodal star polarization or $\ge 25\%$ repeated review text | Statistical review distribution analysis |
| `REG_ADV_01`| Regulatory Cautionary Advisory | **+35.0** | Flat +35.0 if package ID or developer appears on official advisory | State Cyber Cell, Consumer Affairs, or RBI advisories |

### 2.2 Mitigations (Positive Safety Factors)

| Rule ID | Mitigation Factor | Bonus Value | Qualification Criteria | Verification Source |
| :--- | :--- | :--- | :--- | :--- |
| `REG_NBFC_01`| Verified Regulated Entity | **-25.0** | Developer / named lender verified in official RBI NBFC register | Official Reserve Bank of India Register |
| `HIST_01` | High Adoption & Clean Record | **-10.0** | $\ge 1,000,000$ installs, $\ge 20$ reviews sampled, and complaint ratio $< 5\%$ | Store adoption statistics |

---

## 3. Evidence Sufficiency / Confidence Score

The confidence score ranges from $0.00$ to $1.00$ and is computed from four independent dimensions:

$$\text{Confidence} = C_{\text{reviews}} + C_{\text{policy}} + C_{\text{volume}} + C_{\text{evidence}}$$

1. **Review Sample Volume ($C_{\text{reviews}}$, max $0.35$):**  
   $$C_{\text{reviews}} = \min\left(0.35, \frac{N_{\text{reviews}}}{25} \times 0.35\right)$$
2. **Privacy Policy Presence ($C_{\text{policy}}$, max $0.25$):**  
   $0.25$ if a valid HTTPS privacy policy exists; $0.05$ if missing or insecure.
3. **Store Rating Volume ($C_{\text{volume}}$, max $0.20$):**  
   $$C_{\text{volume}} = \min\left(0.20, \frac{\log_{10}(\text{Rating Count} + 1)}{5.0} \times 0.20\right)$$
4. **External Evidence Availability ($C_{\text{evidence}}$, max $0.20$):**  
   $$C_{\text{evidence}} = \min\left(0.20, N_{\text{evidence\_items}} \times 0.10\right)$$

### Confidence Levels
- **High:** $\ge 0.70$
- **Medium:** $0.45 \le \text{Confidence} < 0.70$
- **Low:** $0.30 \le \text{Confidence} < 0.45$
- **Insufficient:** $< 0.30$

---

## 4. Assessment Tiers & Decision Boundaries

```
                 Confidence < 0.35 OR Data Sparse?
                              │
                    ┌─────────┴─────────┐
                   YES                  NO
                    │                   │
                    ▼                   ▼
       [ Insufficient evidence ]   Evaluate Risk Score
                                        │
                      ┌─────────────────┼─────────────────┐
                      ▼                 ▼                 ▼
                 Risk < 30.0     30.0 ≤ Risk < 65.0   Risk ≥ 65.0
                      │                 │                 │
                      ▼                 ▼                 ▼
              [ Lower concern ]    [ Caution ]     [ High concern ]
```

---

## 5. Worked Examples

### Example 1: Predatory Instant Cash App (`com.speedyloan.instantcredit`)
- **Metadata:** 10,000 installs, 85 ratings, insecure HTTP privacy policy (`POL_01` triggered: +15.0).
- **Reviews (25 sampled):**
  - 8 reviews cite threatening calls and abusive collection (`HARASS_01` triggered: +30.0).
  - 5 reviews cite stolen contacts and gallery extortion (`PRIV_01` triggered: +25.0).
  - 6 reviews report 7-day loan trap with 35% deduction (`PRED_01` triggered: +20.0).
- **External Evidence:** Listed on State Cyber Cell advisory (`REG_ADV_01` triggered: +35.0).
- **Mitigations:** None.
- **Score Calculation:**  
  $$\text{Raw Score} = 15.0 + 30.0 + 25.0 + 20.0 + 35.0 = 125.0 \implies \text{Clamped to } 100.0$$
- **Confidence Calculation:**  
  $C = 0.35 (\text{reviews}) + 0.05 (\text{policy}) + 0.08 (\text{ratings}) + 0.10 (\text{advisory}) = 0.58 \text{ (Medium)}$
- **Verdict:** 🔴 **High concern** (Score: 100/100, Confidence: 0.58).

---

### Example 2: Verified NBFC Lender (`com.bajaj.finserv`)
- **Metadata:** 50,000,000+ installs, 1,200,000 ratings, valid HTTPS privacy policy.
- **Reviews (30 sampled):**
  - 0 harassment allegations.
  - 1 user complaining of app lag, 2 users complaining of high interest rates (`deceptive_rates`).
- **External Evidence:** Developer matches RBI Verified NBFC-ICC Register (`REG_NBFC_01` triggered: -25.0).
- **Mitigations:** High adoption & clean history (`HIST_01` triggered: -10.0).
- **Score Calculation:**  
  $$\text{Raw Score} = 0.0 - 25.0 - 10.0 = -35.0 \implies \text{Clamped to } 0.0$$
- **Confidence Calculation:**  
  $C = 0.35 (\text{reviews}) + 0.25 (\text{policy}) + 0.20 (\text{ratings}) + 0.10 (\text{register}) = 0.90 \text{ (High)}$
- **Verdict:** 🟢 **Lower concern** (Score: 0/100, Confidence: 0.90).

---

### Example 3: Unverified Newly Released App (`com.fastpeso.quickloan`)
- **Metadata:** 100+ installs, 4 ratings, no privacy policy listed.
- **Reviews (2 sampled):** "Good app" and "fast".
- **External Evidence:** None found.
- **Score Calculation:**  
  $\text{Raw Score} = 15.0 (\text{missing policy}) = 15.0$
- **Confidence Calculation:**  
  $C = 0.03 (\text{reviews}) + 0.05 (\text{policy}) + 0.03 (\text{ratings}) + 0.0 = 0.11 \text{ (Insufficient)}$
- **Decision Rule Triggered:** Confidence $0.11 < 0.35$ and review sample $< 5$.
- **Verdict:** 🔵 **Insufficient evidence** (Score: 15/100 flagged, Status: Insufficient evidence).
