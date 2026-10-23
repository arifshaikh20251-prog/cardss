# UtilityPay B2B Fintech Platform • Production Master Launch Manual
**Document Version:** `1.0.0`  
**Classification:** Operational Handover / Runbook  
**Target Infrastructure:** Hostinger Cloud Node.js Rails (Production) & Vercel Edge Network (PWA)  
**System Architecture:** SAC 9971 B2B Commercial Invoicing, Statutory Rental Payouts, Dual-Mode PG (Cashfree / Mock), & Real-Time AML Risk Engine

---

## 1. Live Production Infrastructure Directory

The platform is deployed across high-availability cloud infrastructure with isolated frontend, backend API, static legal compliance, and cloud database tiers.

### 1.1 Web Applications & Public Endpoints

| Resource | Live Production URL | Description | Hosting Provider |
| :--- | :--- | :--- | :--- |
| **Client Web Application** | [https://cardss-gilt.vercel.app](https://cardss-gilt.vercel.app) | Progressive Web App (Next.js 14) with offline service workers, responsive mobile shell, and CRED-grade UI | Vercel Edge Network |
| **Merchant Compliance Site** | [https://eshopcity.in](https://eshopcity.in) | Master statutory landing page showcasing commercial leasing & vendor invoicing solutions | Hostinger Apache |
| **Production API Base** | [https://api.eshopcity.in](https://api.eshopcity.in) | Express.js REST API with Phusion Passenger process management | Hostinger Cloud VPS |
| **API Health & Diagnostics** | [https://api.eshopcity.in/api/health](https://api.eshopcity.in/api/health) | Real-time service status, database connectivity, and mock mode indicator | Hostinger Cloud VPS |
| **Public Coupon Engine** | [https://api.eshopcity.in/api/coupons](https://api.eshopcity.in/api/coupons) | Publicly queryable list of active commercial promotional discount codes | Hostinger Cloud VPS |
| **Fee Calculator Sandbox** | [https://api.eshopcity.in/api/health/fee-preview?amount=50000](https://api.eshopcity.in/api/health/fee-preview?amount=50000) | Instant GST (18%) and platform fee breakdown verification | Hostinger Cloud VPS |

### 1.2 Statutory Compliance & AML Policy Directory

Mandatory legal documentation compliant with RBI Master Directions, IT Act 2000, and PMLA (Prevention of Money Laundering Act):

| Policy Document | Live URL | Legal Scope |
| :--- | :--- | :--- |
| **Terms of Service & AML Policy** | [https://eshopcity.in/terms.html](https://eshopcity.in/terms.html) | B2B payment facilitator terms, Anti-Self-Transfer declarations, and KYC mandates |
| **Privacy Policy** | [https://eshopcity.in/privacy.html](https://eshopcity.in/privacy.html) | DPDP Act 2023 compliance, 256-bit encryption disclosures, and data retention |
| **Cancellation & Refund Policy** | [https://eshopcity.in/refund.html](https://eshopcity.in/refund.html) | T+1 IMPS banking reversal protocols and statutory cooling-off rules |
| **Grievance Redressal Desk** | [https://eshopcity.in/contact.html](https://eshopcity.in/contact.html) | Contact details of Grievance Officer, nodal escalation desk, and physical address |

### 1.3 Hostinger Server Configuration & File Paths

*   **Primary Host / IP:** `145.223.17.217`
*   **SSH / SFTP Port:** `65002`
*   **SSH Username:** `u392055965`
*   **Backend Node.js API Root:** `/home/u392055965/domains/eshopcity.in/public_html/api`
*   **Compliance Static Site Root:** `/home/u392055965/domains/eshopcity.in/public_html`
*   **Application Server:** Apache 2.4 with Phusion Passenger Engine (`passenger_nodejs`)
*   **Hot Restart Sentinel File:** `/home/u392055965/domains/eshopcity.in/public_html/api/tmp/restart.txt`
*   **Database Tier:** Supabase Managed PostgreSQL with Row-Level Security (RLS) and automatic fallback to thread-safe in-memory store.

---

## 2. Day-to-Day Operations Guide

### 2.1 Accessing the Admin Operations Center (`/admin`)

The Admin Center provides operational control over platform liquidity, 24-hour statutory cooling releases, transaction ledgers, and live gateway diagnostics.

1.  **Direct Browser URL:**  
    Navigate to [https://cardss-gilt.vercel.app/admin](https://cardss-gilt.vercel.app/admin).
2.  **Authentication Protocols:**
    *   **Method A (Ops Secret Key):** Enter the master operational administrative key into the top authentication bar:
        ```text
        fintech_admin_secret_key_2026
        ```
        *(Or supply the HTTP Header `x-admin-key: fintech_admin_secret_key_2026` via API tooling).*
    *   **Method B (Admin Role Session):** Sign in through `/login` using an authorized operator account designated with `role: "ADMIN"` or `is_admin: true`.
3.  **Core Dashboards Available:**
    *   **Active Cooling Window:** Real-time queue of transactions held under the 24-hour security window.
    *   **Platform Ledger:** Global transaction history searchable by Client PAN, Vendor Name, UTR, or Account Number.
    *   **Statutory Compliance:** One-click CA monthly GSTR-1 and GSTR-3B tax report generator.
    *   **Diagnostics:** Live server metrics, RAM/CPU allocation, remote DB ping, and webhook verification.

---

### 2.2 Managing & Overriding the 24-Hour Statutory Cooling Hold

#### Regulatory Background
In strict adherence to RBI Anti-Money Laundering (AML) standards and fraud prevention protocols, **all initial payouts to newly added vendor or landlord bank accounts are placed in a mandatory 24-hour security cooling hold** (`status: 'IN_COOLING'`). This prevents rapid mule-account siphoning and card-skimming velocity abuse.

#### Automated Background Release
*   The automated worker (`src/services/coolingWorker.js`) scans transactions continuously.
*   Once `cooling_release_at <= Current Timestamp`, the system automatically releases the funds, generates an IMPS Bank UTR, dispatches settlement notifications, and marks the client as `is_cooling_cleared: true`.

#### Manual Override Protocol for Trusted Enterprise Clients
When a trusted corporate client has verified invoices or urgent lease settlement requirements, an authorized operator can bypass the 24-hour hold instantly:

1.  Log into `/admin` and select the **Active Cooling Window** tab.
2.  Review the transaction details:
    *   Corporate Client Name & Verified PAN.
    *   Beneficiary Account Number and IFSC Code.
    *   Uploaded Invoice Voucher or Rent Agreement attachment.
3.  Click the emerald **"Override Cooling & Pay IMPS"** button.
4.  **System Action:**
    *   Invokes `POST /api/admin/transactions/:id/override-cooling`.
    *   Transition status: `IN_COOLING` $\rightarrow$ `PAYOUT_SUCCESS`.
    *   Mints an authentic IMPS settlement reference (`UTR-IMPS-xxxxxxxxxxxx`).
    *   Sets `is_cooling_cleared = true` on the corporate client profile.
    *   Triggers real-time SMS / In-App settlement alerts to both client and payee.
    *   Releases any pending referral reward coupons to referrers.

---

### 2.3 Exporting Monthly GSTR-1 and GSTR-3B Reports for the Chartered Accountant

#### Statutory Taxation Model (SAC Code 9971)
Under GST legislation for B2B payment intermediaries:
*   **The principal payout amount is 100% tax-exempt pass-through volume.**
*   **GST at 18% (9% CGST + 9% SGST) is charged strictly on the NET convenience fee earned by UtilityPay.**

#### Generating the Report

##### Option A: Via Admin Center UI (Recommended)
1.  Navigate to `/admin` $\rightarrow$ Click **"Export CA GSTR-1 Report"** in the top navigation bar.
2.  The browser automatically downloads the formatted CSV file:
    ```text
    UtilityPay_CA_GSTR1_[Period].csv
    ```

##### Option B: Via Command Line / cURL (Automated CA Cron)
Execute the authenticated API endpoint directly:
```bash
curl -X GET "https://api.eshopcity.in/api/admin/export-gst-report?month=2026-10&format=csv" \
     -H "x-admin-key: fintech_admin_secret_key_2026" \
     -o "UtilityPay_CA_GSTR1_2026_10.csv"
```

#### CSV Column Structure Exported
Each exported row contains full audit details ready for filing via the GST Portal:
1.  **Tax Invoice Number:** Unique serial invoice (`INV-TAX-2026-xxxx`).
2.  **Invoice Date:** Date of service delivery (`YYYY-MM-DD`).
3.  **Corporate Client Name:** Registered enterprise legal name.
4.  **Client PAN:** 10-digit PAN of the paying company.
5.  **Beneficiary Payee Name:** Receiving vendor or commercial property landlord.
6.  **SAC Code:** `9971` (Financial and Related Services).
7.  **Service Description:** `B2B Fintech Transaction Processing & Settlement Fee`.
8.  **Principal Payout (INR):** Gross vendor bill amount.
9.  **Taxable Platform Fee (INR):** Net convenience fee retained by the platform.
10. **CGST Rate & Amount:** 9.00% central tax breakdown.
11. **SGST Rate & Amount:** 9.00% state tax breakdown.
12. **Total GST (18%):** Combined statutory tax collected.
13. **Total Fee Invoice Value (INR):** Platform fee + 18% GST.
14. **Settlement Status:** `PAYOUT_SUCCESS`.
15. **Bank IMPS UTR:** Commercial bank settlement confirmation code.

---

## 3. Payment Gateway Switch Guide (Mock $\rightarrow$ Cashfree Sandbox $\rightarrow$ Live)

The platform incorporates an enterprise Dual-Engine Gateway Abstraction Architecture (`GatewayFactory`), allowing instantaneous switching between:
*   **Mock Gateway:** Zero-dependency in-memory settlement engine for local audits and staging.
*   **Cashfree Sandbox:** Official Cashfree PG test environment for simulated Indian banking cards, UPI, and NetBanking.
*   **Cashfree Production:** Live Indian banking rails processing actual debit/credit cards and corporate credit lines.

### 3.1 Step-by-Step Gateway Configuration Wizard

To reconfigure or upgrade the payment gateway credentials, run the built-in configuration utility from your local terminal:

```bash
npm run configure:gateway
```

#### Step 1: Mode Selection
The terminal wizard presents the available modes:
```text
Select Gateway Provider Mode:
  1) mock                 - In-Memory Sandbox (Zero external dependencies)
  2) cashfree_sandbox     - Cashfree PG Sandbox (Test Cards / UPI / Netbanking)
  3) cashfree_production  - Cashfree PG Production (Live Indian Banking Rails)
  4) easebuzz             - Easebuzz Gateway Adapter

Enter option (1-4, default: 1):
```

#### Step 2: Providing Credentials
When choosing `cashfree_sandbox` (Option 2) or `cashfree_production` (Option 3):
1.  **Client ID / App ID:** Input your Cashfree App ID (e.g. `TEST10293847...` or `PROD20394857...`).
2.  **Client Secret Key:** Input the corresponding API secret key generated in your Cashfree Merchant Dashboard.

#### Step 3: Automated API Validation Probe
Before applying changes, the script automatically verifies the credentials against the Cashfree REST API (`/pg/orders`):
*   **Valid Credentials:** Output reports `✅ Cashfree credentials verified successfully with Cashfree API!`.
*   **Invalid Credentials:** The wizard displays an error and prompts whether you wish to abort, protecting the server from configuration mishaps.

#### Step 4: Non-Interactive / Headless Execution (CI/CD)
For automated devops deployments, credentials can be set via CLI flags:
```bash
# Switch to Cashfree Sandbox
node scripts/configureGatewayCredentials.js --mode=cashfree_sandbox --appId="CF_APP_ID" --secretKey="CF_SECRET_KEY"

# Switch to Cashfree Production
node scripts/configureGatewayCredentials.js --mode=cashfree_production --appId="LIVE_APP_ID" --secretKey="LIVE_SECRET_KEY"

# Switch back to Mock Sandbox
node scripts/configureGatewayCredentials.js --mode=mock
```

---

### 3.2 How Hot Reloading Works on Hostinger Without Downtime

When `npm run configure:gateway` executes:
1.  **Local Sync:** Synchronizes the local `.env` file.
2.  **Secure Remote Sync:** Securely uploads the updated environment configuration to Hostinger's `/home/u392055965/domains/eshopcity.in/public_html/api/.env` via SSH/SFTP.
3.  **Phusion Passenger Hot-Restart Trigger:**  
    Executes the command:
    ```bash
    mkdir -p tmp && touch tmp/restart.txt
    ```
4.  **Zero-Downtime Worker Swapping:**
    *   Phusion Passenger detects the timestamp change on `tmp/restart.txt`.
    *   It immediately spawns new Node.js worker instances loaded with the new environment variables.
    *   Incoming client requests are seamlessly routed to the new workers.
    *   Existing connections finish gracefully before old workers terminate.
    *   **Zero HTTP requests are dropped during the cutover.**
5.  **Post-Cutover Health Check:**
    The script automatically performs a validation ping to `https://api.eshopcity.in/api/health` and displays the active operational mode.

---

## 4. Promotional & Referral Controls

### 4.1 Overview of Active Promotional Coupons

All coupons are built on **Unit-Economic Profit-Safe Rules**. Under SAC 9971, discounts apply exclusively to our platform convenience fee, guaranteeing that the platform fee never falls below break-even operational cost:

| Coupon Code | Discount Value | Min Transaction | Min Fee Required | Intended Use Case & Description |
| :--- | :--- | :--- | :--- | :--- |
| **`SAVE10`** | **₹10 OFF** | ₹10,000 | ₹200 | Standard monthly B2B vendor invoices and office utility bills |
| **`SAVE25`** | **₹25 OFF** | ₹25,000 | ₹500 | Commercial warehouse leases and regular supplier payouts |
| **`SAVE50`** | **₹50 OFF** | ₹50,000 | ₹1,000 | High-ticket industrial vendor disbursements and bulk inventory purchases |
| **`REF15`** | **₹15 OFF** | ₹1,000 | ₹25 | Automatic welcome incentive for newly referred businesses on first payout |
| **`REF25`** | **₹25 OFF** | ₹5,000 | ₹100 | Reward coupon granted to referrer upon referee's successful payout |

---

### 4.2 Referral Rules & Double-Sided Incentive Loop

The platform features a viral, zero-loss B2B referral architecture:

```
[Referrer (Existing Client)]
       │
       │ Shares 6-digit Referral Code (e.g., 'UPAY9A')
       ▼
[Referee (New Enterprise)]
       │
       ├─► 1. Registers & applies code at checkout
       │      • Instantly receives 'REF15' (₹15 fee discount)
       │
       ├─► 2. Undergoes 24-Hour AML Cooling Window
       │
       └─► 3. Payout Settles via IMPS (or Admin Override)
              │
              └─► Platform automatically issues 'REF25' (₹25 discount)
                  into the Referrer's account for their next transfer!
```

#### Anti-Fraud Rules Enforced:
1.  **Self-Referral Prevention:** Users cannot apply their own referral code.
2.  **First-Transaction Restriction:** The `REF15` incentive is strictly valid on a business entity's initial transaction.
3.  **Payout-Triggered Issuance:** Referrers receive their `REF25` reward only when the referee's transaction completes bank settlement (`PAYOUT_SUCCESS`).

---

### 4.3 How to Add or Modify Promotional Coupons

To add a seasonal or campaign promotional code:

1.  Open [src/services/couponService.js](file:///d:/ai/card/src/services/couponService.js).
2.  Add a new coupon definition to the `ACTIVE_COUPONS` dictionary:
    ```javascript
    DIWALI100: {
      code: 'DIWALI100',
      type: 'FLAT',
      value: 100,
      minAmount: 100000,
      minFee: 2000,
      description: 'Diwali Festive Offer: ₹100 OFF on transactions of ₹1,00,000 or more',
      badge: 'Festive ₹100 OFF',
      eligiblePurposes: null, // null = all purposes, or ['VENDOR_INVOICE', 'OFFICE_RENT']
    },
    ```
3.  Deploy the updated file to the live Hostinger cluster:
    ```bash
    node scripts/deployToHostinger.js
    ```
4.  The script uploads the updated engine and touches `tmp/restart.txt`. The new coupon is live immediately on both the Web App and Public API.

---

### 4.4 Dynamic Admin-Managed Promotional Pop-Up Modal (Flash Offers)

Operators can trigger instant, high-converting flash offer banners and modal overlays across all active client mobile devices without code deployments:

1.  **Access Manager:** Navigate to [https://cardss-gilt.vercel.app/admin](https://cardss-gilt.vercel.app/admin) $\rightarrow$ Select the **"Flash Offers"** tab.
2.  **Customizable Campaign Attributes:**
    *   **Offer Headline:** e.g. `⚡ Month-End Commercial Bill Rush`
    *   **Shimmering Badge:** e.g. `🔥 FLASH OFFER` or `WEEKEND SPECIAL`
    *   **Attached Coupon Code:** Choose from presets (`SAVE10`, `SAVE25`, `SAVE50`, `REF15`) or custom coupon.
    *   **Target Minimum Amount:** e.g. `₹25,000` (auto-populates in the `/pay` checkout sheet).
    *   **Primary CTA Button Label:** e.g. `Claim Offer & Pay Now`.
    *   **Audience Targeting:** `All Users` or `High-Volume Users` (>= 3 lifetime payouts).
    *   **Master Power Switch:** Instant `[ ACTIVE (ON) / PAUSED (OFF) ]` toggle switch.
3.  **Automated Client Rail:**
    *   Client PWA fetches `/api/promotions/active` on app mount.
    *   **Frequency Capping:** Dismissing the modal sets a 24-hour client cooldown (`dismissed_promo_{id}`) to prevent repeated pop-ups.
    *   **1-Click Action Rail:** Clicking the primary CTA instantly routes the client to `/pay?amount=25000&coupon=SAVE25`, auto-fills the transfer ticket, and auto-applies the promotional discount code.

---

## 5. Emergency Incident Response & Diagnostics Runbook

| Scenario | Diagnostic Action | Mitigation Protocol |
| :--- | :--- | :--- |
| **Health Check returns 503** | Run `curl https://api.eshopcity.in/api/health` | Check PostgreSQL database connectivity. The system automatically switches to the in-memory fallback store to ensure zero data loss. |
| **PG Webhook Failure** | Visit `/admin` $\rightarrow$ System Health $\rightarrow$ Click "Test Webhook Handshake" | Verifies HMAC-SHA256 signature verification against `CASHFREE_SECRET_KEY`. |
| **Stuck Cooling Transaction** | Visit `/admin` $\rightarrow$ Active Cooling Window | Inspect transaction risk score. Click **"Override Cooling & Pay IMPS"** to trigger immediate bank settlement. |
| **Database Backup Required** | Run `npm run backup:ledger` | Generates a timestamped JSON snapshot of all platform users, beneficiaries, and transaction ledgers. |
| **Full Live Production Audit** | Run `npm run audit:live` | Automated 12-point health audit checking landing pages, API latency, security headers, and PWA manifest. |

---

**UtilityPay Operations Desk**  
*Fintech Release Engineering Group • Commercial Launch Version 1.0.0*  
*Document Generated on Production Verification: October 2026*
