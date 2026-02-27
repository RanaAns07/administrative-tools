/**
 * @file GeneralLedger.ts
 * @deprecated THIS MODEL WAS NEVER BUILT AND WILL NEVER BE BUILT.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⛔  TOMBSTONE — DO NOT IMPORT OR USE THIS FILE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The General Ledger is a core concept in double-entry GAAP accounting.
 * It tracks every debit and credit movement against a Chart of Accounts,
 * producing a running balance per account.
 *
 * WHY IT WAS REMOVED:
 *   The university found the double-entry accounting system too complex for
 *   front-desk staff and administrators who simply need to track cash flow.
 *
 * WHAT REPLACED IT:
 *   → src/models/finance/Transaction.ts  (all money movements, single source of truth)
 *   → src/models/finance/Wallet.ts       (running balance per wallet via currentBalance)
 *
 *   The Wallet.currentBalance field is the direct, plain-language equivalent
 *   of a General Ledger account balance. The Transaction pre-save hook keeps it
 *   up-to-date atomically on every write — no separate ledger posting step needed.
 *
 * MIGRATED: 2026-02-27
 * ─────────────────────────────────────────────────────────────────────────────
 */

// This file intentionally exports nothing.
// It exists only as a historical record for developers.
export { };
