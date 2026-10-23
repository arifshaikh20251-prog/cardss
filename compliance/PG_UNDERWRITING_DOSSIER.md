# Payment Gateway Merchant Underwriting & Regulatory Compliance Dossier
**Platform:** UtilityPay (B2B Commercial Invoicing & Real Estate Settlement Intermediary)  
**Target Gateways:** Cashfree Payments India Pvt. Ltd. / Easebuzz Private Limited  
**Document Classification:** Confidential — Merchant Underwriting, Risk Governance & AML Audit  
**Version:** 2.0 (Production Live Release)  
**Effective Date:** October 2026  

---

## 1. Executive Summary & Corporate Classification

### 1.1 Business Overview & Operating Model
**UtilityPay** operates as a specialized B2B commercial settlement intermediary facilitating verified business-to-business vendor payments, commercial office lease transfers, and statutory utility settlements using commercial and corporate credit instruments. 

The platform connects verified corporate entities and registered business proprietors directly to authenticated vendor bank accounts via RBI-regulated payment aggregator and banking rails (IMPS / NEFT / RTGS). All transactions settle through scheduled escrow/nodal accounts with zero peer-to-peer or circular cash recycling.

### 1.2 Statutory Merchant Category Codes (MCC)
In accordance with international card network classification guidelines (Visa, MasterCard, RuPay) and Reserve Bank of India (RBI) payment intermediary regulations, UtilityPay operates strictly under the following merchant categories:

| Statutory Code | Classification Description | Permitted Transaction Types |
|---|---|---|
| **MCC 6513** | **Real Estate Agents, Managers & Commercial Leases** | Corporate office rent, commercial warehouse leases, co-working space payments, and verified commercial facility charges. |
| **MCC 7399** | **Business Services (Not Elsewhere Classified)** | Verified vendor invoices, professional B2B services, hardware/IT supplier bills, logistics, and corporate utility settlements. |

### 1.3 Statutory Goods and Services Tax (GST) Classification
- **Services Accounting Code (SAC):** **SAC 9971** (*Financial and Related Services — Banking, Financial Intermediation, and Credit Processing*).
- **Statutory GST Rate:** **18.00%** (split into 9% CGST + 9% SGST for intra-state settlements, or 18% IGST for inter-state settlements).
- **Invoicing Automation:** Computerized GST Tax Invoices and B2B Commercial Settlement Vouchers compliant with **Rule 46 of the CGST Rules, 2017** are generated instantly for each transaction.

---

## 2. Risk Management & Anti-Money Laundering (AML) Guardrails

To strictly protect acquiring banks, partner payment aggregators, and credit card issuers from fraud, merchant cash advances, card cycling, and stolen card liquidation, UtilityPay enforces automated risk algorithms:

### 2.1 Anti-Self-Transfer & Card Recycling Barrier (AML Rule 101)
- **Mandatory PAN & Account Cross-Check:** The platform strictly forbids self-transfers. When an authenticated payer attempts to add or pay a beneficiary whose Permanent Account Number (PAN) or bank account number matches the payer's KYC records, the transaction is rejected instantly at the API level with error code `AML_SELF_TRANSFER_PROHIBITED`.
- **Fuzzy Name Similarity Engine:** The system executes Levenshtein distance and token-sort similarity scoring between the payer's verified legal name and the payee's bank account holder name. Any match exceeding **80% similarity** is automatically flagged and blocked to eliminate circular money movement.

### 2.2 Statutory 24-Hour Cooling-Off Window
- **New Beneficiary & Card Quarantine:** For any unverified beneficiary or initial transaction, funds are captured securely into the gateway escrow but held in a statutory **24-Hour Cooling-Off Window** (`IN_COOLING` status).
- **Mitigation of Account Takeovers:** This hold prevents flash liquidation of stolen cards or compromised credentials, providing cardholders and issuers a 24-hour dispute buffer before funds disburse to external bank accounts.
- **Automated Cooling Worker:** The background cooling worker (`src/services/coolingWorker.js`) continuously audits hold expirations and only releases payouts after the 24-hour statutory period has cleared without disputes.

