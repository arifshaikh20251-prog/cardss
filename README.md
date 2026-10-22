# UtilityPay | B2B Vendor Invoicing & Rental Management Platform

Complete Fintech Payouts Engine & Mobile-First Web Client built with **Node.js, Express, Supabase (PostgreSQL)**, and **Next.js 14 (App Router) + Tailwind CSS + Lucide Icons**.

---

## 🏗️ Architecture & Project Structure

```text
├── database/
│   └── schema.sql             # Complete Supabase PostgreSQL migration script
├── src/                       # Node.js Express Backend Engine (PORT 5000)
│   ├── config/                # Supabase client & in-memory stateful mockStore
│   ├── controllers/           # Auth, Beneficiary Vault, Transaction Lifecycle
│   ├── middleware/            # JWT Bearer token authentication
│   ├── routes/                # REST endpoints (/api/auth, /api/kyc, /api/beneficiaries, /api/transactions)
│   ├── services/              # Cooling worker, PDFKit GST invoice, KYC adapter, Notification Engine
│   │   ├── kyc/               # KYC Factory, MockKyc, SurepassKyc (PAN + Aadhaar OTP)
│   │   ├── gateway/           # Gateway Factory, CashfreeGateway, MockGateway
│   │   ├── payout/            # Payout Factory, CashfreePayout, MockPayout
│   │   └── notificationService.js # Multi-channel Email (PDF attachment) & SMS alerts
│   ├── utils/                 # Dual Fee Calculator (3.5% vs 2.5%) & AML Risk Rules
│   ├── app.js                 # Express application configuration
│   └── server.js              # Server bootstrapper & background scheduler
├── tests/                     # 36 Automated Backend Unit, Integration & Webhook Tests (100% Pass)
└── frontend/                  # Next.js 14 App Router Mobile-First Client (PORT 3000)
    ├── vercel.json            # Zero-config Vercel deployment manifest
    ├── next.config.js         # Next.js configuration
    ├── tailwind.config.js     # CRED-style dark fintech theme tokens
    └── src/
        ├── app/
        │   ├── layout.js      # AppShell & AuthProvider
        │   ├── login/         # Screen 1: Mobile OTP Login (+91 & dev autofill)
        │   ├── dashboard/     # Screen 2: Dashboard with active cooling countdown & KYC prompt
        │   ├── kyc/           # Screen 3: 2-Step KYC Verification (PAN + Aadhaar OTP)
        │   ├── beneficiaries/ # Screen 4: Beneficiary Vault & ₹1 Penny-Drop Modal
        │   ├── pay/           # Screen 5: Transaction & Dynamic Fee Checkout Sheet
        │   └── transactions/  # Screen 6: Transaction History, Live Ticking Timer & Email Invoice
        ├── components/        # AppShell, TopHeader, BottomNav, CoolingBanner, FeeBreakdown, SwipeToPay, TransactionCard
        └── lib/               # api.js (JWT Interceptor), authContext.js, utils.js
```

---

## 🚀 Running Locally (Fullstack Workflow)

### ⚡ Unified Dev Runner (Backend + Frontend together)
From the repository root (`d:/ai/card`):
```bash
# Start BOTH Backend (5000) & Frontend (3000) simultaneously with colored logs
npm run dev:all

# Run all backend tests AND frontend Next.js production build verification
npm run test:all
```

---

### Separate Services Setup (Alternative)

#### 1. Start the Backend Engine (Port 5000)
From the repository root (`d:/ai/card`):
```bash
# Install backend dependencies
npm install

# Start backend in development mode
npm run dev
# Or production mode:
npm start
```
The backend starts on `http://localhost:5000` (Health diagnostic: `http://localhost:5000/api/health`).

#### 2. Start the Frontend Client (Port 3000)
In a second terminal, navigate to `frontend`:
```bash
cd frontend

# Install frontend dependencies
npm install

# Start frontend in development mode
npm run dev
```
Open **`http://localhost:3000`** in your browser. (Switch to Responsive/Mobile view `375px` - `430px` in Chrome DevTools to experience the native smartphone feel).

### 3. Quick Sandbox Login Credentials
- **Account 1 (KYC Verified, Cooling Cleared)**:
  - Mobile: `9876543210`
  - OTP: `123456`
  - Name: Apex Solutions Private Limited
