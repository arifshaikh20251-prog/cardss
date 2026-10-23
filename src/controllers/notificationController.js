/**
 * In-App Notification Center Controller
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Serves real-time notification records: payment captures, 24h cooling updates,
 * IMPS UTR settlements, and referral reward credits.
 */

const { mockStore } = require('../config/mockStore');
const { supabase, isMockMode } = require('../config/supabase');

/**
 * GET /api/notifications
 * Retrieves all in-app notifications for authenticated user
 */
async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id;

    let notifications = [];
    if (isMockMode || supabase.isMock) {
      notifications = mockStore.getNotificationsByUserId(userId);
    } else {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      notifications = data || [];
    }

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unread_count: unreadCount,
      notifications,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/notifications/:id/read
 * Marks a specific notification as read
 */
async function markAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const notifId = req.params.id;

    let updatedNotification = null;
    if (isMockMode || supabase.isMock) {
      updatedNotification = mockStore.markNotificationAsRead(notifId, userId);
    } else {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notifId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      updatedNotification = data;
    }

    if (!updatedNotification) {
      return res.status(404).json({
        success: false,
        error: 'NotificationNotFound',
        message: 'Notification not found or unauthorized.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification: updatedNotification,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/notifications/read-all
 * Marks all notifications as read for authenticated user
 */
async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.id;

    let updatedCount = 0;
    if (isMockMode || supabase.isMock) {
      updatedCount = mockStore.markAllNotificationsAsRead(userId);
    } else {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      updatedCount = Array.isArray(data) ? data.length : 0;
    }

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      updated_count: updatedCount,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