### 2.3 Automated Digital B2B Settlement Vouchers (Section 65B IT Act)
- When a business customer initiates a recurring commercial lease payment or advance supplier transfer without an external PDF invoice attached, UtilityPay's compliance engine automatically drafts and seals a **Commercial Payment Declaration & Settlement Voucher** (`src/services/invoiceService.js`).
- **Electronic Certificate:** Certified under **Section 65B of the Indian Information Technology Act, 2000**, recording:
  - Corporate Payer Legal Name, Registered Address & Masked PAN
  - Payee Bank IFSC, Masked Account Number & Beneficiary Name
  - Bank IMPS Core Banking UTR confirmation
  - Statutory PMLA compliance declaration and non-repudiation audit hash

### 2.4 Transaction Ticket Caps & Velocity Guardrails
- **Single Ticket Cap:** Hard limit of **₹25,000.00** per individual transaction to limit single-event exposure.
- **Velocity Limiters:** 
  - Maximum **5 OTP requests per 10 minutes** per IP/Mobile.
  - Maximum **20 transaction initiations per hour** per User/IP.
  - Rate limiting enforced via multi-tiered reverse-proxy shield (`src/middleware/rateLimiter.js`).

---

## 3. Regulatory Dual-KYC Framework

All corporate customers undergo strict digital identity verification before achieving instant settlement privileges:

```
[ Payer Registration ]
        │
        ▼
[ Step 1: NSDL PAN Verification ] ──► Instant PAN status check against CBDT / NSDL database
        │
        ▼
[ Step 2: UIDAI Aadhaar e-KYC ]   ──► OTP-based Aadhaar verification with timestamped digital record
        │
        ▼
[ Penny-Drop Bank Verification ]  ──► Re. 1 NPCI IMPS penny-drop verifies beneficiary name & active status
        │
        ▼
[ Tier 1 Verified Business ]      ──► Full access to commercial settlement & instant payout routing
```

1. **NSDL PAN Verification:** Real-time algorithmic validation of the 10-character alphanumeric PAN format and entity status.
2. **UIDAI Aadhaar e-KYC:** Multi-factor OTP authentication with audit logging.
3. **Penny-Drop Bank Verification:** 1-rupee IMPS handshake validates bank account existence and verifies account title before any payment can be submitted.

---

## 4. Live Production URL Directory & Verification Links

All compliance disclosures, policies, API services, and client applications are live, SSL-encrypted (TLS 1.3), and accessible for underwriting inspection:

