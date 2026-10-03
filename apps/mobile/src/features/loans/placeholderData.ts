/**
 * PLACEHOLDER data for the prototype only. Shapes mirror the API (PRD 10.3) but values are
 * static and fake. Schedules are generated; overdue totals and "next due" are DERIVED from the
 * schedule so the screens never disagree with each other.
 *
 * Preview Home states with EXPO_PUBLIC_MOCK_LOANS = multi | one | active_closed | all_closed | none | new_loan.
 *
 * TODO (F-05 / F-06): delete this and source data from the mock/live API adapter,
 * deriving schedule/summary via @app/shared computeSchedule.
 */
import { dayDiff } from './format';
import { MOCK_TODAY } from './clock';

export interface PlaceholderCustomer {
  name: string;
  firstName: string;
  initials: string;
  city: string;
}

export const PLACEHOLDER_CUSTOMER: PlaceholderCustomer = {
  name: 'Rahul Kumar',
  firstName: 'Rahul',
  initials: 'RK',
  city: 'Demo City',
};

export type LoanStatus = 'OVERDUE' | 'ACTIVE' | 'CLOSED';
export type InstallmentStatus = 'PAID' | 'PARTIAL' | 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
export type TransactionType = 'PAYMENT' | 'CHARGE' | 'DISCOUNT' | 'ADJUSTMENT';

export interface Installment {
  emiNumber: number;
  dueDate: Date;
  amount: number;
  status: InstallmentStatus;
  /** PAID: full amount. PARTIAL: part paid. */
  paidAmount?: number;
  clearedVia?: string;
}

export interface Transaction {
  id: string;
  date: Date;
  type: TransactionType;
  /** "Payment", "Late fee", "Discount", ... */
  label: string;
  mode?: 'Online' | 'Cash';
  modeDetail?: string;
  /** Positive for all types except ADJUSTMENT, which is signed from the borrower's credit side (negative = debit). */
  amount: number;
  referenceNo?: string;
  receiptNo?: string;
  /** e.g. "02:45 PM IST" */
  time?: string;
  split?: { principal: number; interest: number; lateFee: number };
}

export interface NextDue {
  emiNumber: number;
  amount: number;
  date: Date;
}

export interface Loan {
  loanId: string;
  accountNumber: string;
  productName: string;
  status: LoanStatus;
  scheme: string;
  branch: string;
  loanDate: Date;
  firstEmiDate: Date;
  maturityDate: Date;
  emiAmount: number;
  frequency: 'Daily' | 'Monthly';
  totalEmis: number;
  emisPaid: number;
  lastPayment?: { date: Date; amount: number };
  // Amount breakdown (rupees)
  loanAmount: number;
  totalInterest: number;
  totalPayable: number;
  lateFee: number;
  overdueInterest: number;
  recoveryCharges: number;
  discount: number;
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  // Derived from the schedule
  overdueAmount: number;
  overdueInstallments: number;
  nextDue?: NextDue;
  // Payment breakup (history only)
  paidOnline: { amount: number; count: number };
  paidCash: { amount: number; count: number };
  /** Optional Key Facts; hidden when absent. */
  keyFacts?: { apr: string; method: string };
  schedule: Installment[];
  transactions: Transaction[];
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

interface Seed {
  loanId: string;
  accountNumber: string;
  productName: string;
  scheme: string;
  branch: string;
  frequency: 'Daily' | 'Monthly';
  loanDate: Date;
  firstEmiDate: Date;
  emiAmount: number;
  totalEmis: number;
  emisPaid: number;
  /** Part-payment on the next installment after `emisPaid`. */
  partialPaid?: number;
  loanAmount: number;
  totalInterest: number;
  lateFee: number;
  overdueInterest: number;
  recoveryCharges: number;
  discount: number;
  totalPaid: number;
  paidOnline: { amount: number; count: number };
  paidCash: { amount: number; count: number };
  lastPayment?: { date: Date; amount: number };
  keyFacts?: { apr: string; method: string };
  transactions?: Transaction[];
}

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());

