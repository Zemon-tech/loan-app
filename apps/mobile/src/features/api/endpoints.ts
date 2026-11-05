/**
 * Typed endpoint functions over the fetch client. Auth endpoints return the raw wire response
 * (the screens branch on `status`); loan endpoints run the adapter so callers receive VMs.
 *
 * Paths carry the FULL `/api/v1` prefix (never `/v1`). `loanRef` is passed through opaque and
 * URL-encoded for the detail path.
 */
import { toLoanDetailVM, toLoanListItemVM } from './adapter';
import { request } from './client';
import { getDeviceId } from './deviceId';
import { AdapterError, type ApiResult } from './errors';
import type { LoanDetailVM, LoanListItemVM } from './vm';
import type {
  LoanDetailWire,
  LoansResponseWire,
  LogoutResponse,
  OtpRequestAccepted,
  OtpVerifyResponse,
} from './wireTypes';

/** POST /api/v1/auth/otp/request */
export function otpRequest(mobileNumber: string): Promise<ApiResult<OtpRequestAccepted>> {
  return request<OtpRequestAccepted>('/api/v1/auth/otp/request', {
    method: 'POST',
    body: { mobileNumber },
  });
}

/** POST /api/v1/auth/otp/verify. `dateOfBirth` (yyyy-MM-dd) only when the API asked for it. */
export async function otpVerify(args: {
  mobileNumber: string;
  otp: string;
  dateOfBirth?: string;
}): Promise<ApiResult<OtpVerifyResponse>> {
  const deviceId = await getDeviceId();
  return request<OtpVerifyResponse>('/api/v1/auth/otp/verify', {
    method: 'POST',
    body: {
      mobileNumber: args.mobileNumber,
      otp: args.otp,
      deviceId,
      ...(args.dateOfBirth ? { dateOfBirth: args.dateOfBirth } : {}),
    },
  });
}

/** POST /api/v1/auth/logout (best effort). Requires the bearer access token. */
export function logout(): Promise<ApiResult<LogoutResponse>> {
  return request<LogoutResponse>('/api/v1/auth/logout', { method: 'POST', auth: true });
}

/** GET /api/v1/loans -> adapted list VMs. */
export async function getLoans(): Promise<ApiResult<LoanListItemVM[]>> {
  const res = await request<LoansResponseWire>('/api/v1/loans', { auth: true });
  if (!res.ok) return res;
  try {
    const loans = Array.isArray(res.data?.loans) ? res.data.loans : [];
    return { ok: true, data: loans.map(toLoanListItemVM) };
  } catch (e) {
    if (e instanceof AdapterError) return { ok: false, error: { kind: 'ADAPTER' } };
    return { ok: false, error: { kind: 'ADAPTER' } };
  }
}

/** GET /api/v1/loans/{loanRef} -> adapted detail VM. `loanId` is the opaque loanRef. */
export async function getLoan(loanId: string): Promise<ApiResult<LoanDetailVM>> {
  const res = await request<LoanDetailWire>(`/api/v1/loans/${encodeURIComponent(loanId)}`, {
    auth: true,
  });
  if (!res.ok) return res;
  try {
    return { ok: true, data: toLoanDetailVM(res.data) };
  } catch (e) {
    if (e instanceof AdapterError) return { ok: false, error: { kind: 'ADAPTER' } };
    return { ok: false, error: { kind: 'ADAPTER' } };
  }
}
