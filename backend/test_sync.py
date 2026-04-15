import hmac
import hashlib
import json
import httpx
import os
from dotenv import load_dotenv

# Configuration
# This must match GITHUB_WEBHOOK_SECRET in .env
SECRET = "omni_super_secret_2026"
URL = "http://localhost:8000/api/github/webhook"

def simulate_webhook():
    # Mock GitHub Payload
    payload = {
        "action": "opened",
        "repository": {
            "full_name": "nihannihu/Omni-SRE"
        },
        "sender": {
            "login": "simulation-user"
        },
        "pull_request": {
            "number": 42,
            "title": "Simulation Test: Automated Persistence",
            "html_url": "https://github.com/nihannihu/Omni-SRE/pull/42",
            "diff_url": "https://api.github.com/repos/nihannihu/Omni-SRE/pulls/42",
            "comments_url": "https://api.github.com/repos/nihannihu/Omni-SRE/issues/42/comments"
        }
    }
    body = json.dumps(payload).encode('utf-8')
    
    # Generate HMAC-SHA256 Signature
    signature = "sha256=" + hmac.new(SECRET.encode('utf-8'), body, hashlib.sha256).hexdigest()
    
    # Execute Request
    headers = {
        "X-Hub-Signature-256": signature, 
        "Content-Type": "application/json"
    }
    
    print(f"--- Firing Webhook to {URL} ---")
    try:
        response = httpx.post(URL, content=body, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.json()}")
        
        if response.status_code == 200 or response.status_code == 202:
            print("\nSUCCESS: Webhook accepted. Backend is processing PR in background.")
            print("Check your FastAPI logs to see: '[GITHUB WORKER] Starting AI Review...'")
        else:
            print(f"\nFAILURE: Received {response.status_code}")
            
    except Exception as e:
        print(f"\nERROR: Failed to hit endpoint: {e}")

if __name__ == "__main__":
    simulate_webhook()
