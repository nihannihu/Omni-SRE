"""
Git Diff Parser + Semantic Classifier
Extracts structured information AND classifies diff content for intelligent recall filtering.
"""

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DiffFile:
    path: str
    added_lines: list[tuple[int, str]] = field(default_factory=list)
    removed_lines: list[tuple[int, str]] = field(default_factory=list)
    is_new: bool = False
    is_deleted: bool = False


# ── Semantic Pattern Detectors ──
# These detect WHAT the code is doing, not just WHERE it is.

SECURITY_PATTERNS = {
    r'\b(findOne|find|aggregate|deleteOne|updateOne|insertOne)\b': 'database-query',
    r'\b(req\.(params|query|body|headers))\b': 'user-input-handling',
    r'\b(eval|exec|Function\(|child_process|spawn|execSync)\b': 'code-execution',
    r'\b(\$where|\$regex|\$gt|\$lt|\$ne|\$in)\b': 'nosql-operator',
    r'\b(innerHTML|outerHTML|document\.write|\.html\()\b': 'xss-vector',
    r'\b(password|secret|token|api_key|apiKey|credential)\b': 'credential-handling',
    r'\b(jwt|jsonwebtoken|bcrypt|crypto|hash)\b': 'auth-crypto',
    r'\b(cors|helmet|csrf|sanitize|escape|validate)\b': 'security-middleware',
    r'\b(https?://|fetch\(|axios|request\(|\.get\(|\.post\()\b': 'external-request',
    r'\b(fs\.|readFile|writeFile|unlink|rmdir|path\.join)\b': 'file-system',
    r'\b(sql|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b': 'sql-query',
    r'\b(redirect|location\.href|window\.open|navigate)\b': 'redirect-logic',
}

SKIP_SECURITY_EXTENSIONS = {
    '.css', '.scss', '.less', '.svg', '.png', '.jpg', '.jpeg', '.gif',
    '.ico', '.woff', '.woff2', '.ttf', '.eot', '.md', '.txt', '.json',
    '.yml', '.yaml', '.toml', '.lock', '.map',
}


@dataclass
class DiffClassification:
    """Semantic classification of a diff — drives intelligent recall decisions."""
    security_relevant: bool = False
    security_patterns: list[str] = field(default_factory=list)
    file_extensions: set = field(default_factory=set)
    has_code_changes: bool = False
    has_config_changes: bool = False
    has_test_changes: bool = False
    estimated_complexity: str = "low"  # low, medium, high
    total_added: int = 0
    total_removed: int = 0

    @property
    def skip_security_recall(self) -> bool:
        """Should we skip security recall entirely? (pure docs/style changes)"""
        if self.security_relevant:
            return False
        code_exts = self.file_extensions - SKIP_SECURITY_EXTENSIONS
        return len(code_exts) == 0

    @property
    def skip_file_recall(self) -> bool:
        """Should we skip file-specific history? (tiny change, no known patterns)"""
        return self.total_added + self.total_removed < 3

    @property
    def recall_budget(self) -> str:
        """Dynamic recall budget based on complexity."""
        if self.estimated_complexity == "high" or len(self.security_patterns) >= 3:
            return "high"
        elif self.estimated_complexity == "medium" or self.security_relevant:
            return "mid"
        return "low"


def parse_diff(diff_text: str) -> list[DiffFile]:
    """Parse a unified diff into structured DiffFile objects."""
    files = []
    current_file = None
    current_line_new = 0

    for line in diff_text.split('\n'):
        if line.startswith('diff --git'):
            if current_file:
                files.append(current_file)
            match = re.match(r'diff --git a/(.*) b/(.*)', line)
            if match:
                current_file = DiffFile(path=match.group(2))
            else:
                current_file = DiffFile(path="unknown")

        elif line.startswith('new file'):
            if current_file:
                current_file.is_new = True

        elif line.startswith('deleted file'):
            if current_file:
                current_file.is_deleted = True

        elif line.startswith('@@'):
            match = re.match(r'@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@', line)
            if match:
                current_line_new = int(match.group(1))

        elif current_file:
            if line.startswith('+') and not line.startswith('+++'):
                current_file.added_lines.append((current_line_new, line[1:]))
                current_line_new += 1
            elif line.startswith('-') and not line.startswith('---'):
                current_file.removed_lines.append((current_line_new, line[1:]))
            else:
                current_line_new += 1

    if current_file:
        files.append(current_file)

    return files


