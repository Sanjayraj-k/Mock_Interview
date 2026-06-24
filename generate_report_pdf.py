"""
MockAI Project Report – Markdown to PDF Generator
Converts project_report.md into a professionally styled PDF document.
"""

import markdown
from xhtml2pdf import pisa
import os

# --- Configuration ---
MD_INPUT = r"C:\Users\SANJAY\.gemini\antigravity-ide\brain\63484e41-aca2-40fa-acb0-7e8dbfc3b503\project_report.md"
PDF_OUTPUT = r"d:\mockai\MockAI_Project_Report.pdf"

# --- Professional CSS matching SentinelAI blue-theme style ---
CSS = """
@page {
    size: A4;
    margin: 2.2cm 2cm 2.5cm 2cm;
    @frame footer {
        -pdf-frame-content: footerContent;
        bottom: 0.8cm;
        margin-left: 2cm;
        margin-right: 2cm;
        height: 1.2cm;
    }
}

body {
    font-family: "Helvetica", "Arial", sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    color: #222222;
}

/* ===== HEADINGS ===== */
h1 {
    font-size: 22pt;
    color: #1a5276;
    border-bottom: 3px solid #2980b9;
    padding-bottom: 8px;
    margin-top: 30px;
    margin-bottom: 15px;
    page-break-after: avoid;
}

h2 {
    font-size: 16pt;
    color: #1a5276;
    border-bottom: 2px solid #d4e6f1;
    padding-bottom: 6px;
    margin-top: 28px;
    margin-bottom: 12px;
    page-break-after: avoid;
}

h3 {
    font-size: 13pt;
    color: #2471a3;
    margin-top: 22px;
    margin-bottom: 10px;
    page-break-after: avoid;
}

h4 {
    font-size: 11.5pt;
    color: #2e86c1;
    margin-top: 16px;
    margin-bottom: 8px;
}

/* ===== TABLES ===== */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 18px 0;
    font-size: 10pt;
}

th {
    background-color: #2980b9;
    color: #ffffff;
    font-weight: bold;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #2471a3;
}

td {
    padding: 7px 10px;
    border: 1px solid #bdc3c7;
    vertical-align: top;
}

tr:nth-child(even) td {
    background-color: #f2f8fc;
}

/* ===== BLOCKQUOTES (Module Boxes) ===== */
blockquote {
    background-color: #f7fbfe;
    border-left: 5px solid #2980b9;
    border: 1px solid #d4e6f1;
    border-left: 5px solid #2980b9;
    padding: 14px 16px;
    margin: 14px 0;
    font-size: 10.5pt;
    page-break-inside: avoid;
}

blockquote strong {
    color: #1a5276;
}

blockquote p {
    margin: 4px 0;
}

/* ===== CODE BLOCKS ===== */
code {
    font-family: "Courier", monospace;
    font-size: 9pt;
    background-color: #f4f6f7;
    padding: 1px 4px;
    color: #2c3e50;
}

pre {
    background-color: #f4f6f7;
    border: 1px solid #d5dbdb;
    border-left: 4px solid #2980b9;
    padding: 10px 14px;
    font-family: "Courier", monospace;
    font-size: 9pt;
    line-height: 1.45;
    overflow-x: auto;
    margin: 10px 0;
    page-break-inside: avoid;
}

/* ===== HORIZONTAL RULES ===== */
hr {
    border: none;
    border-top: 1.5px solid #d4e6f1;
    margin: 20px 0;
}

/* ===== LISTS ===== */
ul, ol {
    margin: 6px 0 10px 20px;
    padding-left: 10px;
}

li {
    margin-bottom: 3px;
}

/* ===== PARAGRAPHS ===== */
p {
    margin: 6px 0;
    text-align: justify;
}

/* ===== LINKS ===== */
a {
    color: #2980b9;
    text-decoration: none;
}

/* ===== FOOTER ===== */
#footerContent {
    text-align: center;
    font-size: 8.5pt;
    color: #7f8c8d;
    border-top: 1px solid #d4e6f1;
    padding-top: 6px;
}
"""

FOOTER_HTML = """
<div id="footerContent">
    MockAI – Final Year Project Report &nbsp;&nbsp;|&nbsp;&nbsp; Page <pdf:pagenumber>
</div>
"""

# --- Cover Page HTML ---
COVER_PAGE = """
<div style="text-align: center; padding-top: 180px;">
    <div style="font-size: 36pt; color: #1a5276; font-weight: bold; letter-spacing: 2px;">
        MockAI
    </div>
    <div style="font-size: 14pt; color: #5d6d7e; margin-top: 12px; letter-spacing: 1px;">
        AI-Powered Mock Interview &amp; Career Preparation Platform
    </div>
    <hr style="width: 60%; margin: 30px auto; border: none; border-top: 3px solid #2980b9;">
    <div style="font-size: 15pt; color: #2c3e50; margin-top: 20px; font-weight: bold;">
        Final Year Project Report
    </div>
    <div style="font-size: 12pt; color: #5d6d7e; margin-top: 30px;">
        Semester 7: Testing &amp; Proctoring Phase<br>
        Semester 8: Learning &amp; Collaboration Phase
    </div>
    <div style="font-size: 11pt; color: #7f8c8d; margin-top: 60px;">
        Department of Computer Science &amp; Engineering<br>
        Academic Year 2025–2026
    </div>
</div>
<pdf:nextpage>
"""


def convert_md_to_pdf(md_path, pdf_path):
    """Read markdown, convert to styled HTML, then render to PDF."""
    
    # 1. Read the markdown source
    print(f"Reading markdown from: {md_path}")
    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    # 2. Convert markdown to HTML with extensions
    extensions = [
        "tables",
        "fenced_code",
        "codehilite",
        "toc",
        "nl2br",
        "sane_lists",
    ]
    html_body = markdown.markdown(md_text, extensions=extensions)

    # 3. Assemble full HTML document
    full_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>MockAI – Final Year Project Report</title>
    <style>{CSS}</style>
</head>
<body>
    {COVER_PAGE}
    {html_body}
    {FOOTER_HTML}
</body>
</html>"""

    # 4. Save intermediate HTML (useful for debugging / browser printing)
    html_path = pdf_path.replace(".pdf", ".html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(full_html)
    print(f"Styled HTML saved to: {html_path}")

    # 5. Generate PDF using xhtml2pdf
    print(f"Generating PDF to: {pdf_path}")
    with open(pdf_path, "wb") as pdf_file:
        pisa_status = pisa.CreatePDF(full_html, dest=pdf_file, encoding="utf-8")

    if pisa_status.err:
        print(f"ERROR: PDF generation encountered {pisa_status.err} errors.")
        print(f"You can still open the HTML file in your browser and print to PDF.")
    else:
        print(f"SUCCESS: PDF generated at {pdf_path}")
        print(f"File size: {os.path.getsize(pdf_path) / 1024:.1f} KB")

    return not pisa_status.err


if __name__ == "__main__":
    success = convert_md_to_pdf(MD_INPUT, PDF_OUTPUT)
    if success:
        print("\n✅ Report PDF generated successfully!")
        print(f"   📄 PDF:  {PDF_OUTPUT}")
        print(f"   🌐 HTML: {PDF_OUTPUT.replace('.pdf', '.html')}")
    else:
        html_fallback = PDF_OUTPUT.replace('.pdf', '.html')
        print(f"\n⚠️  PDF had issues, but the HTML version is ready.")
        print(f"   🌐 Open {html_fallback} in your browser and use Ctrl+P to print as PDF.")