function buildSchedule(seed: Seed): Installment[] {
  const rows: Installment[] = [];
  for (let n = 1; n <= seed.totalEmis; n++) {
    const dueDate =
      seed.frequency === 'Daily'
        ? addDays(seed.firstEmiDate, n - 1)
        : addMonths(seed.firstEmiDate, n - 1);
    const diff = dayDiff(dueDate, MOCK_TODAY);

    if (n <= seed.emisPaid) {
      rows.push({
        emiNumber: n,
        dueDate,
        amount: seed.emiAmount,
        status: 'PAID',
        paidAmount: seed.emiAmount,
        clearedVia: n % 3 === 0 ? 'Cash Deposit' : 'NetBanking',
      });
    } else if (seed.partialPaid && n === seed.emisPaid + 1 && diff < 0) {
      rows.push({
        emiNumber: n,
        dueDate,
        amount: seed.emiAmount,
        status: 'PARTIAL',
        paidAmount: seed.partialPaid,
      });
    } else {
      rows.push({
        emiNumber: n,
        dueDate,
        amount: seed.emiAmount,
        status: diff < 0 ? 'OVERDUE' : diff === 0 ? 'DUE_TODAY' : 'UPCOMING',
      });
    }
  }
  return rows;
}

/** A few recent payments for loans without hand-written history. */
function buildTransactions(seed: Seed, schedule: Installment[]): Transaction[] {
  return schedule
    .filter((i) => i.status === 'PAID')
    .slice(-4)
    .reverse()
    .map((i, idx) => ({
      id: `${seed.loanId}_t${i.emiNumber}`,
      date: i.dueDate,
      type: 'PAYMENT' as const,
      label: 'Payment',
      mode: idx % 2 === 0 ? ('Online' as const) : ('Cash' as const),
      modeDetail: idx % 2 === 0 ? 'Online NetBanking' : 'Cash at branch counter',
      amount: i.amount,
      referenceNo: idx % 2 === 0 ? `TXN${seed.accountNumber.slice(1)}${i.emiNumber}` : undefined,
      receiptNo: `REC${seed.accountNumber.slice(1)}-${i.emiNumber}`,
    }));
}

function buildLoan(seed: Seed): Loan {
  const schedule = buildSchedule(seed);
  const totalPayable = seed.loanAmount + seed.totalInterest;
  const totalDue =
    totalPayable + seed.lateFee + seed.overdueInterest + seed.recoveryCharges - seed.discount;
  const outstanding = Math.max(0, totalDue - seed.totalPaid);

  let overdueAmount = 0;
  let overdueInstallments = 0;
  for (const i of schedule) {
    if (i.status === 'OVERDUE') {
      overdueAmount += i.amount;
      overdueInstallments += 1;
    } else if (i.status === 'PARTIAL') {
      overdueAmount += i.amount - (i.paidAmount ?? 0);
      overdueInstallments += 1;
    }
  }

  const upcoming = schedule.find((i) => i.status === 'DUE_TODAY' || i.status === 'UPCOMING');
  const status: LoanStatus =
    outstanding === 0 ? 'CLOSED' : overdueAmount > 0 ? 'OVERDUE' : 'ACTIVE';

  return {
    loanId: seed.loanId,
    accountNumber: seed.accountNumber,
    productName: seed.productName,
    status,
    scheme: seed.scheme,
    branch: seed.branch,
    loanDate: seed.loanDate,
    firstEmiDate: seed.firstEmiDate,
    maturityDate: schedule[schedule.length - 1]!.dueDate,
    emiAmount: seed.emiAmount,
    frequency: seed.frequency,
    totalEmis: seed.totalEmis,
    emisPaid: seed.emisPaid,
    lastPayment: seed.lastPayment,
    loanAmount: seed.loanAmount,
    totalInterest: seed.totalInterest,
    totalPayable,
    lateFee: seed.lateFee,
    overdueInterest: seed.overdueInterest,
    recoveryCharges: seed.recoveryCharges,
    discount: seed.discount,
    totalDue,
    totalPaid: seed.totalPaid,
    outstanding,
    overdueAmount,
    overdueInstallments,
    nextDue:
      status !== 'CLOSED' && upcoming
        ? { emiNumber: upcoming.emiNumber, amount: upcoming.amount, date: upcoming.dueDate }
        : undefined,
    paidOnline: seed.paidOnline,
    paidCash: seed.paidCash,
    keyFacts: seed.keyFacts,
    schedule,
    transactions: seed.transactions ?? buildTransactions(seed, schedule),
  };
}

// ---------------------------------------------------------------------------
// Loans
// ---------------------------------------------------------------------------

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

