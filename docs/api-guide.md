# Borrower API: guide for Android developers

This API lets borrowers log in with a one-time password (OTP) and view their active loans.

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

## Loan endpoints

Both need `Authorization: Bearer <accessToken>`, and are limited to 60 requests a minute per session.

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
  "overdueAmount": 1000.00
}
```

Treat `loanRef` as an opaque value from the list call. Do not parse it, or store it across logins. A loan that doesn't exist, isn't active or belongs to someone else returns `404`.

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
- Screens: set `FLAG_SECURE` on screens that show loan details, and exclude tokens from Android backup.
- Release builds: turn on code shrinking and obfuscation, and turn off debug logging.
- Device integrity: use the Play Integrity API. Warn or block on rooted or tampered devices, as agreed with the lender.
- No embedded secrets: nothing built into the app is secret, because an APK can be unpacked. This API needs no API key.

## Test environment

Use only the test environment and test borrowers provided to you. Test data is masked. Do not use real customer details in testing, screenshots or support tickets.
