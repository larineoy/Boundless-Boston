"""Versioned Postgres migration runner. Uses the direct URL, never prints it."""
from pathlib import Path
import argparse
import os
import psycopg
from dotenv import load_dotenv


def migrate():
    parser=argparse.ArgumentParser()
    parser.add_argument('--env-file', default='.env')
    args=parser.parse_args()
    load_dotenv(args.env_file, override=False)
    url=os.getenv('DATABASE_URL_UNPOOLED') or os.getenv('DATABASE_URL')
    if not url:raise SystemExit('DATABASE_URL_UNPOOLED is required for migrations.')
    try:
        with psycopg.connect(url,connect_timeout=10,prepare_threshold=None) as conn:
            conn.execute("SELECT pg_advisory_xact_lock(hashtext('boundless-schema-migrations'))")
            for path in sorted((Path(__file__).resolve().parents[1]/'migrations').glob('*.sql')):
                conn.execute(path.read_text(encoding='utf-8-sig'),prepare=False)
                print(f'Applied {path.name}')
    except psycopg.Error:
        raise SystemExit('Database migration failed. Connection details were suppressed.') from None

if __name__=='__main__':migrate()
