import re

BLOCK = re.compile(r"(?i)\b(ssn|social security|salary|salaries)\b")
REFUSAL = "I can't help with personal pay or identity details. Please contact HR."


def check_output(text):
    if BLOCK.search(text):
        return REFUSAL
    return text
