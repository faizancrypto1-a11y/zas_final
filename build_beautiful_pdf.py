from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register fonts (use standard fonts available on system)
# DejaVuSans for normal text, DejaVuSans-Bold for bold
import os

# Build output path
output_path = "/sessions/sleepy-nifty-babbage/mnt/zas sport/Hormozi_Sales_Masterclass_Beautiful.pdf"

# Color palette
COLOR_PRIMARY = colors.HexColor("#1a1a2e")      # Dark navy
COLOR_SECONDARY = colors.HexColor("#e94560")    # Vibrant red/coral
COLOR_ACCENT = colors.HexColor("#0f3460")       # Deep blue
COLOR_GOLD = colors.HexColor("#f5a623")         # Gold accent
COLOR_LIGHT_BG = colors.HexColor("#f8f9fa")     # Light gray
COLOR_TEXT = colors.HexColor("#2d3436")         # Near black
COLOR_WHITE = colors.white
COLOR_CARD_BG = colors.HexColor("#ffffff")
COLOR_GREEN = colors.HexColor("#27ae60")
COLOR_RED = colors.HexColor("#e74c3c")

# Page setup
PAGE_W, PAGE_H = A4
MARGIN = 1.5*cm

# ==================== STYLES ====================
styles = getSampleStyleSheet()

def make_style(name, parent=None, **kwargs):
    base = parent or styles['Normal']
    return ParagraphStyle(name, parent=base, **kwargs)

# Title styles
style_main_title = make_style(
    'MainTitle',
    fontName='Helvetica-Bold',
    fontSize=28,
    leading=34,
    textColor=COLOR_PRIMARY,
    alignment=TA_CENTER,
    spaceAfter=6
)

style_subtitle = make_style(
    'Subtitle',
    fontName='Helvetica',
    fontSize=13,
    leading=18,
    textColor=COLOR_SECONDARY,
    alignment=TA_CENTER,
    spaceAfter=4
)

style_tagline = make_style(
    'Tagline',
    fontName='Helvetica-Oblique',
    fontSize=11,
    leading=16,
    textColor=colors.HexColor("#636e72"),
    alignment=TA_CENTER,
    spaceAfter=20
)

# Section heading
style_section = make_style(
    'SectionHeading',
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=24,
    textColor=COLOR_WHITE,
    alignment=TA_LEFT,
    spaceBefore=16,
    spaceAfter=10,
    leftIndent=0
)

# Sub-heading
style_subheading = make_style(
    'SubHeading',
    fontName='Helvetica-Bold',
    fontSize=13,
    leading=18,
    textColor=COLOR_SECONDARY,
    alignment=TA_LEFT,
    spaceBefore=14,
    spaceAfter=6
)

# Sub-sub-heading
style_sub2 = make_style(
    'Sub2Heading',
    fontName='Helvetica-Bold',
    fontSize=11,
    leading=15,
    textColor=COLOR_ACCENT,
    alignment=TA_LEFT,
    spaceBefore=10,
    spaceAfter=4
)

# Body text
style_body = make_style(
    'BodyText',
    fontName='Helvetica',
    fontSize=10.5,
    leading=16,
    textColor=COLOR_TEXT,
    alignment=TA_LEFT,
    spaceBefore=4,
    spaceAfter=4
)

# Quote / script
style_quote = make_style(
    'Quote',
    fontName='Helvetica-Oblique',
    fontSize=10.5,
    leading=16,
    textColor=COLOR_TEXT,
    alignment=TA_LEFT,
    leftIndent=18,
    rightIndent=10,
    spaceBefore=6,
    spaceAfter=6,
    borderPadding=8
)

# Label / cue
style_cue = make_style(
    'Cue',
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=14,
    textColor=COLOR_SECONDARY,
    alignment=TA_LEFT,
    spaceBefore=6,
    spaceAfter=4
)

# Note
style_note = make_style(
    'Note',
    fontName='Helvetica-Oblique',
    fontSize=9.5,
    leading=14,
    textColor=colors.HexColor("#636e72"),
    alignment=TA_LEFT,
    spaceBefore=4,
    spaceAfter=4
)

# Bullet
style_bullet = make_style(
    'Bullet',
    fontName='Helvetica',
    fontSize=10.5,
    leading=16,
    textColor=COLOR_TEXT,
    alignment=TA_LEFT,
    leftIndent=18,
    spaceBefore=2,
    spaceAfter=2
)

# Numbered list
style_numbered = make_style(
    'Numbered',
    fontName='Helvetica',
    fontSize=10.5,
    leading=16,
    textColor=COLOR_TEXT,
    alignment=TA_LEFT,
    leftIndent=24,
    spaceBefore=2,
    spaceAfter=2
)

# Table text
style_table = make_style(
    'TableText',
    fontName='Helvetica',
    fontSize=9.5,
    leading=14,
    textColor=COLOR_TEXT,
    alignment=TA_LEFT,
    spaceBefore=2,
    spaceAfter=2
)

style_table_header = make_style(
    'TableHeader',
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=14,
    textColor=COLOR_WHITE,
    alignment=TA_LEFT,
    spaceBefore=2,
    spaceAfter=2
)

# ==================== HELPERS ====================

def colored_rect_table(width, height, fill_color):
    """Return a Table with a single colored rectangle used as a background block."""
    return Table(
        [['']],
        colWidths=[width],
        rowHeights=[height]
    ).setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), fill_color),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))


def section_header_block(title_text):
    """Create a colored block with section title text."""
    # We use a Table to get the colored background
    inner = Paragraph(title_text, style_section)
    t = Table(
        [[inner]],
        colWidths=[PAGE_W - 2*MARGIN],
    )
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_SECONDARY),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    return t


