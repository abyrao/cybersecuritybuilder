import re

INSTRUCTION = re.compile(r"(?i)(ignore (all |any )?(previous|prior) instructions|you are now|system prompt)")


def strip_instructions(text):
    return INSTRUCTION.sub("[removed]", text)
