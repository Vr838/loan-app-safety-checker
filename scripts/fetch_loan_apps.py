#!/usr/bin/env python3
"""
fetch_loan_apps.py — Real Google Play Store Loan App Discovery & Safety Analysis Script
=========================================================================================
HOW IT WORKS:
  1. Uses google-play-scraper to search multiple loan-related queries on Play Store (India).
  2. Deduplicates results by package ID. Filters out pure EMI calculators.
  3. Fetches full metadata (rating, installs, developer, privacy policy URL) for each app.
  4. Fetches up to 50 user reviews per app and classifies complaint themes via regex patterns.
  5. Applies a deterministic risk scoring formula (mirrors backend/app/analysis/scoring.py).
  6. Outputs scripts/loan_apps_report.json consumed by the frontend.

USAGE:
  cd loan-app-safety-checker-blueprint/
  ./backend/.venv/bin/python3 scripts/fetch_loan_apps.py

RATE-LIMITING:
  Adds 1.5-3s jitter delay between every network call. Max 20 apps per run.
"""

import json, logging, random, re, sys, time, os
from datetime import datetime, timezone
from typing import Dict, List, Optional

try:
    from google_play_scraper import Sort, app as gps_app, reviews as gps_reviews, search as gps_search
except ImportError:
    print("ERROR: pip install google-play-scraper"); sys.exit(1)

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("fetch_loan_apps")

# ── Config ──────────────────────────────────────────────────────────────────
LOAN_QUERIES = [
    "instant personal loan india",
    "quick cash loan rupee",
    "salary advance loan india",
    "personal loan emi india",
    "payday loan instant approval india",
    "instant loan app no documents",
]
EXCLUDE_KEYWORDS = ["emi calculator", "loan calculator", "home loan calculator", "car loan calculator"]
MAX_APPS_PER_QUERY   = 10
MAX_APPS_TOTAL       = 20
MAX_REVIEWS_PER_APP  = 50
COUNTRY, LANGUAGE    = "in", "en"

# ── Complaint classifier ─────────────────────────────────────────────────────
COMPLAINT_PATTERNS = {
    "harassment_threats": [
        r"threat", r"harass", r"abuse", r"abusive", r"blackmail", r"extort",
        r"contact list", r"calling family", r"calling relatives",
        r"embarrass", r"share contacts", r"whatsapp.+family",
    ],
    "privacy_contact_abuse": [
        r"access.+contacts?", r"stole.+contacts?", r"contact.+hack",
        r"photo.+access", r"gallery.+access", r"personal data", r"data.+sell",
        r"permission.+scary", r"all permissions",
    ],
    "short_cycle_extortion": [
        r"7.?day", r"seven.?day", r"1.?week", r"illegal.+tenure",
        r"forced.+repay", r"only.+7 days", r"one week loan",
    ],
    "hidden_fees_deductions": [
        r"hidden.+fee", r"deduct.+without", r"processing.+fee.+high",
        r"receive.+less", r"disburs.+less", r"charged.+extra",
        r"convenienc.+fee", r"upfront.+deduct", r"not.+disclosed",
    ],
    "fake_reviews_suspected": [
        r"fake.+review", r"paid.+review", r"bot.+review", r"5 star.+fake",
    ],
    "deceptive_rates": [
        r"interest.+high", r"high.+interest", r"rate.+not.+disclosed",
        r"usurious", r"loan.+shark",
    ],
}

RBI_REGISTERED_NBFCS = {
    "Bajaj Finance Limited",
    "Home Credit India Finance Private Limited",
    "PayU Finance (India) Private Limited",
    "PaySense Services India Private Limited",
    "OnEMI Technology Solutions Limited.",
    "OnEMI Technology Solutions Limited",
    "CASHe: Instant Personal Loan App",
    "Vivifi India Finance Pvt Ltd",
    "Moneyview",
    "IndiaLends - GC Web Ventures Private Limited",
    "Branch International Financial Services Pvt Ltd",
}
CYBER_ADVISORY_FLAGGED = {
    "com.rupeeflow.creditpath",
    "com.gfpls.personalloan",
    "com.vmoney.app",
    "com.pocket.rupee.deal",
}

def throttle():
    time.sleep(random.uniform(1.5, 3.0))

def classify_complaints(reviews):
    counts = {k: 0 for k in COMPLAINT_PATTERNS}
    for rev in reviews:
        text = (rev.get("text") or "").lower()
        for theme, patterns in COMPLAINT_PATTERNS.items():
            for pat in patterns:
                if re.search(pat, text):
                    counts[theme] += 1
                    break
    return {k: v for k, v in counts.items() if v > 0}

