"""Financial review sentiment analysis, complaint theme classification, and anomaly detection."""

import re
from collections import Counter
from typing import Any, Dict, List, Tuple

# Targeted complaint theme pattern lexicons
COMPLAINT_PATTERNS = {
    "harassment_threats": [
        r"\bharass(?:ment|ing|ed)?\b",
        r"\bthreat(?:en|ening|s)?\b",
        r"\babuse|abusive\b",
        r"\bblackmail(?:ing)?\b",
        r"\bcall(?:ing)? (?:my )?(?:contacts|family|relatives|parents|friends|boss)\b",
        r"\btortur(?:e|ing|ed)\b",
        r"\bdefam(?:e|ation|ing)\b",
        r"\bshame|shaming\b",
        r"\bvulgar\b",
        r"\bgaali|gali|dhamki|dara(?:ya|te)|badnaam|badnam\b",
        r"\bcall (?:kar|karke) (?:rahe|rha|rhi)\b",
        r"धमकी|गाली|प्रताड़ना|ब्लैकमेल|बदनाम",
    ],
    "privacy_contact_abuse": [
        r"\bcontact (?:list|book|access)\b",
        r"\bhack(?:ed|ing)? (?:my )?phone\b",
        r"\bgaller(?:y|ies)\b",
        r"\bphoto(?:s)? leak\b",
        r"\bstol(?:e|en) contacts\b",
        r"\bunauthorized access\b",
        r"\bpermission abuse\b",
        r"\bphoto|gallery|contact(?:s)? (?:leak|share|upload)\b",
        r"\bphish(?:ing)?|fake (?:app|link|website)|otp (?:fraud|scam|steal)\b",
        r"\bmalware|spyware|data (?:theft|steal)\b",
        r"कॉन्टैक्ट|कॉन्टैक्ट्स|फोटो लीक|गैलरी|डेटा चोरी|फर्जी लिंक|ओटीपी फ्रॉड",
    ],
    "short_cycle_extortion": [
        r"\b7[\s-]?day(?:s)?\b",
        r"\bseven[\s-]?day(?:s)?\b",
        r"\b5[\s-]?day(?:s)?\b",
        r"\b6[\s-]?day(?:s)?\b",
        r"\bshort tenure\b",
        r"\btenure is only 7\b",
        r"\bpromis(?:ed)? (?:90|60|30) days but (?:gave|give) 7\b",
        r"\bsirf (?:7|seven|5|five) din\b",
        r"\bjaldi (?:bhar|repay)|turant (?:bhar|payment)\b",
        r"सात दिन|7 दिन|पांच दिन|5 दिन|जल्दी भर",
    ],
    "hidden_fees_deductions": [
        r"\bprocessing fee\b",
        r"\bdeduct(?:ed|ion)?\b",
        r"\bgot only\b",
        r"\bcut (?:money|\d+%)\b",
        r"\bhidden charge(?:s)?\b",
        r"\bupfront fee\b",
        r"\bdisbursed only\b",
        r"\bpaise (?:kaat|kat)|amount (?:kaat|kat)\b",
        r"\bservice charge|convenience fee|gst charge\b",
        r"कटौती|पैसे काट|प्रोसेसिंग फीस|छुपा शुल्क",
    ],
    "deceptive_rates": [
        r"\bhigh interest\b",
        r"\bextravagant interest\b",
        r"\bcheat(?:ed|ing)?\b",
        r"\bfraud interest\b",
        r"\bpenalt(?:y|ies)\b",
        r"\bloot|looting\b",
        r"\bscam|fraud|fake loan|dhokha|thag(?:i|a)\b",
        r"\binterest (?:bahut|zyada)|zyada (?:interest|byaj)\b",
        r"धोखा|फ्रॉड|फर्जी लोन|ज्यादा ब्याज|सूद",
    ],
}


class ReviewAnalyzer:
    """Classifies user reviews into financial risk themes and detects manipulative review anomalies."""

    def __init__(self):
        self._compiled_patterns = {
            theme: [re.compile(pat, re.IGNORECASE) for pat in patterns]
            for theme, patterns in COMPLAINT_PATTERNS.items()
        }

    def classify_review(self, text: str, rating: int) -> Tuple[str, List[str]]:
        """Determines review sentiment and flags detected financial risk themes."""
        if not text:
            return ("neutral", [])

        detected_themes: List[str] = []
        for theme, compiled_list in self._compiled_patterns.items():
            for regex in compiled_list:
                if regex.search(text):
                    detected_themes.append(theme)
                    break

        # Sentiment estimation
        if rating <= 2 or len(detected_themes) > 0:
            sentiment = "negative"
        elif rating >= 4:
            sentiment = "positive"
        else:
            sentiment = "neutral"

        return sentiment, detected_themes

    def detect_anomalies(self, reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Detects suspicious patterns in review samples such as burst duplication or bimodal distribution."""
        if not reviews or len(reviews) < 5:
            return {
                "has_anomaly": False,
                "bimodal_distribution": False,
                "duplicate_review_ratio": 0.0,
                "notes": "Insufficient review volume for anomaly inference.",
            }

        ratings = [r.get("rating", 3) for r in reviews]
        texts = [r.get("text", "").strip().lower() for r in reviews if len(r.get("text", "").strip()) > 15]

        # 1. Rating Distribution Check (Bimodal: High 1-star and High 5-star simultaneously)
        count_1 = ratings.count(1)
        count_5 = ratings.count(5)
        total = len(ratings)
        ratio_1 = count_1 / total
        ratio_5 = count_5 / total

        bimodal = (ratio_1 >= 0.25 and ratio_5 >= 0.40)

        # 2. Text Duplication Check (Identical or near-identical review copies)
        duplicate_ratio = 0.0
        if texts:
            counts = Counter(texts)
            duplicate_instances = sum(c for c in counts.values() if c > 1)
            duplicate_ratio = duplicate_instances / len(texts)

        has_anomaly = bimodal or (duplicate_ratio >= 0.25)
        notes = []
        if bimodal:
            notes.append("Bimodal star polarization detected (high 1-star complaints offset by sudden 5-star ratings).")
        if duplicate_ratio >= 0.25:
            notes.append(f"High text repetition ({duplicate_ratio:.1%} identical phrase templates in reviews).")

        return {
            "has_anomaly": has_anomaly,
            "bimodal_distribution": bimodal,
            "duplicate_review_ratio": round(duplicate_ratio, 3),
            "notes": " ".join(notes) if notes else "No anomalous review patterns detected.",
        }
