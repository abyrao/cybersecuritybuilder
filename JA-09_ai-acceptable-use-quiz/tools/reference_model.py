"""JA-09 reference model: AI acceptable use policy, self-check rules, quiz scoring, program dashboard.
Writes data/*.json and prints known answers. All data is fictional.

Usage: python3 tools/reference_model.py data
"""
import json, sys
from collections import defaultdict, Counter

AS_OF = "2026-10-30"
WINDOW = ("2026-10-01", "2026-10-30")      # 30 days of program data

# ------------------------------------------------------------------ organization (same as JA-01)
DEPTS = [
    ("FIN", "Finance", 310), ("HR", "HR", 180), ("SAL", "Sales", 820), ("MKT", "Marketing", 260),
    ("ENG", "Engineering", 1150), ("SUP", "Customer Support", 720), ("LEG", "Legal", 90),
    ("OPS", "Operations", 590), ("EXE", "Executive", 80),
]
HEADCOUNT = sum(d[2] for d in DEPTS)

# ------------------------------------------------------------------ policy building blocks
CLASSES = ["Public", "Internal", "Confidential", "Restricted"]
RANK = {c: i for i, c in enumerate(CLASSES)}

DATA_TYPES = [
    # id, label, class, never (can't go into any AI tool), examples
    ("public", "Published content", "Public", False, "Website copy, press releases, published docs"),
    ("internal", "Internal documents", "Internal", False, "Announcements, process docs, meeting agendas"),
    ("strategy", "Plans and contracts", "Confidential", False, "Strategy decks, pricing, customer and supplier contracts"),
    ("code", "Source code", "Confidential", False, "Application code with no secrets in it"),
    ("customer", "Customer personal data", "Restricted", False, "Names, emails, phone numbers, support tickets, account history"),
    ("employee", "Employee records", "Restricted", False, "HR files, pay, performance, health and leave"),
    ("financials", "Unreleased financials", "Restricted", False, "Quarter results and forecasts before they're public"),
    ("secrets", "Passwords and keys", "Restricted", True, "Passwords, API keys, tokens, private certificates"),
    ("payment", "Card, bank and ID numbers", "Restricted", True, "Payment card numbers, bank account numbers, government ID numbers"),
]
DT = {d[0]: dict(id=d[0], label=d[1], cls=d[2], never=d[3], examples=d[4]) for d in DATA_TYPES}

TOOLS = [
    # id, name, status, max class, restricted types allowed, purposes allowed (None = any), note
    dict(id="T1", name="Company AI assistant", status="approved", max_class="Confidential", restricted_ok=[], purposes=None,
         note="Enterprise tenant with single sign-on. Prompts aren't used for training and are kept 30 days. Includes meeting notes."),
    dict(id="T2", name="Support Copilot", status="approved", max_class="Internal", restricted_ok=["customer"],
         purposes=["reply", "summarize"], note="Built into the support desk. Approved for customer personal data in support work only."),
    dict(id="T3", name="Code assistant", status="approved", max_class="Confidential", restricted_ok=[], purposes=["code", "summarize"],
         note="Enterprise license on company repositories. Code isn't used for training."),
    dict(id="T4", name="Design tool AI", status="limited", max_class="Internal", restricted_ok=[], purposes=["draft", "image"],
         note="AI features in the company design tool. Internal and public content only."),
    dict(id="T5", name="Public chatbot, personal account", status="public_only", max_class="Public", restricted_ok=[], purposes=None,
         note="Any consumer AI chatbot used with a personal account. Published content only."),
    dict(id="T6", name="NoteHawk meeting bot", status="blocked", max_class=None, restricted_ok=[], purposes=None,
         note="Free meeting note-taker. Blocked by the AI Governance Committee (blacklist v3.2, BL-06)."),
    dict(id="T7", name="TabGenie AI extension", status="blocked", max_class=None, restricted_ok=[], purposes=None,
         note="Browser extension that reads every page you open. Blocked (blacklist v3.2, BL-04)."),
]
TOOL = {t["id"]: t for t in TOOLS}
STATUS_LABEL = {"approved": "Approved", "limited": "Approved with limits", "public_only": "Public content only", "blocked": "Blocked"}

