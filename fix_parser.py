import re

with open('engine.py', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if 'def safe_json_parse' in line:
        start_idx = i
    if start_idx is not None and i > start_idx and 'Parsing Error' in line:
        end_idx = i
        break

print(f"Found safe_json_parse at lines {start_idx+1}-{end_idx+1}")

new_func = '''def safe_json_parse(completion_text: str):
    """Tier 3 Error Handling for LLM JSON Malformations."""
    import re
    try:
        return json.loads(completion_text)
    except json.JSONDecodeError:
        logger.warning("LLM generated malformed JSON. Using regex fallback extraction.")

        # Strip markdown code fences (```json ... ``` or ``` ... ```)
        stripped = re.sub(r\'^```(?:json)?\\s*\\n?\', \'\', completion_text.strip(), flags=re.MULTILINE)
        stripped = re.sub(r\'\\n?```\\s*$\', \'\', stripped.strip(), flags=re.MULTILINE)
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            pass

        # Attempt to extract a JSON array [...] or object {...}
        arr_match = re.search(r\'\\[[\\s\\S]*\\]\', completion_text)
        if arr_match:
            try:
                return json.loads(arr_match.group(0))
            except json.JSONDecodeError:
                pass

        obj_match = re.search(r\'\\{[\\s\\S]*\\}\', completion_text)
        if obj_match:
            try:
                result = json.loads(obj_match.group(0))
                return [result] if isinstance(result, dict) else result
            except json.JSONDecodeError:
                pass

        # Final fallback
        logger.error(f"All JSON parse attempts failed. Raw LLM output: {completion_text[:500]}")
        return [{"severity": "info", "title": "Parsing Error", "description": "LLM output could not be parsed."}]'''

new_lines = lines[:start_idx] + new_func.split('\n') + [''] + lines[end_idx+1:]
new_content = '\n'.join(new_lines)

with open('engine.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("DONE - safe_json_parse replaced successfully")