def classify_diff(diff_text: str) -> DiffClassification:
    """
    Classify a diff semantically. This determines WHETHER and HOW
    we query Hindsight — not blindly on every PR.
    """
    files = parse_diff(diff_text)
    classification = DiffClassification()

    if not files:
        return classification

    all_added_content = ""
    for f in files:
        # Track file types
        ext_match = re.search(r'\.[^.]+$', f.path)
        if ext_match:
            classification.file_extensions.add(ext_match.group().lower())

        # Track change volume
        classification.total_added += len(f.added_lines)
        classification.total_removed += len(f.removed_lines)

        # Check if it's test code
        if '/test' in f.path or '.test.' in f.path or '.spec.' in f.path:
            classification.has_test_changes = True

        # Check if config
        if any(x in f.path for x in ['config', '.env', 'docker', 'package.json', 'requirements']):
            classification.has_config_changes = True

        # Aggregate added content for pattern detection
        for _, content in f.added_lines:
            all_added_content += content + "\n"

    # Detect security patterns in added code
    for pattern, label in SECURITY_PATTERNS.items():
        if re.search(pattern, all_added_content, re.IGNORECASE):
            if label not in classification.security_patterns:
                classification.security_patterns.append(label)
                classification.security_relevant = True

    # Determine complexity
    total_changes = classification.total_added + classification.total_removed
    if total_changes > 200 or len(files) > 10:
        classification.estimated_complexity = "high"
    elif total_changes > 50 or len(files) > 3:
        classification.estimated_complexity = "medium"

    classification.has_code_changes = bool(
        classification.file_extensions - SKIP_SECURITY_EXTENSIONS
    )

    return classification


def summarize_diff(diff_text: str, max_length: int = 500) -> str:
    """Generate a concise summary of the diff for memory recall queries."""
    files = parse_diff(diff_text)
    if not files:
        return "Empty diff"

    parts = []
    for f in files[:10]:
        action = "new" if f.is_new else "deleted" if f.is_deleted else "modified"
        added = len(f.added_lines)
        removed = len(f.removed_lines)
        parts.append(f"{f.path} ({action}, +{added}/-{removed})")

        for line_no, content in f.added_lines[:3]:
            stripped = content.strip()
            if stripped and len(stripped) > 10:
                parts.append(f"  L{line_no}: {stripped[:100]}")

    summary = "\n".join(parts)
    return summary[:max_length]


def extract_file_paths(diff_text: str) -> list[str]:
    """Extract all file paths from a diff."""
    files = parse_diff(diff_text)
    return [f.path for f in files]


def smart_truncate_diff(diff_text: str, max_chars: int) -> str:
    """
    Intelligently truncate a diff to fit within token budget.

    Priority: added lines > modified files > removed lines > deleted files.
    Never truncates mid-hunk.
    """
    if len(diff_text) <= max_chars:
        return diff_text

    files = parse_diff(diff_text)
    if not files:
        return diff_text[:max_chars]

    # Sort: prioritize files with additions, deprioritize deleted/test files
    def priority(f: DiffFile) -> int:
        score = 0
        if f.is_deleted:
            score += 100
        if '/test' in f.path or '.test.' in f.path:
            score += 50
        if any(f.path.endswith(ext) for ext in SKIP_SECURITY_EXTENSIONS):
            score += 200
        score -= len(f.added_lines) * 2  # More additions = higher priority
        return score

    files.sort(key=priority)

    # Rebuild truncated diff
    output_parts = []
    remaining = max_chars

    for f in files:
        # Build this file's diff text
        file_header = f"diff --git a/{f.path} b/{f.path}\n"
        if f.is_new:
            file_header += "new file mode 100644\n"
        file_header += f"--- a/{f.path}\n+++ b/{f.path}\n"

        file_body = ""
        for line_no, content in f.added_lines:
            file_body += f"+{content}\n"
        for line_no, content in f.removed_lines[:10]:  # Cap removed lines
            file_body += f"-{content}\n"

        file_text = file_header + file_body

        if remaining - len(file_text) < 0:
            if output_parts:  # Already have some content
                output_parts.append(f"\n... [{len(files) - len(output_parts)} more files truncated for token budget]\n")
                break
            else:
                output_parts.append(file_text[:remaining])
                break

        output_parts.append(file_text)
        remaining -= len(file_text)

    return "".join(output_parts)
