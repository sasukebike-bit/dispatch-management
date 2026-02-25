"""
ReportLabを使って配達指示書PDFを生成する
"""
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from schemas import DispatchResult


def generate_dispatch_pdf(result: DispatchResult) -> bytes:
    pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        fontName="HeiseiKakuGo-W5",
        fontSize=16,
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        fontName="HeiseiKakuGo-W5",
        fontSize=11,
        spaceAfter=4,
    )
    normal_style = ParagraphStyle(
        "Normal",
        fontName="HeiseiKakuGo-W5",
        fontSize=9,
    )

    story = []

    for idx, item in enumerate(result.assignments):
        if not item.orders:
            continue

        story.append(Paragraph(f"配達指示書", title_style))
        story.append(Paragraph(
            f"日付：{result.date}　　担当：{item.driver_name}　　件数：{item.total_jobs}件",
            subtitle_style
        ))
        story.append(Spacer(1, 4 * mm))

        # テーブルデータ
        header = ["No", "時間帯", "配達先住所", "備考"]
        table_data = [header]
        for i, order in enumerate(item.orders, 1):
            table_data.append([
                str(i),
                f"{order.time_start}〜{order.time_end}",
                order.address,
                order.notes or "",
            ])

        col_widths = [12 * mm, 30 * mm, 100 * mm, 40 * mm]
        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, -1), "HeiseiKakuGo-W5"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("ALIGN", (0, 0), (1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#EFF6FF")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(table)

        if idx < len(result.assignments) - 1:
            story.append(PageBreak())

    doc.build(story)
    return buffer.getvalue()
