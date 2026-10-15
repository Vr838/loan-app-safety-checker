"""Deterministic, explainable, and versioned risk assessment engine."""

import math
from typing import Any, Dict, List

ENGINE_VERSION = "v1.0.0"


class RiskEngine:
    """Calculates deterministic risk scores and evidence sufficiency for loan applications."""

    def __init__(self, version: str = ENGINE_VERSION):
        self.version = version

    def compute_assessment(
        self,
        app_data: Dict[str, Any],
        reviews: List[Dict[str, Any]],
        evidence_items: List[Dict[str, Any]],
        anomalies: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Calculates risk score (0-100), confidence (0.0-1.0), and indicator breakdown.

        Deterministic and reproducible: same input guarantees identical output.
        """
        score_breakdown: Dict[str, Any] = {}
        negative_indicators: List[Dict[str, Any]] = []
        positive_indicators: List[Dict[str, Any]] = []
        theme_counts: Dict[str, int] = {}

        # Aggregate complaint themes across reviews
        total_reviews = len(reviews)
        for r in reviews:
            themes = r.get("complaint_themes", [])
            for t in themes:
                theme_counts[t] = theme_counts.get(t, 0) + 1

        raw_risk_score = 0.0

        # ----------------------------------------------------------------------
        # Rule 1: Harassment & Coercion Complaints (HARASS_01, Weight: +30)
        # ----------------------------------------------------------------------
        harass_count = theme_counts.get("harassment_threats", 0)
        if harass_count > 0 and total_reviews > 0:
            harass_ratio = harass_count / total_reviews
            harass_contrib = round(min(30.0, 30.0 * (harass_count / max(3, total_reviews * 0.15))), 1)
            raw_risk_score += harass_contrib
            score_breakdown["HARASS_01"] = {
                "weight": 30.0,
                "contribution": harass_contrib,
                "count": harass_count,
                "ratio": round(harass_ratio, 3),
            }
            negative_indicators.append({
                "rule_id": "HARASS_01",
                "category": "Conduct & Collection",
                "finding": f"Repeated allegations of abusive collection or threats ({harass_count} user reviews).",
                "impact": "negative",
                "weight": 30.0,
                "contribution": harass_contrib,
                "source": "Google Play Reviews",
                "source_url": app_data.get("store_url"),
                "citation_excerpt": f"Detected in {harass_count} sampled user reviews indicating intimidation or family contact harassment.",
            })

        # ----------------------------------------------------------------------
        # Rule 2: Contact Harvesting & Privacy Abuse (PRIV_01, Weight: +25)
        # ----------------------------------------------------------------------
        priv_count = theme_counts.get("privacy_contact_abuse", 0)
        if priv_count > 0 and total_reviews > 0:
            priv_contrib = round(min(25.0, 25.0 * (priv_count / max(2, total_reviews * 0.10))), 1)
            raw_risk_score += priv_contrib
            score_breakdown["PRIV_01"] = {
                "weight": 25.0,
                "contribution": priv_contrib,
                "count": priv_count,
            }
            negative_indicators.append({
                "rule_id": "PRIV_01",
                "category": "Privacy & Permissions",
                "finding": f"Reports of unauthorized contact harvesting or photo gallery access ({priv_count} user reviews).",
                "impact": "negative",
                "weight": 25.0,
                "contribution": priv_contrib,
                "source": "Google Play Reviews",
                "source_url": app_data.get("store_url"),
                "citation_excerpt": "Reviewers allege application scraped phone contacts or threatened contact list disclosure.",
            })

        # ----------------------------------------------------------------------
        # Rule 3: Short-Cycle Extortion & Fee Deductions (PRED_01, Weight: +20)
        # ----------------------------------------------------------------------
        pred_count = theme_counts.get("short_cycle_extortion", 0) + theme_counts.get("hidden_fees_deductions", 0)
        if pred_count > 0 and total_reviews > 0:
            pred_contrib = round(min(20.0, 20.0 * (pred_count / max(2, total_reviews * 0.10))), 1)
            raw_risk_score += pred_contrib
            score_breakdown["PRED_01"] = {
                "weight": 20.0,
                "contribution": pred_contrib,
                "count": pred_count,
            }
            negative_indicators.append({
                "rule_id": "PRED_01",
                "category": "Loan Terms & Transparency",
                "finding": f"Allegations of predatory 7-day loan traps or undisclosed upfront fee deductions ({pred_count} reports).",
                "impact": "negative",
                "weight": 20.0,
                "contribution": pred_contrib,
                "source": "Google Play Reviews",
                "source_url": app_data.get("store_url"),
                "citation_excerpt": "Complaints citing severe discrepancies between advertised loan duration and 7-day demand notices.",
            })

        # ----------------------------------------------------------------------
        # Rule 4: Privacy Policy Transparency (POL_01, Weight: +15)
        # ----------------------------------------------------------------------
        policy_url = (app_data.get("privacy_policy_url") or "").strip()
        if not policy_url or not policy_url.startswith("https://"):
            pol_contrib = 15.0
            raw_risk_score += pol_contrib
            score_breakdown["POL_01"] = {
                "weight": 15.0,
                "contribution": pol_contrib,
                "policy_url": policy_url,
            }
            negative_indicators.append({
                "rule_id": "POL_01",
                "category": "Privacy Transparency",
                "finding": "Missing or insecure (non-HTTPS) privacy policy URL on store listing.",
                "impact": "negative",
                "weight": 15.0,
                "contribution": pol_contrib,
                "source": "Store Listing Metadata",
                "source_url": app_data.get("store_url"),
                "citation_excerpt": "Application fails to link a valid secure privacy disclosure document on its public listing.",
            })

        # ----------------------------------------------------------------------
        # Rule 5: Review Manipulation & Anomalies (REV_01, Weight: +10)
        # ----------------------------------------------------------------------
        if anomalies.get("has_anomaly"):
            rev_contrib = 10.0
            raw_risk_score += rev_contrib
            score_breakdown["REV_01"] = {
                "weight": 10.0,
                "contribution": rev_contrib,
                "details": anomalies.get("notes"),
            }
            negative_indicators.append({
                "rule_id": "REV_01",
                "category": "Listing Anomalies",
                "finding": f"Anomalous review pattern: {anomalies.get('notes')}",
                "impact": "negative",
                "weight": 10.0,
                "contribution": rev_contrib,
                "source": "Review Distribution Analysis",
                "source_url": app_data.get("store_url"),
                "citation_excerpt": "Unusual polarization or text repetition detected across user rating distribution.",
            })

        # ----------------------------------------------------------------------
        # Rule 6: Regulatory Advisory Match (REG_ADV_01, Weight: +35)
        # ----------------------------------------------------------------------
        advisory_items = [e for e in evidence_items if e.get("source_type") == "regulator" and "advisory" in e.get("claim_supported", "").lower()]
        if advisory_items:
            adv_contrib = 35.0
            raw_risk_score += adv_contrib
            score_breakdown["REG_ADV_01"] = {
                "weight": 35.0,
                "contribution": adv_contrib,
                "count": len(advisory_items),
            }
            for adv in advisory_items:
                negative_indicators.append({
                    "rule_id": "REG_ADV_01",
                    "category": "Regulatory Notices",
                    "finding": f"Official Cautionary Advisory: {adv.get('claim_supported')}",
                    "impact": "negative",
                    "weight": 35.0,
                    "contribution": adv_contrib,
                    "source": adv.get("source_title"),
                    "source_url": adv.get("source_url"),
                    "citation_excerpt": adv.get("excerpt"),
                })

        # ----------------------------------------------------------------------
        # Mitigation 1: Verified Regulated Entity / NBFC (REG_NBFC_01, Deduction: -25)
        # ----------------------------------------------------------------------
        nbfc_items = [e for e in evidence_items if e.get("source_type") == "regulator" and "regulated entity" in e.get("claim_supported", "").lower()]
        if nbfc_items:
            nbfc_deduction = 25.0
            raw_risk_score -= nbfc_deduction
            score_breakdown["REG_NBFC_01"] = {
                "weight": -25.0,
                "contribution": -nbfc_deduction,
                "entity": nbfc_items[0].get("claim_supported"),
            }
            for item in nbfc_items:
                positive_indicators.append({
                    "rule_id": "REG_NBFC_01",
                    "category": "Regulatory Standing",
                    "finding": f"Entity verified in official regulator registry: {item.get('claim_supported')}",
                    "impact": "positive",
                    "weight": -25.0,
                    "contribution": -nbfc_deduction,
                    "source": item.get("source_title"),
                    "source_url": item.get("source_url"),
                    "citation_excerpt": item.get("excerpt"),
                })

        # ----------------------------------------------------------------------
        # Mitigation 2: High Install Volume & Clean Track Record (HIST_01, Deduction: -10)
        # ----------------------------------------------------------------------
        installs_num = app_data.get("installs_approx", 0)
        complaint_ratio = (harass_count + priv_count + pred_count) / max(1, total_reviews)
        if installs_num >= 1_000_000 and total_reviews >= 20 and complaint_ratio < 0.05:
            hist_deduction = 10.0
            raw_risk_score -= hist_deduction
            score_breakdown["HIST_01"] = {
                "weight": -10.0,
                "contribution": -hist_deduction,
                "installs": installs_num,
            }
            positive_indicators.append({
                "rule_id": "HIST_01",
                "category": "Market Longevity",
                "finding": f"High market adoption ({app_data.get('installs_text', '1M+')}) with very low complaint frequency.",
                "impact": "positive",
                "weight": -10.0,
                "contribution": -hist_deduction,
                "source": "Store Adoption Metrics",
                "source_url": app_data.get("store_url"),
                "citation_excerpt": "Substantial user base without elevated predatory complaint ratios.",
            })

        # Final score clamping to 0 - 100
        final_risk_score = round(max(0.0, min(100.0, raw_risk_score)), 1)

        # ----------------------------------------------------------------------
        # Evidence Sufficiency / Confidence Score (0.0 to 1.0)
        # ----------------------------------------------------------------------
        # 1. Review sample volume (up to 0.35)
        review_conf = min(0.35, (total_reviews / 25.0) * 0.35)
        # 2. Privacy policy presence (0.25)
        policy_conf = 0.25 if policy_url and policy_url.startswith("https://") else 0.05
        # 3. Store ratings volume (up to 0.20)
        ratings_vol = app_data.get("rating_count", 0)
        ratings_conf = min(0.20, (math.log10(ratings_vol + 1) / 5.0) * 0.20) if ratings_vol > 0 else 0.0
        # 4. External evidence items (up to 0.20)
        evidence_conf = min(0.20, len(evidence_items) * 0.10)

        total_confidence = round(min(1.0, max(0.0, review_conf + policy_conf + ratings_conf + evidence_conf)), 2)

        if total_confidence >= 0.70:
            confidence_level = "High"
        elif total_confidence >= 0.45:
            confidence_level = "Medium"
        elif total_confidence >= 0.30:
            confidence_level = "Low"
        else:
            confidence_level = "Insufficient"

        # Categorization based on Risk Score and Evidence Sufficiency
        # Crucial principle: Low data MUST NOT lead to a false clean verdict!
        if total_confidence < 0.35 or (total_reviews < 5 and ratings_vol < 20 and len(evidence_items) == 0):
            risk_category = "Insufficient evidence"
            rationale = (
                f"Data sufficiency is low (confidence score {total_confidence:.2f}). "
                f"Sample contains only {total_reviews} reviews and {ratings_vol} store ratings with no corroborated external records. "
                "The system cannot make a responsible safety assessment."
            )
        else:
            if final_risk_score < 30.0:
                risk_category = "Lower concern"
                rationale = (
                    f"Heuristic risk score is low ({final_risk_score}/100) with {confidence_level.lower()} confidence ({total_confidence:.2f}). "
                    "Observable store signals and regulatory checks show minimal predatory complaint frequency."
                )
            elif final_risk_score < 65.0:
                risk_category = "Caution"
                rationale = (
                    f"Elevated risk signals detected ({final_risk_score}/100). "
                    "Indicators suggest potential transparency or fee concerns requiring user caution."
                )
            else:
                risk_category = "High concern"
                rationale = (
                    f"Significant high-risk indicators observed ({final_risk_score}/100). "
                    "Multiple severe signals present such as harassment allegations, contact access reports, or regulatory advisories."
                )

        return {
            "overall_score": final_risk_score,
            "risk_category": risk_category,
            "confidence_score": total_confidence,
            "confidence_level": confidence_level,
            "score_breakdown": score_breakdown,
            "negative_indicators": negative_indicators,
            "positive_indicators": positive_indicators,
            "complaint_theme_distribution": theme_counts,
            "evidence_sufficiency_rationale": rationale,
            "engine_version": self.version,
        }