def score_app(app_data, complaints, review_count, is_nbfc, is_cyber):
    score = 0.0
    neg, pos = [], []

    if complaints.get("harassment_threats", 0) >= 3:
        score += 30; neg.append({"rule_id":"HARASS_01","category":"Conduct & Collection",
            "finding":f"{complaints['harassment_threats']} reviews mention harassment/threats by collectors.",
            "impact":"negative","weight":30.0,"contribution":30.0,"source":"Google Play Reviews"})
    if complaints.get("privacy_contact_abuse", 0) >= 3:
        score += 25; neg.append({"rule_id":"PRIV_01","category":"Privacy & Permissions",
            "finding":f"{complaints['privacy_contact_abuse']} reviews report unauthorized contact/photo access.",
            "impact":"negative","weight":25.0,"contribution":25.0,"source":"Google Play Reviews"})
    if complaints.get("short_cycle_extortion", 0) >= 2:
        score += 20; neg.append({"rule_id":"PRED_01","category":"Loan Terms & Transparency",
            "finding":"Reviews mention 7-day illegal loan cycle/forced repayment.",
            "impact":"negative","weight":20.0,"contribution":20.0,"source":"Google Play Reviews"})
    if complaints.get("hidden_fees_deductions", 0) >= 2:
        score += 20; neg.append({"rule_id":"HIDDEN_01","category":"Fee Transparency",
            "finding":f"{complaints['hidden_fees_deductions']} reviews report hidden/undisclosed fees.",
            "impact":"negative","weight":20.0,"contribution":20.0,"source":"Google Play Reviews"})
    if not app_data.get("privacy_policy_url"):
        score += 15; neg.append({"rule_id":"POL_01","category":"Privacy Transparency",
            "finding":"No privacy policy URL on store listing.",
            "impact":"negative","weight":15.0,"contribution":15.0,"source":"Store Listing Metadata"})
    r = app_data.get("rating") or 0
    rc = app_data.get("rating_count") or 0
    if r < 3.0 and rc >= 100:
        score += 15; neg.append({"rule_id":"RATING_01","category":"User Sentiment",
            "finding":f"Rating {r:.1f} below 3.0 with {rc:,} ratings.",
            "impact":"negative","weight":15.0,"contribution":15.0,"source":"Store Listing Metadata"})
    if is_cyber:
        score += 35; neg.append({"rule_id":"REG_ADV_01","category":"Regulatory Notices",
            "finding":"App appears in public Cyber Crime Cell advisory lists.",
            "impact":"negative","weight":35.0,"contribution":35.0,
            "source":"State Cyber Crime Advisories","source_url":"https://cybercrime.gov.in"})
    if complaints.get("fake_reviews_suspected", 0) >= 1:
        score += 10; neg.append({"rule_id":"FAKE_01","category":"Review Authenticity",
            "finding":"Reviews contain signals suggesting paid/inauthentic reviews.",
            "impact":"negative","weight":10.0,"contribution":10.0,"source":"Google Play Reviews"})

    if is_nbfc:
        score -= 25; pos.append({"rule_id":"REG_NBFC_01","category":"Regulatory Standing",
            "finding":"Developer matches a verified RBI-registered NBFC.",
            "impact":"positive","weight":-25.0,"contribution":-25.0,
            "source":"RBI Official NBFC Register","source_url":"https://www.rbi.org.in/scripts/BS_NBFCList.aspx"})
    installs = app_data.get("installs_approx", 0) or 0
    if installs >= 10_000_000 and (app_data.get("rating") or 0) >= 4.0:
        score -= 10; pos.append({"rule_id":"HIST_01","category":"Market Longevity",
            "finding":"10M+ installs with rating >= 4.0 — established market presence.",
            "impact":"positive","weight":-10.0,"contribution":-10.0,"source":"Store Listing Statistics"})

    score = max(0.0, min(100.0, score))
    ev = min(review_count / 25.0, 1.0)
    if review_count < 5:
        cat, cl = "Insufficient Evidence", "Insufficient"
    elif score >= 70: cat, cl = "High Concern", ("High" if ev >= 0.5 else "Medium")
    elif score >= 40: cat, cl = "Caution", "Medium"
    elif score >= 20: cat, cl = "Moderate", "Medium"
    else: cat, cl = "Lower Concern", ("High" if ev >= 0.5 else "Medium")

    return {"overall_score":round(score,1),"risk_category":cat,"confidence_score":round(ev,2),
            "confidence_level":cl,"negative_indicators":neg,"positive_indicators":pos,
            "complaint_theme_distribution":complaints,
            "assessment_timestamp":datetime.now(timezone.utc).isoformat(),"engine_version":"v1.0.0"}

def discover_apps():
    log.info("STEP 1: Discovering apps from Google Play Store")
    seen, packages = set(), []
    for q in LOAN_QUERIES:
        throttle()
        try:
            hits = gps_search(q, n_hits=MAX_APPS_PER_QUERY, lang=LANGUAGE, country=COUNTRY)
            for h in hits:
                pkg = h.get("appId","")
                title_lower = h.get("title","").lower()
                if any(kw in title_lower for kw in EXCLUDE_KEYWORDS): continue
                if pkg and pkg not in seen:
                    seen.add(pkg); packages.append(pkg)
            log.info("  Query %r -> total unique so far: %d", q, len(packages))
        except Exception as e:
            log.error("Search failed for %r: %s", q, e)
    return packages[:MAX_APPS_TOTAL]

