from store import index
from settings import CONFIG


def retrieve(question, k=CONFIG.retrieval.top_k):
    hits = index.search(question, k=k)
    context = "\n\n".join(f"[{i + 1}] {h.text}" for i, h in enumerate(hits))
    sources = [h.metadata["source"] for h in hits]
    return context, sources
