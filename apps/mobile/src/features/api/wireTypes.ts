/**
 * WIRE types — hand-authored to mirror contracts/openapi.yaml exactly (no codegen pipeline
 * exists in the repo; hand-written types stay traceable to the contract).
 *
 * These are the shapes that travel on the wire per docs/api-guide.md: camelCase, rupee-decimal
 * `number` amounts, ISO-8601 `string` datetimes, title-case status/frequency labels, opaque
 * `loanRef`. They are DELIBERATELY DISTINCT from the @app/shared domain types; the adapter
 * (adapter.ts) bridges wire -> domain. Nothing below is persisted; `loanRef` is opaque.
 */

export interface OtpRequestBody {
  mobileNumber: string;
}

export interface OtpRequestAccepted {
  status: 'otp_sent_if_registered';
}

export interface OtpVerifyBody {
  mobileNumber: string;
  otp: string;
  deviceId: string;
  dateOfBirth?: string; // yyyy-MM-dd
}

export interface AuthSuccess {
  status: 'authenticated';
  accessToken: string;
  expiresInSeconds: number; // advisory only; never drives a proactive refresh
  refreshToken: string;
}

export interface DobRequired {
  status: 'date_of_birth_required';
  expiresInSeconds: 0;
}

export type OtpVerifyResponse = AuthSuccess | DobRequired;

export interface RefreshBody {
  refreshToken: string;
  deviceId: string;
}

export interface LogoutResponse {
  status: 'logged_out';
}

export interface LoanWire {
  loanRef: string;
  accountNumber: string;
  status: string; // title-case label; normalized in the adapter
  installmentAmount: number; // rupees
  outstandingAmount: number; // rupees
  overdueAmount: number; // rupees
}

export interface LoanDetailWire extends LoanWire {
  startDate: string; // ISO-8601 datetime
  maturityDate: string; // ISO-8601 datetime
  paymentFrequency: string; // title-case label; normalized in the adapter
  financedAmount: number; // rupees
  totalPaid: number; // rupees
}

export interface LoansResponseWire {
  loans: LoanWire[];
}

export interface ErrorBody {
  error: string;
}

export interface MissingTokenBody {
  message: string;
}
