/**
 * Promotional Broadcast & Pop-Up Campaign Controller
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Manages operator-controlled dynamic flash offers, commercial volume incentives,
 * and high-converting CRED-grade pop-up modal payloads.
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { mockStore, isMockMode, supabaseAdmin } = require('../config/supabase');

/**
 * Optional User Resolver from Authorization Header
 */
function resolveOptionalUser(req) {
  if (req.user) return req.user;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (isMockMode || !supabaseAdmin || supabaseAdmin.isMock) {
        return (
          mockStore.findUserById(decoded.id) ||
          (decoded.mobile ? mockStore.findUserByMobile(decoded.mobile) : null)
        );
      }
    } catch (_) {
      // Ignored for optional auth
    }
  }
  return null;
}

/**
 * GET /api/promotions/active
 * Returns the currently active broadcast campaign for client apps
 */
async function getActivePromotion(req, res, next) {
  try {
    const user = resolveOptionalUser(req);

    if (isMockMode || !supabaseAdmin || supabaseAdmin.isMock) {
      const promo = mockStore.getActivePromotion(user);
      return res.json({
        success: true,
        promotion: promo || null,
        message: promo ? 'Active campaign retrieved' : 'No active broadcast promotion available',
      });
    }

    // Supabase Live Query
    const { data, error } = await supabaseAdmin
      .from('broadcast_promotions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return res.json({
        success: true,
        promotion: null,
        message: 'No active broadcast promotion found in database',
      });
    }

    const promo = data[0];

    // Check expiration
    if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
      return res.json({
        success: true,
        promotion: null,
        message: 'Broadcast promotion has expired',
      });
    }

    // Check audience targeting
    if (promo.target_audience === 'HIGH_VOLUME') {
      if (!user) {
        return res.json({
          success: true,
          promotion: null,
          message: 'Promotion targeted to high volume users only',
        });
      }

      const { count } = await supabaseAdmin
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['SUCCESS', 'SETTLED', 'PAYOUT_SUCCESS', 'IN_COOLING']);

      if ((count || 0) < 3) {
        return res.json({
          success: true,
          promotion: null,
          message: 'User does not meet high volume threshold (>= 3 transfers)',
        });
      }
    }

    return res.json({
      success: true,
      promotion: promo,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/promotions
 * Protected admin endpoint to toggle or update active promotional campaign
 */
async function updateBroadcastPromotion(req, res, next) {
  try {
    const {
      title,
      subtitle,
      coupon_code,
      badge_text,
      cta_label,
      target_amount,
      target_audience,
      is_active,
      expires_at,
    } = req.body;

    const payload = {};
    if (title !== undefined) payload.title = String(title);
    if (subtitle !== undefined) payload.subtitle = String(subtitle);
    if (coupon_code !== undefined) payload.coupon_code = String(coupon_code).trim().toUpperCase();
    if (badge_text !== undefined) payload.badge_text = String(badge_text);
    if (cta_label !== undefined) payload.cta_label = String(cta_label);
    if (target_amount !== undefined) payload.target_amount = Number(target_amount);
    if (target_audience !== undefined) payload.target_audience = target_audience;
    if (is_active !== undefined) payload.is_active = Boolean(is_active);
    if (expires_at !== undefined) payload.expires_at = expires_at;
    payload.updated_at = new Date().toISOString();

    let updatedPromo = null;

    if (isMockMode || !supabaseAdmin || supabaseAdmin.isMock) {
      updatedPromo = mockStore.updateBroadcastPromotion(payload);
    } else {
      const { data: existing } = await supabaseAdmin
        .from('broadcast_promotions')
        .select('id')
        .limit(1);

      if (existing && existing.length > 0) {
        const { data, error } = await supabaseAdmin
          .from('broadcast_promotions')
          .update(payload)
          .eq('id', existing[0].id)
          .select()
          .single();
        if (error) throw error;
        updatedPromo = data;
      } else {
        const { data, error } = await supabaseAdmin
          .from('broadcast_promotions')
          .insert({
            id: 'promo-flash-01',
            title: payload.title || '⚡ Month-End Commercial Bill Rush',
            subtitle: payload.subtitle || 'Transfer above ₹25,000 today & save flat ₹25 on convenience fees!',
            coupon_code: payload.coupon_code || 'SAVE25',
            badge_text: payload.badge_text || '🔥 FLASH OFFER',
            cta_label: payload.cta_label || 'Claim Offer & Pay Now',
            target_amount: payload.target_amount || 25000,
            target_audience: payload.target_audience || 'ALL',
            is_active: payload.is_active !== undefined ? payload.is_active : true,
            expires_at: payload.expires_at || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        updatedPromo = data;
      }
    }

    console.log(`[PROMOTION_ENGINE] Updated broadcast offer: "${updatedPromo.title}" | Active: ${updatedPromo.is_active}`);

    return res.json({
      success: true,
      message: 'Promotional campaign broadcast updated successfully.',
      promotion: updatedPromo,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/promotions
 * Returns current campaign configuration for Admin Center
 */
async function getAdminPromotions(req, res, next) {
  try {
    let promo = null;
    if (isMockMode || !supabaseAdmin || supabaseAdmin.isMock) {
      promo = mockStore.getBroadcastPromotions()[0] || null;
    } else {
      const { data } = await supabaseAdmin
        .from('broadcast_promotions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      promo = (data && data[0]) || null;
    }

    return res.json({
      success: true,
      promotion: promo,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getActivePromotion,
  updateBroadcastPromotion,
  getAdminPromotions,
};
