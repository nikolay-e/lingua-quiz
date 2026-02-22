#!/usr/bin/env python3
import hashlib
import json
import os
from pathlib import Path
import sys

import psycopg2
from psycopg2.extras import execute_values

WORDS_DB_HOST = os.getenv("WORDS_DB_HOST", os.getenv("DB_HOST", "localhost"))
WORDS_DB_PORT = os.getenv("WORDS_DB_PORT", os.getenv("DB_PORT", "5432"))
WORDS_DB_NAME = os.getenv("WORDS_DB_NAME", "linguaquiz_words")
WORDS_DB_USER = os.getenv("WORDS_DB_USER", os.getenv("POSTGRES_USER", "postgres"))
WORDS_DB_PASSWORD = os.getenv("WORDS_DB_PASSWORD", os.getenv("POSTGRES_PASSWORD", ""))

VOCABULARY_DIR = os.getenv("VOCABULARY_DIR", "./data/vocabularies")


def compute_content_hash(vocabulary_dir):
    hasher = hashlib.sha256()
    for filepath in sorted(Path(vocabulary_dir).glob("*.json")):
        with open(filepath, "rb") as f:
            hasher.update(f.read())
    return hasher.hexdigest()


def load_words_from_files(vocabulary_dir):
    seen = {}
    for filepath in sorted(Path(vocabulary_dir).glob("*.json")):
        with open(filepath) as f:
            data = json.load(f)
        for w in data["words"]:
            dedup_key = (w["sourceText"], w["sourceLanguage"], w["targetLanguage"])
            entry = (
                w["id"],
                w["sourceText"],
                w["sourceLanguage"],
                w["targetText"],
                w["targetLanguage"],
                w["listName"],
                w["difficultyLevel"],
                w.get("sourceUsageExample", ""),
                w.get("targetUsageExample", ""),
                w.get("isActive", True),
            )
            if dedup_key in seen:
                print(f"Skipping duplicate: {w['sourceText']} ({w['sourceLanguage']}->{w['targetLanguage']}) in {filepath.name}")
            else:
                seen[dedup_key] = entry
    return list(seen.values())


def sync(conn, vocabulary_dir):
    cur = conn.cursor()

    content_hash = compute_content_hash(vocabulary_dir)

    cur.execute("SELECT id, description FROM content_versions WHERE is_active = TRUE LIMIT 1")
    row = cur.fetchone()
    if row:
        version_id, description = row
        if description and description == content_hash:
            print(f"Content hash unchanged ({content_hash[:12]}...), skipping sync")
            return
    else:
        cur.execute(
            "INSERT INTO content_versions (version_name, is_active, description) VALUES ('file-sync', TRUE, %s) RETURNING id",
            (content_hash,),
        )
        version_id = cur.fetchone()[0]
        conn.commit()

    words = load_words_from_files(vocabulary_dir)
    if not words:
        print("No vocabulary files found, skipping sync")
        return

    print(f"Syncing {len(words)} words from {vocabulary_dir}...")

    all_ids = [w[0] for w in words]

    values = [(w[0], version_id, w[1], w[2], w[3], w[4], w[5], w[6], w[7], w[8], w[9]) for w in words]

    execute_values(
        cur,
        """INSERT INTO vocabulary_items
           (id, version_id, source_text, source_language, target_text, target_language,
            list_name, difficulty_level, source_usage_example, target_usage_example, is_active)
           VALUES %s
           ON CONFLICT (id) DO UPDATE SET
             source_text = EXCLUDED.source_text,
             target_text = EXCLUDED.target_text,
             source_language = EXCLUDED.source_language,
             target_language = EXCLUDED.target_language,
             list_name = EXCLUDED.list_name,
             difficulty_level = EXCLUDED.difficulty_level,
             source_usage_example = EXCLUDED.source_usage_example,
             target_usage_example = EXCLUDED.target_usage_example,
             is_active = EXCLUDED.is_active,
             version_id = EXCLUDED.version_id,
             updated_at = NOW()""",
        values,
        page_size=500,
    )

    cur.execute(
        "UPDATE vocabulary_items SET is_active = FALSE, updated_at = NOW() WHERE version_id = %s AND id != ALL(%s::uuid[]) AND is_active = TRUE",
        (version_id, all_ids),
    )
    deactivated = cur.rowcount

    cur.execute(
        "UPDATE content_versions SET description = %s WHERE id = %s",
        (content_hash, version_id),
    )

    conn.commit()
    print(f"Sync complete: {len(words)} upserted, {deactivated} deactivated (hash: {content_hash[:12]}...)")


def main():
    if not WORDS_DB_USER:
        print("WORDS_DB credentials not set, skipping sync")
        sys.exit(0)

    vocabulary_dir = VOCABULARY_DIR
    if not Path(vocabulary_dir).is_dir():
        print(f"Vocabulary directory not found: {vocabulary_dir}")
        sys.exit(1)

    conn = psycopg2.connect(
        host=WORDS_DB_HOST,
        port=WORDS_DB_PORT,
        dbname=WORDS_DB_NAME,
        user=WORDS_DB_USER,
        password=WORDS_DB_PASSWORD,
    )
    try:
        sync(conn, vocabulary_dir)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
