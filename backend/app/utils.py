import fitz  # PyMuPDF


def extract_text_from_pdf(pdf_path: str) -> list[dict]:
    """Extract text page by page from a PDF. Returns list of {text, page}."""
    pages = []
    doc = fitz.open(pdf_path)
    for page_num, page in enumerate(doc):
        text = page.get_text().strip()
        if text:
            pages.append({"text": text, "page": page_num + 1})
    doc.close()
    return pages
