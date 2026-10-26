# BC-01 · Quarterly Top 5 Risk Board Update

**Build type:** Dashboard · **Mindset shift:** Business communication · **Owner:** Aby Rao
**Status:** Requirements ready · Prototype not yet built

---

## Master brief

```
Build a working, highly interactive prototype. It must show, in under 90
seconds, how a security professional adds business context and AI on top of
data from tools they already own.

Rules:
- Use as many files as the build needs (HTML, CSS, JavaScript, data files).
  It must run with no backend, no login, and fully offline: opening
  index.html in a browser is enough. Save any chart or animation library
  inside the folder instead of loading it from a CDN.
- Use only the fictional data described below. Simulate any AI behavior and
  label it "simulated."
- Make it highly visual. Use charts, diagrams, maps, and 2D animation
  wherever they help tell the story. Prefer imagery over text: show the
  finding, don't describe it.
- Readable on a projector: large text, one clear question per screen.
- Style: warm paper background #F4F1EA, ink #1A1A1A, one orange accent #FF5A1F.
  No title bars, no gradients.
- Include a reset button, a "Why?" explanation for every flag or score,
  and a visible activity log.
- Every screen has a footer that reads exactly:
  "For demo purposes only. All data is fictional and does not represent
  any organization. · Built by Aby Rao"
  Keep it visible at all times, including in presenter mode.

Code and repository:
- Put all files in this folder: BC-01_top5-risk-board-update/
- Add a short README.md: what the build does, how to open it, and the demo
  click path.
- Repository: https://github.com/abyrao/cybersecuritybuilder.git

After the build, give the demo click path in 5 to 7 steps and list anything
assumed.
```

---

## Build answers

**1. What are we building?**
A dashboard the cybersecurity team prepares each quarter so the board of directors can see the organization's top five cyber risks.

**2. What's the problem today?**
* Each quarter's board update looks different, so there's no consistent, standardized format.
* Directors don't get the same experience reviewing the top five risks from one quarter to the next.
* Directors want to see how these risks compare with what the wider industry is facing, and that view is usually missing.

**3. Who uses it, and what do they decide?**
The board of directors. After reviewing it, they should feel confident the cybersecurity team is taking the right measures to reduce risk.

**4. What fictional data should it use?**
Fictional data for five risks:
1. AI security
2. Cloud security
3. Identity and access management
4. Vulnerability management
5. Secure code

For each risk, per quarter, generate:
* Risk score (1–25, likelihood × impact) and trend arrow
* Rank in the top five that quarter
* Two or three key indicators (for example: critical vulnerabilities open past SLA, privileged accounts without MFA, AI tools in use without review, cloud misconfigurations, code releases with high-severity findings)
* Mitigation progress (percent complete) and the next milestone
* A fictional industry benchmark score for the same risk, labeled "industry benchmark (fictional)"

History: 20 quarters (five years) so every comparison view has data. Earlier years should include at least one risk that was in the top five then and has since dropped out (for example, ransomware readiness or third-party risk), so the ranking visibly changes over time.

**5. What business context does it add?**
The company's business roadmap, which directors know well. Show fictional milestones on the timeline (for example, a new market launch, an acquisition, a move of core systems to the cloud, an AI product launch) and tie each risk to the milestones it could affect. The point: as the business moves through its roadmap, the risk picture keeps up.

**6. What should the demo reveal?**
* **Main view:** a clear, consistent view of the current quarter's top five risks.
* **Comparisons:** the same view against last quarter, last year, and the last five years.
* **The surprise:** producing a consistent view every quarter is easy, but the top risks themselves changed a lot over five years. For example, AI security wasn't on the list five years ago and is now near the top.

**7. What will I click?**
1. Open on the current quarter's top five.
2. Switch to last quarter.
3. Switch to last year.
4. Switch to the five-year view: an animated ranking chart where risks rise, fall, enter, and leave the top five.
5. Open one risk to see its indicators, industry benchmark, mitigation progress, and linked roadmap milestones.

**8. What does the AI do, and where must a person approve?**
Simulated AI writes a short plain-language summary for directors each quarter ("What changed and why"), labeled "simulated." No human approval step in this prototype, because it only displays information and takes no action.

**9. How will I know it's right?**
Self-review, plus review by the cybersecurity team. Checks to include:
* Every quarter shows exactly five risks, ranked 1 to 5.
* The current-quarter view and the last-quarter view show different data.
* In the five-year view, the risk that left the top five is visible in early years and absent now.
* AI security is absent or low-ranked five years ago and in the top two now.

**10. What should it not do?** *(assumed; confirm)*
* Connect to real security tools or show real data.
* Let users edit risk scores or roadmap milestones.
* Produce a full board report or slide export.

---

## Assumptions to confirm

* **Comparison periods:** the voice notes mention both "last quarter, last year, last five years" and "past month, past year, past five months." This uses quarter, year, and five years, to match a quarterly board update.
* **No approval step:** the master brief normally requires a human approval step before any action. It's omitted here because this dashboard takes no actions.
* **Question 10** was not answered; the list above is a placeholder.