PURPOSES = [
    ("draft", "Draft or edit writing"), ("summarize", "Summarize or analyze"), ("code", "Write or review code"),
    ("meeting", "Take meeting notes"), ("reply", "Reply to a customer"), ("image", "Create images or visuals"),
    ("people", "Screen, rank or evaluate people"), ("likeness", "Imitate a real person's voice or face"),
]
PURPOSE = dict(PURPOSES)

# ------------------------------------------------------------------ the policy (AUP v2.1)
POLICY = dict(
    title="AI Acceptable Use Policy", version="2.1", effective="2026-10-14", owner="AI Governance Committee",
    review="Every 6 months, or when a tool or rule changes",
    sections=[
        dict(id="1", title="Why this policy exists", items=[
            ("1.1", "AI tools help us work faster. This policy tells you which tools to use, what data can go into them, and what stays human."),
            ("1.2", "It applies to everyone who works for us, on any device, whenever company or customer information is involved."),
        ]),
        dict(id="2", title="Five principles", items=[
            ("2.1", "AI helps; people decide."),
            ("2.2", "Protect data: only put in what the tool is approved for."),
            ("2.3", "You own the output: check it before you use it."),
            ("2.4", "Be open about AI use when it matters to the reader."),
            ("2.5", "Speak up when something looks wrong."),
        ]),
        dict(id="3", title="Data: what can go where", items=[
            ("3.1", "Every piece of information has a class: Public, Internal, Confidential or Restricted."),
            ("3.2", "Use a tool only for data up to the class it's approved for (see the table)."),
            ("3.3", "Restricted data goes only into a tool approved for that exact data and task. Today that's Support Copilot, for customer data in support work."),
            ("3.4", "Never put passwords, keys, tokens, payment card numbers, bank account numbers or government ID numbers into any AI tool."),
        ]),
        dict(id="4", title="Tools", items=[
            ("4.1", "Use the approved tools first. They run on our enterprise accounts and don't train on our data."),
            ("4.2", "Blocked tools (for example NoteHawk and TabGenie AI) must not be used, even if a customer or supplier invites them."),
            ("4.3", "Public chatbots with personal accounts: published content only, never signed in with a company email."),
            ("4.4", "Need a tool that isn't listed? Request it through AI vendor intake. Don't start with a free trial."),
        ]),
        dict(id="5", title="Never use AI to", items=[
            ("5.1", "Make or recommend decisions about people: hiring, firing, pay, promotion or discipline."),
            ("5.2", "Imitate a real person's voice, face or writing without their written consent."),
            ("5.3", "Get around security controls, monitoring or this policy."),
            ("5.4", "Monitor or profile colleagues."),
        ]),
        dict(id="6", title="Your responsibilities", items=[
            ("6.1", "A person reviews anything AI drafts before it reaches a customer."),
            ("6.2", "Check facts, figures, code and sources. AI output is your work once you use it."),
            ("6.3", "Tell everyone in a meeting before AI takes notes, and delete recordings within 30 days."),
            ("6.4", "Label AI-generated images and media in external content."),
        ]),
        dict(id="7", title="Speak up", items=[
            ("7.1", "If you see AI used against this policy, talk to the person, ask the AI help desk, or report it. Anonymous reports are welcome."),
            ("7.2", "Reports start with coaching, not discipline. Retaliation against anyone who speaks up is not allowed."),
            ("7.3", "Never forward or screenshot the sensitive data itself when you report."),
        ]),
        dict(id="8", title="Exceptions", items=[
            ("8.1", "Ask the AI Governance Committee for an exception with a business reason, an owner and an end date. Wait for approval before you start."),
        ]),
    ],
    history=[
        dict(version="2.0", date="2026-04-01", change="Added Support Copilot for customer data; added the five principles."),
        dict(version="2.1", date="2026-10-14", change="Blocked NoteHawk and TabGenie AI (blacklist v3.2); added 4.2 and 6.3."),
    ],
)
CLAUSE = {i[0]: i[1] for s in POLICY["sections"] for i in s["items"]}

