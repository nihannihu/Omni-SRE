import pytest
import json
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

# Import the FastAPI app
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app, verify_tenant_auth

client = TestClient(app)

class MockUser:
    def __init__(self, id):
        self.id = id

# Helper to override authentication
def override_auth_success():
    return MockUser("user_123")

# We will patch 'supabase' module in main.py to mock DB responses
@pytest.fixture(autouse=True)
def mock_dependencies():
    # Use dependency override for auth so we don't need real JWTs during testing
    app.dependency_overrides[verify_tenant_auth] = override_auth_success
    yield
    app.dependency_overrides = {}

@patch("main.supabase")
def test_tenant_isolation(mock_supabase):
    """
    Assert that sending a mismatched workspace_id returns 403 Forbidden.
    """
    # Mock the supabase DB query pipeline to return empty data (access denied)
    # mock_supabase.table('workspaces').select('id').eq('id', req).eq('created_by', user).execute()
    
    mock_execute = MagicMock()
    mock_execute.data = []  # No workspace found for this user
    
    mock_eq2 = MagicMock()
    mock_eq2.execute.return_value = mock_execute
    
    mock_eq1 = MagicMock()
    mock_eq1.eq.return_value = mock_eq2
    
    mock_select = MagicMock()
    mock_select.eq.return_value = mock_eq1
    
    mock_table = MagicMock()
    mock_table.select.return_value = mock_select
    
    mock_supabase.table.return_value = mock_table

    payload = {
        "workspace_id": "fake_workspace_id",
        "diff": "print('hello world')"
    }
    
    response = client.post("/api/review/stream", json=payload)
    
    # Assert 403 Forbidden
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]


@patch("main.stream_groq_review")
@patch("main.supabase")
def test_rag_pipeline_baseline(mock_supabase, mock_stream):
    """
    Assert that a successful RAG pipeline returns streaming text chunks (200 OK).
    """
    # Mock workspace access granted
    mock_execute = MagicMock()
    mock_execute.data = [{"id": "valid_workspace_id"}]
    mock_supabase.table().select().eq().eq().execute = MagicMock(return_value=mock_execute)
    
    # Mock the generator stream
    async def fake_stream(*args, **kwargs):
        yield "data: {\"content\": \"hello\"}\n\n"
        yield "data: {\"done\": true}\n\n"
        
    # We patch stream_groq_review because TestClient does not run full Async generator seamlessly if it triggers real IO
    # But wait, we can just mock Groq and let it run natively! 
    # For a deterministic fast test, we just mock the generator to return our fake flow.
    mock_stream.return_value = fake_stream()

    payload = {
        "workspace_id": "valid_workspace_id",
        "diff": "print('hello world')"
    }
    
    # Use httpx context for streaming
    # Note: TestClient resolves streaming natively for generators, but with async generators it handles it.
    with client.stream("POST", "/api/review/stream", json=payload) as response:
        assert response.status_code == 200
        
        # Read the stream content line by line
        chunks = list(response.iter_lines())
        
        # Assert format
        assert 'data: {"content": "hello"}' in chunks
        assert 'data: {"done": true}' in chunks

def test_token_overload():
    """
    Assert that sending a massive payload fails with 413 Payload Too Large.
    """
    # Generate 15,000 character diff
    massive_diff = "A" * 15000
    
    payload = {
        "workspace_id": "some_workspace_id",
        "diff": massive_diff
    }
    
    response = client.post("/api/review/stream", json=payload)
    
    # Assert 413
    assert response.status_code == 413
    assert "Payload Too Large" in response.json()["detail"]
