/**
 * @file seed-coa.ts
 * @deprecated THIS SCRIPT IS NO LONGER NEEDED — Khatta Migration (2026-02-27)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⛔  DO NOT RUN THIS SCRIPT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This script seeded the old Chart of Accounts hierarchical account tree
 * (Assets, Liabilities, Equity, Revenue, Expenses) into the `chartofaccounts`
 * MongoDB collection.
 *
 * The Chart of Accounts concept has been FULLY REPLACED by:
 *   → Wallets   (BANK, CASH, INVESTMENT) — where money sits
 *   → Categories (INCOME, EXPENSE)        — how money is tagged
 *
 * TO SEED THE NEW KHATTA SYSTEM, run:
 *   npx tsx scripts/seed-finance.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

console.error([
    '',
    '⛔  seed-coa.ts is deprecated and should not be run.',
    '    The Chart of Accounts has been removed from this system.',
    '',
    '    To seed the new Khatta (Wallet & Transaction) system, run:',
    '    npx tsx scripts/seed-finance.ts',
    '',
].join('\n'));

process.exit(1);