# ------------------------------------------------------------------ self-check engine
def check(tool, data, purpose, customer_facing=False, reviewed=True, consent=True):
    """Returns verdict (approved | conditions | not_approved), the rule that decided, clauses, conditions, safer path."""
    t = TOOL[tool]
    data = list(data)
    top = max((DT[d]["cls"] for d in data), key=lambda c: RANK[c]) if data else "Public"
    restricted = [d for d in data if DT[d]["cls"] == "Restricted"]
    customer_facing = customer_facing or purpose == "reply"
    def out(verdict, rule, clauses, safer=None, conditions=None):
        return dict(verdict=verdict, rule=rule, clauses=clauses, safer=safer, conditions=conditions or [], data_class=top)
    never = [d for d in data if DT[d]["never"]]
    if never:
        return out("not_approved", "R1", ["3.4"], "Remove the numbers, keys or passwords first, or use masked values (for example the last four digits).")
    if purpose == "people":
        return out("not_approved", "R2", ["5.1", "2.1"], "Use AI to draft the job description or interview questions. Decisions about people stay with people.")
    if purpose == "likeness":
        return out("not_approved", "R3", ["5.2"], "Use a stock voice or an illustrated character instead, or get the person's written consent first.")
    if t["status"] == "blocked":
        alt = "Use the company AI assistant's meeting notes, and tell everyone first." if purpose == "meeting" else "Use the company AI assistant instead."
        return out("not_approved", "R4", ["4.2"], alt)
    if t["status"] == "public_only" and RANK[top] > RANK["Public"]:
        return out("not_approved", "R5", ["4.3", "3.2"], safer_tool(data, purpose))
    # every data type must be within the tool's class, or a named exception for that tool
    too_high = [d for d in data if RANK[DT[d]["cls"]] > RANK[t["max_class"]] and d not in t["restricted_ok"]]
    if too_high:
        return out("not_approved", "R6", ["3.3"] if restricted else ["3.2"], safer_tool(data, purpose))
    if t["purposes"] is not None and purpose not in t["purposes"]:
        return out("not_approved", "R7", ["4.1"], f"{t['name']} is approved for {', '.join(PURPOSE[p].lower() for p in t['purposes'])}. " + (safer_tool(data, purpose) or ""))
    if customer_facing and not reviewed:
        return out("not_approved", "R8", ["6.1"], "Keep the AI draft, then have a person review and send it.")
    if purpose == "meeting" and not consent:
        return out("not_approved", "R9", ["6.3"], "Tell everyone in the meeting first, then turn on notes.")
    conds, clauses = [], []
    if t["status"] == "public_only":
        conds += ["Don't sign in with your company email", "Paste only what's already published", "Check facts before you use it"]; clauses.append("4.3")
    if restricted:
        conds += ["Use only the fields the task needs", "No card, bank or ID numbers"]; clauses.append("3.3")
    if customer_facing:
        conds += ["A person reviews and sends the reply"]; clauses.append("6.1")
    if purpose == "meeting":
        conds += ["Tell everyone before notes start", "Delete the recording within 30 days"]; clauses.append("6.3")
    if purpose == "image" and t["id"] != "T5":
        pass
    if conds:
        return out("conditions", "R10", clauses + ["6.2"], None, conds)
    return out("approved", "R11", ["6.2"], None, ["Check the output before you use it"])

def safer_tool(data, purpose):
    for t in TOOLS:
        if t["status"] in ("blocked", "public_only"): continue
        if t["purposes"] is not None and purpose not in t["purposes"]: continue
        if all(RANK[DT[d]["cls"]] <= RANK[t["max_class"]] or d in t["restricted_ok"] for d in data):
            return f"Use {t['name']} instead."
    if any(DT[d]["cls"] == "Restricted" for d in data):
        return "No approved tool takes this data for this task. Remove or mask the restricted data, or request an exception."
    return None

RULE_LABEL = {
    "R1": "Never-allowed data (keys, card, bank or ID numbers)", "R2": "Decisions about people",
    "R3": "Imitating a real person", "R4": "Blocked tool", "R5": "Non-public data in a public chatbot",
    "R6": "Data above the tool's approval", "R7": "Tool not approved for this task", "R8": "Customer reply without review",
    "R9": "Meeting notes without telling attendees", "R10": "Allowed with conditions", "R11": "Allowed",
}

