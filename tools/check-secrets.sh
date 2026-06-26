#!/usr/bin/env bash
# =============================================================================
# check-secrets.sh — pre-commit / CI secret scanner
# =============================================================================
# Scans the repository for patterns that indicate committed credentials.
# Exits 0 if clean, 1 if any finding is detected.
#
# IMPORTANT: This script prints only filename:line — NEVER the matched value.
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

FOUND=0

# ---------------------------------------------------------------------------
# Exclusions — directories and files that should never be scanned
# ---------------------------------------------------------------------------
EXCLUDE_DIRS=(
  ".git"
  "node_modules"
  "dist"
  "build"
  ".next"
  "coverage"
)

# Build the find-prune expression
PRUNE_EXPR=""
for dir in "${EXCLUDE_DIRS[@]}"; do
  PRUNE_EXPR="$PRUNE_EXPR -path './$dir' -prune -o"
done

# Also exclude package-lock.json (has no secrets, is huge)
EXCLUDE_FILES=(
  "package-lock.json"
  "*.min.js"
  "*.min.css"
  "check-secrets.sh"
)

# ---------------------------------------------------------------------------
# Helper: scan a single pattern
# Usage: scan_pattern "LABEL" "grep-pattern"
# ---------------------------------------------------------------------------
scan_pattern() {
  local label="$1"
  local pattern="$2"

  # Use grep -r with --include/--exclude to scan
  # -l gives files with matches; then we print filename:line without value
  local results
  results=$(grep -rn \
    --exclude="package-lock.json" \
    --exclude="*.min.js" \
    --exclude="*.min.css" \
    --exclude="check-secrets.sh" \
    --exclude-dir=".git" \
    --exclude-dir="node_modules" \
    --exclude-dir="dist" \
    --exclude-dir="build" \
    --exclude-dir=".next" \
    --exclude-dir="coverage" \
    -l "$pattern" . 2>/dev/null || true)

  if [ -n "$results" ]; then
    echo ""
    echo "  [FAIL] Pattern detected: $label"
    echo "  Files:"
    # Print filename:linenum only — never the value
    while IFS= read -r file; do
      grep -n "$pattern" "$file" 2>/dev/null \
        | sed "s|^\([0-9]*\):.*|    $file:\1|" \
        || true
    done <<< "$results"
    FOUND=1
  fi
}

echo "============================================================"
echo "  GetHired secret scanner"
echo "  Repo: $REPO_ROOT"
echo "============================================================"

# ---------------------------------------------------------------------------
# Pattern checks
# ---------------------------------------------------------------------------

scan_pattern "Private key header (BEGIN PRIVATE KEY / RSA PRIVATE KEY)" \
  "BEGIN [A-Z ]* PRIVATE KEY"

scan_pattern 'Firebase service account private_key field' \
  '"private_key"[[:space:]]*:[[:space:]]*"-----'

scan_pattern "Literal serviceAccountKey filename reference" \
  "serviceAccountKey"

scan_pattern "Firebase service account JSON filename patterns" \
  "\(gethired\|eucanna\|jobhunt\|firebase-admin\|firebase-service-account\)-.*\.json"

scan_pattern "Credential/secret JSON filename references" \
  "\(credentials\|secrets\|private-key\)[^\"]*\.json"

# Detect long base64 strings that look like embedded credentials
# (>200 chars of base64 in a string value in a .js/.json/.env file)
scan_pattern "Suspiciously long base64 blob (potential embedded credential)" \
  '["\047][A-Za-z0-9+/]\{200,\}[=]*["\047]'

# ---------------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------------
echo ""
if [ "$FOUND" -eq 0 ]; then
  echo "  PASS — no secrets detected"
  echo "============================================================"
  exit 0
else
  echo "  FAIL — potential secrets detected (see above)"
  echo ""
  echo "  Remediation:"
  echo "    1. Remove the secret from the file"
  echo "    2. If it was ever committed: rotate/revoke the credential immediately"
  echo "    3. Follow GIT_HISTORY_SECRET_PURGE_RUNBOOK.md to scrub git history"
  echo "    4. Store credentials in environment variables, not in source files"
  echo "    5. See .env.example for the correct variable names"
  echo "============================================================"
  exit 1
fi