def sub_section_header_block(title_text):
    """Create a lighter colored sub-section header."""
    inner = Paragraph(title_text, style_subheading)
    t = Table(
        [[inner]],
        colWidths=[PAGE_W - 2*MARGIN],
    )
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_LIGHT_BG),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -1), 2, COLOR_SECONDARY),
    ]))
    return t


def script_box(text):
    """Create a styled box for scripts/quotes."""
    content = Paragraph(text, style_quote)
    t = Table(
        [[content]],
        colWidths=[PAGE_W - 2*MARGIN - 10],
    )
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_LIGHT_BG),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LINEBEFORE', (0, 0), (0, -1), 4, COLOR_SECONDARY),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#dfe6e9")),
    ]))
    return t


def bullet_item(text):
    return Paragraph(f"• {text}", style_bullet)


def numbered_item(num, text):
    return Paragraph(f"{num}. {text}", style_numbered)


def make_table(headers, rows, col_widths):
    """Create a styled table."""
    header_row = [Paragraph(h, style_table_header) for h in headers]
    data_rows = []
    for row in rows:
        data_rows.append([Paragraph(str(c), style_table) for c in row])

    all_data = [header_row] + data_rows

    t = Table(all_data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        # Body
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9.5),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        # Alternating rows
        ('BACKGROUND', (0, 1), (-1, 1), COLOR_LIGHT_BG),
        ('BACKGROUND', (0, 3), (-1, 3), COLOR_LIGHT_BG),
        ('BACKGROUND', (0, 5), (-1, 5), COLOR_LIGHT_BG),
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#dfe6e9")),
        # Padding
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    return t


# ==================== PAGE TEMPLATE ====================

def draw_page_template(canvas, doc):
    """Draw header/footer on every page."""
    canvas.saveState()
    # Top bar
    canvas.setFillColor(COLOR_PRIMARY)
    canvas.rect(0, PAGE_H - 22, PAGE_W, 22, fill=1, stroke=0)
    canvas.setFillColor(COLOR_SECONDARY)
    canvas.rect(0, PAGE_H - 24, PAGE_W, 2, fill=1, stroke=0)

    canvas.setFont('Helvetica-Bold', 9)
    canvas.setFillColor(COLOR_WHITE)
    canvas.drawString(MARGIN, PAGE_H - 15, "HORMOSI SALES CLOSING MASTERCLASS")

    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor("#b2bec3"))
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 15, "Seamless Socials")

    # Bottom bar
    canvas.setFillColor(COLOR_PRIMARY)
    canvas.rect(0, 0, PAGE_W, 18, fill=1, stroke=0)
    canvas.setFillColor(COLOR_SECONDARY)
    canvas.rect(0, 18, PAGE_W, 1, fill=1, stroke=0)

    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor("#b2bec3"))
    canvas.drawString(MARGIN, 6, "www.seamlesssocials.in")
    canvas.drawRightString(PAGE_W - MARGIN, 6, f"Page {doc.page}")

    canvas.restoreState()


# ==================== BUILD DOCUMENT ====================

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=MARGIN,
    rightMargin=MARGIN,
    topMargin=40,
    bottomMargin=30,
)

story = []

# ==================== COVER PAGE ====================

story.append(Spacer(1, 60))

# Big decorative block
cover_block = Table(
    [['']],
    colWidths=[PAGE_W - 2*MARGIN],
    rowHeights=[4]
)
cover_block.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), COLOR_SECONDARY),
    ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ('TOPPADDING', (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
]))
story.append(cover_block)
story.append(Spacer(1, 20))

story.append(Paragraph("Hormozi Sales", style_main_title))
story.append(Paragraph("Closing Masterclass", style_main_title))
story.append(Spacer(1, 8))
story.append(Paragraph("The Complete Logical Closing Framework", style_subtitle))
story.append(Paragraph("5 Objections  ·  8 Frameworks  ·  Ready-to-Use Scripts", style_tagline))

story.append(Spacer(1, 6))

def hr_line(width="60%", thickness=2, color=COLOR_SECONDARY, spaceAfter=12):
    return HRFlowable(width=width, thickness=thickness, color=color, spaceAfter=spaceAfter)

# Stats row
stats_data = [
    [
        Paragraph('<b>5</b>', make_style('stat_num', fontName='Helvetica-Bold', fontSize=32, textColor=COLOR_SECONDARY, alignment=TA_CENTER)),
        Paragraph('<b>8</b>', make_style('stat_num2', fontName='Helvetica-Bold', fontSize=32, textColor=COLOR_SECONDARY, alignment=TA_CENTER)),
        Paragraph('<b>80%</b>', make_style('stat_num3', fontName='Helvetica-Bold', fontSize=32, textColor=COLOR_SECONDARY, alignment=TA_CENTER)),
    ],
    [
        Paragraph('Objection Types', make_style('stat_lbl', fontName='Helvetica', fontSize=10, textColor=colors.HexColor("#636e72"), alignment=TA_CENTER)),
        Paragraph('Decision Frameworks', make_style('stat_lbl2', fontName='Helvetica', fontSize=10, textColor=colors.HexColor("#636e72"), alignment=TA_CENTER)),
        Paragraph('Prospects Need Your Help', make_style('stat_lbl3', fontName='Helvetica', fontSize=10, textColor=colors.HexColor("#636e72"), alignment=TA_CENTER)),
    ]
]
stats_table = Table(stats_data, colWidths=[(PAGE_W - 2*MARGIN)/3]*3)
stats_table.setStyle(TableStyle([
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
]))
story.append(stats_table)

story.append(Spacer(1, 16))
story.append(hr_line())
story.append(Spacer(1, 16))

