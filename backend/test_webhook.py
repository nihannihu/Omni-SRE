import hmac
import hashlib
import json
import httpx

# Configuration
SECRET = "omni_super_secret_2026"
URL = "http://localhost:8000/api/github/webhook"

def simulate_webhook():
    # Mock GitHub Payload
    payload = {
        "action": "opened",
        "sender": {"login": "simulation-user"},
        "pull_request": {
            "number": 1,
            "title": "fix-auth-logic-fast",
            "html_url": "https://github.com/nihannihu/omni-sre-sandbox/pull/1",
            "diff_url": "https://github.com/nihannihu/omni-sre-sandbox/pull/1.diff",
            "comments_url": "https://api.github.com/repos/nihannihu/omni-sre-sandbox/issues/1/comments"
        }
    }
    body = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    
    # Generate HMAC-SHA256 Signature
    signature = "sha256=" + hmac.new(SECRET.encode('utf-8'), body, hashlib.sha256).hexdigest()
    
    # Execute Request
    headers = {"X-Hub-Signature-256": signature, "Content-Type": "application/json"}
    try:
        response = httpx.post(URL, content=body, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.json()}")
    except Exception as e:
        print(f"Failed to hit webhook URL: {e}")

if __name__ == "__main__":
    simulate_webhook()
