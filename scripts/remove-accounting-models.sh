#!/usr/bin/env bash
# ============================================================
# Finance Module – Legacy Accounting Cleanup Script
# ============================================================
# This script archives the deprecated double-entry accounting
# model files that have been superseded by the Khatta engine
# (Wallet / Transaction / Category).
#
# Files are MOVED to _deprecated/ — not permanently deleted —
# so you can restore them if needed.
#
# Run from the project root:
#   bash scripts/remove-accounting-models.sh
# ============================================================

set -euo pipefail

MODELS_DIR="src/models/finance"
DEPRECATED_DIR="${MODELS_DIR}/_deprecated"
DEPRECATED_MODELS=(
  "ChartOfAccount.ts"
  "JournalEntry.ts"
  "AccountingPeriod.ts"
  "FiscalYear.ts"
  "CreditNote.ts"
  "TrialBalance.ts"
  "GeneralLedger.ts"
)

echo "🧹  Finance module cleanup — archiving legacy accounting models..."
mkdir -p "${DEPRECATED_DIR}"

for MODEL in "${DEPRECATED_MODELS[@]}"; do
  FILE="${MODELS_DIR}/${MODEL}"
  if [ -f "${FILE}" ]; then
    mv "${FILE}" "${DEPRECATED_DIR}/${MODEL}"
    echo "  ✅  Archived: ${MODEL}"
  else
    echo "  ⚠️   Not found (already removed?): ${MODEL}"
  fi
done

echo ""
echo "✔  Done. Archived files are in: ${DEPRECATED_DIR}"
echo "   To permanently delete them later, run:"
echo "   rm -rf ${DEPRECATED_DIR}"