story.append(Paragraph("Based on Alex Hormozi's Framework", make_style(
    'based',
    fontName='Helvetica-Oblique',
    fontSize=11,
    textColor=colors.HexColor("#636e72"),
    alignment=TA_CENTER,
    spaceAfter=6
)))
story.append(Paragraph("By Seamless Socials", make_style(
    'byline',
    fontName='Helvetica-Bold',
    fontSize=11,
    textColor=COLOR_PRIMARY,
    alignment=TA_CENTER,
)))

story.append(PageBreak())

# ==================== TABLE OF CONTENTS ====================

story.append(section_header_block("📋 Contents"))
story.append(Spacer(1, 16))

toc_items = [
    "Core Beliefs — The Foundation",
    "The 10-80-10 Rule",
    "Objection 1 — Time: \"I'm too busy\"",
    "Objection 2 — Money / Value: \"I can't afford it\"",
    "Objection 3 — Fit: \"I don't think it's for me\"",
    "Objection 4 — Authority: \"I need to ask my spouse\"",
    "Objection 5 — Avoidance: \"I need to think about it\"",
    "The Blame Onion",
    "Decision Frameworks",
    "Hinglish Scripts — Doctor Digital Package",
]

for i, item in enumerate(toc_items, 1):
    row_data = [[
        Paragraph(str(i), make_style(f'toc_num{i}', fontName='Helvetica-Bold', fontSize=10, textColor=COLOR_SECONDARY)),
        Paragraph(item, make_style(f'toc_item{i}', fontName='Helvetica', fontSize=10.5, textColor=COLOR_TEXT)),
    ]]
    row_table = Table(row_data, colWidths=[30, PAGE_W - 2*MARGIN - 30])
    row_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor("#dfe6e9")),
    ]))
    story.append(row_table)

story.append(PageBreak())

# ==================== SECTION 0: CORE BELIEFS ====================

story.append(section_header_block("🧠 Core Beliefs — The Foundation"))
story.append(Spacer(1, 14))

story.append(Paragraph("What separates closers from order-takers:", make_style(
    'intro', fontName='Helvetica-Bold', fontSize=11, textColor=COLOR_ACCENT, spaceAfter=10
)))

beliefs = [
    ("🧡 People want to believe you",
     "They just need their logical brain to justify the emotional decision they already want to make. Your job: give them permission.",
     "🌐 Example: A restaurant owner already wants a website — they just need you to logically show them it'll bring more table bookings. Give them the proof, the permission to invest follows."),
    ("🔄 Selling ≠ Closing",
     "Selling = everything before the offer. Closing = everything after you state the price. Today we're only talking about closing.",
     None),
    ("🎯 Expect the \"no\"",
     "If they were just going to buy, you wouldn't be needed. The objection is what you train for — not a failure signal.",
     None),
    ("🤝 Belief transfers over trust",
     "You can't transfer what you don't have. If your team doesn't believe in the product, no script will fix it.",
     "🌐 Example: If you genuinely believe a website can 10x a local business, that belief comes through in every word. If you're unsure yourself, the client will smell it."),
    ("❤️ Care more than they do",
     "The person who cares most about the prospect wins the deal. Commission breath = instant trust killer.",
     "🌐 Example: Don't just pitch a 5-page site. Ask about their business goals, their current customers, their biggest frustration. Show you care about their growth, not just your invoice."),
    ("🧱 Obstacles vs objections",
     "Obstacles come before the offer — go attack them. Objections come after — dance with them.",
     "🌐 Example: Before you even present pricing, find out if they've had a bad website experience before — that's an obstacle. Attack it early by showing them your process."),
]

for title, body_text, example in beliefs:
    story.append(KeepTogether([
        Paragraph(title, style_sub2),
        Paragraph(body_text, style_body),
    ]))
    if example:
        story.append(Paragraph(example, style_note))
    story.append(Spacer(1, 6))

story.append(Spacer(1, 8))
quote_box = Table(
    [[Paragraph('💬 "Selling is a transference of belief over a bridge of trust."  —  Alex Hormozi',
                make_style('hquote', fontName='Helvetica-Bold', fontSize=11, textColor=COLOR_WHITE, alignment=TA_CENTER))]],
    colWidths=[PAGE_W - 2*MARGIN],
)
quote_box.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), COLOR_PRIMARY),
    ('LEFTPADDING', (0, 0), (-1, -1), 20),
    ('RIGHTPADDING', (0, 0), (-1, -1), 20),
    ('TOPPADDING', (0, 0), (-1, -1), 14),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
    ('ROUNDEDCORNERS', [6, 6, 6, 6]),
]))
story.append(quote_box)
story.append(PageBreak())

# ==================== SECTION 1: 10-80-10 RULE ====================

story.append(section_header_block("📊 The 10-80-10 Rule"))
story.append(Spacer(1, 14))

story.append(Paragraph("Every room of prospects breaks down the same way:", style_body))
story.append(Spacer(1, 10))

rule_data = [
    [Paragraph('<b>10%</b> ❌', make_style('r1', fontName='Helvetica-Bold', fontSize=13, textColor=COLOR_RED)),
     Paragraph('<b>80%</b> 🤔', make_style('r2', fontName='Helvetica-Bold', fontSize=13, textColor=COLOR_GOLD)),
     Paragraph('<b>10%</b> ✅', make_style('r3', fontName='Helvetica-Bold', fontSize=13, textColor=COLOR_GREEN))],
    [Paragraph('Will NEVER buy', make_style('r1b', fontName='Helvetica', fontSize=10, textColor=colors.HexColor("#636e72"))),
     Paragraph('Need HELP deciding — this is why you exist', make_style('r2b', fontName='Helvetica-Bold', fontSize=10, textColor=COLOR_TEXT)),
     Paragraph('Will buy regardless', make_style('r3b', fontName='Helvetica', fontSize=10, textColor=colors.HexColor("#636e72")))],
]
rule_table = Table(rule_data, colWidths=[(PAGE_W - 2*MARGIN)/3]*3)
rule_table.setStyle(TableStyle([
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 12),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ('LINEBELOW', (0, 1), (-1, 1), 1.5, COLOR_SECONDARY),
    ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#dfe6e9")),
]))
story.append(rule_table)
story.append(Spacer(1, 16))