/** Daily loan, overdue: 62 missed EMIs + 1 partial = Rs 75,000 overdue. */
const REGULAR_LOAN = buildLoan({
  loanId: 'ln_demo_a',
  accountNumber: 'A00001',
  productName: 'Regular Loan',
  scheme: 'Regular (daily collection)',
  branch: 'Pune Central Hub',
  frequency: 'Daily',
  loanDate: d(2026, 6, 10),
  firstEmiDate: d(2026, 6, 16),
  emiAmount: 1200,
  totalEmis: 100,
  emisPaid: 32,
  partialPaid: 600,
  loanAmount: 85000,
  totalInterest: 35000,
  lateFee: 2400,
  overdueInterest: 1267,
  recoveryCharges: 500,
  discount: 1000,
  totalPaid: 29000,
  paidOnline: { amount: 24000, count: 26 },
  paidCash: { amount: 5000, count: 6 },
  lastPayment: { date: d(2026, 9, 11), amount: 5000 },
  keyFacts: { apr: '36.5% p.a.', method: 'Reducing balance method' },
  transactions: [
    { id: 't1', date: d(2026, 9, 11), type: 'PAYMENT', label: 'Payment', mode: 'Online', modeDetail: 'Online NetBanking', amount: 5000, referenceNo: 'TXN839102948', receiptNo: 'REC10291-PUN', time: '02:45 PM IST', split: { principal: 3800, interest: 1200, lateFee: 0 } },
    { id: 't2', date: d(2026, 9, 11), type: 'CHARGE', label: 'Late fee', amount: 500 },
    { id: 't3', date: d(2026, 9, 5), type: 'PAYMENT', label: 'Payment', mode: 'Cash', modeDetail: 'Cash at branch counter', amount: 1200, receiptNo: 'REC10244-PUN' },
    { id: 't4', date: d(2026, 8, 28), type: 'PAYMENT', label: 'Payment', mode: 'Online', modeDetail: 'Online UPI', amount: 2000, referenceNo: 'TXN839077120', receiptNo: 'REC10180-PUN' },
    { id: 't5', date: d(2026, 8, 20), type: 'DISCOUNT', label: 'Discount', amount: 1000 },
    { id: 't6', date: d(2026, 8, 14), type: 'PAYMENT', label: 'Payment', mode: 'Online', modeDetail: 'Online NetBanking', amount: 3000, referenceNo: 'TXN838990331', receiptNo: 'REC10122-PUN' },
    { id: 't7', date: d(2026, 8, 1), type: 'CHARGE', label: 'Overdue interest', amount: 1267 },
    { id: 't8', date: d(2026, 7, 25), type: 'PAYMENT', label: 'Payment', mode: 'Cash', modeDetail: 'Cash at branch counter', amount: 2400, receiptNo: 'REC10033-PUN' },
    { id: 't9', date: d(2026, 7, 18), type: 'ADJUSTMENT', label: 'Adjustment', amount: -300 },
    { id: 't10', date: d(2026, 7, 2), type: 'PAYMENT', label: 'Payment', mode: 'Online', modeDetail: 'Online NetBanking', amount: 4000, referenceNo: 'TXN838801245', receiptNo: 'REC09950-PUN' },
  ],
});

/** Monthly loan, on track. */
const TWO_WHEELER_LOAN = buildLoan({
  loanId: 'ln_demo_b',
  accountNumber: 'A00042',
  productName: 'Two-Wheeler Loan',
  scheme: 'Two-wheeler finance',
  branch: 'Pune Central Hub',
  frequency: 'Monthly',
  loanDate: d(2024, 1, 20),
  firstEmiDate: d(2024, 2, 5),
  emiAmount: 1200,
  totalEmis: 48,
  emisPaid: 32,
  loanAmount: 46000,
  totalInterest: 11600,
  lateFee: 0,
  overdueInterest: 0,
  recoveryCharges: 0,
  discount: 0,
  totalPaid: 38400,
  paidOnline: { amount: 30000, count: 25 },
  paidCash: { amount: 8400, count: 7 },
  lastPayment: { date: d(2026, 9, 5), amount: 1200 },
});

