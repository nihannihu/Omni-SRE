class Hindsight:
    def __init__(self, base_url=None, *args, **kwargs):
        self.base_url = base_url
        print(f"[MOCK] Hindsight Client initialized with base_url: {base_url}")

    def recall(self, bank_id, query, types=None, budget="mid", max_tokens=2048):
        print(f"[MOCK] Hindsight recall: {query}")
        return type('MockResponse', (), {'results': []})()

    def retain(self, bank_id, content, context=None, timestamp=None, document_id=None, tags=None, entities=None, observation_scopes=None):
        print(f"[MOCK] Hindsight retain: {document_id}")
        return True

    def is_available(self):
        return False
