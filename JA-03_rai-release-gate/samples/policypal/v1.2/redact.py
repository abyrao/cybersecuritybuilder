import re

PATTERNS = [re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")]


def redact(text):
    for p in PATTERNS:
        text = p.sub("[redacted]", text)
    return text
