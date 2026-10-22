-- ==============================================================================
-- B2B Vendor Invoicing & Rental Management Platform
-- Database Migration Script (Supabase / PostgreSQL)
-- Phase 1 - Step 2: Core Fintech Business Engine Schema
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. Helper Functions & Triggers
-- ==============================================================================

-- Trigger function to automatically maintain updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. Table: users
-- Core entity representing registered businesses / payers
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    pan_number VARCHAR(10) UNIQUE,
    kyc_status VARCHAR(20) DEFAULT 'PENDING' CHECK (kyc_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')),
    is_cooling_cleared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.users IS 'Registered businesses and corporate payers initiating vendor invoices & rent payments.';
COMMENT ON COLUMN public.users.is_cooling_cleared IS 'Indicates if the user has completed their initial 24-hour cooling window.';

-- Trigger for users
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 4. Table: beneficiaries
-- Target bank accounts for vendor payouts, office landlords, and equipment leases
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    account_holder_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    ifsc_code VARCHAR(11) NOT NULL,
    bank_name VARCHAR(100),
    beneficiary_type VARCHAR(30) DEFAULT 'VENDOR' CHECK (beneficiary_type IN ('VENDOR', 'RENTAL_LANDLORD', 'COMMERCIAL_LEASE', 'UTILITY', 'OTHER')),
    pan_number VARCHAR(10),
    penny_drop_verified BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    cooling_period_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
    is_cooling_cleared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_user_beneficiary_account UNIQUE (user_id, account_number, ifsc_code)
);

COMMENT ON TABLE public.beneficiaries IS 'Recipient bank accounts for vendor settlements and commercial rentals.';
COMMENT ON COLUMN public.beneficiaries.penny_drop_verified IS 'Flags automated ₹1 bank account verification status.';

-- Trigger for beneficiaries
DROP TRIGGER IF EXISTS trg_beneficiaries_updated_at ON public.beneficiaries;
CREATE TRIGGER trg_beneficiaries_updated_at
BEFORE UPDATE ON public.beneficiaries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. Table: invoices
-- B2B Vendor Invoices and Rental Agreements with fee calculations
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50),
    invoice_date DATE DEFAULT CURRENT_DATE,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'VENDOR_INVOICE',
        'OFFICE_RENT',
        'WAREHOUSE_RENT',
        'EQUIPMENT_LEASE',
        'MAINTENANCE',
        'CONSULTING_SERVICES',
        'UTILITIES'
    )),
    description TEXT,
    document_url TEXT,
    base_amount NUMERIC(12, 2) NOT NULL CHECK (base_amount > 0),
    platform_fee_percent NUMERIC(5, 2) DEFAULT 2.50 NOT NULL,
    fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'PAYMENT_INITIATED',
        'PAID',
        'CANCELLED',
        'REJECTED'
    )),
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger for invoices
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 6. Table: transactions
-- Payment gateway debits and bank settlement payout records
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(id),
    beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0 AND amount <= 25000.00),
    transfer_type VARCHAR(20) DEFAULT 'STANDARD' CHECK (transfer_type IN ('INSTANT', 'STANDARD')),
    purpose VARCHAR(50) DEFAULT 'VENDOR_INVOICE',
    convenience_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst_on_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_debited NUMERIC(12, 2) NOT NULL,
    payment_mode VARCHAR(30) DEFAULT 'CREDIT_CARD' CHECK (payment_mode IN (
        'CREDIT_CARD',
        'DEBIT_CARD',
        'NET_BANKING',
        'UPI',
        'CORPORATE_CARD'
    )),
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    utr_number VARCHAR(50),
    status VARCHAR(30) DEFAULT 'INITIATED' CHECK (status IN (
        'INITIATED',
        'IN_COOLING',
        'PAYOUT_SCHEDULED',
        'PAYOUT_SUCCESS',
        'FAILED',
        'CANCELLED'
    )),
    payout_status VARCHAR(30) DEFAULT 'INITIATED' CHECK (payout_status IN (
        'INITIATED',
        'IN_COOLING',
        'QUEUED',
        'PROCESSING',
        'PAYOUT_SCHEDULED',
        'PAYOUT_SUCCESS',
        'SETTLED',
        'FAILED',
        'REVERSED'
    )),
    cooling_release_at TIMESTAMPTZ,
    failure_reason TEXT,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.transactions IS 'Financial transactions linking customer credit card charges to beneficiary bank payouts.';
COMMENT ON COLUMN public.transactions.cooling_release_at IS 'Timestamp after which 24-hour security cooling expires and payout can be released.';

-- Trigger for transactions
DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 7. Table: audit_logs
-- Immutable compliance & security trail
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID,
    ip_address VARCHAR(45),
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==============================================================================
-- 8. Performance Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_mobile ON public.users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_pan ON public.users(pan_number);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON public.beneficiaries(user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_account_ifsc ON public.beneficiaries(account_number, ifsc_code);
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON public.invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_beneficiary ON public.invoices(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id ON public.transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_utr ON public.transactions(utr_number);
CREATE INDEX IF NOT EXISTS idx_transactions_cooling ON public.transactions(status, cooling_release_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);

-- ==============================================================================
-- 9. Row Level Security (RLS) Policies (Supabase Best Practices)
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Beneficiaries policies
CREATE POLICY "Users can view own beneficiaries"
    ON public.beneficiaries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own beneficiaries"
    ON public.beneficiaries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own beneficiaries"
    ON public.beneficiaries FOR UPDATE
    USING (auth.uid() = user_id);

-- Invoices policies
CREATE POLICY "Users can view own invoices"
    ON public.invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own invoices"
    ON public.invoices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Service role bypass policies (enables backend worker to settle payments)
CREATE POLICY "Service role full access to transactions"
    ON public.transactions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 10. Mock / Seed Data for Sandbox & Local Testing
-- ==============================================================================
DO $$
DECLARE
    user1_id UUID;
    user2_id UUID;
    ben1_id UUID;
BEGIN
    INSERT INTO public.users (mobile, full_name, pan_number, kyc_status, is_cooling_cleared)
    VALUES ('9876543210', 'Apex Solutions Private Limited', 'AAACA1234F', 'VERIFIED', TRUE)
    ON CONFLICT (mobile) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id INTO user1_id;

    INSERT INTO public.users (mobile, full_name, pan_number, kyc_status, is_cooling_cleared)
    VALUES ('9123456780', 'Rohan Verma', 'BAPPR5678K', 'PENDING', FALSE)
    ON CONFLICT (mobile) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id INTO user2_id;

    INSERT INTO public.beneficiaries (
        user_id, account_holder_name, account_number, ifsc_code, bank_name,
        beneficiary_type, pan_number, penny_drop_verified, is_verified, is_cooling_cleared
    )
    VALUES (
        user1_id, 'InfraTech Hardware Supplies', '100234908123', 'HDFC0000128',
        'HDFC Bank Ltd', 'VENDOR', 'BBBCB4321G', TRUE, TRUE, TRUE
    )
    ON CONFLICT (user_id, account_number, ifsc_code) DO NOTHING
    RETURNING id INTO ben1_id;

    RAISE NOTICE 'Step 2 schema migration complete. Demo User ID: %', user1_id;
END $$;
