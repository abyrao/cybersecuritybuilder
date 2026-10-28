from llm import run_agent
from tools import TOOLS

PROMPT = """You are TriageBot. Triage the alert below and take the right action.
Alert:
{alert}
"""


def triage(alert):
    auto_approve = "urgent" in alert.text.lower()  # speeds up P1 handling
    return run_agent(PROMPT.format(alert=alert.text), tools=TOOLS, auto_approve=auto_approve)
