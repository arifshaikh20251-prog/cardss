/**
 * Transaction Lifecycle & History Controller
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Manages transaction initiation, Dual Fee calculations (INSTANT 3.5%, STANDARD 2.5%),
 * ticket size caps (₹25,000), payment gateway webhook routing, history listing,
 * cooling-off status countdowns, and automated GST Tax Invoice PDF generation.
 */

const { getFeeBreakdown } = require('../utils/feeCalculator');
const {
  evaluateTransactionRisk,
  checkSelfTransfer,
  MAX_SINGLE_TICKET_AMOUNT,
} = require('../utils/riskRules');
const { mockStore, isMockMode, supabase } = require('../config/supabase');
const { generateInvoicePdf, maskAccount } = require('../services/invoiceService');
const gatewayFactory = require('../services/gateway/gatewayFactory');
const payoutFactory = require('../services/payout/payoutFactory');
const notificationService = require('../services/notificationService');
const { recordAuditLog } = require('../middleware/auditLogger');

/**
 * Helper to compute remaining cooling time in seconds and humanized text
 */
function getCoolingCountdown(coolingReleaseAt) {
  if (!coolingReleaseAt) {
    return {
      cooling_seconds_remaining: 0,
      cooling_message: null,
    };
  }

  const releaseMs = new Date(coolingReleaseAt).getTime();
  const nowMs = Date.now();
  const diffSeconds = Math.max(0, Math.floor((releaseMs - nowMs) / 1000));

  if (diffSeconds <= 0) {
    return {
      cooling_seconds_remaining: 0,
      cooling_message: 'Security cooling-off window completed. Payout eligible for release.',
    };
  }

  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);

  return {
    cooling_seconds_remaining: diffSeconds,
    cooling_message: `Security cooling active. Payout releases in ${hours} hours ${minutes} mins.`,
  };
}

/**
 * Format transaction record with standardized response fields
 */
function formatTransactionItem(tx, beneficiary) {
  const coolingInfo = getCoolingCountdown(tx.cooling_release_at);

  return {
    id: tx.id,
    user_id: tx.user_id,
    beneficiary_id: tx.beneficiary_id,
    amount: tx.amount,
    transfer_type: tx.transfer_type,
    status: tx.status,
    payout_status: tx.payout_status,
    total_charged: tx.total_debited,
    total_debited: tx.total_debited,
    platform_fee: tx.convenience_fee,
    convenience_fee: tx.convenience_fee,
    gst_amount: tx.gst_on_fee,
    gst_on_fee: tx.gst_on_fee,
    created_at: tx.created_at,
    utr_number: tx.utr_number,
    payout_utr: tx.utr_number,
    settled_at: tx.settled_at,
    cooling_release_at: tx.cooling_release_at,
    purpose: tx.purpose,
    gateway_order_id: tx.gateway_order_id,
    gateway_payment_id: tx.gateway_payment_id,
    beneficiary: beneficiary
      ? {
          id: beneficiary.id,
          name: beneficiary.account_holder_name,
          account_holder_name: beneficiary.account_holder_name,
          masked_account: maskAccount(beneficiary.account_number),
          bank_name: beneficiary.bank_name,
          ifsc_code: beneficiary.ifsc_code,
        }
      : null,
    cooling_seconds_remaining: coolingInfo.cooling_seconds_remaining,
    cooling_message: coolingInfo.cooling_message,
    invoice_url: `/api/transactions/${tx.id}/invoice`,
  };
}

/**
 * Initiate a vendor or rental payment transaction
 * POST /api/transactions/initiate
 */
