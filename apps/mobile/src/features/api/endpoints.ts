/**
 * Typed endpoint functions over the fetch client. Auth endpoints return the raw wire response
 * (the screens branch on `status`); loan endpoints run the adapter so callers receive VMs.
 *
 * Paths carry the FULL `/api/v1` prefix (never `/v1`). `loanRef` is passed through opaque and
 * URL-encoded for the detail path.
 */
import {
  toBorrowerProfileVM,
  toLoanDetailVM,
  toLoanListItemVM,
  toTransactionsPageVM,
} from './adapter';
import { baseUrl } from './config';
import { request } from './client';
import { getDeviceId } from './deviceId';
import { AdapterError, type ApiResult } from './errors';
import { getAccessToken } from './tokenStore';
import type {
  BorrowerProfileVM,
  LoanDetailVM,
  LoanListItemVM,
  TransactionsPageVM,
} from './vm';
import type {
  LoanDetailWire,
  LoansResponseWire,
  LogoutResponse,
  OtpRequestAccepted,
  OtpVerifyResponse,
  TransactionsResponseWire,
  UserProfileWire,
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

/** GET /api/v1/me -> adapted borrower profile VM. */
export async function getProfile(): Promise<ApiResult<BorrowerProfileVM>> {
  const res = await request<UserProfileWire>('/api/v1/me', { auth: true });
  if (!res.ok) return res;
  try {
    return { ok: true, data: toBorrowerProfileVM(res.data) };
  } catch {
    return { ok: false, error: { kind: 'ADAPTER' } };
  }
}

/**
 * GET /api/v1/me/photo -> In-memory JPEG data URI or null if not found (404).
 * Strictly memory-only per API guide: never written to disk or device gallery.
 */
export async function getPhoto(): Promise<ApiResult<string | null>> {
  const origin = baseUrl();
  const url = `${origin}/api/v1/me/photo`;
  const token = getAccessToken();
  if (!token) return { ok: false, error: { kind: 'UNAUTHORIZED', status: 401 } };

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 404) {
      return { ok: true, data: null };
    }
    if (res.status === 401) {
      return { ok: false, error: { kind: 'UNAUTHORIZED', status: 401 } };
    }
    if (!res.ok) {
      return { ok: false, error: { kind: 'SERVER', status: res.status } };
    }

    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    const base64 = btoa(binary);
    return { ok: true, data: `data:image/jpeg;base64,${base64}` };
  } catch {
    return { ok: false, error: { kind: 'NETWORK' } };
  }
}

/** GET /api/v1/loans/{loanRef}/transactions?page=X&pageSize=Y */
export async function getTransactions(
  loanId: string,
  page = 1,
  pageSize = 50,
): Promise<ApiResult<TransactionsPageVM>> {
  const query = `page=${page}&pageSize=${pageSize}`;
  const res = await request<TransactionsResponseWire>(
    `/api/v1/loans/${encodeURIComponent(loanId)}/transactions?${query}`,
    { auth: true },
  );
  if (!res.ok) return res;
  try {
    return { ok: true, data: toTransactionsPageVM(res.data) };
  } catch {
    return { ok: false, error: { kind: 'ADAPTER' } };
  }
}
