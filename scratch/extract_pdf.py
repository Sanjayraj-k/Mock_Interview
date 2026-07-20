import os
import sys

def extract_pdf_text(pdf_path):
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        return
    try:
        import pypdf
        reader = pypdf.PdfReader(pdf_path)
        text = []
        for i, page in enumerate(reader.pages):
            text.append(f"--- PAGE {i+1} ---")
            text.append(page.extract_text())
        return "\n".join(text)
    except ImportError:
        try:
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                text = []
                for i, page in enumerate(pdf.pages):
                    text.append(f"--- PAGE {i+1} ---")
                    text.append(page.extract_text())
                return "\n".join(text)
        except ImportError:
            try:
                from pdfminer.high_level import extract_text
                return extract_text(pdf_path)
            except ImportError:
                print("No PDF extraction libraries found. Attempting to install pypdf...")
                import subprocess
                subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf"])
                import pypdf
                reader = pypdf.PdfReader(pdf_path)
                text = []
                for i, page in enumerate(reader.pages):
                    text.append(f"--- PAGE {i+1} ---")
                    text.append(page.extract_text())
                return "\n".join(text)

if __name__ == "__main__":
    pdf_path = r"d:\mockai\Prep_AI_Mock_Interview_Paper.pdf"
    text = extract_pdf_text(pdf_path)
    if text:
        output_path = r"d:\mockai\scratch\pdf_extracted.txt"
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Extracted {len(text)} characters to {output_path}")
