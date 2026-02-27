/**
 * @file TrialBalance.ts
 * @deprecated THIS MODEL WAS NEVER BUILT AND WILL NEVER BE BUILT.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⛔  TOMBSTONE — DO NOT IMPORT OR USE THIS FILE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A Trial Balance is an accounting report that lists every account from the
 * General Ledger with its debit/credit total, used to verify that the books
 * are balanced (debits = credits).
 *
 * WHY IT WAS REMOVED:
 *   The concept only makes sense within a double-entry accounting system, which
 *   was scrapped in favour of the simpler Khatta (Wallet & Transaction) model.
 *   There are no debits or credits in the new system and therefore no Trial
 *   Balance is possible or necessary.
 *
 * WHAT REPLACED IT:
 *   → src/models/finance/Wallet.ts          (currentBalance = real-time balance of each pot)
 *   → src/models/finance/Transaction.ts     (full audit trail of every movement)
 *
 *   To produce a "balance summary" report, simply query Wallet.find() and sum
 *   currentBalance grouped by wallet type (BANK / CASH / INVESTMENT).
 *   Example aggregate:
 *
 *       await Wallet.aggregate([
 *           { $match: { isActive: true } },
 *           { $group: { _id: '$type', total: { $sum: '$currentBalance' } } }
 *       ]);
 *
 * MIGRATED: 2026-02-27
 * ─────────────────────────────────────────────────────────────────────────────
 */

// This file intentionally exports nothing.
// It exists only as a historical record for developers.
export { };