# ------------------------------------------------------------------ quiz
QUIZ = [
    # id, prompt, inputs, base correct rate (company-wide), topic
    ("Q1", "Rewrite our published press release in a public chatbot, signed in with your personal account.", dict(tool="T5", data=["public"], purpose="draft"), 0.72, "Public chatbots"),
    ("Q2", "Paste this quarter's results, out next week, into the company AI assistant to draft talking points.", dict(tool="T1", data=["financials"], purpose="draft"), 0.81, "Restricted data"),
    ("Q3", "Ask the code assistant to review a pull request with no secrets in it.", dict(tool="T3", data=["code"], purpose="code"), 0.88, "Approved tools"),
    ("Q4", "Upload a list of 2,000 customer emails to the company AI assistant to plan a campaign.", dict(tool="T1", data=["customer"], purpose="summarize"), 0.42, "Restricted data"),
    ("Q5", "Support Copilot drafts a reply to a customer complaint. You edit and send it.", dict(tool="T2", data=["customer"], purpose="reply", reviewed=True), 0.69, "Customer replies"),
    ("Q6", "A supplier invites NoteHawk to your call. You let it take notes.", dict(tool="T6", data=["strategy"], purpose="meeting"), 0.63, "Blocked tools"),
    ("Q7", "Use the company AI assistant to rank 300 job applicants by résumé.", dict(tool="T1", data=["employee"], purpose="people"), 0.84, "Decisions about people"),
    ("Q8", "Ask the company AI assistant to summarize an internal process doc.", dict(tool="T1", data=["internal"], purpose="summarize"), 0.93, "Approved tools"),
    ("Q9", "Paste a config file with an API key into the code assistant to debug it.", dict(tool="T3", data=["code", "secrets"], purpose="code"), 0.76, "Never-allowed data"),
    ("Q10", "The company AI assistant takes notes in your team meeting. You told everyone at the start.", dict(tool="T1", data=["internal"], purpose="meeting", consent=True), 0.66, "Meetings"),
    ("Q11", "TabGenie AI, a browser extension, summarizes a customer contract for you.", dict(tool="T7", data=["strategy"], purpose="summarize"), 0.58, "Blocked tools"),
    ("Q12", "Set up the company AI assistant to send replies to customer emails automatically.", dict(tool="T1", data=["internal"], purpose="reply", reviewed=False), 0.87, "Customer replies"),
]
SCORING = dict(correct=100, streak_step=10, streak_cap=50, hint_cost=25, pass_correct=10,
               levels=[("AI Explorer", 0), ("AI Navigator", 800), ("AI Champion", 1400)])
BADGES = [
    dict(id="guardian", name="Data Guardian", rule="Answer every restricted-data question correctly (Q2, Q4, Q9)."),
    dict(id="streak", name="Clean Streak", rule="Five correct answers in a row."),
    dict(id="reader", name="Policy Reader", rule="Open five policy sections."),
    dict(id="ally", name="Speak-up Ally", rule="Finish the three Speak up cards."),
    dict(id="certified", name="Certified", rule="10 of 12 correct. Records your policy attestation."),
]

def answer(q):
    i = q[2]
    return check(i["tool"], i["data"], i["purpose"], reviewed=i.get("reviewed", True), consent=i.get("consent", True))

def score_run(results):
    """results: list of (correct, used_hint). Returns points, streak max, level."""
    pts, streak, best = 0, 0, 0
    for ok, hint in results:
        if ok:
            streak += 1
            pts += max(0, SCORING["correct"] - (SCORING["hint_cost"] if hint else 0))
            pts += min(SCORING["streak_step"] * (streak - 1), SCORING["streak_cap"])
        else:
            streak = 0
        best = max(best, streak)
    level = [n for n, t in SCORING["levels"] if pts >= t][-1]
    return dict(points=pts, best_streak=best, correct=sum(1 for ok, _ in results if ok), level=level,
                passed=sum(1 for ok, _ in results if ok) >= SCORING["pass_correct"])

# ------------------------------------------------------------------ program data (30 days)
DEPT_MOD = {"FIN": 0.05, "HR": 0.07, "SAL": 0.09, "MKT": 0.06, "ENG": 0.04, "SUP": -0.01, "LEG": 0.11, "OPS": -0.07, "EXE": 0.02}
COMPLETION = {"FIN": 0.90, "HR": 0.97, "SAL": 0.71, "MKT": 0.88, "ENG": 0.79, "SUP": 0.83, "LEG": 0.96, "OPS": 0.41, "EXE": 0.64}
# special: Sales knows the NoteHawk rule (Q6) well on the quiz
SPECIAL = {("SAL", "Q6"): 0.12, ("SUP", "Q5"): 0.20, ("ENG", "Q9"): 0.12, ("HR", "Q7"): 0.12}

