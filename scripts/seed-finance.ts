/**
 * @file seed-finance.ts
 * @description Khatta Engine — Development Seed Script
 *
 * Seeds the database with starter Wallets and Categories for the new Khatta system.
 * This replaces the old seed-finance.ts (which seeded Chart of Accounts, Fiscal Years,
 * Accounting Periods, and other deprecated models).
 *
 * Run with:
 *   npx tsx scripts/seed-finance.ts
 */
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import Category from '../src/models/finance/Category';
import Wallet from '../src/models/finance/Wallet';
import Vendor from '../src/models/finance/Vendor';
import Employee from '../src/models/finance/Employee';
import FeeStructure from '../src/models/finance/FeeStructure';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌  Please define MONGODB_URI in .env.local');
  process.exit(1);
}

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅  Connected.\n');

    // ─── 1. Income Categories ──────────────────────────────────────────────
    console.log('--- Seeding Income Categories ---');
    const incomeCategories = [
      { name: 'Tuition Fee', type: 'INCOME', description: 'Semester tuition charges' },
      { name: 'Admission Fee', type: 'INCOME', description: 'One-time admission processing fee' },
      { name: 'Registration Fee', type: 'INCOME', description: 'Per-semester registration' },
      { name: 'Examination Fee', type: 'INCOME', description: 'Mid/final term examination charges' },
      { name: 'Lab Fee', type: 'INCOME', description: 'Practical lab usage charges' },
      { name: 'Library Fee', type: 'INCOME', description: 'Library access and late fines' },
      { name: 'Hostel Fee', type: 'INCOME', description: 'On-campus accommodation charges' },
      { name: 'Activity Fee', type: 'INCOME', description: 'Sports, events, extracurricular activities' },
      { name: 'Grants & Donations', type: 'INCOME', description: 'External grants and philanthropic donations' },
      { name: 'Miscellaneous Income', type: 'INCOME', description: 'Ad-hoc income not covered above' },
    ];

    for (const c of incomeCategories) {
      await Category.findOneAndUpdate(
        { name: c.name, type: c.type },
        { ...c, isActive: true },
        { upsert: true, new: true }
      );
      console.log(`  [INCOME] ${c.name}`);
    }

    // ─── 2. Expense Categories ─────────────────────────────────────────────
    console.log('\n--- Seeding Expense Categories ---');
    const expenseCategories = [
      { name: 'Faculty Salary', type: 'EXPENSE', description: 'Monthly salary for teaching staff' },
      { name: 'Administrative Salary', type: 'EXPENSE', description: 'Monthly salary for admin/support staff' },
      { name: 'Visiting Faculty Payment', type: 'EXPENSE', description: 'Per-lecture or contract faculty payment' },
      { name: 'Office Supplies', type: 'EXPENSE', description: 'Stationery, printing, and office materials' },
      { name: 'Utility - Electricity', type: 'EXPENSE', description: 'WAPDA/electricity bills' },
      { name: 'Utility - Gas', type: 'EXPENSE', description: 'Gas utility bills' },
      { name: 'Internet & IT Services', type: 'EXPENSE', description: 'ISP, IT subscriptions, software licenses' },
      { name: 'Building Maintenance', type: 'EXPENSE', description: 'Repair and upkeep of campus buildings' },
      { name: 'Security Services', type: 'EXPENSE', description: 'Guards, CCTV maintenance' },
      { name: 'Vendor Payment', type: 'EXPENSE', description: 'Payments to approved vendors' },
      { name: 'Bank Charges', type: 'EXPENSE', description: 'Bank transaction and service fees' },
      { name: 'Transportation', type: 'EXPENSE', description: 'Fuel, vehicle maintenance, transport services' },
      { name: 'Miscellaneous Expense', type: 'EXPENSE', description: 'Ad-hoc expenses not covered above' },
    ];

    for (const c of expenseCategories) {
      await Category.findOneAndUpdate(
        { name: c.name, type: c.type },
        { ...c, isActive: true },
        { upsert: true, new: true }
      );
      console.log(`  [EXPENSE] ${c.name}`);
    }

    // ─── 3. Wallets ────────────────────────────────────────────────────────
    console.log('\n--- Seeding Wallets ---');
    const wallets = [
      { name: 'Main Bank — HBL', type: 'BANK', currency: 'PKR', currentBalance: 0 },
      { name: 'Payroll Account — MCB', type: 'BANK', currency: 'PKR', currentBalance: 0 },
      { name: 'Front Desk Petty Cash', type: 'CASH', currency: 'PKR', currentBalance: 0 },
      { name: 'Admission Office Cash', type: 'CASH', currency: 'PKR', currentBalance: 0 },
      { name: 'Reserve Fund', type: 'INVESTMENT', currency: 'PKR', currentBalance: 0 },
    ];

    for (const w of wallets) {
      await Wallet.findOneAndUpdate(
        { name: w.name },
        { ...w, isActive: true },
        { upsert: true, new: true }
      );
      console.log(`  [${w.type}] ${w.name}`);
    }

    // ─── 4. Vendors ────────────────────────────────────────────────────────
    console.log('\n--- Seeding Vendors ---');
    const vendorsData = [
      { vendorCode: 'VEN-001', companyName: 'TechCorp IT Solutions', vendorType: 'SUPPLIER', contactPerson: 'Ali Khan', phone: '0300-1112222' },
      { vendorCode: 'VEN-002', companyName: 'WAPDA', vendorType: 'UTILITY', contactPerson: 'Billing Dept', phone: '111-000-111' },
      { vendorCode: 'VEN-003', companyName: 'Office World Supplies', vendorType: 'SUPPLIER', contactPerson: 'Sara Ahmed', phone: '0321-9998888' },
    ];
    for (const v of vendorsData) {
      await Vendor.findOneAndUpdate({ vendorCode: v.vendorCode }, v, { upsert: true });
      console.log(`  [VENDOR] ${v.companyName}`);
    }

    // ─── 5. Employees ──────────────────────────────────────────────────────
    console.log('\n--- Seeding Employees ---');
    const empData = [
      { employeeCode: 'EMP-001', firstName: 'Dr. Tariq', lastName: 'Mehmood', department: 'Computer Science', designation: 'Professor', employmentType: 'FULL_TIME', basicSalary: 150000, cnic: '35202-1111111-1' },
      { employeeCode: 'EMP-002', firstName: 'Ayesha', lastName: 'Kamal', department: 'Administration', designation: 'HR Manager', employmentType: 'FULL_TIME', basicSalary: 90000, cnic: '35202-2222222-2' },
      { employeeCode: 'EMP-003', firstName: 'Usman', lastName: 'Ali', department: 'Security', designation: 'Guard', employmentType: 'CONTRACT', basicSalary: 35000, cnic: '35202-3333333-3' },
    ];
    for (const e of empData) {
      await Employee.findOneAndUpdate(
        { employeeCode: e.employeeCode },
        { ...e, dateOfJoining: new Date('2022-01-01') },
        { upsert: true }
      );
      console.log(`  [EMPLOYEE] ${e.firstName} ${e.lastName}`);
    }

    // ─── 6. Fee Structures ─────────────────────────────────────────────────
    console.log('\n--- Seeding Fee Structures ---');
    const feeData = [
      {
        programName: 'BS Computer Science', semester: 'Fall 2025', academicYear: '2025-26',
        totalAmount: 125000,
        feeComponents: [
          { name: 'Tuition Fee', amount: 100000, isRequired: true },
          { name: 'Lab Charges', amount: 15000, isRequired: true },
          { name: 'Library Fee', amount: 5000, isRequired: true },
          { name: 'Extracurricular', amount: 5000, isRequired: false },
        ],
        lateFeePerDay: 500, gracePeriodDays: 7, isActive: true,
      },
      {
        programName: 'BBA', semester: 'Fall 2025', academicYear: '2025-26',
        totalAmount: 110000,
        feeComponents: [
          { name: 'Tuition Fee', amount: 95000, isRequired: true },
          { name: 'Library Fee', amount: 5000, isRequired: true },
          { name: 'Activity Fee', amount: 10000, isRequired: true },
        ],
        lateFeePerDay: 500, gracePeriodDays: 7, isActive: true,
      },
    ];
    for (const fs of feeData) {
      const existing = await FeeStructure.findOne({ programName: fs.programName, semester: fs.semester });
      if (!existing) {
        await FeeStructure.create(fs);
        console.log(`  [FEE] ${fs.programName} (${fs.semester}) — PKR ${fs.totalAmount.toLocaleString()}`);
      } else {
        console.log(`  [SKIP] ${fs.programName} already exists.`);
      }
    }

    console.log('\n✅  Khatta seed complete! Wallets, Categories, Vendors, Employees, and Fee Structures are ready.');
    process.exit(0);
  } catch (error) {
    console.error('❌  Seeding error:', error);
    process.exit(1);
  }
}

seed();
