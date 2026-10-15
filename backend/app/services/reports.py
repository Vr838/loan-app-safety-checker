"""Export helpers for evidence based app research reports."""

import csv
from io import BytesIO, StringIO
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.db.models import App, Evidence, RiskAssessment


def build_csv_report(app: App, assessment: RiskAssessment | None, evidence: Iterable[Evidence]) -> str:
    """Create a flat CSV report that can be opened in spreadsheet software."""
    output = StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(["Loan App Safety Checker research report"])
    writer.writerow(["App", app.title])
    writer.writerow(["Package ID", app.package_id])
    writer.writerow(["Developer", app.developer])
    writer.writerow(["Google Play rating", app.rating])
    writer.writerow(["Install range", app.installs_text or "Unavailable"])
    writer.writerow(["Last scanned", app.last_scanned_at.isoformat()])
    writer.writerow([])
    writer.writerow(["Assessment"])
    writer.writerow(["Observed risk score", assessment.overall_score if assessment else "Not available"])
    writer.writerow(["Category", assessment.risk_category if assessment else "Needs more data"])
    writer.writerow(["Confidence", assessment.confidence_score if assessment else "Not available"])
    writer.writerow(["Rationale", assessment.evidence_sufficiency_rationale if assessment else "No assessment recorded"])
    writer.writerow([])
    writer.writerow(["Source title", "Source type", "Claim", "URL"])
    for item in evidence:
        writer.writerow([item.source_title, item.source_type, item.claim_supported, item.source_url or ""])
    return output.getvalue()


def build_pdf_report(app: App, assessment: RiskAssessment | None, evidence: Iterable[Evidence]) -> bytes:
    """Create a compact PDF research summary with source links listed as text."""
    output = BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"Research report for {app.title}",
    )
    styles = getSampleStyleSheet()
    heading = styles["Heading1"]
    body = styles["BodyText"]
    body.leading = 14
    story = [
        Paragraph("Loan App Safety Checker research report", heading),
        Paragraph(app.title, styles["Heading2"]),
        Paragraph(f"Package ID: {app.package_id}", body),
        Paragraph(f"Developer: {app.developer}", body),
        Spacer(1, 6 * mm),
    ]

    score = f"{assessment.overall_score:.1f} / 100" if assessment else "Not available"
    confidence = f"{assessment.confidence_score:.0%}" if assessment else "Not available"
    summary_rows = [
        ["Observed risk score", score],
        ["Assessment", assessment.risk_category if assessment else "Needs more data"],
        ["Confidence", confidence],
        ["Google Play rating", f"{app.rating:.1f}"],
        ["Last scanned", app.last_scanned_at.strftime("%Y-%m-%d %H:%M UTC")],
    ]
    summary_table = Table(summary_rows, colWidths=[50 * mm, 110 * mm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f5f5f7")),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d2d2d7")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 7),
    ]))
    story.extend([summary_table, Spacer(1, 6 * mm)])
    story.append(Paragraph("Interpretation", styles["Heading2"]))
    story.append(Paragraph(
        assessment.evidence_sufficiency_rationale if assessment else "No assessment is available for this app.",
        body,
    ))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Source list", styles["Heading2"]))
    evidence_items = list(evidence)
    if not evidence_items:
        story.append(Paragraph("No external evidence links were collected for this scan.", body))
    else:
        for item in evidence_items[:20]:
            safe_title = item.source_title.replace("&", "&amp;")
            safe_claim = item.claim_supported.replace("&", "&amp;")
            story.append(Paragraph(f"<b>{safe_title}</b><br/>{safe_claim}<br/>{item.source_url or 'No public URL'}", body))
            story.append(Spacer(1, 3 * mm))

    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph(
        "This report is a research aid based on public information. It does not certify safety, legality, or lending suitability.",
        body,
    ))
    document.build(story)
    return output.getvalue()