def q_rate(dep, q):
    return max(0.05, min(0.98, q[3] + DEPT_MOD[dep] + SPECIAL.get((dep, q[0]), 0)))

def pass_prob(rates, need):
    dp = [1.0] + [0.0] * len(rates)
    for r in rates:
        dp = [dp[k] * (1 - r) + (dp[k - 1] * r if k else 0) for k in range(len(dp))]
    return sum(dp[need:])

TEMPLATES = {
    "S1": dict(tool="T1", data=["internal"], purpose="summarize"),
    "S2": dict(tool="T1", data=["strategy"], purpose="draft"),
    "S3": dict(tool="T1", data=["customer"], purpose="summarize"),
    "S4": dict(tool="T2", data=["customer"], purpose="reply", reviewed=True),
    "S5": dict(tool="T2", data=["customer"], purpose="summarize"),
    "S6": dict(tool="T3", data=["code"], purpose="code"),
    "S7": dict(tool="T3", data=["code", "secrets"], purpose="code"),
    "S8": dict(tool="T6", data=["strategy"], purpose="meeting"),
    "S9": dict(tool="T1", data=["internal"], purpose="meeting", consent=True),
    "S10": dict(tool="T5", data=["public"], purpose="draft"),
    "S11": dict(tool="T5", data=["strategy"], purpose="summarize"),
    "S12": dict(tool="T7", data=["strategy"], purpose="summarize"),
    "S13": dict(tool="T1", data=["employee"], purpose="people"),
    "S14": dict(tool="T1", data=["financials"], purpose="draft"),
    "S15": dict(tool="T1", data=["internal"], purpose="reply", reviewed=False),
    "S16": dict(tool="T4", data=["public"], purpose="image"),
}
VOLUME = {
    "FIN": dict(S1=120, S2=90, S14=38, S11=20, S12=12, S10=15, S9=30),
    "HR":  dict(S1=60, S2=30, S13=22, S9=15, S10=10, S11=6),
    "SAL": dict(S1=160, S2=210, S3=48, S8=212, S9=90, S10=80, S11=32, S12=18, S15=21),
    "MKT": dict(S1=90, S2=110, S10=160, S16=120, S11=30, S3=25, S8=14),
    "ENG": dict(S6=900, S7=60, S1=260, S2=120, S12=40, S10=70, S9=60),
    "SUP": dict(S4=820, S5=410, S3=40, S15=35, S1=120, S10=20),
    "LEG": dict(S1=40, S2=35, S9=10, S11=4),
    "OPS": dict(S1=180, S2=90, S9=40, S10=40, S12=25, S8=20),
    "EXE": dict(S2=40, S14=6, S9=10, S8=8),
}

REPORTS = [
    # id, behavior (rule), department where it happened, channel, talked first, status
    ("SR-01", "R4", "SAL", "named", True, "coached"), ("SR-02", "R4", "SAL", "anonymous", False, "coached"),
    ("SR-03", "R4", "SAL", "anonymous", False, "coached"), ("SR-04", "R5", "MKT", "named", True, "coached"),
    ("SR-05", "R4", "OPS", "anonymous", False, "open"), ("SR-06", "R8", "SUP", "named", True, "coached"),
    ("SR-07", "R4", "SAL", "named", False, "coached"), ("SR-08", "R6", "SAL", "anonymous", False, "coached"),
    ("SR-09", "R4", "EXE", "named", True, "coached"), ("SR-10", "R5", "FIN", "anonymous", False, "no_issue"),
    ("SR-11", "R4", "SAL", "anonymous", False, "open"), ("SR-12", "R1", "ENG", "named", True, "coached"),
    ("SR-13", "R4", "MKT", "named", False, "coached"), ("SR-14", "R8", "SUP", "anonymous", False, "coached"),
    ("SR-15", "R5", "SAL", "named", True, "no_issue"), ("SR-16", "R4", "SAL", "anonymous", False, "coached"),
    ("SR-17", "R2", "HR", "anonymous", False, "open"), ("SR-18", "R4", "OPS", "named", True, "coached"),
    ("SR-19", "R6", "SAL", "named", False, "coached"), ("SR-20", "R5", "MKT", "anonymous", False, "coached"),
    ("SR-21", "R4", "SAL", "anonymous", False, "open"), ("SR-22", "R1", "ENG", "named", True, "no_issue"),
    ("SR-23", "R8", "SUP", "anonymous", False, "open"),
]
REPORT_STATUS = {"coached": "Coached", "open": "Open", "no_issue": "No issue found"}

