import dbConnect from './src/lib/mongodb';
import { FinanceTransactionService } from './src/lib/finance/FinanceTransactionService';
import FeeInvoice from './src/models/finance/FeeInvoice';
import Wallet from './src/models/finance/Wallet';

async function run() {
  await dbConnect();
  
  const studentProfileId = "69a22acc21266819b3c20d40";
  const feeStructureId = "69a22af021266819b3c20d4f";
  
  const invoice = await FeeInvoice.create({
            studentProfileId,
            feeStructureId,
            semesterNumber: 1,
            dueDate: new Date(),
            totalAmount: 20000,
            discountAmount: 0,
            amountPaid: 0,
            penaltyAmount: 0,
            status: 'PENDING',
        });
        
   console.log("Invoice created.", invoice._id);
   
   try {
     const wallet = await Wallet.findOne({});
     const result = await FinanceTransactionService.recordAdvanceApplication({
                    invoiceId: invoice._id.toString(),
                    amount: 20000, // Max it can apply
                    walletId: wallet._id.toString(),
                    performedBy: "system",
                });
     console.log("Advance applied:", result);
   } catch (e: any) {
     console.error("Advance error:", e.message);
   }
   
   process.exit(0);
}
run();
