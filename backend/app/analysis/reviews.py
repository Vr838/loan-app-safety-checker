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
        r"\bcall(?:ing)? (?:my )?(?:contacts|family|relatives|parents|friends|boss|office)\b",
        r"\btortur(?:e|ing|ed)\b",
        r"\bdefam(?:e|ation|ing)\b",
        r"\bshame|shaming\b",
        r"\bvulgar|filthy language\b",
        r"\bgaali|gali|dhamki|dara(?:ya|te)|badnaam|badnam|beizzati\b",
        r"\bcall (?:kar|karke) (?:rahe|rha|rhi)\b",
        r"\brelatives ko (?:call|phone|message)\b",
        r"\bmarne ki dhamki|police complaint|cyber cell\b",
        r"\bgunde bhejna|ghar par aayenge|vasooli agent\b",
        r"\bmental torture|suicide threat|night calling\b",
        r"\bbayapuduthuranga|kevalam|vatti kodumai|kudumbathuku call\b",
        r"\bblackmail chesthunnaru|champesthanani dhamki\b",
        r"धमकी|गाली|प्रताड़ना|ब्लैकमेल|बदनाम|आत्महत्या|गंदे फोटो|इज्जत|घर आएंगे|एजेंट भेजेंगे|हफ्ता वसूली|बदतमीजी|रात को फोन|शिवीगाळ|बෙದರಿಕೆ|হুমকি",
    ],
    "privacy_contact_abuse": [
        r"\bcontact (?:list|book|access)\b",
        r"\bhack(?:ed|ing)? (?:my )?phone\b",
        r"\bgaller(?:y|ies)\b",
        r"\bphoto(?:s)? leak\b",
        r"\bphoto (?:morph|morphed|viral)\b",
        r"\bstol(?:e|en) contacts\b",
        r"\bunauthorized access\b",
        r"\bpermission abuse\b",
        r"\bphoto|gallery|contact(?:s)? (?:leak|share|upload)\b",
        r"\bphish(?:ing)?|fake (?:app|link|website)|otp (?:fraud|scam|steal)\b",
        r"\bmalware|spyware|data (?:theft|steal|chor)\b",
        r"\bcontacts ko phone|gallery hack|whatsapp group banaya\b",
        r"\bmummy papa ko call|office me phone\b",
        r"कॉन्टैक्ट|कॉन्टैक्ट्स|फोटो लीक|गैलरी|डेटा चोरी|फर्जी लिंक|ओटीपी फ्रॉड|नातेवाईकांना फोन|फोटो मॉर्फ",
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
        r"\b7 din|seven days|sirf 6 din\b",
        r"\bjaldi (?:bhar|repay)|turant (?:bhar|payment)\b",
        r"\bdue date se pehle|time se pehle call\b",
        r"\bextension fee|rollover charge\b",
        r"सात दिन|7 दिन|पांच दिन|5 दिन|जल्दी भर|समय से पहले|७ दिवसांचे कर्ज|৭ দিনের ফাঁদ|7 நாள் கடன்",
    ],
    "hidden_fees_deductions": [
        r"\bprocessing fee\b",
        r"\bdeduct(?:ed|ion)?\b",
        r"\bgot only\b",
        r"\bcut (?:money|\d+%)\b",
        r"\bhidden charge(?:s)?\b",
        r"\bupfront fee\b",
        r"\bdisbursed only\b",
        r"\bpaise (?:kaat|kat|kaat liye)|amount (?:kaat|kat)\b",
        r"\bservice charge|convenience fee|gst charge\b",
        r"\bprocessing fee (?:bahut|zyada)\b",
        r"\bdouble deduction|auto debit fraud|no kfs\b",
        r"कटौती|पैसे काट|प्रोसेसिंग फीस|छुपा शुल्क|कम पैसे दिए|हण कಡಿತ",
    ],
    "deceptive_rates": [
        r"\bhigh interest\b",
        r"\bextravagant interest\b",
        r"\bcheat(?:ed|ing)?\b",
        r"\bfraud interest\b",
        r"\bpenalt(?:y|ies)\b",
        r"\bloot|looting\b",
        r"\bscam|fraud|fake loan|dhokha|thag(?:i|a)\b",
        r"\bchor app|lutera|farud|fas gaya\b",
        r"\bthiruttu|mosam|donga app\b",
        r"\binterest (?:bahut|zyada)|zyada (?:interest|byaj)\b",
        r"\bfake nbfc|bogus loan|chirkut app|chinese loan app\b",
        r"धोखा|फ्रॉड|फर्जी लोन|ज्यादा ब्याज|सूद|चोर ऐप|लूट|फर्जी एनबीएफसी|फसवणूक|மோசம்|திருட்டு ஆப்|మోసం|প্রতারণা",
    ],
}


class ReviewAnalyzer:
    """Classifies user reviews into financial risk themes and detects manipulative review anomalies."""

    def __init__(self):
        self._compiled_patterns = {
            theme: [re.compile(pat, re.IGNORECASE) for pat in patterns]
            for theme, patterns in COMPLAINT_PATTERNS.items()
        }

    def detect_language(self, text: str) -> str:
        """Identifies whether review is in Hindi (Devanagari), Hinglish (Romanized Hindi), Regional, or English."""
        if not text:
            return "English"
        if re.search(r"[\u0900-\u097F]", text):
            return "Hindi"
        if re.search(r"\b(panranga|thiruttu|mosam|illa|romba|vatti|undi|cheppandi)\b", text, re.IGNORECASE):
            return "Regional"
        if re.search(r"\b(hai|aur|ko|me|bhi|nahi|kare|karte|kar|liye|karke|mera|meri|ye|wo|bahut|zyada|din|paise|dhamki|gali|chor)\b", text, re.IGNORECASE):
            return "Hinglish"
        return "English"

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

