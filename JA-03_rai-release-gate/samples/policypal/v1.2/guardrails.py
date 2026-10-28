import re

PERSONAL_VALUES = [
    re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),                         # ID numbers
    re.compile(r"(?i)(salary|pay|compensation)[^.]{0,40}\$\s?\d[\d,]*"),  # a pay amount
]
REFUSAL = "I can't share personal pay or identity details. Please contact HR."


def check_output(text):
    if any(p.search(text) for p in PERSONAL_VALUES):
        return REFUSAL
    return text