story.append(Paragraph("💡 The Implication", style_subheading))
story.append(Paragraph("Train for the 80%. If they already knew how to decide, they wouldn't need your help — they'd just send you money. Your skill as a closer is literally the reason they're there.", style_body))
story.append(PageBreak())

# ==================== OBJECTION HELPERS ====================

def objection_header_block(number, title, meaning):
    inner_data = [
        [Paragraph(f"Objection {number} — {title}", style_section)],
        [Paragraph(meaning, make_style('obj_meaning', fontName='Helvetica-Oblique', fontSize=10,
                                       textColor=COLOR_WHITE, alignment=TA_LEFT))]
    ]
    t = Table(inner_data, colWidths=[PAGE_W - 2*MARGIN])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_ACCENT),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    return t


def response_block(label, script_text, example=None):
    items = []
    items.append(Paragraph(label, style_cue))
    items.append(script_box(script_text))
    if example:
        items.append(Paragraph(example, style_note))
    return items


# ==================== SECTION 2: OBJECTION — TIME ====================

story.append(objection_header_block(1, "⏰ Time — \"I'm too busy\"", 'What they really mean: "I can\'t succeed while busy"'))
story.append(Spacer(1, 12))

for item in response_block("🌍 Macro Response (Big Life Picture)",
    "Busy is actually the best time — because if you learn to handle this when it's hard, the rest of your life it will be easy. Do you think you'll never be busy again? Then you need to learn how to manage this while busy — that's exactly what I help with.",
    "🌐 Example: Sir, business chal raha hai na — isi wajah se aapko website chahiye. Agar aap busy nahi hote, toh aapko naye customers ki zaroorat hi nahi hoti. Website exactly wahi time pe kaam karta hai jab aap busy hain — 24/7 open rehta hai. Aaj busy rehna best time hai."
):
    story.append(item)

story.append(Spacer(1, 8))
for item in response_block("📅 Micro Response (Daily Schedule)",
    "How many hours a day are you on social media? My wife found 3.5 hours on my phone once. Is there anyone on earth with less time than you who has made this work? It's not a time issue — it's a priorities issue.",
    "🌐 Example: Aapko pata hai aap kitne hours apne phone pe scrolling karte hain? Ek baar sochiye — agar usi time ek professional website aapke business ke liye kaam kar raha hai, naye customers la raha hai. Aapke liye time nahi hai — par website ke liye time banana hai."
):
    story.append(item)

story.append(Spacer(1, 8))
for item in response_block("🔄 The When-Then Fallacy",
    "That's called the when-then fallacy. 'When I'm healed I'll go to the hospital.' 'When I save money I'll invest.' The order is reversed — you have to do it first to get the result. You don't wait until you're in shape to join the gym.",
    "🌐 Example: Jab aapka business thoda slow hoga tabhi website banayenge? Nahi — tab aapko customers ki zaroorat zyada hoti hai. 'Jab business accha ho jayega tab banayenge' — yeh logic ulta hai. Website se hi business accha hota hai."
):
    story.append(item)

story.append(Spacer(1, 10))
cue_box = Table(
    [[Paragraph('💡 Quick cue to remember: "Busy is the best time." — Say this instantly when they object. It reframes the entire conversation in 5 words.',
                make_style('cue_text', fontName='Helvetica-Bold', fontSize=10, textColor=COLOR_SECONDARY))]],
    colWidths=[PAGE_W - 2*MARGIN],
)
cue_box.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), COLOR_LIGHT_BG),
    ('LEFTPADDING', (0, 0), (-1, -1), 14),
    ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ('TOPPADDING', (0, 0), (-1, -1), 10),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ('LINEBEFORE', (0, 0), (0, -1), 4, COLOR_GOLD),
]))
story.append(cue_box)
story.append(PageBreak())

# ==================== SECTION 3: OBJECTION — MONEY ====================

story.append(objection_header_block(2, "💰 Money / Value — \"I can't afford it\"", 'What they really mean: "I don\'t see enough value yet"'))
story.append(Spacer(1, 12))

money_items = [
    ("🏆 Expensive = Committed",
     "That's actually great. My best results come from people this is expensive for — it means you'll try harder. People who say it's cheap never show up.",
     "🌐 Example: ₹50k for a website thoda zyada lag raha hai? Good — matlab aap seriously lene wale ho. Jo log ₹5k ke cheap template lete hain, unka result bhi waisa hi hota hai. Aap agar invest karenge, toh aapko result bhi milega."),
    ("💭 Separate Price from Belief",
     "So if this actually got you to your goal, would it be expensive? I think what you're really saying is you're not sure it'll work for you. Let's talk about that.",
     "🌐 Example: Agar yeh website har mahina aapko 20 naye customers de — tab bhi ₹50k expensive hai? Sochiye — 20 customers × ₹500 average order = ₹10,000/month. Sirf 5 mahine mein aapka investment wapas. Aap asli doubt yeh hai ki website actually kaam karega ki nahi."),
    ("🔥 Don't Let a Bad Decision Burn You Twice",
     "Something didn't work in the past. The only thing worse is letting that experience prevent you from making the right move now. Did you stop dating after your first heartbreak?",
     "🌐 Example: Samajh gaya — pehle kisi ne aapko ₹20k mein bakwas website banaya tha. Par woh aapki galti nahi thi — woh developer ki galti thi. Aaj aapke paas ek experienced team hai jo aapko result dega."),
    ("🦾 Resourcefulness, Not Resources",
     "Self-made millionaires and you have one thing in common — both started at zero. You've found money for tax bills, emergencies, things others needed. Why not for yourself?",
     "🌐 Example: Aapne shop ka rent toh diya hai, staff ka salary diya hai, marketing budget rakha hai — mobile se ₹50k nahi nikal sakte? Aap resourceful ho — aapko bas sahi jagah par invest karna seekho."),
    ("⚖️ Best Case / Worst Case Close",
     "Both options are risk-free. Option A: walk out — guaranteed to not get the result. Option B: start, hate it in 30 days, I refund you. Same risk, but only one has upside. Which do you choose?",
     "🌐 Example: Dono option risk-free hain. Option A: jaao — guarantee hai ki aapko naye customers nahi milenge, aapka competitor aage badhega. Option B: website bana lo, 30 din mein dekh lo — agar pasand nahi aaya toh poora refund."),
]

