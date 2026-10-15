# Research Methodology & Evidence Hierarchy

**Document Version:** `v1.0.0`  
**Purpose:** Outlines the investigatory framework, evidence evaluation standards, and analytical boundaries implemented in the platform.

---

## 1. Scope and Analytical Boundaries

The **Loan App Safety Checker** system evaluates observable digital lending risk signals associated with public mobile applications.
- **What it does:** Surfaces corroborated consumer complaints, contact harvesting allegations, predatory repayment patterns, privacy transparency gaps, and verified regulatory statuses.
- **What it does not do:** It cannot provide a definitive legal determination of fraud or innocence, issue a credit rating, or verify closed runtime source code. Assessments are informational research heuristics.

---

## 2. Evidence Hierarchy

Evidence is gathered from multiple public sources and evaluated according to a strict credibility hierarchy:

```
┌────────────────────────────────────────────────────────┐
│ Level 1: Official Regulatory & Government Notices      │  ▶ Weight: Highest (0.90 - 0.95)
│ Reserve Bank of India (RBI) Gazette, State Cyber Cells │  ▶ Verifiable entity matches & public advisories
├────────────────────────────────────────────────────────┤
│ Level 2: Verified Legal Entity Registries              │  ▶ Weight: High (0.85 - 0.95)
│ Corporate affairs registries & licensed NBFC lists     │  ▶ Establishes corporate accountability
├────────────────────────────────────────────────────────┤
│ Level 3: Reputable Investigative Journalism            │  ▶ Weight: Moderate-High (0.70 - 0.80)
│ Mainstream financial press with named sourcing         │  ▶ Corroborates recurring predatory behavior
├────────────────────────────────────────────────────────┤
│ Level 4: Bounded App Store User Reviews                │  ▶ Weight: Heuristic (0.50 - 0.70)
│ Public customer reviews on Google Play Store           │  ▶ Anonymized and aggregated for recurring patterns
├────────────────────────────────────────────────────────┤
│ Level 5: Unverified Social Media & Forums              │  ▶ Weight: Low (Filtered out by default)
│ Unattributed public threads                            │  ▶ Treated strictly as investigatory leads
└────────────────────────────────────────────────────────┘
```

---

## 3. Four-Tier Classification System

Observations and assertions in the platform are strictly labeled according to their epistemic certainty:

1. **Verified Facts:** Directly verifiable against primary official registries (e.g., *"Developer entity matches RBI-registered NBFC-ICC"* or *"Privacy policy URL returned HTTP 404"*).
2. **Attributed Allegations:** Customer reports originating from public reviews (e.g., *"Reviewers allege collection agents sent abusive messages on WhatsApp"*). These are never stated as proven facts.
3. **Heuristic Indicators:** Mathematical signals computed from pattern analysis (e.g., *"Bimodal star polarization detected"* or *"Risk score 88/100"*).
4. **Unknowns:** Areas where data is absent or unavailable (e.g., *"No external regulatory advisory found"* or *"Installs volume unverified"*).

---

## 4. Review Sentiment & Complaint Analysis

1. **Lexical Financial Theme Classification:**  
   Reviews are parsed using pattern matching across five distinct predatory lending themes:
   - `harassment_threats`: Abusive calls, defamation, intimidation of family members.
   - `privacy_contact_abuse`: Harvesting contact books, unauthorized photo access, extortion.
   - `short_cycle_extortion`: 7-day or 5-day repayment traps contradicting advertised terms.
   - `hidden_fees_deductions`: Upfront deductions exceeding 25-40% of loan principal.
   - `deceptive_rates`: Astronomical unadvertised interest rates and penalties.
2. **Review Manipulation & Anomaly Detection:**  
   Review distributions are tested for:
   - **Bimodal Polarization:** High proportion of 1-star complaints offset by a sudden surge of 5-star ratings.
   - **Textual Duplication:** Repeated boilerplate phrases ($> 25\%$ repetition ratio) indicating automated or incentivized positive reviews.
3. **Caveat on Reviews:**  
   Customer reviews are inherently self-selected and can be skewed. Negative reviews alone do not establish fraud; they serve as prioritized signals for human analysts.
