import mongoose, { ClientSession, Types } from 'mongoose';
import FeeInvoice, { IFeeInvoice } from '@/models/finance/FeeInvoice';
import FeePayment, { IFeePayment } from '@/models/finance/FeePayment';
import InstallmentPlan, { IInstallmentPlan } from '@/models/finance/InstallmentPlan';
import dbConnect from '@/lib/mongodb';

/**
 * Custom Exception for financial overpayment scenarios.
 */
export class OverpaymentException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OverpaymentException';
    }
}

/**
 * FinanceTransactionService
 * 
 * Handles core financial logic including fee payment processing and departmental reporting.
 * Follows strict cascading allocation rules and ensures atomicity via MongoDB transactions.
 */
export class FinanceTransactionService {

    /**
     * Processes a fee payment with a strict cascading allocation algorithm:
     * 1. Pay pending penalties first.
     * 2. Pay installments in chronological order (if plan exists).
     * 3. Update invoice and installment statuses dynamically.
     * 
     * @param payload Payment data including invoice ID, amount, and metadata.
     */
    static async processFeePayment(payload: {
        invoiceId: string | Types.ObjectId;
        amount: number;
        paymentMode: string;
        performedBy: string;
        date?: Date;
    }) {
        await dbConnect();
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const invoice = await FeeInvoice.findById(payload.invoiceId).session(session);
            if (!invoice) {
                throw new Error(`Invoice ${payload.invoiceId} not found.`);
            }

            const currentArrears = invoice.getArrears();
            if (payload.amount > currentArrears) {
                throw new OverpaymentException(
                    `Overpayment detected. Payable: ${currentArrears}, Received: ${payload.amount}`
                );
            }

            let remainingCash = payload.amount;
            
            // 1. Penalty Allocation
            const pendingPenalty = invoice.penaltyAmount - invoice.penaltyPaid;
            const allocatedPenalty = Math.min(remainingCash, pendingPenalty);
            remainingCash -= allocatedPenalty;

            // 2. Principal Allocation (Installments vs Straight Payment)
            let allocatedPrincipal = 0;
            const installmentPlan = await InstallmentPlan.findOne({
                feeInvoice: invoice._id,
                isCompleted: false
            }).session(session);

            if (installmentPlan) {
                // Cascade remaining cash through installments
                for (const inst of installmentPlan.installments) {
                    if (remainingCash <= 0) break;
                    if (inst.isPaid) continue;

                    const instArrears = inst.amount - inst.paidAmount;
                    const toApply = Math.min(remainingCash, instArrears);

                    inst.paidAmount += toApply;
                    remainingCash -= toApply;
                    allocatedPrincipal += toApply;

                    if (inst.paidAmount >= inst.amount) {
                        inst.isPaid = true;
                        inst.paidAt = payload.date || new Date();
                    }
                }
                
                // Check if all installments are now completed
                installmentPlan.isCompleted = installmentPlan.installments.every(i => i.isPaid);
                await installmentPlan.save({ session });
            } else {
                // No installment plan, apply directly to invoice principal
                allocatedPrincipal = remainingCash;
                remainingCash = 0;
            }

            // 3. Update Invoice State
            invoice.penaltyPaid += allocatedPenalty;
            invoice.amountPaid += allocatedPrincipal;
            
            // Derive Status (No pre-save hooks)
            const finalArrears = invoice.getArrears();
            if (finalArrears <= 0) {
                invoice.status = 'PAID';
            } else if (invoice.amountPaid > 0 || invoice.penaltyPaid > 0) {
                invoice.status = 'PARTIAL';
            }

            await invoice.save({ session });

            // 4. Record Payment Receipt
            const [payment] = await FeePayment.create([{
                receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                feeInvoice: invoice._id,
                amount: payload.amount,
                allocation: {
                    principalAmount: allocatedPrincipal,
                    penaltyAmount: allocatedPenalty
                },
                paymentMode: payload.paymentMode,
                paymentDate: payload.date || new Date(),
                receivedBy: payload.performedBy,
                status: 'APPROVED'
            }], { session });

            await session.commitTransaction();
            return { invoice, payment };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Generates a real-time, departmental finance report using a multi-stage aggregation pipeline.
     */
    static async generateDepartmentalFinanceReport() {
        await dbConnect();

        const pipeline: any[] = [
            // 1. Join with StudentProfile
            {
                $lookup: {
                    from: 'university_students',
                    localField: 'studentProfileId',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },

            // 2. Deep Populate: Student -> Batch -> Program -> Department
            {
                $lookup: {
                    from: 'university_batches',
                    localField: 'student.batchId',
                    foreignField: '_id',
                    as: 'batch'
                }
            },
            { $unwind: '$batch' },
            {
                $lookup: {
                    from: 'university_programs',
                    localField: 'batch.programId',
                    foreignField: '_id',
                    as: 'program'
                }
            },
            { $unwind: '$program' },
            {
                $lookup: {
                    from: 'university_departments',
                    localField: 'program.departmentId',
                    foreignField: '_id',
                    as: 'department'
                }
            },
            { $unwind: '$department' },

            // 3. Group by Department
            {
                $group: {
                    _id: '$department._id',
                    departmentName: { $first: '$department.name' },
                    totalExpectedFee: { 
                        $sum: { $subtract: ['$totalAmount', '$discountAmount'] } 
                    },
                    totalFeeEarned: { $sum: '$amountPaid' },
                    totalFinesImposed: { $sum: '$penaltyAmount' },
                    totalFinesCollected: { $sum: '$penaltyPaid' },
                    totalStudents: { $addToSet: '$studentProfileId' },
                    // Support for counting active installment plans later
                    invoiceIds: { $push: '$_id' }
                }
            },

            // 4. Calculate Pending and Fines
            {
                $project: {
                    departmentName: 1,
                    totalExpectedFee: 1,
                    totalFeeEarned: 1,
                    totalFinesImposed: 1,
                    totalFinesCollected: 1,
                    pendingReceivables: { $subtract: ['$totalExpectedFee', '$totalFeeEarned'] },
                    outstandingFines: { $subtract: ['$totalFinesImposed', '$totalFinesCollected'] },
                    totalStudents: { $size: '$totalStudents' },
                    invoiceIds: 1
                }
            },

            // 5. Lookup InstallmentPlans to count active ones for these invoices
            {
                $lookup: {
                    from: 'installmentplans', // Assuming collection name
                    let: { ids: '$invoiceIds' },
                    pipeline: [
                        { 
                            $match: { 
                                $expr: { 
                                    $and: [
                                        { $in: ['$feeInvoice', '$$ids'] },
                                        { $eq: ['$isCompleted', false] }
                                    ]
                                } 
                            } 
                        },
                        { $count: 'activeCount' }
                    ],
                    as: 'installments'
                }
            },

            // 6. Final Projection
            {
                $project: {
                    departmentName: 1,
                    totalExpectedFee: 1,
                    totalFeeEarned: 1,
                    pendingReceivables: 1,
                    totalFinesImposed: 1,
                    totalFinesCollected: 1,
                    outstandingFines: 1,
                    totalStudents: 1,
                    activeInstallmentPlans: { 
                        $ifNull: [{ $arrayElemAt: ['$installments.activeCount', 0] }, 0] 
                    }
                }
            },
            { $sort: { departmentName: 1 } }
        ];

        return await FeeInvoice.aggregate(pipeline);
    }
}