- **Account 2 (Unverified, In 24h Cooling Hold)**:
  - Mobile: `9123456780`
  - OTP: `123456`
  - Name: Rohan Verma

---

## 📱 Mobile-First Frontend Screens (Phase 2 - Step 1)

1. **Screen 1: Mobile OTP Login (`/login`)**:
   - Clean +91 phone input with mock OTP `123456` auto-fill buttons.
   - Issues 7-day signed JWT stored in client state.
2. **Screen 2: Dashboard (`/dashboard`)**:
   - KYC Verification badge & greeting header.
   - Quick bill cards for **Office Rent (MCC 6513)** and **Vendor Invoice (MCC 7399)**.
   - **Active Cooling Alert Card** with live ticking countdown if a transaction is in the 24-hour hold window.
3. **Screen 3: Beneficiary Vault (`/beneficiaries`)**:
   - List of verified payout recipients.
   - Drawer/modal to register new beneficiaries with **Anti-Self-Transfer check** (warns if payee matches cardholder) and simulated ₹1 penny-drop validation.
4. **Screen 4: Checkout & Dynamic Fee Sheet (`/pay`)**:
   - Max ₹25,000 single ticket cap validation.
   - Speed Toggle:
     - **Instant Pay (IMPS)**: `3.5%` platform fee.
     - **Standard Pay (Next-Day)**: `2.5%` platform fee.
   - Live Dynamic Breakdown Box: calculates Fee + 18% GST + Card Debit amount in real-time.
   - **Mock Payment Gateway Modal**: simulates card swipe and invokes `/api/transactions/mock-pg-webhook`.
5. **Screen 5: Transaction History & Live Countdown (`/transactions`)**:
   - Chronological transfer records with filter tabs (*All*, *In Cooling*, *Settled*).
   - Live countdown timer for transactions in cooling (`COOLING (18h 24m 30s)`).
   - Instant **Download GST Tax Invoice (PDF)** button streaming official SAC 9971 invoices.

---

## ☁️ Zero-Config Vercel Deployment

The frontend includes `vercel.json` and is configured to deploy directly to Vercel:
1. Push this repository to GitHub/GitLab.
2. Import the project in Vercel.
3. Set **Root Directory** to `frontend`.
4. Configure Environment Variable:
   - `NEXT_PUBLIC_API_BASE_URL`: The URL of your deployed backend (e.g. `https://your-api.onrender.com/api`).
5. Deploy! `npm run build` generates optimized static routes with zero build errors.

---

## 🧪 Automated Testing

### Backend Engine (36 Tests Pass - 100% Green):
```bash
npm test
```
- E2E Fintech Business Engine Lifecycle (7 tests)
- KYC Verification & Notification Engine Suite (4 tests)
- Gateway Adapter & HMAC Webhook Verification Suite (5 tests)
- Transaction History & GST Tax Invoice PDF Tests (4 tests)
- Fee Calculator Unit Tests (5 tests)
- Risk & AML Rules Unit Tests (7 tests)
- Dev Sandbox Controls & Fast-Forward Simulation Tests (4 tests)

### Frontend Production Build:
```bash
cd frontend
npm run build
```
- All routes compiled and static-prerendered successfully without errors.

---

## 🌐 Hostinger Compliance Public Website (`landing-page/`)

The `landing-page/` directory contains a zero-dependency, static B2B SaaS public website required for commercial payment gateway onboarding (Razorpay / Cashfree / PayU):

```text
landing-page/
├── index.html       # Hero, Features, B2B Solutions, Dual Fee Pricing, RBI & GST Compliance
├── terms.html       # Terms of Service & Anti-Money Laundering (AML) Anti-Cycling Declaration
├── privacy.html     # Privacy Policy, 256-bit SSL & RBI Card-on-File Tokenization (CoFT)
├── refund.html      # 3-5 Banking Day Refund TAT, Cooling Cancellation, & Grievance Redressal
└── contact.html     # Registered Bengaluru Entity, CIN, GSTIN, SAC 9971, & Enterprise Inquiry
```

