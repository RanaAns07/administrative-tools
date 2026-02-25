# Finance Department Module — User Guide & Stories

Welcome to the Lahore Leads University Finance Department Module! This document is designed for all users—whether you're an accountant, a department head, or administrative staff—to understand what each part of the system does, why it exists, and how to use it safely.

---

## 1. Core Accounting: The Heart of Finance

### Feature: Chart of Accounts (CoA)
**What it is:** The master list of all "buckets" (accounts) where the university's money is categorized (e.g., Cash, Tuition Revenue, Salaries Expense, Accounts Payable).
- **User Story:** *As a Chief Accountant, I want a structured list of all financial accounts so I can accurately categorize every incoming and outgoing penny.*
**Key Fields Explained:**
- **Account Code:** A unique numbered ID for the account (e.g., 1001 for Cash).
- **Account Name:** What the account is called (e.g., "Main Bank Account").
- **Account Type:** The broad category: Asset (what we own), Liability (what we owe), Equity (net worth), Revenue (what we earn), or Expense (what we spend).
- **Normal Balance:** Whether the account naturally carries a Debit (Assets, Expenses) or Credit (Liabilities, Equity, Revenue).
- **Is Control Account:** If "Yes," this is a parent category (like "All Banks") that cannot have direct transactions.

### Feature: Journal Entries (JE)
**What it is:** The digital record of moving money from one account to another. All financial magic happens here using "Double-Entry Accounting," meaning every transaction has a Debit and a matching Credit.
- **User Story:** *As an Accountant, I want to record financial transactions manually and have the system prevent me from saving if my debits and credits don't balance exactly to zero.*
**Key Fields Explained:**
- **Entry Number:** Auto-generated unique ID (e.g., JE-2025-00001).
- **Status:** DRAFT (editable), PENDING_APPROVAL (sent to supervisor), APPROVED (ready to post), POSTED (locked into the ledger forever), REJECTED.
- **Debit / Credit Lines:** The actual amounts being added or removed from specific accounts.

### Feature: Fiscal Years & Accounting Periods
**What it is:** The university's financial calendar. A Fiscal Year is divided into 12 monthly Accounting Periods.
- **User Story:** *As a Finance Manager, I want to lock previous months so no one can accidentally (or maliciously) change historical financial records.*
**Key Fields Explained:**
- **Status (Fiscal Year):** OPEN (currently active) or CLOSED (finished and archived).
- **Is Locked (Period):** A toggle switch. If a month is locked, the system physically blocks any new Journal Entries for that month's dates.

---

## 2. Student Revenue: Billing & Collections

### Feature: Fee Structures
**What it is:** The blueprints for how much academic programs cost per semester. 
- **User Story:** *As an Admin, I want to define a fee template for "BS Computer Science - Fall 2025" so I don't have to manually type out tuition and lab fees for every single student.*
**Key Fields Explained:**
- **Fee Components:** The individual charges (Tuition, Library Fee, Sports Fee).
- **Late Fee Per Day & Grace Period:** Rules for auto-calculating penalties if a student pays late.

### Feature: Fee Invoices & Fee Payments
**What it is:** Generating bills for students and recording the money they hand over.
- **User Story:** *As a Cashier, I want to record a student's payment, print a receipt, and have the system automatically update their invoice status and post the accounting journal entry behind the scenes.*
**Key Fields Explained:**
- **Total Amount:** The gross cost.
- **Outstanding Amount:** How much the student still owes. (Total - Paid - Discount + Penalty).
- **Payment Mode:** How they paid (Cash, Bank Transfer, Cheque).
- *Automated Magic:* When a payment is recorded, the system automatically creates a Journal Entry (Debit: Cash, Credit: Student Receivables).

---

## 3. Accounts Payable (AP): Buying Things

### Feature: Vendors
**What it is:** Our address book of people and companies we buy goods or services from.
- **User Story:** *As a Procurement Officer, I want a centralized directory of suppliers so I know exactly who we owe and how to contact them.*
**Key Fields Explained:**
- **NTN:** The National Tax Number of the vendor.
- **AP Account Code:** The specific ledger account where debts to this vendor are tracked.