QUESTIONS = [
    ("Can I use AI to summarize customer calls?", 41, "6.3"),
    ("A supplier uses NoteHawk. Can I join the call?", 33, "4.2"),
    ("Can the company assistant screen résumés for keywords?", 18, "5.1"),
    ("Can I paste a screenshot of a dashboard into a chatbot?", 15, "3.2"),
    ("Is the code assistant OK for open-source projects?", 9, "4.1"),
    ("Do I have to label AI images in internal decks?", 7, "6.4"),
]
FAQ_DRAFT = dict(
    clause="6.3", version="2.2",
    text=("Customer call summaries: Support Copilot may summarize recorded support calls when the customer was told "
          "the call is recorded. Use the company AI assistant for internal calls only. NoteHawk stays blocked, "
          "even when a customer or supplier brings it."),
    change="Clarified 6.3: customer call summaries allowed in Support Copilot when the customer was told about the recording.",
)

# ------------------------------------------------------------------ aggregate
def program():
    depts = []
    q_missed = Counter(); q_attempts = Counter()
    sc_tot = Counter(); sc_rule = Counter(); sc_tool = defaultdict(Counter); sc_dept = defaultdict(Counter)
    for dep, name, hc in DEPTS:
        attempts = round(hc * COMPLETION[dep])
        rates = [round(q_rate(dep, q), 3) for q in QUIZ]   # the published rates in program.json
        avg = sum(rates) / len(rates)
        passed = round(attempts * pass_prob(rates, SCORING["pass_correct"]))
        for q, r in zip(QUIZ, rates):
            q_attempts[q[0]] += attempts
            q_missed[q[0]] += attempts - round(attempts * r)
        for tid, n in VOLUME[dep].items():
            res = check(**TEMPLATES[tid])
            sc_tot[res["verdict"]] += n; sc_rule[res["rule"]] += n
            sc_tool[TEMPLATES[tid]["tool"]][res["verdict"]] += n
            sc_dept[dep][res["verdict"]] += n
        total = sum(sc_dept[dep].values())
        depts.append(dict(id=dep, name=name, headcount=hc, quiz_attempts=attempts, completion=round(attempts / hc, 3),
                          quiz_avg=round(avg, 3), passed=passed, attested=round(passed / hc, 3),
                          checks=total, approved=sc_dept[dep]["approved"], conditions=sc_dept[dep]["conditions"],
                          not_approved=sc_dept[dep]["not_approved"], not_approved_share=round(sc_dept[dep]["not_approved"] / total, 3)))
    total_checks = sum(sc_tot.values())
    na = sc_tot["not_approved"]
    attempts = sum(d["quiz_attempts"] for d in depts)
    passed = sum(d["passed"] for d in depts)
    qstats = [dict(id=q[0], topic=q[4], attempts=q_attempts[q[0]], missed=q_missed[q[0]],
                   missed_share=round(q_missed[q[0]] / q_attempts[q[0]], 3)) for q in QUIZ]
    weighted_avg = sum(d["quiz_avg"] * d["quiz_attempts"] for d in depts) / attempts
    rep = Counter(r[1] for r in REPORTS); st = Counter(r[5] for r in REPORTS)
    return dict(
        departments=depts,
        totals=dict(headcount=HEADCOUNT, quiz_attempts=attempts, completion=round(attempts / HEADCOUNT, 3), passed=passed,
                    attested=round(passed / HEADCOUNT, 3), quiz_avg=round(weighted_avg, 3),
                    checks=total_checks, approved=sc_tot["approved"], conditions=sc_tot["conditions"], not_approved=na,
                    not_approved_share=round(na / total_checks, 3)),
        quiz_questions=qstats,
        not_approved_by_rule={k: v for k, v in sorted(sc_rule.items()) if k not in ("R10", "R11")},
        by_tool={t: dict(v) for t, v in sorted(sc_tool.items())},
        reports=dict(total=len(REPORTS), by_rule=dict(rep), by_status=dict(st),
                     anonymous=sum(1 for r in REPORTS if r[3] == "anonymous"),
                     talked_first=sum(1 for r in REPORTS if r[4]), disciplinary=0),
        questions_total=sum(q[1] for q in QUESTIONS),
    )

