/**
 * @file FinanceError.ts
 * @description Typed error class for the Finance Service Layer
 *
 * All financial operations throw FinanceError on business rule violations.
 * API routes catch these and return structured 400 responses.
 * Unknown errors bubble up as 500.
 */

export type FinanceErrorCode =
    | 'PERIOD_LOCKED'           // Accounting period is closed for new entries
    | 'INSUFFICIENT_BALANCE'    // Wallet would go negative
    | 'WALLET_NOT_FOUND'        // Wallet ID does not exist or is inactive
    | 'INVOICE_NOT_FOUND'       // Fee invoice not found
    | 'INVOICE_ALREADY_PAID'    // Cannot pay a fully paid invoice
    | 'INVOICE_WAIVED'          // Cannot pay a waived invoice
    | 'SLIP_NOT_DRAFT'          // Salary slip is not in DRAFT state
    | 'STUDENT_NOT_FOUND'       // Student profile not found
    | 'INVALID_AMOUNT'          // Amount is zero or negative
    | 'SAME_WALLET_TRANSFER'    // Source and destination wallets are identical
    | 'DEPOSIT_ALREADY_REFUNDED'// Security deposit was already returned
    | 'INVESTMENT_NOT_ACTIVE'   // Investment is already matured/withdrawn
    | 'DUPLICATE_PERIOD'        // Recurring expense already generated for this month
    | 'VALIDATION_ERROR'        // Generic field-level error
    | 'TX_NOT_FOUND'            // Transaction not found
    | 'TX_ALREADY_REVERSED'     // Transaction already reversed
    | 'CANNOT_REVERSE_REVERSAL' // Cannot reverse a reversal transaction
    | 'CANNOT_REVERSE_ADVANCE'; // Reversing advance directly is not supported

export class FinanceError extends Error {
    public readonly code: FinanceErrorCode;
    public readonly detail?: Record<string, unknown>;

    constructor(
        code: FinanceErrorCode,
        message?: string,
        detail?: Record<string, unknown>
    ) {
        super(message ?? code);
        this.name = 'FinanceError';
        this.code = code;
        this.detail = detail;
    }

    /** Serialize to a safe API response body (no stack traces) */
    toJSON() {
        return {
            error: this.message,
            code: this.code,
            ...(this.detail ? { detail: this.detail } : {}),
        };
    }
}
