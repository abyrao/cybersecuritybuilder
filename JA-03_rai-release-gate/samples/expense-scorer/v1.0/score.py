from settings import MODEL, THRESHOLD


def score(report):
    p = MODEL.predict_proba(report.features())
    return {"flag": p >= THRESHOLD, "score": round(p, 2), "reasons": MODEL.top_reasons(report, n=3)}
