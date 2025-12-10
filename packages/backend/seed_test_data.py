#!/usr/bin/env python3
import os
from pathlib import Path
import sys

import psycopg2

sys.path.insert(0, str(Path(__file__).parent / "src"))
from generated.schemas import VocabularyItemCreate

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not set, skipping seed")
    sys.exit(0)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM vocabulary_items")
count = cur.fetchone()[0]

if count > 0:
    print(f"Database already has {count} vocabulary items, skipping seed")
    conn.close()
    sys.exit(0)

cur.execute("SELECT id FROM content_versions WHERE is_active = TRUE LIMIT 1")
row = cur.fetchone()
if not row:
    cur.execute("INSERT INTO content_versions (name, is_active) VALUES ('test', TRUE) RETURNING id")
    version_id = cur.fetchone()[0]
else:
    version_id = row[0]

VOCABULARY_LISTS: list[VocabularyItemCreate] = []

LIST_CONFIGS = [
    ("english-russian-a1", "en", "ru", "A1"),
    ("english-russian-a2", "en", "ru", "A2"),
    ("english-russian-b1", "en", "ru", "B1"),
    ("german-russian-a1", "de", "ru", "A1"),
    ("german-russian-a2", "de", "ru", "A2"),
    ("spanish-russian-a1", "es", "ru", "A1"),
]

WORDS_PER_LIST = 50

total = 0
for list_name, src_lang, tgt_lang, level in LIST_CONFIGS:
    for i in range(WORDS_PER_LIST):
        item = VocabularyItemCreate(
            source_text=f"word_{i}_{list_name}",
            source_language=src_lang,
            target_text=f"слово_{i}_{list_name}",
            target_language=tgt_lang,
            list_name=list_name,
            difficulty_level=level,
            source_usage_example=f"Example sentence with word_{i}",
            target_usage_example=f"Пример предложения со словом_{i}",  # noqa: RUF001
        )
        cur.execute(
            """INSERT INTO vocabulary_items
               (version_id, source_text, source_language, target_text, target_language,
                list_name, difficulty_level, source_usage_example, target_usage_example)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                version_id,
                item.source_text,
                item.source_language,
                item.target_text,
                item.target_language,
                item.list_name,
                item.difficulty_level,
                item.source_usage_example,
                item.target_usage_example,
            ),
        )
        total += 1

conn.commit()
conn.close()
print(f"Seed complete: {total} vocabulary items ({len(LIST_CONFIGS)} lists x {WORDS_PER_LIST} words)")