### Feature: Purchase Requests (PR) & Purchase Orders (PO)
**What it is:** Internal requests for buying things (PR), which get converted into formal orders to the vendor (PO).
- **User Story (PR):** *As an IT Manager, I want to request 10 new laptops from Finance and track whether my request is approved or rejected.*
- **User Story (PO):** *As a Procurement Officer, once a PR is approved, I want to generate a formal PDF order with GST taxes auto-calculated to send to the vendor.*
**Key Fields Explained:**
- **Estimated Unit Cost (PR):** A guess of what things will cost.
- **GST % (PO):** Auto-calculates the sales tax on the final ordered items.

### Feature: Vendor Invoices
**What it is:** The bill the vendor sends us after delivering the goods.
- **User Story:** *As an AP Clerk, I want to record that we received a bill from the laptop vendor, so the system logs that we owe them money.*
**Key Fields Explained:**
- **Vendor Invoice #:** The physical invoice number printed on the vendor's paper.
- *Automated Magic:* Saving this invoice automatically posts a Journal Entry (Debit: Expense, Credit: Accounts Payable), increasing our recorded liability.

---

## 4. Payroll: Paying Our Team

### Feature: Employees & Payroll Processing
**What it is:** Managing staff salaries and running the monthly payroll engine.
- **User Story:** *As the HR/Payroll Manager, I want to click one button at the end of the month to generate payslips for all active employees, calculate their net pay, and post the massive salary journal entry instantly.*
**Key Fields Explained:**
- **Gross Salary (Employee):** Their base monthly pay.
- **Deductions:** Subtractions for taxes, absent days, or loan repayments.
- **Net Payable:** What actually hits their bank account (Gross minus Deductions).
- *Automated Magic:* The Payroll Engine creates individual payslips, updates employee loan balances, and posts a consolidated Journal Entry (Debit: Salary Expense, Credit: Salary Payable).

---

## 5. Budget Management

### Feature: Budgets
**What it is:** The financial guardrails for the year. It sets a ceiling on how much can be spent from specific expense accounts.
- **User Story:** *As the Vice Chancellor, I want to allocate PKR 1,000,000 to the "Marketing Expense" account, and have the system warn us if we try to spend PKR 1,100,000.*
**Key Fields Explained:**
- **Budget Lines:** The specific accounts and the amount allocated to them.
- **Allow Overspend:** A toggle. If OFF, the system physically blocks Journal Entries that would push an account past its allocated budget. If ON, it only warns the user.

---

## 6. Financial Reports: The Big Picture

### Feature: General Ledger & Trial Balance
**What it is:** The detailed microscope and the high-level summary of all accounts.
- **User Story (GL):** *As an Auditor, I want to type in the "Cash" account code and see every single transaction that moved money in or out, along with a running balance.*
- **User Story (Trial Balance):** *As a CFO, I want a single list of all accounts to ensure Total Debits equal Total Credits, proving the math is flawless.*

### Feature: Fee Aging Report
**What it is:** A report showing how late student payments are.
- **User Story:** *As a Recovery Officer, I want to know exactly which students owe money from 30 days ago, 60 days ago, or 90+ days ago, so I know who to call first.*
**Key Fields Explained:**
- **Buckets (Current, 1-30, 31-60, 90+):** Groups outstanding invoices based on how many days past the Due Date they are.

### Feature: Balance Sheet & Income Statement
**What it is:** The ultimate health checks of the university.
- **User Story:** *As the Board of Directors, I want to see our net profit/loss for the year (Income Statement) and verify our total Assets exactly match our Liabilities plus Equity (Balance Sheet).*
**Key Fields Explained:**
- **Surplus / Deficit:** Did we make more money than we spent?
- **A = L + E Check:** A green badge verifying that the fundamental accounting equation is balanced.

---
**Security Note (Audit Log):** Remember, everything you do is tracked. The `Audit Log` records who created, approved, posted, or rejected any record, the exact timestamp, and the user's IP address. Nothing is truly deleted; it is only marked as inactive.