for title, body_text, example in money_items:
    story.append(KeepTogether([
        Paragraph(title, style_sub2),
        Paragraph(body_text, style_body),
    ]))
    if example:
        story.append(Paragraph(example, style_note))
    story.append(Spacer(1, 6))

story.append(Spacer(1, 6))
story.append(Paragraph("🏎️ The Ferrari Principle", style_subheading))
story.append(Paragraph("If I offered you a Ferrari for ₹5,000 — would you find the money? Of course. If they can't afford it, you haven't communicated enough value. Resources are never the real issue.", style_body))
story.append(Paragraph("🌐 Example: Agar main kehto ki ₹5,000 mein Ferrari degi — aap paisa nikal loge na? Kyunki aapko value samajh aa jayegi. Aaj aapko ₹50k expensive lag raha hai kyunki aapko abhi tak nahi dikha ki yeh website aapke business ke liye kitna valuable hai.", style_note))
story.append(PageBreak())

# ==================== SECTION 4: OBJECTION — FIT ====================

story.append(objection_header_block(3, "🎭 Fit — \"I don't think it's for me\"", 'What they really mean: "I\'m afraid of changing what got me here"'))
story.append(Spacer(1, 12))

fit_items = [
    ("🪞 New Identity = New Priorities",
     "We vote with our dollars for the things we care about. You say you care about this — but if I looked at your bank account, what does it say you actually vote for? When you step into the identity of who you want to be, your priorities shift automatically.",
     "🌐 Example: Aap kehte ho aap grow karna chahte hain — lekin aapka current marketing mein 80% budget print media mein ja raha hai. Aapka bank account bol raha hai aap change se darte ho. Website pe invest karna aapki priority ban jayegi."),
    ("😤 Pain of Change",
     "That breakfast you always have? That's the breakfast that got you this body. That morning routine got you that bank account. You have to change the thing to change the result. The pain of staying the same must exceed the pain of changing.",
     "🌐 Example: Aaj tak aapne jo bhi kiya — wohi aapke business ka current size laaya hai. Agar aapko naye customers chahiye, toh aapko nai cheez try karni padegi. Website banane se 10x aayenge."),
    ("🧪 Hypothetical Isolation",
     "If this program had everything you needed — if that one thing wasn't an issue — would you do it? [Yes.] Great. So let's talk about just that one thing. Everything else works for you?",
     "🌐 Example: Agar main yeh guarantee de doon ki aapke website pe har din 50 naye visitors aayenge — tab bhi aap nahi banwane wenge? [Nahi, banwaunga.] Great — toh sirf ek cheez hai jo aapko rok rahi hai. Woh baat karte hain."),
]

for title, body_text, example in fit_items:
    story.append(KeepTogether([
        Paragraph(title, style_sub2),
        Paragraph(body_text, style_body),
    ]))
    if example:
        story.append(Paragraph(example, style_note))
    story.append(Spacer(1, 6))

story.append(Spacer(1, 6))
story.append(Paragraph("🌡️ The Thermostat Principle", style_subheading))
story.append(Paragraph("Everyone has an internal thermostat — an acceptable level of struggle. Your job isn't to force change. It's to help them see where their thermostat is set and whether that's what they actually want.", style_body))
story.append(Paragraph("🌐 Example: Aapke business ka current size comfortable hai — par aapka thermostat kitna hai? ₹2L/month enough hai ya aap 5L chahte hain? Website aapka thermostat badha sakta hai.", style_note))
story.append(PageBreak())

# ==================== SECTION 5: OBJECTION — AUTHORITY ====================

story.append(objection_header_block(4, "👨‍👩‍👧 Authority — \"I need to ask my spouse\"", 'What they really mean: "I\'m looking for permission, not support"'))
story.append(Spacer(1, 12))

story.append(Paragraph("📋 The 3-Step Collapse Process", style_subheading))
story.append(Spacer(1, 6))

auth_steps = [
    ("Step 1 — 🎯 Isolate",
     "What part do you think they wouldn't approve of? They will reveal their REAL objection (usually their own fear, not the spouse's). Now you can attack the actual issue.",
     "🌐 Example: Aapke spouse ko kya objection lag sakta hai? [Paise waste ho jayenge.] Sochiye — aapke business mein already ₹10k/month marketing pe kharch ho raha hai. Agar woh dekh paye ki website se actual customers aa rahe hain — kyun oppose karenge?"),
    ("Step 2 — 🔑 Permission vs Support",
     "Do they approve of your current struggle? No. So why would they oppose something that fixes a problem they already don't approve of? You're looking for permission — what you actually need is support. Do you think they'll support you fixing this?",
     "🌐 Example: Kya aapke ghar wale aapke business ke current struggle se khush hain? Nahi na. Toh woh kyun oppose karenge kisi cheez se jo aapke problem ko solve kare? Aap unka support chahte ho — unka support hi milega."),
    ("Step 3 — 🛡️ The Guarantee Out",
     "Sign up today. If you get home and your partner says they want you to stay stuck — call me, I'll refund everything. But we both know that's not what they want for you.",
     "🌐 Example: Aaj sign up karo. Ghar jaake agar family mein koi issue ho — 3 din ke andar call karo, poora refund. Lekin aapko pata hai woh chahte hain ki aapka business grow kare."),
]

