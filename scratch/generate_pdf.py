# -*- coding: utf-8 -*-
import os
import sys

# 1. Install reportlab if missing
try:
    import reportlab
except ImportError:
    import subprocess
    print("Installing reportlab library...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "reportlab"])
    except Exception as e:
        print(f"Error installing reportlab: {e}")
        sys.exit(1)

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def build_pdf(txt_path, pdf_path):
    if not os.path.exists(txt_path):
        print(f"Error: Text file not found at {txt_path}")
        return

    with open(txt_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Define custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        alignment=1, # Center
        spaceAfter=15
    )
    
    author_style = ParagraphStyle(
        'DocAuthor',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        alignment=1, # Center
        spaceAfter=4
    )
    
    abstract_heading_style = ParagraphStyle(
        'AbstractHeading',
        parent=styles['Heading3'],
        fontName='Helvetica-BoldOblique',
        fontSize=10,
        leading=12,
        spaceAfter=4
    )

    abstract_text_style = ParagraphStyle(
        'AbstractText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=12,
        spaceAfter=15,
        leftIndent=20,
        rightIndent=20
    )
    
    heading1_style = ParagraphStyle(
        'SecHeading1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        spaceBefore=12,
        spaceAfter=8,
        textColor=colors.HexColor('#1A365D') # Deep Navy
    )

    heading2_style = ParagraphStyle(
        'SecHeading2',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        spaceBefore=10,
        spaceAfter=6,
        textColor=colors.HexColor('#2B6CB0') # Slate Blue
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        spaceAfter=8,
        firstLineIndent=15
    )
    
    caption_style = ParagraphStyle(
        'Caption',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=10,
        alignment=1, # Center
        spaceBefore=5,
        spaceAfter=10
    )
    
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    story = []
    
    # State flags for parsing
    in_title = True
    in_authors = False
    in_abstract = False
    in_keywords = False
    in_table = False
    table_data = []

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines at the very beginning
        if not line and in_title and len(story) == 0:
            i += 1
            continue

        # Parse title (first non-empty line)
        if in_title and line:
            story.append(Paragraph(line, title_style))
            story.append(Spacer(1, 10))
            in_title = False
            in_authors = True
            i += 1
            continue
            
        # Parse authors (lines until Abstract— or Abstract)
        if in_authors:
            if "Abstract—" in line or "Abstract" in line or line.startswith("Abstract"):
                in_authors = False
                in_abstract = True
                # Clean up and split Abstract text if it's on the same line
                abstract_part = ""
                if "Abstract—" in line:
                    abstract_part = line.split("Abstract—")[1].strip()
                elif "Abstract" in line:
                    abstract_part = line.split("Abstract")[1].strip()
                    if abstract_part.startswith("—") or abstract_part.startswith("-"):
                        abstract_part = abstract_part[1:].strip()
                
                story.append(Paragraph("Abstract", abstract_heading_style))
                if abstract_part:
                    story.append(Paragraph(abstract_part, abstract_text_style))
                i += 1
                continue
            else:
                if line:
                    story.append(Paragraph(line, author_style))
                i += 1
                continue

        # Parse abstract content
        if in_abstract:
            if "Keywords—" in line or "Keywords" in line or line.startswith("Keywords"):
                in_abstract = False
                in_keywords = True
                kw_part = ""
                if "Keywords—" in line:
                    kw_part = line.split("Keywords—")[1].strip()
                elif "Keywords" in line:
                    kw_part = line.split("Keywords")[1].strip()
                    if kw_part.startswith("—") or kw_part.startswith("-"):
                        kw_part = kw_part[1:].strip()
                
                story.append(Paragraph(f"<b>Keywords—</b> {kw_part}", body_style))
                story.append(Spacer(1, 10))
                in_keywords = False
                i += 1
                continue
            else:
                if line:
                    story.append(Paragraph(line, abstract_text_style))
                i += 1
                continue

        # Detect Section Headings (e.g. I. INTRODUCTION, II. RELATED WORK, etc.)
        import re
        sec_match = re.match(r'^([IXVLCDM]+\.\s+[A-Z\s&]+)$', line)
        if sec_match:
            story.append(Paragraph(line, heading1_style))
            i += 1
            continue

        # Detect Subheadings (e.g. A. Overview, B. Identity Verification, etc.)
        subsec_match = re.match(r'^([A-G]\.\s+[A-Za-z\s&/:\-]+)$', line)
        if subsec_match:
            story.append(Paragraph(line, heading2_style))
            i += 1
            continue

        # Detect Figure/Image Placeholders
        if line.startswith("[INSERT PLACEHOLDER:") or line.startswith("Fig.") or line.startswith("Caption:"):
            if line.startswith("[INSERT PLACEHOLDER:"):
                # Draw a neat visual box placeholder for the figure
                fig_text = line.replace("[", "").replace("]", "")
                box_data = [[Paragraph(f"<b>[ {fig_text} ]</b><br/>Insert Screenshot / Diagram Here in MS Word", author_style)]]
                box_table = Table(box_data, colWidths=[400], rowHeights=[100])
                box_table.setStyle(TableStyle([
                    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F7FAFC')),
                    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E0')),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 15),
                    ('TOPPADDING', (0,0), (-1,-1), 15),
                ]))
                story.append(Spacer(1, 8))
                story.append(box_table)
            else:
                story.append(Paragraph(line, caption_style))
            i += 1
            continue

        # Detect Metric Tables Start (e.g. TABLE I, TABLE II)
        if line.startswith("TABLE ") and ("BREAKDOWN" in line or "ACCURACY" in line or "ANALYSIS" in line or " breakdown" in line.lower()):
            in_table = True
            table_title = line
            table_data = []
            
            # Read header divider (e.g. ------...)
            i += 1
            divider_line = lines[i].strip()
            
            # Read columns header line
            i += 1
            header_line = lines[i].strip()
            headers = [h.strip() for h in re.split(r'\s{2,}', header_line) if h.strip()]
            table_data.append([Paragraph(h, table_header_style) for h in headers])
            
            # Read subheader divider (e.g. -------...)
            i += 1
            
            # Read rows until another divider
            i += 1
            while i < len(lines):
                row_line = lines[i].strip()
                if row_line.startswith("------") or row_line.startswith("======="):
                    break
                row_vals = [r.strip() for r in re.split(r'\s{2,}', row_line) if r.strip()]
                # Match widths
                if len(row_vals) == len(headers):
                    table_data.append([Paragraph(val, table_cell_style) for val in row_vals])
                elif len(row_vals) > 0:
                    # Pad or trim if mismatch
                    if len(row_vals) < len(headers):
                        row_vals += [""] * (len(headers) - len(row_vals))
                    else:
                        row_vals = row_vals[:len(headers)]
                    table_data.append([Paragraph(val, table_cell_style) for val in row_vals])
                i += 1
            
            # Format and append Table
            col_width = 504 / len(headers) # page width (612 - 108 margin) / col count
            t = Table(table_data, colWidths=[col_width]*len(headers))
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1A365D')),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('LEFTPADDING', (0,0), (-1,-1), 4),
                ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(Spacer(1, 8))
            story.append(Paragraph(f"<b>{table_title}</b>", caption_style))
            story.append(t)
            story.append(Spacer(1, 8))
            in_table = False
            i += 1
            continue

        # Standard paragraph text
        if line:
            # Check for inline math equations (like $$...$$) and clean up
            line_cleaned = line.replace("$$", "")
            # Double check for lists or references
            if line.startswith("[") and "]" in line and len(line) < 150:
                # Reference list item (indent)
                ref_style = ParagraphStyle(
                    'RefText',
                    parent=styles['Normal'],
                    fontName='Helvetica',
                    fontSize=9,
                    leading=12,
                    leftIndent=20,
                    firstLineIndent=-20,
                    spaceAfter=4
                )
                story.append(Paragraph(line_cleaned, ref_style))
            else:
                story.append(Paragraph(line_cleaned, body_style))
            
        i += 1

    # Build document
    doc.build(story)
    print(f"Successfully generated PDF at {pdf_path}")

if __name__ == "__main__":
    txt_path = r"d:\mockai\scratch\paper_updated.txt"
    pdf_path = r"d:\mockai\MockAI_Updated_Research_Paper.pdf"
    build_pdf(txt_path, pdf_path)