/** Monthly loan, fully paid. */
const CLOSED_LOAN = buildLoan({
  loanId: 'ln_demo_c',
  accountNumber: 'D00002',
  productName: 'Monthly Loan',
  scheme: 'Monthly instalment',
  branch: 'Pune Central Hub',
  frequency: 'Monthly',
  loanDate: d(2025, 1, 1),
  firstEmiDate: d(2025, 1, 10),
  emiAmount: 1000,
  totalEmis: 12,
  emisPaid: 12,
  loanAmount: 10000,
  totalInterest: 2000,
  lateFee: 0,
  overdueInterest: 0,
  recoveryCharges: 0,
  discount: 0,
  totalPaid: 12000,
  paidOnline: { amount: 9000, count: 9 },
  paidCash: { amount: 3000, count: 3 },
  lastPayment: { date: d(2025, 12, 10), amount: 1000 },
});

/** Freshly disbursed loan: nothing paid yet, so History is empty. */
const NEW_LOAN = buildLoan({
  loanId: 'ln_demo_d',
  accountNumber: 'A00077',
  productName: 'Business Loan',
  scheme: 'Business working capital',
  branch: 'Pune Central Hub',
  frequency: 'Monthly',
  loanDate: d(2026, 9, 15),
  firstEmiDate: d(2026, 10, 5),
  emiAmount: 2500,
  totalEmis: 12,
  emisPaid: 0,
  loanAmount: 25000,
  totalInterest: 5000,
  lateFee: 0,
  overdueInterest: 0,
  recoveryCharges: 0,
  discount: 0,
  totalPaid: 0,
  paidOnline: { amount: 0, count: 0 },
  paidCash: { amount: 0, count: 0 },
});

const ALL_LOANS: Loan[] = [REGULAR_LOAN, TWO_WHEELER_LOAN, CLOSED_LOAN, NEW_LOAN];

export type LoanScenario = 'multi' | 'one' | 'active_closed' | 'all_closed' | 'none' | 'new_loan';

function pickScenario(): Loan[] {
  switch (process.env.EXPO_PUBLIC_MOCK_LOANS as LoanScenario | undefined) {
    case 'one':
      return [REGULAR_LOAN];
    case 'active_closed':
      return [REGULAR_LOAN, CLOSED_LOAN];
    case 'all_closed':
      return [CLOSED_LOAN];
    case 'none':
      return [];
    case 'new_loan':
      return [NEW_LOAN];
    default:
      return [REGULAR_LOAN, TWO_WHEELER_LOAN, CLOSED_LOAN]; // multi: two active (one overdue) + one closed
  }
}

/** Loans shown on Home for the selected scenario. */
export const PLACEHOLDER_LOANS: Loan[] = pickScenario();

/** Lookup across every placeholder loan (deep links keep working in any scenario). */
export function findPlaceholderLoan(loanId: string): Loan | undefined {
  return ALL_LOANS.find((l) => l.loanId === loanId);
}

export interface HomeSummary {
  activeLoans: Loan[];
  closedLoans: Loan[];
  totalOutstanding: number;
  overdueTotal: number;
  overdueLoanCount: number;
  nextDue?: NextDue & { loanId: string; accountNumber: string };
}

/** Would come from GET /v1/loans `totals`. */
export function summarize(loans: Loan[]): HomeSummary {
  const activeLoans = loans
    .filter((l) => l.status !== 'CLOSED')
    // Overdue first, then soonest next due.
    .sort((a, b) => {
      if ((a.status === 'OVERDUE') !== (b.status === 'OVERDUE')) return a.status === 'OVERDUE' ? -1 : 1;
      return (a.nextDue?.date.getTime() ?? Infinity) - (b.nextDue?.date.getTime() ?? Infinity);
    });
  const closedLoans = loans.filter((l) => l.status === 'CLOSED');

  let nextDue: HomeSummary['nextDue'];
  for (const l of activeLoans) {
    if (l.nextDue && (!nextDue || l.nextDue.date < nextDue.date)) {
      nextDue = { ...l.nextDue, loanId: l.loanId, accountNumber: l.accountNumber };
    }
  }

  return {
    activeLoans,
    closedLoans,
    totalOutstanding: activeLoans.reduce((s, l) => s + l.outstanding, 0),
    overdueTotal: activeLoans.reduce((s, l) => s + l.overdueAmount, 0),
    overdueLoanCount: activeLoans.filter((l) => l.overdueAmount > 0).length,
    nextDue,
  };
}