for title, body_text, example in auth_steps:
    story.append(KeepTogether([
        Paragraph(title, style_sub2),
        Paragraph(body_text, style_body),
    ]))
    if example:
        story.append(Paragraph(example, style_note))
    story.append(Spacer(1, 6))

story.append(Spacer(1, 6))
story.append(Paragraph("🔄 The Frame Shift", style_subheading))
story.append(Paragraph("When someone says \"I need to talk to my spouse\" — translate it as: \"That person controls me.\" Your job is to hand the power back to the prospect. They don't need permission — they need support.", style_body))
story.append(Paragraph("🌐 Example: Main samajhta hoon ghar se poochna chahiye — lekin sirf ek cheez poocho unse: 'Kya tum chahte ho ki mera business grow kare?' Agar haan hai, toh website ek step wahi pe hai. Aap unse permission nahi chahte — unka support chahte ho.", style_note))
story.append(PageBreak())

# ==================== SECTION 6: OBJECTION — AVOIDANCE ====================

story.append(objection_header_block(5, "🐢 Avoidance — \"I need to think about it\"", 'What they really mean: "I need to avoid this decision"'))
story.append(Spacer(1, 12))

avoid_items = [
    ("📜 Past — They've Been Deciding for Years",
     "How long have you wanted to fix this? Five years? This isn't a fast decision — you decided a long time ago. Today we're just taking the first step. Do you think not being able to pull the trigger is why you're still in the same place?",
     "🌐 Example: Aapko kitne saal se website chahiye? 2 saal? 3 saal? Aap already decide kar chuke ho — bas action nahi liya. Aaj jo first step lena hai woh decision nahi hai — woh confirmation hai jo aapne pehle hi li thi."),
    ("🪑 Present — The Rocking Chair Close",
     "You're not actually going to sit in a rocking chair and think about this. You'll get in your car, check your phone, pick up the kids — and five days later you'll try on a pair of jeans and think 'I should have done that.' You don't need time. You need information.",
     "🌐 Example: Aap sochna chahte ho? Aap gadi mein baith kar sochoge, WhatsApp check karoge — aur 5 din baad yaad aayega ki kal woh website banwani thi. Aapko time nahi chahiye — aapko sirf ek cheez chahiye: information. Kaunsi ek cheez aapko abhi bhi samajh nahi aayi?"),
    ("🔮 Future — Which Future Are You Killing Off?",
     "The word 'decide' comes from Latin — decidere — to kill off. Which future are we killing today? Five more years of the same result, or the one where you've finally fixed this?",
     "🌐 Example: Aaj aap decide karenge: ya woh future jahan aapka business abhi bhi offline rehta hai, competitors aage badhte rahenge. Ya woh future jahan aapka website aapke liye 24/7 kaam karta hai, customers automatically aate hain."),
    ("📚 The Informed Decision Close",
     "You just said you need an informed decision. How can you make an informed decision without experiencing it? Let's get you started — 30 days in, if you hate it, I'll give your money back.",
     "🌐 Example: Aap kehte ho informed decision lena hai. Par aap informed decision kaise le sakte ho jab aapne experience nahi kiya? Chalo aaj start karte hain — 30 din baad dekhna ki website se customers aa rahe hain ki nahi. Agar nahi aaye — refund."),
]

for title, body_text, example in avoid_items:
    story.append(KeepTogether([
        Paragraph(title, style_sub2),
        Paragraph(body_text, style_body),
    ]))
    if example:
        story.append(Paragraph(example, style_note))
    story.append(Spacer(1, 6))

story.append(PageBreak())

# ==================== SECTION 7: BLAME ONION ====================

story.append(section_header_block("🧅 The Blame Onion"))
story.append(Spacer(1, 10))

story.append(Paragraph("People cast their power in layers — peel them one by one:", style_body))
story.append(Spacer(1, 10))

onion_data = [
    [Paragraph('<b>Layer</b>', style_table_header),
     Paragraph('<b>Description</b>', style_table_header),
     Paragraph('<b>Website Example</b>', style_table_header)],
    [Paragraph('1 — Circumstances 🕐', style_table),
     Paragraph('Time, money, market. "Abhi business slow hai, budget nahi hai."', style_table),
     Paragraph('You still have 2-3 layers underneath. Don\'t stop here.', style_table)],
    [Paragraph('2 — Other People 👥', style_table),
     Paragraph('Spouse, partner, employees. "Mere wife se poochna hai."', style_table),
     Paragraph('Halfway through. Keep peeling.', style_table)],
    [Paragraph('3 — Self 🔍', style_table),
     Paragraph('Fear of making a mistake. Avoidance. "Mujhe laga main tech samajh nahi sakta."', style_table),
     Paragraph('This is the real conversation — and the most powerful one.', style_table)],
]
onion_table = Table(onion_data, colWidths=[100, 180, PAGE_W - 2*MARGIN - 100 - 180 - 20])
onion_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_ACCENT),
    ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_WHITE),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 1), (-1, -1), 9.5),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#dfe6e9")),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ('BACKGROUND', (0, 1), (-1, 1), COLOR_LIGHT_BG),
    ('BACKGROUND', (0, 3), (-1, 3), COLOR_LIGHT_BG),
]))
story.append(onion_table)
story.append(Spacer(1, 16))

story.append(Paragraph("🥋 The Universal Judo Move", style_subheading))
story.append(Paragraph("Whatever reason they give you — it's the exact reason they should buy.", style_body))
story.append(Spacer(1, 8))

