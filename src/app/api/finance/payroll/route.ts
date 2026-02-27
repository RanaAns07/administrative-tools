/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import PayrollRun from '@/models/finance/PayrollRun';
import Employee from '@/models/finance/Employee';
import LoanAdvance from '@/models/finance/LoanAdvance';
import { writeAuditLog } from '@/lib/finance-utils';

/**
 * GET /api/finance/payroll
 * List payroll runs with optional year/status filters.
 */
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const year = searchParams.get('year');
        const status = searchParams.get('status');
        const query: Record<string, unknown> = {};
        if (year) query.year = parseInt(year);
        if (status) query.status = status;

        const runs = await PayrollRun.find(query).sort({ year: -1, month: -1 }).lean();
        return NextResponse.json(runs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/finance/payroll — Process payroll for a month/year.
 *
 * NOTE (2026-02-27 — Khatta Migration):
 *   Journal Entry auto-creation has been removed. After creating a PayrollRun,
 *   record the actual disbursement as a Transaction:
 *     type: 'OUT', referenceType: 'PAYROLL_SLIP', referenceId: run._id
 *   This keeps the wallet balance accurate without any double-entry logic.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { month, year } = body;

        if (!month || !year) {
            return NextResponse.json({ error: 'month and year are required.' }, { status: 400 });
        }

        // Check no duplicate run
        const existing = await PayrollRun.findOne({ month, year });
        if (existing) {
            return NextResponse.json({ error: `Payroll for ${month}/${year} already exists.` }, { status: 400 });
        }

        // Fetch all active employees
        const employees = await Employee.find({ status: 'ACTIVE' }).lean();
        if (!employees.length) {
            return NextResponse.json({ error: 'No active employees found.' }, { status: 400 });
        }

        // Fetch active loans
        const loans = await LoanAdvance.find({ status: 'ACTIVE' }).lean();
        const loanMap = new Map(loans.map((l) => [l.employee.toString(), l]));

        // Compute payslips
        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;

        const payslips = employees.map((emp) => {
            const basic = emp.basicSalary;
            const allowances = 0;
            const gross = basic + allowances;

            const incomeTax = gross > 50000 ? parseFloat((gross * 0.01).toFixed(2)) : 0;
            const providentFund = parseFloat((gross * 0.05).toFixed(2));
            const loanDeduction = loanMap.get(emp._id.toString())?.monthlyInstallment || 0;
            const totalDeduction = incomeTax + providentFund + loanDeduction;
            const netSalary = parseFloat((gross - totalDeduction).toFixed(2));

            totalGross += gross;
            totalDeductions += totalDeduction;
            totalNet += netSalary;

            return {
                employee: emp._id,
                employeeCode: emp.employeeCode,
                employeeName: emp.name,
                basicSalary: basic,
                allowances,
                grossSalary: gross,
                incomeTax,
                providentFund,
                loanDeduction,
                otherDeductions: 0,
                totalDeductions: totalDeduction,
                netSalary,
                workingDays: 26,
                presentDays: 26,
                leaveDays: 0,
            };
        });

        const runNumber = `PAY-${year}-${String(month).padStart(2, '0')}`;
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0);

        const run = await PayrollRun.create({
            runNumber,
            month, year,
            periodStart, periodEnd,
            status: 'POSTED',
            payslips,
            totalGross: parseFloat(totalGross.toFixed(2)),
            totalDeductions: parseFloat(totalDeductions.toFixed(2)),
            totalNetPayable: parseFloat(totalNet.toFixed(2)),
            processedBy: session.user.email,
            processedAt: new Date(),
            approvedBy: session.user.email,
            approvedAt: new Date(),
            postedBy: session.user.email,
            postedAt: new Date(),
            createdBy: session.user.email || 'unknown',
        });

        // Update loan balances
        for (const emp of employees) {
            const loan = loanMap.get(emp._id.toString());
            if (loan && loan.monthlyInstallment > 0) {
                await LoanAdvance.findByIdAndUpdate(loan._id, {
                    $inc: { totalRepaid: loan.monthlyInstallment, remainingBalance: -loan.monthlyInstallment },
                });
            }
        }

        await writeAuditLog({
            action: 'PROCESS_PAYROLL',
            entityType: 'PayrollRun',
            entityId: run._id.toString(),
            entityReference: runNumber,
            performedBy: session.user.email || 'unknown',
            newState: { month, year, employeeCount: employees.length, totalGross },
        });

        return NextResponse.json({
            payrollRun: run,
            message: `Payroll processed. Record disbursement via POST /api/finance/transactions with type:OUT and referenceType:PAYROLL_SLIP.`,
        }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
