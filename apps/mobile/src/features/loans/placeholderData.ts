/**
 * PLACEHOLDER data for the prototype only. Values mirror the shapes we'll get from
 * the API (PRD 10.3) but are static and fake.
 *
 * TODO (F-05 / F-06): delete this and source data from the mock/live API adapter,
 * deriving schedule/summary via @app/shared computeSchedule.
 */
import type { BadgeStatus } from '@/components/ui';

export interface PlaceholderLoan {
  loanId: string;
  accountNumber: string;
  productName: string;
  status: BadgeStatus;
  outstandingDisplay: string; // formatted via @app/shared formatINR in the real app
  progressText: string;
  progressRatio: number; // 0..1 for the bar
  nextDueText: string;
}

export const PLACEHOLDER_LOANS: PlaceholderLoan[] = [
  {
    loanId: 'ln_demo_a',
    accountNumber: 'A00001',
    productName: 'Regular',
    status: 'OVERDUE',
    outstandingDisplay: '\u20B994,167',
    progressText: '32 of 100 EMIs paid',
    progressRatio: 0.32,
    nextDueText: 'Next due: \u20B91,200 today',
  },
  {
    loanId: 'ln_demo_b',
    accountNumber: 'D00002',
    productName: 'Monthly',
    status: 'CLOSED',
    outstandingDisplay: '\u20B90',
    progressText: '12 of 12 EMIs paid',
    progressRatio: 1,
    nextDueText: 'Fully paid',
  },
];

export function findPlaceholderLoan(loanId: string): PlaceholderLoan | undefined {
  return PLACEHOLDER_LOANS.find((l) => l.loanId === loanId);
}
