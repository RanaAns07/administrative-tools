import dbConnect from './src/lib/mongodb';
import ExpenseRecord from './src/models/finance/ExpenseRecord';

async function run() {
  await dbConnect();
  const records = await ExpenseRecord.find({});
  let changes = 0;

  for (let i = 0; i < records.length; i++) {
    const date = new Date();
    const monthsAgo = i % 6; // 0 to 5 months
    date.setMonth(date.getMonth() - monthsAgo);
    date.setDate(Math.floor(Math.random() * 28) + 1);

    records[i].date = date;
    await records[i].save();
    changes++;
  }

  console.log(`Updated ${changes} expense records with spread dates.`);
  process.exit(0);
}
run();
