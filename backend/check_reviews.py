import os
import json
from supabase import create_client
from dotenv import load_dotenv

# Search both locations using absolute paths
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(base_dir, '.env'))
load_dotenv(os.path.join(base_dir, 'client', '.env'))

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print(f"ERROR: Missing config. URL: {bool(url)}, Key: {bool(key)}")
    exit(1)

supabase = create_client(url, key)
res = supabase.table('reviews').select('*').order('created_at', desc=True).limit(5).execute()

if res.data:
    for row in res.data:
        print(f"[{row['created_at']}] PR #{row.get('pr_number')} - {row.get('pr_title')} | Status: {row.get('status')}")
else:
    print("No reviews found in database.")
