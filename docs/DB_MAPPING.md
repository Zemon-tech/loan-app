# DB mapping (HUMAN to fill in)

Agents MUST NOT guess these values. Leave `TBD` until a human maps the client's
MySQL schema. Source: PRD Section 14.3.

| Needed data | Table.column | Notes |
|---|---|---|
| Customer id | TBD | |
| Customer full name | TBD | |
| Customer primary mobile | TBD | format? (+91, spaces?) |
| Customer city/area | TBD | optional |
| Loan id (internal) | TBD | |
| Loan account number (e.g. A04391) | TBD | |
| Scheme/product name | TBD | |
| Loan date | TBD | |
| First installment (interest) date | TBD | |
| Principal | TBD | |
| Total interest | TBD | |
| Payable amount | TBD | |
| EMI amount | TBD | |
| Pay frequency | TBD | map to enum |
| Total installments (tenure) | TBD | |
| Weekly off | TBD | optional |
| Maturity date | TBD | may be unset |
| Branch name | TBD | |
| Internal loan status | TBD | map to ACTIVE/OVERDUE/CLOSED |
| Late fee | TBD | |
| Overdue interest charge | TBD | |
| Recovery visit charges | TBD | |
| Discount / offer | TBD | |
| Payment adjusted | TBD | |
| Installments paid / credited total | TBD | |
| Transactions (date, amount, mode, ref, receipt) | TBD | |
| Installment schedule table (if any) | TBD | Q3 |
