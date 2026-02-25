import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { resolve } from 'path';

// Load env vars
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import ChartOfAccount from '../src/models/finance/ChartOfAccount';
import FiscalYear from '../src/models/finance/FiscalYear';
import AccountingPeriod from '../src/models/finance/AccountingPeriod';
import Vendor from '../src/models/finance/Vendor';
import Employee from '../src/models/finance/Employee';
import FeeStructure from '../src/models/finance/FeeStructure';
import Budget from '../src/models/finance/Budget';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

const createdBy = 'admin@leads.edu.pk';

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('Connected.');

    // 1. Chart of Accounts
    console.log('\n--- Seeding Chart of Accounts ---');
    const accountsData = [
      { accountCode: '1000', accountName: 'Assets', accountType: 'ASSET', isControl: true, level: 1 },
      { accountCode: '1001', accountName: 'Cash', accountType: 'ASSET', isControl: false, level: 2, parentAccountCode: '1000' },
      { accountCode: '1002', accountName: 'Bank Accounts', accountType: 'ASSET', isControl: true, level: 2, parentAccountCode: '1000' },
      { accountCode: '1002-01', accountName: 'HBL Main Account', accountType: 'ASSET', isControl: false, level: 3, parentAccountCode: '1002' },
      { accountCode: '1200', accountName: 'Student Receivables', accountType: 'ASSET', isControl: false, level: 2, parentAccountCode: '1000' },
      { accountCode: '2000', accountName: 'Liabilities', accountType: 'LIABILITY', isControl: true, level: 1 },
      { accountCode: '2001', accountName: 'Accounts Payable', accountType: 'LIABILITY', isControl: false, level: 2, parentAccountCode: '2000' },
      { accountCode: '2100', accountName: 'Salary Payable', accountType: 'LIABILITY', isControl: false, level: 2, parentAccountCode: '2000' },
      { accountCode: '3000', accountName: 'Equity', accountType: 'EQUITY', isControl: true, level: 1 },
      { accountCode: '3001', accountName: 'Retained Earnings', accountType: 'EQUITY', isControl: false, level: 2, parentAccountCode: '3000' },
      { accountCode: '4000', accountName: 'Revenue', accountType: 'REVENUE', isControl: true, level: 1 },
      { accountCode: '4001', accountName: 'Tuition Fee Revenue', accountType: 'REVENUE', isControl: false, level: 2, parentAccountCode: '4000' },
      { accountCode: '4002', accountName: 'Lab Fee Revenue', accountType: 'REVENUE', isControl: false, level: 2, parentAccountCode: '4000' },
      { accountCode: '5000', accountName: 'Expenses', accountType: 'EXPENSE', isControl: true, level: 1 },
      { accountCode: '5001', accountName: 'Salary Expense', accountType: 'EXPENSE', isControl: false, level: 2, parentAccountCode: '5000' },
      { accountCode: '5002', accountName: 'Utilities Expense', accountType: 'EXPENSE', isControl: false, level: 2, parentAccountCode: '5000' },
      { accountCode: '5003', accountName: 'Office Supplies', accountType: 'EXPENSE', isControl: false, level: 2, parentAccountCode: '5000' },
      { accountCode: '5004', accountName: 'IT Equipment Expense', accountType: 'EXPENSE', isControl: false, level: 2, parentAccountCode: '5000' }
    ];

    for (const data of accountsData) {
      await ChartOfAccount.findOneAndUpdate(
        { accountCode: data.accountCode },
        { ...data, createdBy },
        { upsert: true, new: true }
      );
      console.log(`Created Account: [${data.accountCode}] ${data.accountName}`);
    }

    // 2. Fiscal Year & Periods
    console.log('\n--- Seeding Fiscal Year ---');
    const currentYear = new Date().getFullYear();
    const startDate = new Date(`${currentYear}-07-01T00:00:00.000Z`);
    const endDate = new Date(`${currentYear + 1}-06-30T23:59:59.999Z`);
    
    let fy = await FiscalYear.findOne({ name: `FY ${currentYear}-${currentYear + 1}` });
    if (!fy) {
      fy = await FiscalYear.create({
        name: `FY ${currentYear}-${currentYear + 1}`,
        startDate,
        endDate,
        status: 'OPEN',
        createdBy
      });
      console.log(`Created Fiscal Year: ${fy.name}`);

      for (let i = 0; i < 12; i++) {
        const pStart = new Date(startDate);
        pStart.setUTCMonth(pStart.getUTCMonth() + i);
        const pEnd = new Date(pStart);
        pEnd.setUTCMonth(pEnd.getUTCMonth() + 1);
        pEnd.setUTCDate(0);
        pEnd.setUTCHours(23, 59, 59, 999);

        const mName = pStart.toLocaleString('default', { month: 'short', timeZone: 'UTC' });
        const yName = pStart.getUTCFullYear();
        
        await AccountingPeriod.create({
          fiscalYear: fy._id,
          periodName: `${mName} ${yName}`,
          periodNumber: i + 1,
          startDate: pStart,
          endDate: pEnd,
          isLocked: false,
          createdBy
        });
      }
      console.log(`Created 12 Accounting Periods for ${fy.name}`);
    } else {
      console.log(`Fiscal Year ${fy.name} already exists.`);
    }

    // 3. Vendors
    console.log('\n--- Seeding Vendors (Accounts Payable) ---');
    const vendorsData = [
      { vendorCode: 'VEN-001', companyName: 'TechCorp IT Solutions', vendorType: 'SUPPLIER', payableAccountCode: '2001', contactPerson: 'Ali Khan', phone: '0300-1112222' },
      { vendorCode: 'VEN-002', companyName: 'WAPDA', vendorType: 'UTILITY', payableAccountCode: '2001', contactPerson: 'Billing Dept', phone: '111-000-111' },
      { vendorCode: 'VEN-003', companyName: 'Office World Supplies', vendorType: 'SUPPLIER', payableAccountCode: '2001', contactPerson: 'Sara Ahmed', phone: '0321-9998888' },
    ];
    for (const v of vendorsData) {
      await Vendor.findOneAndUpdate({ vendorCode: v.vendorCode }, { ...v, createdBy }, { upsert: true });
      console.log(`Created Vendor: ${v.companyName}`);
    }

    // 4. Employees
    console.log('\n--- Seeding Employees (Payroll) ---');
    const empData = [
      { employeeCode: 'EMP-001', firstName: 'Dr. Tariq', lastName: 'Mehmood', department: 'Computer Science', designation: 'Professor', employmentType: 'FULL_TIME', basicSalary: 150000, salaryExpenseAccount: '5001', salaryPayableAccount: '2100', cnic: '35202-1111111-1' },
      { employeeCode: 'EMP-002', firstName: 'Ayesha', lastName: 'Kamal', department: 'Administration', designation: 'HR Manager', employmentType: 'FULL_TIME', basicSalary: 90000, salaryExpenseAccount: '5001', salaryPayableAccount: '2100', cnic: '35202-2222222-2' },
      { employeeCode: 'EMP-003', firstName: 'Usman', lastName: 'Ali', department: 'Security', designation: 'Guard', employmentType: 'CONTRACT', basicSalary: 35000, salaryExpenseAccount: '5001', salaryPayableAccount: '2100', cnic: '35202-3333333-3' }
    ];
    for (const e of empData) {
      await Employee.findOneAndUpdate({ employeeCode: e.employeeCode }, { ...e, createdBy, dateOfJoining: new Date('2022-01-01') }, { upsert: true });
      console.log(`Created Employee: ${e.firstName} ${e.lastName} (${e.department})`);
    }

    // 5. Fee Structures
    console.log('\n--- Seeding Fee Structures (Accounts Receivable) ---');
    const feeData = [
      {
        programName: 'BS Computer Science',
        semester: 'Fall 2025',
        academicYear: '2025-26',
        totalAmount: 125000,
        feeComponents: [
          { name: 'Tuition Fee', amount: 100000, isRequired: true, accountCode: '4001' },
          { name: 'Lab Charges', amount: 15000, isRequired: true, accountCode: '4002' },
          { name: 'Library Fee', amount: 5000, isRequired: true, accountCode: '4003' },
          { name: 'Extracurricular', amount: 5000, isRequired: false, accountCode: '4004' }
        ],
        lateFeePerDay: 500,
        gracePeriodDays: 7,
        isActive: true,
      },
      {
        programName: 'BBA',
        semester: 'Fall 2025',
        academicYear: '2025-26',
        totalAmount: 110000,
        feeComponents: [
          { name: 'Tuition Fee', amount: 95000, isRequired: true, accountCode: '4001' },
          { name: 'Library Fee', amount: 5000, isRequired: true, accountCode: '4003' },
          { name: 'Activity Fee', amount: 10000, isRequired: true, accountCode: '4005' }
        ],
        lateFeePerDay: 500,
        gracePeriodDays: 7,
        isActive: true,
      }
    ];
    for (const fs of feeData) {
      let struct = await FeeStructure.findOne({ programName: fs.programName, semester: fs.semester });
      if (!struct) {
        struct = await FeeStructure.create({ ...fs, createdBy });
        console.log(`Created Fee Structure: ${fs.programName} (${fs.semester}) - Total PKR ${fs.totalAmount}`);
      } else {
        console.log(`Fee Structure ${fs.programName} already exists.`);
      }
    }

    // 6. Budgets
    console.log('\n--- Seeding Budgets ---');
    let budget = await Budget.findOne({ budgetName: 'Annual Operating Budget 2025', fiscalYear: fy._id });
    if (!budget) {
      // Need object IDs for budgetlines accounts
      const a5001 = await ChartOfAccount.findOne({ accountCode: '5001' });
      const a5002 = await ChartOfAccount.findOne({ accountCode: '5002' });
      const a5003 = await ChartOfAccount.findOne({ accountCode: '5003' });
      const a5004 = await ChartOfAccount.findOne({ accountCode: '5004' });

      await Budget.create({
        fiscalYear: fy._id,
        budgetName: 'Annual Operating Budget 2025',
        totalBudget: 6000000,
        status: 'ACTIVE',
        allowOverspend: false,
        budgetLines: [
          { account: a5001._id, accountCode: '5001', accountName: 'Salary Expense', budgetedAmount: 5000000 },
          { account: a5002._id, accountCode: '5002', accountName: 'Utilities Expense', budgetedAmount: 500000 },
          { account: a5003._id, accountCode: '5003', accountName: 'Office Supplies', budgetedAmount: 200000 },
          { account: a5004._id, accountCode: '5004', accountName: 'IT Equipment Expense', budgetedAmount: 300000 }
        ],
        createdBy
      });
      console.log('Created Annual Operating Budget 2025');
    } else {
      console.log('Budget already exists.');
    }

    console.log('\n✅ Seeding Complete! You can now explore the Finance Dashboard.');
    process.exit(0);

  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
}

seed();
