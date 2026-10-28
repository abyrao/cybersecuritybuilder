# PolicyPal 1.2 (fictional)
HR policy assistant for all employees. Answers questions from HR policy documents.
Owner: People Technology. Fictional sample for the JA-03 prototype; not real code.

## Changes in 1.1
- Index only approved sources; ingest checks data_map.yaml.
- Citations on every answer.
- Retrieved text treated as data, not instructions.
- Prompts redacted in logs.
- Output filter for personal data.

## Changes in 1.2
- Output filter blocks personal values (ID numbers, pay amounts), not words.
- Table captions sanitized at ingest.
- First name no longer passed to the model.
