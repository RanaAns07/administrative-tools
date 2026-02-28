import dbConnect from './src/lib/mongodb';
import ExpenseRecord from './src/models/finance/ExpenseRecord';

async function run() {
  await dbConnect();
  const records = await ExpenseRecord.find({}, 'date').lean();
  console.log(records.map(r => r.date));
  process.exit(0);
}
run();