judo_data = [
    [Paragraph('<b>Objection</b>', style_table_header),
     Paragraph('<b>Website Response</b>', style_table_header)],
    [Paragraph('"I don\'t have time" ⏰', style_table),
     Paragraph('"That\'s exactly why you need this — website 24/7 kaam karta hai jab aap busy hain."', style_table)],
    [Paragraph('"I can\'t afford it" 💸', style_table),
     Paragraph('"That\'s exactly why — har mahine marketing pe ₹10k kharch, website ek baar mein fix."', style_table)],
    [Paragraph('"Mera business chhota hai" 🏪', style_table),
     Paragraph('"That\'s exactly why — chhote business ko bhi bada dikhane ke liye website sabse zaroori hai."', style_table)],
    [Paragraph('"Main tech samajh nahi sakta" 💻', style_table),
     Paragraph('"That\'s exactly why — aapko tech samajhne ki zaroorat nahi. Hum handle kar dete hain."', style_table)],
    [Paragraph('"Maine pehle try kiya tha" ❌', style_table),
     Paragraph('"That\'s exactly why — pehle galat bande ke haath mein gaye the. Ab experienced team hai."', style_table)],
]
judo_table = Table(judo_data, colWidths=[140, PAGE_W - 2*MARGIN - 140 - 10])
judo_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_ACCENT),
    ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_WHITE),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 1), (-1, -1), 9.5),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#dfe6e9")),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ('BACKGROUND', (0, 1), (-1, 1), COLOR_LIGHT_BG),
    ('BACKGROUND', (0, 3), (-1, 3), COLOR_LIGHT_BG),
    ('BACKGROUND', (0, 5), (-1, 5), COLOR_LIGHT_BG),
]))
story.append(judo_table)
story.append(PageBreak())

# ==================== SECTION 8: DECISION FRAMEWORKS ====================

story.append(section_header_block("🧩 Decision Frameworks"))
story.append(Spacer(1, 14))

# Framework 1
story.append(Paragraph("1️⃣ Closer or Further?", style_subheading))
story.append(Paragraph("The single most powerful frame. Not \"will this get me what I want?\" — but \"will this get me closer?\"", style_body))
story.append(Spacer(1, 6))

cf_data = [
    [Paragraph('<b>✅ Sign up</b>', make_style('cf1', fontName='Helvetica-Bold', fontSize=10, textColor=COLOR_GREEN)),
     Paragraph('<b>❌ Walk out</b>', make_style('cf2', fontName='Helvetica-Bold', fontSize=10, textColor=COLOR_RED))],
    [Paragraph('Gets you CLOSER. Website ban jayega, pehle step complete ho jayega.', style_table),
     Paragraph('GUARANTEED to not get what you want. Zero risk, zero upside, zero progress.', style_table)],
]
cf_table = Table(cf_data, colWidths=[(PAGE_W - 2*MARGIN - 10)/2]*2)
cf_table.setStyle(TableStyle([
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#dfe6e9")),
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_LIGHT_BG),
    ('BACKGROUND', (0, 1), (0, 1), colors.HexColor("#e8f8f5")),
    ('BACKGROUND', (1, 1), (1, 1), colors.HexColor("#fdedec")),
    ('TOPPADDING', (0, 0), (-1, -1), 10),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ('LEFTPADDING', (0, 0), (-1, -1), 12),
    ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))
story.append(cf_table)
story.append(Paragraph("🌐 Example: Sign up karoge toh aapka website ban jayega, pehle step complete ho jayega. Jaane doge toh kuch nahi hoga, bas aapka competitor aage badhega. Closer ya further?", style_note))
story.append(Spacer(1, 12))

# Framework 2
story.append(Paragraph("2️⃣ The 4-Question Decision Test", style_subheading))
story.append(Paragraph("Walk any stuck prospect through these — they'll close themselves:", style_body))
story.append(Spacer(1, 6))

questions = [
    "🤔 Do you believe a website could work for your business?",
    "🤝 Do you trust me / us to deliver?",
    "🎯 Do you think it will work for you specifically?",
    "💵 Do you have access to the money to start — or know someone who does?",
]
for i, q in enumerate(questions, 1):
    story.append(Paragraph(f"{i}. {q}", style_numbered))

story.append(Spacer(1, 6))
story.append(script_box('💬 If all four are yes: "Then what\'s left to decide? Let\'s get you started." — Most people never make big decisions. You\'re teaching them how.'))
story.append(Paragraph("🌐 Example: Agar aapko lagta hai ki website aapke business ke liye kaam karega, aap humpe bharosa karte ho, aur aapke liye bhi kaam karega — toh phir kya decide karne mein problem hai?", style_note))
story.append(Spacer(1, 12))

# Framework 3
story.append(Paragraph("3️⃣ 📚 The Ignorance Debt", style_subheading))
story.append(Paragraph("The cost of not knowing. Use when someone says the price is too high.", style_body))
story.append(Spacer(1, 6))
story.append(script_box(
    '"If you make ₹18L/year and want to make ₹1Cr — right now your ignorance costs you ₹82L per year. Every year you wait, that debt compounds. The program fee is nothing compared to what not knowing is costing you."'
))
story.append(Paragraph("🌐 Example: Aapka business currently ₹10L/month pe hai. Aapka competitor jiska website hai woh ₹15L pe hai. Har mahina jo aap wait karte hain, woh ₹5L ka opportunity cost hai. ₹50k ek baar mein — par 5 mahine mein woh ₹50k wapas a jayega.", style_note))
story.append(Spacer(1, 12))

# Framework 4
story.append(Paragraph("4️⃣ 🌉 Transference of Belief over a Bridge of Trust", style_subheading))
story.append(Paragraph("The master framework behind every close:", style_body))
story.append(Spacer(1, 6))