| Compliance Resource | Live Production URL | Inspection Purpose |
|---|---|---|
| **Compliance Homepage** | [https://eshopcity.in](https://eshopcity.in) | Merchant business portal & commercial product overview |
| **Terms of Service & AML Policy** | [https://eshopcity.in/terms.html](https://eshopcity.in/terms.html) | B2B statutory terms, AML policies, MCC restrictions & prohibited items |
| **Privacy & Data Security Policy** | [https://eshopcity.in/privacy.html](https://eshopcity.in/privacy.html) | DPDP Act 2023 compliance, 256-bit encryption & data retention |
| **Refund & Cancellation Policy** | [https://eshopcity.in/refund.html](https://eshopcity.in/refund.html) | T+2 settlement reversals, cooling cancellations & failed payment policies |
| **Customer Grievance & Contact** | [https://eshopcity.in/contact.html](https://eshopcity.in/contact.html) | Grievance Officer details, phone, email & registered office address |
| **Production Client PWA** | [https://cardss-gilt.vercel.app](https://cardss-gilt.vercel.app) | Production Next.js 14 web app & Cashfree drop-in checkout |
| **Production API Health Diagnostic** | [https://api.eshopcity.in/api/health](https://api.eshopcity.in/api/health) | Live REST API status, Node.js runtime & database connectivity |
| **Live Promotional Coupons** | [https://api.eshopcity.in/api/coupons](https://api.eshopcity.in/api/coupons) | Live Tiered Coupons (`SAVE10`, `SAVE25`, `SAVE50`, `REF15`, `REF25`) |
| **Client PWA Web Manifest** | [https://cardss-gilt.vercel.app/manifest.json](https://cardss-gilt.vercel.app/manifest.json) | Standalone PWA installable manifest |

---

## 5. Technical Infrastructure & Webhook Security Architecture

```
                                  [ Corporate Payer ]
                                           │
                                           ▼ (HTTPS / TLS 1.3)
                       [ Next.js 14 Client PWA (Vercel Global CDN) ]
                                           │
                                           ▼ (REST API / Bearer JWT)
                [ Express.js Core Engine (Hostinger Phusion Passenger) ]
                  ├── Multi-Tiered Rate Limiter Shield (IP / User)
                  ├── AML Anti-Self-Transfer Rules Engine
                  ├── SAC 9971 Tax Calculation (18% GST Split)
                  └── Section 65B PDFKit Vector Invoicing
                               │                       │
                               ▼                       ▼
            [ Cashfree / Easebuzz Gateway ]    [ Supabase PostgreSQL ]
              (Drop-in Web SDK v3.0)              (Multi-AZ Cloud Ledger)
                               │
               HMAC-SHA256 Webhook Callback
               (x-webhook-signature / timestamp)
                               │
                               ▼
            [ Automated Payout Settlement Engine ]
                               │
                               ▼ (IMPS / NEFT Rail)
                      [ Beneficiary Bank Account ]
```

### 5.1 HMAC-SHA256 Webhook Verification
- Webhook callbacks from payment gateways are validated using **HMAC-SHA256** signatures (`x-webhook-signature` header) computed over `timestamp + rawBody`.
- A strict **300-second timestamp tolerance** prevents replay attacks.
- Webhook endpoints (`/api/transactions/pg-webhook`) bypass standard client rate limiters to guarantee 100% callback delivery without dropped events.

### 5.2 RBI 5-Year Digital Audit Trail
Under RBI Master Directions on Payment Intermediaries and Prevention of Money Laundering Act (PMLA) requirements, every transaction, status transition, cooling release, and user action is logged with client IP, User-Agent fingerprint, and ISO timestamp into immutable audit ledgers (`src/middleware/auditLogger.js`).

---

## 6. Corporate Contact & Grievance Redressal Officer

In compliance with the **Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021** and RBI Consumer Protection Directives:

- **Corporate Entity:** UtilityPay / EshopCity Technologies
- **Registered Office:** Suite 404, Tech Park, Outer Ring Road, Bangalore, Karnataka - 560103, India
- **Compliance & Grievance Officer:** Shrikant Verma
- **Official Compliance Email:** `grievance@utilitypay.in` / `compliance@eshopcity.in`
- **Customer Helpline:** `+91-80-4920-1122` (Mon-Fri, 9:30 AM to 6:30 PM IST)
- **Settlement Discrepancy Escalation:** `nodal-desk@utilitypay.in`

---

## 7. Merchant Statutory Declaration

We hereby solemnly declare and affirm that:
1. UtilityPay does not engage in, facilitate, or settle any transactions related to prohibited goods or services, including but not limited to gambling, lottery, multi-level marketing, virtual digital assets/cryptocurrencies, or peer-to-peer personal loans.
2. All card-acquired funds are utilized strictly for the bona fide settlement of designated B2B commercial invoices, vendor supplies, or commercial leases.
3. Our operational systems, AML guardrails, and customer verification processes meet or exceed all applicable RBI regulations and payment aggregator onboarding standards.

**Authorized Signatory:**  
*Principal Compliance & Risk Engineering Directorate*  
*UtilityPay B2B Financial Systems*