def fetch_one(pkg):
    throttle()
    try:
        raw = gps_app(pkg, lang=LANGUAGE, country=COUNTRY)
    except Exception as e:
        log.warning("SKIP %s: %s", pkg, e); return None

    installs_num = int(raw.get("minInstalls", 0) or 0)
    app_data = {
        "package_id": pkg,
        "title": raw.get("title","Unknown"),
        "developer": raw.get("developer","Unknown"),
        "developer_id": str(raw.get("developerId") or ""),
        "developer_email": raw.get("developerEmail"),
        "developer_website": raw.get("developerWebsite"),
        "developer_address": raw.get("developerAddress"),
        "category": raw.get("genreId","FINANCE"),
        "rating": round(float(raw.get("score") or 0),2),
        "rating_count": int(raw.get("ratings") or 0),
        "installs_text": str(raw.get("installs","0+")),
        "installs_approx": installs_num,
        "privacy_policy_url": raw.get("privacyPolicy"),
        "store_url": f"https://play.google.com/store/apps/details?id={pkg}",
        "icon_url": raw.get("icon"),
        "summary": (raw.get("summary") or raw.get("description") or "")[:500],
        "is_active": True,
        "first_discovered_at": datetime.now(timezone.utc).isoformat(),
        "last_scanned_at": datetime.now(timezone.utc).isoformat(),
    }

    throttle()
    try:
        result, _ = gps_reviews(pkg, lang=LANGUAGE, country=COUNTRY, sort=Sort.NEWEST, count=MAX_REVIEWS_PER_APP)
        reviews = [{"rating":int(r.get("score") or 1),"text":str(r.get("content") or "").strip(),
                    "thumbs_up":int(r.get("thumbsUpCount") or 0)} for r in result]
    except Exception as e:
        log.warning("Reviews failed %s: %s", pkg, e); reviews = []

    complaints = classify_complaints(reviews)
    dev = app_data["developer"]
    is_nbfc = dev in RBI_REGISTERED_NBFCS or any(nb.lower() in dev.lower() for nb in RBI_REGISTERED_NBFCS)
    is_cyber = pkg in CYBER_ADVISORY_FLAGGED
    assessment = score_app(app_data, complaints, len(reviews), is_nbfc, is_cyber)
    assessment["package_id"] = pkg

    cat = assessment["risk_category"]
    neg = assessment["negative_indicators"]
    pos_i = assessment["positive_indicators"]
    if cat == "Insufficient Evidence":
        reason = f"Only {len(reviews)} reviews — insufficient data for a reliable assessment."
    elif cat == "High Concern":
        reason = "⚠️ " + "; ".join(i["finding"][:100] for i in neg[:2]) + ". Avoid this app."
    elif cat == "Caution":
        reason = "⚡ " + (neg[0]["finding"][:100] if neg else "Some concerns") + ". Proceed with caution."
    elif cat == "Moderate":
        reason = "🟡 Minor concerns. " + (pos_i[0]["finding"][:80] if pos_i else "No major red flags.")
    else:
        reason = "✅ " + ("; ".join(i["finding"][:80] for i in pos_i[:2]) if pos_i else "No major red flags found in reviews.")

    app_data["latest_assessment"] = assessment
    app_data["safety_reason"] = reason
    app_data["review_sample_count"] = len(reviews)
    app_data["evidence_items"] = []
    return app_data

def main():
    print("=" * 60)
    print("  Loan App Safety Checker — Real Play Store Discovery")
    print("=" * 60)
    pkgs = discover_apps()
    print(f"\nSTEP 2: Fetching details for {len(pkgs)} apps...\n")
    collected, failed = [], []
    for i, pkg in enumerate(pkgs, 1):
        print(f"[{i}/{len(pkgs)}] {pkg}")
        r = fetch_one(pkg)
        if r:
            collected.append(r)
            print(f"  ✓ {r['title']} | {r['latest_assessment']['risk_category']} ({r['latest_assessment']['overall_score']})")
        else:
            failed.append(pkg)
            print("  ✗ Not found / removed from Play Store")

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "play_store_country": COUNTRY,
        "queries_used": LOAN_QUERIES,
        "total_discovered": len(pkgs),
        "total_collected": len(collected),
        "total_failed": len(failed),
        "failed_packages": failed,
        "apps": collected,
    }
    out = os.path.join(os.path.dirname(__file__), "loan_apps_report.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, default=str)
    print(f"\n✅ Report written to {out}")
    from collections import Counter
    for cat, n in Counter(a["latest_assessment"]["risk_category"] for a in collected).most_common():
        print(f"  {cat}: {n}")

if __name__ == "__main__":
    main()
