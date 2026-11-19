# Borrower API: guide for Android developers

This API lets borrowers log in with a one-time password (OTP), see their name and photo, and view their active loans.

- Base URL: provided separately for each environment.
- Transport: HTTPS only. Plain HTTP is refused.
- Format: JSON requests and responses, with field names in camelCase.
- Dates: `yyyy-MM-dd` in requests. Responses use ISO 8601.
- Amounts: numbers in Indian rupees.

## Login flow

1. The borrower enters their mobile number. Call `POST /api/v1/auth/otp/request`.
2. They receive a 6-digit OTP on WhatsApp, valid for 5 minutes and usable once.
3. Call `POST /api/v1/auth/otp/verify` with the mobile number, OTP and device ID.
4. If the reply has status `date_of_birth_required`, ask for their date of birth and repeat step 3 with the same OTP and `dateOfBirth`.
5. Store both tokens securely. Send the access token on every loan request.
6. When a request returns 401 with the header `Token-Expired: true`, call `POST /api/v1/auth/token/refresh`, then retry the request once.
7. If the refresh fails, delete both tokens and return to the login screen.

## Authentication endpoints

### POST /api/v1/auth/otp/request

```json
{ "mobileNumber": "9876543210" }
```

| Response | Meaning |
|---|---|
| `202` `{"status":"otp_sent_if_registered"}` | Show "If this number is registered, you'll receive a code on WhatsApp." |
| `400` | Invalid mobile number |
| `429` | Too many requests |

The reply is the same whether or not the number is registered, so never tell the user that a code was definitely sent.

Limits: one request per number every 60 seconds, and three per hour.

### POST /api/v1/auth/otp/verify

```json
{
  "mobileNumber": "9876543210",
  "otp": "123456",
  "deviceId": "stable-per-install-id",
  "dateOfBirth": "1990-05-21"
}
```

`dateOfBirth` is only needed when the API asks for it. `deviceId` must be 8 to 100 characters. Generate a random ID on first launch and keep it for that install, and do not use a hardware identifier.

Success:

```json
{
  "status": "authenticated",
  "accessToken": "eyJ...",
  "expiresInSeconds": 900,
  "refreshToken": "4f1c....AbCd"
}
```

Date of birth needed (OTP is correct and has not been used up):

```json
{ "status": "date_of_birth_required", "expiresInSeconds": 0 }
```

| Response | Meaning |
|---|---|
| `200` | See `status` above |
| `401` `{"error":"invalid_otp"}` | Wrong, expired or already used OTP, or wrong date of birth |
| `400` | Invalid request |
| `429` | Too many requests |

Three wrong attempts lock the number for 15 minutes. During the lock, even a correct OTP returns `invalid_otp`, and no new OTP is sent. Show one message for all of these cases.

### POST /api/v1/auth/token/refresh

```json
{ "refreshToken": "4f1c....AbCd", "deviceId": "stable-per-install-id" }
```

Returns the same success body as verify.

Each refresh token works once. Save the new one before using the new access token. If an old refresh token is sent, the session ends at once and the borrower must log in again. Make sure two refresh calls can never run at the same time, for example by using a single lock around refresh in your network layer.

Refresh tokens last 30 days from last use, and a session lasts 90 days at most.

### POST /api/v1/auth/logout

Needs `Authorization: Bearer <accessToken>`. Returns `200` `{"status":"logged_out"}`. Delete both tokens afterwards.

## Profile endpoints

Both need `Authorization: Bearer <accessToken>`, and count towards the same 60-a-minute limit as the loan endpoints. They always return the logged-in borrower's own details. Neither takes an id.

### GET /api/v1/me

```json
{ "name": "Ramesh Kumar", "hasPhoto": true }
```

`name` is the borrower's full name as recorded by the lender.

### GET /api/v1/me/photo

Returns the borrower's photo as `image/jpeg`, at most 400 × 400 px. Returns `404` when there is no photo, so only call it when `hasPhoto` is `true`, and show a placeholder otherwise.