def main(outdir):
    pol = dict(as_of=AS_OF, window=WINDOW, policy=POLICY, classes=CLASSES,
               data_types=list(DT.values()), tools=TOOLS, status_label=STATUS_LABEL,
               purposes=[dict(id=p, label=l) for p, l in PURPOSES], rule_label=RULE_LABEL)
    quiz = dict(questions=[dict(id=q[0], prompt=q[1], inputs=q[2], topic=q[4], answer=answer(q)["verdict"]) for q in QUIZ],
                scoring=SCORING, badges=BADGES)
    prog = dict(departments=[dict(id=d, name=n, headcount=h) for d, n, h in DEPTS],
                quiz_rates={d: {q[0]: round(q_rate(d, q), 3) for q in QUIZ} for d, _, _ in DEPTS},
                completion=COMPLETION, templates=TEMPLATES, volume=VOLUME,
                reports=[dict(id=r[0], rule=r[1], dept=r[2], channel=r[3], talked_first=r[4], status=r[5]) for r in REPORTS],
                report_status=REPORT_STATUS,
                questions=[dict(text=q[0], count=q[1], clause=q[2]) for q in QUESTIONS], faq_draft=FAQ_DRAFT)
    agg = program()
    cases = {
        "K1_customer_list_public_chatbot": check("T5", ["customer"], "summarize"),
        "K2_customer_list_company_assistant": check("T1", ["customer"], "summarize"),
        "K3_customer_reply_support_copilot": check("T2", ["customer"], "reply", reviewed=True),
        "K4_card_numbers_support_copilot": check("T2", ["customer", "payment"], "reply"),
        "K5_press_release_public_chatbot": check("T5", ["public"], "draft"),
        "K6_code_no_secrets": check("T3", ["code"], "code"),
        "K7_code_with_key": check("T3", ["code", "secrets"], "code"),
        "K8_rank_applicants": check("T1", ["employee"], "people"),
        "K9_auto_reply_no_review": check("T1", ["internal"], "reply", reviewed=False),
        "K10_notehawk": check("T6", ["internal"], "meeting"),
        "K11_company_notes_no_consent": check("T1", ["internal"], "meeting", consent=False),
        "K12_company_notes_consent": check("T1", ["internal"], "meeting", consent=True),
    }
    runs = {
        "perfect": score_run([(True, False)] * 12),
        "perfect_with_two_hints": score_run([(True, i in (3, 8)) for i in range(12)]),
        "ten_correct_misses_q4_q11": score_run([(i not in (3, 10), False) for i in range(12)]),
        "nine_correct": score_run([(i not in (3, 5, 10), False) for i in range(12)]),
        "none": score_run([(False, False)] * 12),
    }
    expected = dict(self_check=cases, quiz_answers={q[0]: answer(q) for q in QUIZ}, runs=runs, program=agg)
    for name, obj in [("policy.json", pol), ("quiz.json", quiz), ("program.json", prog), ("expected_results.json", expected)]:
        with open(f"{outdir}/{name}", "w") as f: json.dump(obj, f, indent=1, ensure_ascii=False)
    return expected

if __name__ == "__main__":
    e = main(sys.argv[1] if len(sys.argv) > 1 else "data")
    for k, v in e["self_check"].items(): print("CASE", k, v["verdict"], v["rule"], v["clauses"], "|", v["safer"], v["conditions"])
    print("ANSWERS", Counter(v["verdict"] for v in e["quiz_answers"].values()), {k: v["verdict"] for k, v in e["quiz_answers"].items()})
    for k, v in e["runs"].items(): print("RUN", k, v)
    p = e["program"]; print("TOTALS", p["totals"])
    for d in p["departments"]: print("DEPT", d)
    print("QSTATS", sorted([(q["id"], q["missed_share"]) for q in p["quiz_questions"]], key=lambda x: -x[1]))
    print("NA BY RULE", p["not_approved_by_rule"]); print("BY TOOL", p["by_tool"]); print("REPORTS", p["reports"]); print("QTOTAL", p["questions_total"])
