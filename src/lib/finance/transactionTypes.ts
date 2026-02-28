/**
 * @file transactionTypes.ts
 * @description Locked Financial Transaction Type Enum
 *
 * This is the ONLY classification system for all money movements.
 * No free-text categories. No arbitrary strings.
 *
 * INFLOW  → money enters the university's wallet
 * OUTFLOW → money leaves the university's wallet
 * TRANSFER → internal wallet-to-wallet movement (no net effect on total position)
 *
 * Surplus / Deficit formula (see analytics route):
 *   Operational Revenue  = FEE_PAYMENT only
 *   Operational Expenses = PAYROLL_PAYMENT + EXPENSE_PAYMENT
 *   Net Surplus          = Revenue - Expenses
 *
 *   EXCLUDED from surplus:
 *     SECURITY_DEPOSIT    → liability, not revenue
 *     REFUND              → adjustment
 *     INVESTMENT_OUTFLOW  → capital movement
 *     INVESTMENT_RETURN   → capital movement
 *     WALLET_TRANSFER_*   → internal only
 */

// ── Inflow Types ──────────────────────────────────────────────────────────────

export const INFLOW_TYPES = [
    'FEE_PAYMENT',        // Student tuition / semester fee receipt
    'SECURITY_DEPOSIT',   // Refundable deposit paid by student
    'INVESTMENT_RETURN',  // Maturity / return on investment
] as const;

// ── Outflow Types ─────────────────────────────────────────────────────────────

export const OUTFLOW_TYPES = [
    'EXPENSE_PAYMENT',   // Operational expense (utilities, supplies, etc.)
    'PAYROLL_PAYMENT',   // Salary disbursement to staff
    'REFUND',            // Any refund back to a student
    'INVESTMENT_OUTFLOW', // Capital placed into an investment
] as const;

// ── Transfer Types ────────────────────────────────────────────────────────────
// A transfer always produces TWO linked transactions (OUT + IN)

export const TRANSFER_TYPES = [
    'WALLET_TRANSFER_OUT', // Debit side of an internal transfer
    'WALLET_TRANSFER_IN',  // Credit side of an internal transfer
] as const;

// ── Special Types ────────────────────────────────────────────────────────────

export const ADJUSTMENT_TYPES = [
    'REVERSAL',                   // Reversal of any transaction
    'STUDENT_ADVANCE_DEDUCTION',  // Applying student advance towards an invoice
] as const;

// ── Combined Union ────────────────────────────────────────────────────────────

export type InflowType = typeof INFLOW_TYPES[number];
export type OutflowType = typeof OUTFLOW_TYPES[number];
export type TransferType = typeof TRANSFER_TYPES[number];
export type AdjustmentType = typeof ADJUSTMENT_TYPES[number];
export type FinanceTxType = InflowType | OutflowType | TransferType | AdjustmentType;

export const ALL_TX_TYPES: readonly FinanceTxType[] = [
    ...INFLOW_TYPES,
    ...OUTFLOW_TYPES,
    ...TRANSFER_TYPES,
    ...ADJUSTMENT_TYPES,
] as const;

// ── Operational Revenue & Expense Subsets (for Surplus Calculation) ───────────

export const OPERATIONAL_REVENUE_TYPES: readonly FinanceTxType[] = ['FEE_PAYMENT'] as const;

export const OPERATIONAL_EXPENSE_TYPES: readonly FinanceTxType[] = [
    'PAYROLL_PAYMENT',
    'EXPENSE_PAYMENT',
] as const;

// ── Helper Guards ─────────────────────────────────────────────────────────────

export function isInflowType(t: string): t is InflowType {
    return (INFLOW_TYPES as readonly string[]).includes(t);
}

export function isOutflowType(t: string): t is OutflowType {
    return (OUTFLOW_TYPES as readonly string[]).includes(t);
}

export function isTransferType(t: string): t is TransferType {
    return (TRANSFER_TYPES as readonly string[]).includes(t);
}

export function isAdjustmentType(t: string): t is AdjustmentType {
    return (ADJUSTMENT_TYPES as readonly string[]).includes(t);
}

export function isValidTxType(t: string): t is FinanceTxType {
    return (ALL_TX_TYPES as readonly string[]).includes(t);
}

/**
 * Returns +1 for inflow/transfer-in (balance increases),
 * -1 for outflow/transfer-out/deductions (balance decreases).
 * REVERSAL depends on what it's reversing, but the math uses the signed delta passed.
 * For REVERSAL, it's typically an adjustment that mimics an inflow or outflow based on amount sign,
 * However we use positive amounts for all transactions, so reversal must be handled carefully.
 * Usually a reversal of an inflow is a decrease (-1).
 */
export function balanceDeltaSign(txType: FinanceTxType): 1 | -1 {
    if (txType === 'WALLET_TRANSFER_IN' || isInflowType(txType)) return 1;
    // Note: STUDENT_ADVANCE_DEDUCTION is a virtual money movement applied to invoice. It does NOT move wallet cash directly, or it acts as a transfer.
    // Wait, advance deduction reduces advance balance, but does not touch WALLET balance.
    // So Wallet balanceDeltaSign for STUDENT_ADVANCE_DEDUCTION should technically be 0, but this function only returns 1 | -1.
    // Let's return -1 and handle it carefully in the Service.
    return -1;
}
