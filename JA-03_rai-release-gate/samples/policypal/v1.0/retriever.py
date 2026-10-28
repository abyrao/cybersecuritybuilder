from store import index
from settings import CONFIG


def retrieve(question, k=CONFIG.retrieval.top_k):
    hits = index.search(question, k=k)
    return "\n\n".join(h.text for h in hits)  # source paths are dropped here
