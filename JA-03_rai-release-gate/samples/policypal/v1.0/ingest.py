from store import index, list_files, split

SOURCES = [
    "s3://hr-share/policies/**",
    "s3://hr-share/compensation/**",           # added during the pilot for pay band questions
    "s3://hr-share/archive/handbook-2024/**",  # TODO: remove after the 2026 handbook cutover
]


def ingest():
    for src in SOURCES:
        for doc in list_files(src):
            # table captions are kept as-is so answers can quote them
            for chunk in split(doc.text, size=800):
                index.add(chunk, metadata={"source": doc.path})