### 📂 How to Deploy to Hostinger File Manager
1. Log in to your Hostinger Control Panel (hPanel).
2. Go to **Websites** -> Select your domain -> Open **File Manager**.
3. Navigate to `public_html/`.
4. Upload all 5 files directly from `d:/ai/card/landing-page/` into `public_html/` (or drag and drop the folder contents).
5. The public compliance website is instantly live with zero build or npm dependencies!

---

## 🔌 Supabase Live Bridge & Database Verification

To verify connectivity with your live Supabase PostgreSQL database:

```bash
# Verify database connection and check all tables
npm run verify:supabase
```

- When running with `MOCK_MODE=true` (default), the script verifies mock engine operations and outputs live connection steps.
- When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided with `MOCK_MODE=false`, the script tests live PostgreSQL connectivity, confirms table existence (`users`, `beneficiaries`, `transactions`, `invoices`, `audit_logs`), and guides schema migration via `database/schema.sql`.

---

## 🛠️ Fintech Dev Sandbox Controls & Mobile PWA (Phase 2 - Step 3)

### 1. Dev Simulation Endpoints (`/api/dev`)
- `POST /api/dev/fast-forward-cooling`: Accepts optional `{ hours: 24 }`. Advances virtual clock, releases all `IN_COOLING` transfers to `PAYOUT_SUCCESS`, generates mock IMPS UTRs, and updates users.
- `POST /api/dev/reset-sandbox`: Resets in-memory mock store back to clean demo state.

### 2. Floating Dev Sandbox Drawer (`DevSandboxDrawer.js`)
- Floating pill toggle ("🛠️ Sandbox Tools") embedded at the bottom of the screen.
- Includes **Fast-Forward 24h** button with auto-refresh of transaction records.
- Includes **Reset Demo Data** button.
- **Quick Switch Persona**: One-tap instant switching between Verified User (`9876543210`) and In-Cooling User (`9123456780`).

### 3. Mobile PWA Configuration
- `frontend/public/manifest.json`: Configured for `display: "standalone"`, `start_url: "/dashboard"`, and high-res vector app icon (`icon.svg`).
- PWA meta tags in `frontend/src/app/layout.js` enable full-screen, native-app feel on Android/iOS home screen additions.

---

## 🎨 Mobbin-Inspired UI/UX Elevation & Supabase Seeder (Phase 2 - Step 4)

### 1. CRED / Apple Pay "Swipe-to-Pay" Slider (`SwipeToPay.js`)
- Replaces static submit buttons with an interactive spring-drag slider.
- Real-time gradient track fill (indigo to emerald), dynamic drag threshold (>88%), haptic bounce, and particle burst feedback.

### 2. Revolut Metallic Virtual Card Preview (`VirtualCardPreview.js`)
- Embedded on the checkout sheet with realistic gold EMV chip, contactless waves, embossed masked card number (`•••• •••• •••• 4242`), cardholder entity name, and RuPay/Visa dual network badges.
- Dynamic fee tier pill (`⚡ INSTANT • 3.5%` vs `⏱️ STANDARD • 2.5%`) embedded directly on the card surface.

### 3. Elevated Active Cooling Widget (`CoolingBanner.js`)
- Revolut / Jupiter circular SVG progress ring tracking elapsed 24-hour security hold.
- Pulsating neon amber AML hold badge.
- Interactive **"Why is my payment delayed?"** bottom sheet explaining RBI digital payment guidelines, anti-cycling rules, and 100% nodal escrow security.

### 4. Monzo / Jupiter Beneficiary Bank Cards Grid
- Auto-detects issuing bank from IFSC / bank name (HDFC Blue, ICICI Orange, SBI Cyan, Axis Pink, Kotak Red).
- Animated **"₹1 Penny-Drop Verified"** green checkmark badge on every verified recipient tile.

### 5. Supabase Live Table Seeder (`scripts/seedSupabaseLive.js`)
- Automated seeder verifying table structures and provisioning initial verified corporate and cooling accounts:
```bash
npm run seed:supabase
```

---

## 💳 Modular Gateway & Payout Adapter (Phase 3 - Step 1)