tbt_data = [
    [Paragraph('<b>B — Belief</b>', style_table_header),
     Paragraph('You must genuinely believe your product changes lives. No script fixes no belief.', style_table)],
    [Paragraph('<b>T — Trust</b>', style_table_header),
     Paragraph('Built through genuine care, not commission breath. They can smell intention.', style_table)],
    [Paragraph('<b>→ Transfer</b>', style_table_header),
     Paragraph('When belief is deep and trust is high, closing is easy. You\'re not convincing — you\'re conveying.', style_table)],
]
tbt_table = Table(tbt_data, colWidths=[120, PAGE_W - 2*MARGIN - 120 - 10])
tbt_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_ACCENT),
    ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_WHITE),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('BACKGROUND', (0, 1), (0, 2), colors.HexColor("#e8f8f5")),
    ('BACKGROUND', (0, 2), (0, 2), colors.HexColor("#fef9e7")),
    ('BACKGROUND', (0, 3), (0, 3), colors.HexColor("#f4ecf7")),
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 1), (-1, -1), 9.5),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#dfe6e9")),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
]))
story.append(tbt_table)
story.append(PageBreak())

# ==================== SECTION 9: HINGLISH SCRIPTS ====================

story.append(section_header_block("🗣️ Hinglish Scripts — Website Sales (₹30k / ₹50k)"))
story.append(Spacer(1, 14))

story.append(Paragraph("Ready-to-use scripts for your website sales calls:", make_style(
    'script_intro', fontName='Helvetica', fontSize=10.5, textColor=colors.HexColor("#636e72"), spaceAfter=12
)))

scripts = [
    ('Prospect: "Abhi budget nahi hai" 💸',
     '"Doctor sahab, yahi toh sab kehte hain pehle — aur isi wajah se aapko yeh chahiye. Abhi aap apne area ke 3 competitors se behind hain digitally. Har mahina jo aap wait karte hain, woh cost aap pay kar rahe hain — sirf bank account mein nahi dikhti. ₹30k ek baar — lekin yeh aapko harr mahina naye patients de sakta hai. Closer ya further — kaunsa option aapko goal ke paas le jaata hai?"'),
    ('Prospect: "Thoda sochna hai" 🤔',
     '"Doctor sahab, main samajhta hoon. Lekin sochte sochte kya hoga? Aap apni car mein jaoge, 6 WhatsApp messages check karoge, OPD start ho jaayega — aur yeh baat 3 mahine baad yaad aayegi jab koi junior doctor apne area mein digital practice shuru kar dega. Aapko time nahi chahiye — information chahiye. Toh abhi ek sawaal poochhun: kaunsi ek cheez aapko rok rahi hai? Woh baat karte hain."'),
    ('Prospect: "Wife / family se poochhunga" 👨‍👩‍👧',
     '"Bilkul — ghar mein discuss karna chahiye. Ek kaam karo: sign up karo aaj. 3 din andar agar unhe koi issue ho — mujhe call karo, poora refund. Lekin ek sawaal: kya woh chahte hain ki aapki practice struggle kare? Nahi na. Toh unhe issue nahi hoga — aap unka support chahte hain, permission nahi. Support toh milega."'),
    ('Prospect: "Mere liye kaam nahi karega" 🏪',
     '"Interesting — aapne yeh kyun socha? Doctor community mein specifically humne 4 clinics ka kaam kiya hai. Agar hum yeh ek concern solve kar lein, baaki sab theek hai aapko? Great — toh woh ek cheez pe focus karte hain. Aur honestly, jo patients aap iss waqt miss kar rahe hain social media pe — woh kisi aur ke paas ja rahe hain."'),
    ('Prospect: "Bahut busy hoon" ⏰',
     '"Doctor sahab — busy rehna toh aapki life hai. Agar hum \'not busy\' ka wait karein, toh yeh hoga hi nahi. Aur exactly yahi wajah hai ki yeh kaam aata hai: humaara poora system aapke bina chalta hai. Aap ek baar onboard ho, content plan approve karo — baaki hum karte hain. Aapka time: 20 minute per week. Aur ek cheez — busy doctor ka result zyada powerful hota hai, kyunki aap actually prove karte ho ki system kaam karta hai."'),
]

for title, script in scripts:
    story.append(KeepTogether([
        Paragraph(title, style_subheading),
        script_box(script),
    ]))
    story.append(Spacer(1, 10))

# ==================== REMEMBER ====================

story.append(Spacer(1, 10))
story.append(HRFlowable(width="100%", thickness=2, color=COLOR_SECONDARY, spaceAfter=12))

story.append(Paragraph("📝 Remember", style_subheading))
story.append(Paragraph("These scripts are starting points — adapt them to your voice. The framework matters more than the exact words. When in doubt: stay curious, care genuinely, and ask one more question.", style_body))

story.append(Spacer(1, 20))
footer_box = Table(
    [[Paragraph('Seamless Socials  ·  Loni, Ghaziabad  ·  seamlesssocials.in',
                make_style('footer_text', fontName='Helvetica-Oblique', fontSize=9,
                           textColor=colors.HexColor("#636e72"), alignment=TA_CENTER))]],
    colWidths=[PAGE_W - 2*MARGIN],
)
footer_box.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), COLOR_LIGHT_BG),
    ('LEFTPADDING', (0, 0), (-1, -1), 14),
    ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ('TOPPADDING', (0, 0), (-1, -1), 10),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ('LINEABOVE', (0, 0), (-1, 0), 1.5, COLOR_SECONDARY),
]))
story.append(footer_box)

# ==================== BUILD ====================

doc.build(story, onFirstPage=draw_page_template, onLaterPages=draw_page_template)
print(f"Beautiful PDF created at: {output_path}")