- Load the image with the same `Authorization` header, for example through an OkHttp interceptor in Coil or Glide. The photo has no public URL.
- The response is marked `no-store`. Keep it in memory only: don't let the image library write it to its disk cache, and don't save it to the gallery or app storage.
- The photo is updated within about an hour after the lender changes it. Fetch it again after each login.

## Loan endpoints

All three need `Authorization: Bearer <accessToken>`, and share a limit of 60 requests a minute per session.

### GET /api/v1/loans

```json
{
  "loans": [
    {
      "loanRef": "x7Kq2mVbT9sLw3RnYc1DfA",
      "accountNumber": "LN-1042",
      "status": "Active",
      "installmentAmount": 500.00,
      "outstandingAmount": 18250.00,
      "overdueAmount": 1000.00
    }
  ]
}
```

### GET /api/v1/loans/{loanRef}

```json
{
  "startDate": "2026-04-01T00:00:00",
  "maturityDate": "2026-10-31T00:00:00",
  "paymentFrequency": "Daily",
  "financedAmount": 50000.00,
  "totalPaid": 37500.00,
  "loanRef": "x7Kq2mVbT9sLw3RnYc1DfA",
  "accountNumber": "LN-1042",
  "status": "Active",
  "installmentAmount": 500.00,
  "outstandingAmount": 18250.00,
  "overdueAmount": 1000.00,
  "loanDate": "2026-03-30T00:00:00",
  "numberOfInstallments": 120,
  "weeklyOff": "Sunday",
  "nextCollectionDate": null,
  "installmentsOverdue": 2,
  "lastPayment": { "amount": 500.00, "date": "2026-06-14T00:00:00" },
  "disbursal": {
    "loanAmount": 50000.00,
    "serviceCharges": 1000.00,
    "verificationCharges": 500.00,
    "advanceInstallment": 500.00,
    "previousLoanAdjustment": 0.00,
    "totalDeductions": 2000.00,
    "amountDisbursed": 48000.00
  },
  "dues": {
    "installmentsDue": 38000.00,
    "lateFees": 500.00,
    "overdueInterest": 0.00,
    "recoveryVisitCharges": 0.00,
    "discount": 0.00,
    "totalDue": 38500.00,
    "installmentPayments": 36500.00,
    "advanceInstallment": 500.00,
    "adjustments": 500.00,
    "totalPaid": 37500.00,
    "overdueAmount": 1000.00
  },
  "settlement": null
}
```

Treat `loanRef` as an opaque value from the list call. Do not parse it, or store it across logins. A loan that doesn't exist, isn't active or belongs to someone else returns `404`.

The fields from `loanDate` onwards were added on 2026-11-18. The earlier fields are unchanged, so existing app versions keep working. Ignore any field you don't recognise, because more may be added later.

| Field | Meaning |
|---|---|
| `startDate` | When installments start being counted. `loanDate` is the day the loan was given. |
| `weeklyOff` | Day with no collection, or `null` |
| `nextCollectionDate` | Weekly loans only; `null` for daily and monthly |
| `installmentsOverdue` | `overdueAmount` divided by the installment, rounded to a whole number |
| `lastPayment` | Latest installment payment, or `null` if none yet |
| `disbursal` | Loan amount, what was deducted from it, and what the borrower received |
| `dues.totalDue` | Due so far: `installmentsDue + lateFees + overdueInterest + recoveryVisitCharges - discount` |
| `dues.totalPaid` | `installmentPayments + advanceInstallment + adjustments`; always equals `totalPaid` |
| `dues.overdueAmount` | `totalDue - totalPaid`, or `0` when paid ahead; always equals `overdueAmount` |
| `settlement` | `null` unless a settlement has been agreed (see below) |

When a settlement has been agreed:

```json
"settlement": {
  "settlementDate": "2026-09-01T00:00:00",
  "settlementAmount": 12000.00,
  "paymentFrequency": "Weekly",
  "installmentAmount": 1000.00,
  "paidSinceSettlement": 4000.00,
  "balance": 8000.00
}
```

`paymentFrequency` and `installmentAmount` are `null` when the settlement is a single payment. `balance` is `settlementAmount - paidSinceSettlement`.

### GET /api/v1/loans/{loanRef}/transactions?page=1&pageSize=50

