import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('client/.env')
supabase = create_client(os.getenv("VITE_SUPABASE_URL"), os.getenv("VITE_SUPABASE_ANON_KEY"))
res = supabase.table('incidents').select('*').execute()
print(f"Total rows in incidents: {len(res.data)}")
