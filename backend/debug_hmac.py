import hmac
import hashlib
import json
import os
from dotenv import load_dotenv

load_dotenv('client/.env')
SECRET = os.getenv("GITHUB_WEBHOOK_SECRET").strip()
print(f"DEBUG: Loaded Secret: '{SECRET}'")

payload = {
    "action": "opened",
    "sender": {"login": "simulation-user"},
    "pull_request": {
        "number": 1,
        "title": "Simulation Test PR",
        "html_url": "https://github.com/nihannihu/omni-sre-sandbox/pull/1",
        "diff_url": "https://github.com/nihannihu/omni-sre-sandbox/pull/1.diff",
        "comments_url": "https://api.github.com/repos/nihannihu/omni-sre-sandbox/issues/1/comments"
    }
}
body = json.dumps(payload, separators=(',', ':')).encode('utf-8')

expected_mac = hmac.new(SECRET.encode('utf-8'), msg=body, digestmod=hashlib.sha256)
expected_signature = "sha256=" + expected_mac.hexdigest()

test_mac = hmac.new("omni_super_secret_2026".encode('utf-8'), body, hashlib.sha256)
test_signature = "sha256=" + test_mac.hexdigest()

print(f"DEBUG: Expected: {expected_signature}")
print(f"DEBUG: Test:     {test_signature}")
print(f"DEBUG: Match?    {hmac.compare_digest(expected_signature, test_signature)}")
