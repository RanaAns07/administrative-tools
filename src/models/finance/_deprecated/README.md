# ⛔ DEPRECATED — Double-Entry Accounting Models

> **Do not import anything from this directory.**
> These models are archived here for historical reference only.
> The MongoDB collections they created may still exist on older databases — do not populate them with new data.

---

## Why Were These Removed?

The university requested a simpler cash-flow tracking system that front-desk clerks can operate without accounting knowledge. The previous double-entry GAAP system (debits, credits, journal entries, chart of accounts, trial balance) was replaced by the **Khatta Engine** — a plain-language "Wallet & Transaction" model.

---

## Migration Map

| Deprecated Model | Reason for Removal | Khatta Replacement |
|---|---|---|
| `ChartOfAccount.ts` | Replaced "accounts" with plain wallet names | [`Wallet.ts`](../Wallet.ts) |
| `JournalEntry.ts` | Double-entry replaced by single-record transactions | [`Transaction.ts`](../Transaction.ts) |
| `AccountingPeriod.ts` | Period locking not needed in simple cash tracking | Use `date` field on `Transaction.ts` |
| `FiscalYear.ts` | No fiscal year close process in Khatta model | N/A — filter by date range on `Transaction.ts` |
| `CreditNote.ts` | AR adjustments handled via `type: 'OUT'` transactions | [`Transaction.ts`](../Transaction.ts) |
| `GeneralLedger.ts` | *(Never built)* Ledger = wallet balance | [`Wallet.currentBalance`](../Wallet.ts) |
| `TrialBalance.ts` | *(Never built)* No debits/credits to balance | Aggregate `Wallet.currentBalance` by type |

---

## The New System (Khatta Engine)

```
src/models/finance/
├── Category.ts      ← Tags every income/expense (e.g. "Tuition Fee", "Utility")
├── Wallet.ts        ← Where money sits (BANK, CASH, INVESTMENT); balance auto-updated
└── Transaction.ts   ← Every rupee movement: IN / OUT / TRANSFER
```

### Key Invariants

1. **Never write `Wallet.currentBalance` directly** from an API route. The `Transaction` pre-save hook does it atomically.
2. **Every `IN` or `OUT` needs a `categoryId`**. This enforces income/expense tagging.
3. **Every `TRANSFER` needs `toWalletId`** and it must differ from `walletId`.

---

*Archived: 2026-02-27 — Khatta Engine migration*