The loan's transactions, newest first. `page` starts at 1 and defaults to 1. `pageSize` defaults to 50, with a maximum of 100. Out-of-range or non-numeric values return `400`. A page past the end returns an empty list.

```json
{
  "page": 1,
  "pageSize": 50,
  "totalCount": 214,
  "totalPages": 5,
  "totalCredit": 37500.00,
  "totalDebit": 50500.00,
  "transactions": [
    {
      "date": "2026-06-14T00:00:00",
      "type": "installment_payment",
      "description": "Installment payment",
      "direction": "credit",
      "amount": 500.00,
      "paymentMode": "UPI",
      "channel": "Online"
    },
    {
      "date": "2026-06-10T00:00:00",
      "type": "late_fee",
      "description": "Late fee",
      "direction": "debit",
      "amount": 100.00,
      "paymentMode": null,
      "channel": null
    }
  ]
}
```

`totalCount`, `totalCredit` and `totalDebit` cover every page, not just the one returned. `direction` is `credit` for money paid or credited to the loan, and `debit` for amounts charged or given. `paymentMode` (`Cash`, `Bank`, `Wallet`, `UPI`, `Other`) and `channel` (`Agent`, `Office`, `Online`) are set for payments only, and are `null` for other rows.

Use `description` for display, and `type` for logic or icons:

| `type` | Direction | Counts towards |
|---|---|---|
| `installment_payment` | credit | `dues.installmentPayments` |
| `advance_installment` | credit | `dues.advanceInstallment` (first installment taken at disbursal) |
| `adjustment_received` | credit | `dues.adjustments` (moved from another of the borrower's loans) |
| `discount` | credit | `dues.discount` |
| `principal_repayment` | credit | Principal on interest-only loans |
| `late_fee` | debit | `dues.lateFees` |
| `overdue_interest` | debit | `dues.overdueInterest` |
| `recovery_visit_charge` | debit | `dues.recoveryVisitCharges` |
| `loan_disbursed` | debit | The loan amount paid out |
| `additional_loan` | debit | Extra principal on interest-only loans |
| `previous_loan_adjustment` | debit | Part of this loan used to clear an earlier loan |
| `other` | either | Rare; show the description |

The rows reconcile with the loan: for example, `installment_payment` + `advance_installment` + `adjustment_received` rows add up to `totalPaid`. Fetch all pages if you add rows up in the app. On interest-only loans, overdue interest and visit charges are not part of `dues`, so always show the `dues` figures from the API rather than recalculating them.

## Errors

| Status | Meaning | App action |
|---|---|---|
| `400` | Invalid request | Fix the input |
| `401` | Not logged in, or OTP rejected | Refresh if `Token-Expired: true`, otherwise log in |
| `403` | Sent over HTTP | Use HTTPS |
| `404` | Not found | Show "loan not found" and reload the list |
| `429` | Too many requests | Wait, and don't retry automatically in a loop |
| `500` | Server error | Show a generic message and retry later |

Error bodies look like `{"error":"code"}`. A `401` for a missing token has `{"message":"..."}` instead, so rely on the status code.

## Security requirements for the app

These are required before the app can go live.

- Token storage: keep tokens only in encrypted storage backed by Android Keystore. Never use plain SharedPreferences, files or the SQLite database.
- Certificate pinning: pin the API's public key, with a backup pin, so an expired certificate can't lock users out.
- Network: block cleartext traffic in `network_security_config.xml`, and don't trust user-installed certificates.
- Logging: never log tokens, OTPs, mobile numbers or loan details, including in crash reports and analytics.
- Screens: set `FLAG_SECURE` on screens that show loan details, the borrower's name or photo, and exclude tokens from Android backup.
- Release builds: turn on code shrinking and obfuscation, and turn off debug logging.
- Device integrity: use the Play Integrity API. Warn or block on rooted or tampered devices, as agreed with the lender.
- No embedded secrets: nothing built into the app is secret, because an APK can be unpacked. This API needs no API key.

## Test environment

Use only the test environment and test borrowers provided to you. Test data is masked. Do not use real customer details in testing, screenshots or support tickets.
