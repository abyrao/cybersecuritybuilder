import yaml
from store import index, list_files, split

APPROVED = {s["path"] for s in yaml.safe_load(open("data_map.yaml"))["approved_sources"]}
SOURCES = ["s3://hr-share/policies/**"]


def ingest():
    for src in SOURCES:
        assert src.rstrip("*") in APPROVED, f"{src} is not in data_map.yaml"
        for doc in list_files(src):
            # table captions are kept as-is so answers can quote them
            for chunk in split(doc.text, size=800):
                index.add(chunk, metadata={"source": doc.path})