async function initiateTransaction(req, res, next) {
  try {
    const user = req.user;
    const {
      beneficiary_id,
      amount,
      transfer_type = 'STANDARD',
      purpose = 'VENDOR_INVOICE',
    } = req.body;

    const numericAmount = parseFloat(amount);

    // 1. Enforce ₹25,000 single ticket cap & positive number check
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Transaction amount must be a positive number greater than 0.',
      });
    }

    if (numericAmount > MAX_SINGLE_TICKET_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: 'TicketCapExceeded',
        message: `Transaction amount ₹${numericAmount.toLocaleString('en-IN')} exceeds the maximum single ticket cap of ₹${MAX_SINGLE_TICKET_AMOUNT.toLocaleString('en-IN')}.00.`,
      });
    }

    // 2. Validate transfer type
    const normalizedType = String(transfer_type).toUpperCase();
    if (!['INSTANT', 'STANDARD'].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: "Invalid transfer_type. Supported values are 'INSTANT' or 'STANDARD'.",
      });
    }

    // 3. Resolve beneficiary & verify ownership
    if (!beneficiary_id) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'beneficiary_id is required.',
      });
    }

    let beneficiary = null;
    if (isMockMode || supabase.isMock) {
      beneficiary = mockStore.findBeneficiaryById(beneficiary_id);
    } else {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', beneficiary_id)
        .single();
      if (!error && data) beneficiary = data;
    }

    if (!beneficiary || beneficiary.user_id !== user.id) {
      return res.status(404).json({
        success: false,
        error: 'BeneficiaryNotFound',
        message: 'Beneficiary not found or unauthorized for this account.',
      });
    }

    // 4. Anti-Self Transfer Check
    const selfCheck = checkSelfTransfer(user, beneficiary);
    if (selfCheck.isSelfTransfer) {
      return res.status(400).json({
        success: false,
        error: 'SelfTransferProhibited',
        message: selfCheck.reason,
      });
    }

    // 5. Compute Fee Breakdown (2.5% or 3.5% + 18% GST)
    const feeBreakdown = getFeeBreakdown(numericAmount, normalizedType);

    // 6. Create Transaction with status 'INITIATED'
    const transactionRecord = {
      user_id: user.id,
      beneficiary_id: beneficiary.id,
      amount: numericAmount,
      transfer_type: normalizedType,
      purpose: (purpose || 'VENDOR_INVOICE').toUpperCase(),
      convenience_fee: feeBreakdown.platformFee,
      gst_on_fee: feeBreakdown.gstAmount,
      total_debited: feeBreakdown.totalPayable,
      status: 'INITIATED',
      payout_status: 'INITIATED',
      gateway_order_id: `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    };

    let savedTransaction = null;
    if (isMockMode || supabase.isMock) {
      savedTransaction = mockStore.createTransaction(transactionRecord);
    } else {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionRecord)
        .select()
        .single();
      if (error) throw error;
      savedTransaction = data;
    }

    // Capture RBI Compliance Digital Audit Trail (IP & Device User-Agent)
    try {
      await recordAuditLog({
        entityType: 'TRANSACTION',
        entityId: savedTransaction.id,
        action: 'TRANSACTION_INITIATED',
        actorId: user.id,
        ipAddress: req.clientIp || req.ip || '127.0.0.1',
        userAgent: req.userAgent || req.headers['user-agent'] || 'Unknown',
        payload: {
          amount: numericAmount,
          total_debited: feeBreakdown.totalPayable,
          convenience_fee: feeBreakdown.platformFee,
          gst_on_fee: feeBreakdown.gstAmount,
          transfer_type: normalizedType,
          beneficiary_id: beneficiary.id,
          gateway_order_id: savedTransaction.gateway_order_id,
        },
      });
    } catch (auditErr) {
      console.warn('[AUDIT_TRAIL_WARN] Non-blocking audit record error:', auditErr.message);
    }

    // Create Gateway Order via active adapter (Mock or Cashfree)
    let gatewayOrder = null;
    try {
      gatewayOrder = await gatewayFactory.createPaymentOrder({
        orderId: savedTransaction.gateway_order_id,
        amount: feeBreakdown.totalPayable,
        customerInfo: {
          id: user.id,
          name: user.full_name,
          phone: user.mobile,
        },
        returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/transactions`,
      });
    } catch (gwErr) {
      console.warn('[GATEWAY_ORDER] Adapter warning:', gwErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Transaction checkout session initiated.',
      checkout: {
        order_id: savedTransaction.id,
        gateway_order_id: savedTransaction.gateway_order_id,
        payment_session_id: gatewayOrder?.payment_session_id || `session_${savedTransaction.id}`,
        principal_amount: numericAmount,
        total_amount: feeBreakdown.totalPayable,
        transfer_type: normalizedType,
        fee_breakdown: feeBreakdown,
        gateway_provider: gatewayFactory.provider,
      },
      transaction: formatTransactionItem(savedTransaction, beneficiary),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * HMAC-SHA256 Verified Payment Gateway Webhook
 * POST /api/transactions/pg-webhook
 */
async function handlePgWebhook(req, res, next) {
  try {
    const signature =
      req.headers['x-webhook-signature'] ||
      req.headers['x-signature'] ||
      req.headers['signature'] ||
      req.body?.signature;
    const timestamp =
      req.headers['x-webhook-timestamp'] ||
      req.headers['x-timestamp'];

    // 1. Validate HMAC Signature
    const isValid = gatewayFactory.verifyWebhookSignature(req.body, signature, timestamp);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'InvalidSignature',
        message: 'Invalid Webhook Signature - AML Security Alert: Unauthorized transaction tampering detected.',
      });
    }

    // 2. Parse Order ID and Payment Status (Support Cashfree & standard payloads)
    const order_id =
      req.body.order_id ||
      req.body.orderId ||
      req.body.data?.order?.order_id;

    const gateway_payment_id =
      req.body.gateway_payment_id ||
      req.body.payment_id ||
      req.body.data?.payment?.cf_payment_id ||
      `PAY_GW_${Date.now()}`;

    const payment_status = (
      req.body.payment_status ||
      req.body.data?.payment?.payment_status ||
      req.body.type ||
      'SUCCESS'
    ).toUpperCase();

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'order_id is required to process webhook.',
      });
    }

    // 3. Resolve Transaction
    let transaction = null;
    if (isMockMode || supabase.isMock) {
      transaction =
        mockStore.findTransactionById(order_id) ||
        mockStore.transactions.find((t) => t.gateway_order_id === order_id);
    } else {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`id.eq.${order_id},gateway_order_id.eq.${order_id}`)
        .maybeSingle();
      if (!error && data) transaction = data;
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'TransactionNotFound',
        message: `Transaction not found for order_id: ${order_id}`,
      });
    }

    // 4. Resolve Payer User & Beneficiary
    let user = null;
    if (isMockMode || supabase.isMock) {
      user = mockStore.findUserById(transaction.user_id);
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', transaction.user_id)
        .single();
      if (!error && data) user = data;
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'UserNotFound',
        message: 'Payer account associated with this transaction could not be located.',
      });
    }

    let beneficiary = null;
    if (isMockMode || supabase.isMock) {
      beneficiary = mockStore.findBeneficiaryById(transaction.beneficiary_id);
    } else {
      const { data } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', transaction.beneficiary_id)
        .maybeSingle();
      beneficiary = data;
    }

    // 5. Evaluate Payment Success
    if (!payment_status.includes('FAIL') && !payment_status.includes('CANCEL')) {
      let updatedStatus = 'IN_COOLING';
      let updatedPayoutStatus = 'IN_COOLING';
      let coolingReleaseAt = null;
      let utrNumber = null;
      let settledAt = null;
      let responseMessage = '';

      // Check Cooling Engine
      if (!user.is_cooling_cleared) {
        updatedStatus = 'IN_COOLING';
        updatedPayoutStatus = 'IN_COOLING';
        coolingReleaseAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        responseMessage = 'Security cooling-off active. Payout scheduled after 24 hours.';
      } else if (transaction.transfer_type === 'INSTANT') {
        // Trigger automated IMPS payout via adapter
        const payoutResult = await payoutFactory.executeImpsPayout({
          transferId: transaction.id,
          amount: transaction.amount,
          beneficiaryAccount: beneficiary?.account_number,
          beneficiaryIfsc: beneficiary?.ifsc_code,
          remarks: 'B2B Vendor Utility SAC 9971 Disbursement',
        });

        updatedStatus = 'PAYOUT_SUCCESS';
        updatedPayoutStatus = 'PAYOUT_SUCCESS';
        utrNumber = payoutResult.utr_number;
        settledAt = payoutResult.settled_at || new Date().toISOString();
        responseMessage = 'Instant payout settled successfully via IMPS rail.';
      } else {
        // Standard settlement (T+1)
        updatedStatus = 'PAYOUT_SCHEDULED';
        updatedPayoutStatus = 'PAYOUT_SCHEDULED';
        responseMessage = 'Next-day batch settlement queued.';
      }

      const updates = {
        status: updatedStatus,
        payout_status: updatedPayoutStatus,
        gateway_payment_id,
        cooling_release_at: coolingReleaseAt,
        utr_number: utrNumber,
        settled_at: settledAt,
      };

      let updatedTransaction = null;
      if (isMockMode || supabase.isMock) {
        updatedTransaction = mockStore.updateTransaction(transaction.id, updates);
      } else {
        const { data, error } = await supabase
          .from('transactions')
          .update(updates)
          .eq('id', transaction.id)
          .select()
          .single();
        if (error) throw error;
        updatedTransaction = data;
      }

      // Multi-Channel Notifications Trigger
      try {
        const pdfBuffer = await generateInvoicePdf(updatedTransaction, user, beneficiary || {});
        if (updatedStatus === 'IN_COOLING') {
          await Promise.allSettled([
            notificationService.sendCoolingAlert({ user, transaction: updatedTransaction }),
            notificationService.sendPaymentSuccessAlert({ user, transaction: updatedTransaction, beneficiary: beneficiary || {}, pdfBuffer }),
          ]);
        } else if (updatedStatus === 'PAYOUT_SUCCESS') {
          await Promise.allSettled([
            notificationService.sendPaymentSuccessAlert({ user, transaction: updatedTransaction, beneficiary: beneficiary || {}, pdfBuffer }),
            notificationService.sendPayoutSettledAlert({ user, transaction: updatedTransaction, utr: utrNumber }),
          ]);
        } else {
          await notificationService.sendPaymentSuccessAlert({ user, transaction: updatedTransaction, beneficiary: beneficiary || {}, pdfBuffer });
        }
      } catch (notifErr) {
        console.warn('[WEBHOOK] Notification error:', notifErr.message);
      }

      return res.status(200).json({
        success: true,
        message: responseMessage,
        transaction: formatTransactionItem(updatedTransaction),
      });
    }

    // Payment failed or cancelled
    const updates = {
      status: 'FAILED',
      payout_status: 'FAILED',
      gateway_payment_id,
    };
    if (isMockMode || supabase.isMock) {
      mockStore.updateTransaction(transaction.id, updates);
    } else {
      await supabase.from('transactions').update(updates).eq('id', transaction.id);
    }

    return res.status(200).json({
      success: false,
      message: 'Payment was not successful.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Mock Payment Gateway Webhook
 * POST /api/transactions/mock-pg-webhook
 */
async function mockPgWebhook(req, res, next) {
  try {
    const { order_id, gateway_payment_id = `PAY_${Date.now()}` } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'order_id is required to process webhook.',
      });
    }

    // Resolve transaction
    let transaction = null;
    if (isMockMode || supabase.isMock) {
      transaction = mockStore.findTransactionById(order_id) ||
        mockStore.transactions.find((t) => t.gateway_order_id === order_id);
    } else {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', order_id)
        .single();
      if (!error && data) transaction = data;
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'TransactionNotFound',
        message: `Transaction not found for order_id: ${order_id}`,
      });
    }

    // Resolve user associated with the transaction
    let user = null;
    if (isMockMode || supabase.isMock) {
      user = mockStore.findUserById(transaction.user_id);
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', transaction.user_id)
        .single();
      if (!error && data) user = data;
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'UserNotFound',
        message: 'Payer account associated with this transaction could not be located.',
      });
    }

    let beneficiary = null;
    if (isMockMode || supabase.isMock) {
      beneficiary = mockStore.findBeneficiaryById(transaction.beneficiary_id);
    } else {
      const { data } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', transaction.beneficiary_id)
        .maybeSingle();
      beneficiary = data;
    }

    let updatedStatus = 'IN_COOLING';
    let updatedPayoutStatus = 'IN_COOLING';
    let coolingReleaseAt = null;
    let utrNumber = null;
    let settledAt = null;
    let responseMessage = '';

    // Cooling Rule Evaluation
    if (!user.is_cooling_cleared) {
      updatedStatus = 'IN_COOLING';
      updatedPayoutStatus = 'IN_COOLING';
      coolingReleaseAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      responseMessage = 'Security cooling-off active. Payout scheduled after 24 hours.';
    } else if (transaction.transfer_type === 'INSTANT') {
      updatedStatus = 'PAYOUT_SUCCESS';
      updatedPayoutStatus = 'PAYOUT_SUCCESS';
      utrNumber = `UTR-IMPS-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      settledAt = new Date().toISOString();
      responseMessage = 'Instant payout settled successfully.';
    } else {
      updatedStatus = 'PAYOUT_SCHEDULED';
      updatedPayoutStatus = 'PAYOUT_SCHEDULED';
      responseMessage = 'Next-day settlement queued.';
    }

    const updates = {
      status: updatedStatus,
      payout_status: updatedPayoutStatus,
      gateway_payment_id,
      cooling_release_at: coolingReleaseAt,
      utr_number: utrNumber,
      settled_at: settledAt,
    };

    let updatedTransaction = null;
    if (isMockMode || supabase.isMock) {
      updatedTransaction = mockStore.updateTransaction(transaction.id, updates);
    } else {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', transaction.id)
        .select()
        .single();
      if (error) throw error;
      updatedTransaction = data;
    }

    // Multi-Channel Notifications Trigger
    try {
      const pdfBuffer = await generateInvoicePdf(updatedTransaction, user, beneficiary || {});
      if (updatedStatus === 'IN_COOLING') {
        await Promise.allSettled([
          notificationService.sendCoolingAlert({ user, transaction: updatedTransaction }),
          notificationService.sendPaymentSuccessAlert({ user, transaction: updatedTransaction, beneficiary: beneficiary || {}, pdfBuffer }),
        ]);
      } else if (updatedStatus === 'PAYOUT_SUCCESS') {
        await Promise.allSettled([
          notificationService.sendPaymentSuccessAlert({ user, transaction: updatedTransaction, beneficiary: beneficiary || {}, pdfBuffer }),
          notificationService.sendPayoutSettledAlert({ user, transaction: updatedTransaction, utr: utrNumber }),
        ]);
      } else {
        await notificationService.sendPaymentSuccessAlert({ user, transaction: updatedTransaction, beneficiary: beneficiary || {}, pdfBuffer });
      }
    } catch (notifErr) {
      console.warn('[MOCK_WEBHOOK] Notification error:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: responseMessage,
      transaction: formatTransactionItem(updatedTransaction),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all transactions for authenticated user (History)
 * GET /api/transactions
 */
async function getTransactions(req, res, next) {
  try {
    const user = req.user;
    let transactions = [];

    if (isMockMode || supabase.isMock) {
      transactions = mockStore.getTransactionsByUserId(user.id);
    } else {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      transactions = data || [];
    }

    // Enrich transactions with beneficiary details & cooling countdown
    const enriched = await Promise.all(
      transactions.map(async (tx) => {
        let ben = null;
        if (isMockMode || supabase.isMock) {
          ben = mockStore.findBeneficiaryById(tx.beneficiary_id);
        } else {
          const { data } = await supabase.from('beneficiaries').select('*').eq('id', tx.beneficiary_id).single();
          ben = data;
        }
        return formatTransactionItem(tx, ben);
      })
    );

    return res.status(200).json({
      success: true,
      count: enriched.length,
      transactions: enriched,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Fetch detailed transaction by ID
 * GET /api/transactions/:id
 */
async function getTransactionById(req, res, next) {
  try {
    const user = req.user;
    const { id } = req.params;

    let transaction = null;
    if (isMockMode || supabase.isMock) {
      transaction = mockStore.findTransactionById(id);
    } else {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) transaction = data;
    }

    if (!transaction || transaction.user_id !== user.id) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Transaction not found.',
      });
    }

    let beneficiary = null;
    if (isMockMode || supabase.isMock) {
      beneficiary = mockStore.findBeneficiaryById(transaction.beneficiary_id);
    } else {
      const { data } = await supabase.from('beneficiaries').select('*').eq('id', transaction.beneficiary_id).single();
      beneficiary = data;
    }

    const feeBreakdown = getFeeBreakdown(transaction.amount, transaction.transfer_type);
    const item = formatTransactionItem(transaction, beneficiary);

    return res.status(200).json({
      success: true,
      transaction: {
        ...item,
        fee_breakdown: feeBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Download GST Tax Invoice PDF
 * GET /api/transactions/:id/invoice
 */
async function downloadInvoicePdf(req, res, next) {
  try {
    const user = req.user;
    const { id } = req.params;

    let transaction = null;
    if (isMockMode || supabase.isMock) {
      transaction = mockStore.findTransactionById(id);
    } else {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) transaction = data;
    }

    if (!transaction || transaction.user_id !== user.id) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Transaction not found or unauthorized to download invoice.',
      });
    }

    let beneficiary = null;
    if (isMockMode || supabase.isMock) {
      beneficiary = mockStore.findBeneficiaryById(transaction.beneficiary_id);
    } else {
      const { data } = await supabase.from('beneficiaries').select('*').eq('id', transaction.beneficiary_id).single();
      beneficiary = data;
    }

    // Generate GST Tax Invoice PDF in memory
    const pdfBuffer = await generateInvoicePdf(transaction, user, beneficiary || {});

    // Set standard PDF download headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${transaction.id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * Dispatch or Resend Invoice via Email
 * POST /api/transactions/:id/send-email-invoice
 */
async function sendEmailInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user;
    const recipientEmail = req.body?.email || user.email || 'corporate-client@utilitypay.in';

    let transaction = null;
    if (isMockMode || supabase.isMock) {
      transaction = mockStore.findTransactionById(id);
    } else {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) transaction = data;
    }

    if (!transaction || transaction.user_id !== user.id) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Transaction not found or unauthorized to access invoice.',
      });
    }

    let beneficiary = null;
    if (isMockMode || supabase.isMock) {
      beneficiary = mockStore.findBeneficiaryById(transaction.beneficiary_id);
    } else {
      const { data } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', transaction.beneficiary_id)
        .single();
      beneficiary = data;
    }

    const pdfBuffer = await generateInvoicePdf(transaction, user, beneficiary || {});
    await notificationService.sendPaymentSuccessAlert({
      user: { ...user, email: recipientEmail },
      transaction,
      beneficiary: beneficiary || {},
      pdfBuffer,
    });

    return res.status(200).json({
      success: true,
      message: `Tax Invoice PDF successfully dispatched to ${recipientEmail}.`,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  initiateTransaction,
  handlePgWebhook,
  mockPgWebhook,
  getTransactions,
  getTransactionById,
  downloadInvoicePdf,
  sendEmailInvoice,
};