### 1. Payment Gateway Abstraction (`src/services/gateway/`)
- **Factory**: `gatewayFactory.js` dynamically binds to `'mock'`, `'cashfree'`, or `'easebuzz'` based on `GATEWAY_PROVIDER`.
- **Cashfree PG Adapter** (`cashfreeGateway.js`): Official v2023-08-01 API integration. Dispatches order creation to `/pg/orders` and returns `payment_session_id`.
- **Strict Webhook HMAC Verification**: Validates `x-webhook-signature` using HMAC-SHA256 (`crypto.timingSafeEqual`) against the client secret key.

### 2. Modular Payout (IMPS) Adapter (`src/services/payout/`)
- **Factory**: `payoutFactory.js` abstracts direct IMPS bank payouts.
- **Cashfree Payout Adapter** (`cashfreePayout.js`): Integrates `/payout/v1/requestTransfer` to execute instantaneous bank payouts with UTR generation.
- **Mock Payout Adapter** (`mockPayout.js`): Emulates instant banking settlements with realistic 12-digit UTR identifiers (`UTR-IMPS-xxxxxxxxxxxx`).

### 3. Production Webhook Route (`POST /api/transactions/pg-webhook`)
- Validates webhook authenticity using HMAC-SHA256.
- Rejects tampered payloads with `HTTP 401: Invalid Webhook Signature - AML Security Alert`.
- Evaluates statutory 24-hour cooling window for new payers, or dispatches instant IMPS payouts for verified corporate accounts.

---

## 🛡️ KYC Verification & Notification Engine (Phase 3 - Step 2)

### 1. Provider-Agnostic KYC Adapter (`src/services/kyc/`)
- **Factory**: `kycFactory.js` switches between `'mock'`, `'surepass'`, and `'sandbox'`.
- **PAN Verification**: Validates 10-character alphanumeric PAN syntax, confirms active ITD status, and calculates fuzzy Levenshtein name match percentage.
- **Aadhaar OTP Flow**: Generates UIDAI OTP session (`initiateAadhaarOtp`) and validates 6-digit OTP (`verifyAadhaarOtp`), clearing cooling limits on verification.

### 2. Multi-Channel Notification Engine (`src/services/notificationService.js`)
- Supports **Nodemailer** (SMTP / Resend) and SMS (Fast2SMS / MSG91) with automatic mock fallbacks in dev/test.
- **`sendPaymentSuccessAlert()`**: Automatically generates & attaches official SAC 9971 GST Tax Invoice PDF. Sends email breakdown + SMS alert.
- **`sendCoolingAlert()`**: Dispatches security notification for 24-hour escrow cooling window.
- **`sendPayoutSettledAlert()`**: Confirms bank IMPS disbursement with UTR number.
- **One-Tap Resend**: `POST /api/transactions/:id/send-email-invoice` allows instant PDF resending to user email.

---

## ☁️ Cloud Production Deployment Engine (Phase 4 - Step 1)

### 1. Cloud-Ready Backend Adapter (Docker / Render / Railway)
- **`Dockerfile`**: Lightweight Node.js 20 Alpine Linux production container with unprivileged `node` user security and automated `HEALTHCHECK` probe targeting `/api/health`.
- **`render.yaml`**: 1-click Blueprint for Render web service deployment.
- **`Procfile`**: Multi-platform process launcher (`web: node src/server.js`).

### 2. Vercel Frontend Configuration & API Rewrites
- **`frontend/next.config.js`**: Configures seamless API rewrites proxying `/api/*` requests directly to backend, eliminating CORS preflight friction.
- **`frontend/vercel.json`**: Enforces strict fintech security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`).

### 3. Automated Production Smoke Test Script
Verify the entire end-to-end production pipeline against any local or remote target URL:
```bash
# Run against local server (auto-boots in-process if port 5000 is inactive)
npm run smoke:test

# Run against a live cloud deployment
TARGET_API_URL=https://your-api.onrender.com npm run smoke:test
```
Verifies:
1. Health & Database Connectivity probe
2. Mobile OTP dispatch & JWT issuance
3. Beneficiary registration & Anti-Self-Transfer AML check
4. ₹20,000 transfer initiation & exact fee math (₹700 fee + ₹126 GST = ₹20,826)
5. Payment capture webhook & 24-hour cooling window lock
6. Cooling timer expiration & Bank IMPS UTR issuance
7. Valid binary `%PDF` GST Tax Invoice streaming
8. KYC Engine status check





