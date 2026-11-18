/**
 * オーナー／公開制限 — API（serverFeatures.ownerPlatformOperational 時）
 */
(function (global) {
  'use strict';

  function gasPost(action, payload) {
    payload = payload || {};
    payload.action = action;
    if (typeof global.sendToGAS_Safe === 'function') {
      return global.sendToGAS_Safe(action, payload);
    }
    return Promise.reject(new Error('GAS_UNAVAILABLE'));
  }

  function ownerPlatformActive() {
    if (typeof global.ringGasOwnerPlatformOperational_ === 'function') {
      return global.ringGasOwnerPlatformOperational_();
    }
    var sf = (global.ringGasFeaturesSession_ && global.ringGasFeaturesSession_.features) || global.ringServerFeatures || {};
    return !!(sf.ownerPlatform && sf.ownerPlatformOperational);
  }

  function parseShakenOcrForOwner(ocrResult) {
    if (!ocrResult || typeof ocrResult !== 'object') return { vin: '', securityCode: '' };
    var vin = String(ocrResult.vin || ocrResult.VIN || '').trim();
    var code = String(
      ocrResult.eshakenSecurityCode || ocrResult.securityCode ||
      ocrResult.eShakenSecurityCode || ocrResult.shakenSecurityCode || ''
    ).trim().replace(/\s+/g, '');
    if (!/^[0-9]{4}$/.test(code)) code = '';
    return { vin: vin, securityCode: code };
  }

  function purgeSensitiveCaches() {
    try {
      var logs = typeof global.readLogsArray === 'function' ? global.readLogsArray() : [];
      logs.forEach(function (l) {
        if (l.visibility === 'private' || l.photoAccess === 'fetch') {
          l.photoUrl = '';
          l.partsPhoto = '';
        }
      });
      if (typeof global.DB_LOGS === 'string') {
        global.localStorage.setItem(global.DB_LOGS, JSON.stringify(logs));
      } else {
        global.localStorage.setItem('nappy_logs_v1', JSON.stringify(logs));
      }
    } catch (e) { /* ignore */ }
    try {
      global.localStorage.removeItem('ring_owner_notices_v1');
    } catch (e2) { /* ignore */ }
  }

  async function fetchMaintenancePhoto(vin, logId) {
    return gasPost('get_maintenance_photo', { vin: vin, log_id: logId });
  }

  global.ringOwnerPlatform = {
    active: ownerPlatformActive,
    purgeSensitiveCaches: purgeSensitiveCaches,
    claimTransfer: function (p) { return gasPost('owner_claim_transfer', p); },
    setHistoryVisibility: function (logId, visibility) {
      return gasPost('owner_set_history_visibility', { log_id: logId, visibility: visibility });
    },
    bulkHistoryVisibility: function (vin, logIds, visibility) {
      return gasPost('owner_bulk_history_visibility', { vin: vin, log_ids: logIds, visibility: visibility });
    },
    setDefaultVisibility: function (visibility) {
      return gasPost('owner_set_user_prefs', { defaultHistoryVisibility: visibility });
    },
    registerFavoriteShop: function (opts) { return gasPost('owner_register_favorite_shop', opts || {}); },
    unregisterFavoriteShop: function (opts) { return gasPost('owner_unregister_favorite_shop', opts || {}); },
    archiveVehicle: function (vin, choice) {
      return gasPost('owner_archive_vehicle', { vin: vin, privateDisclosureChoice: choice || 'keep_private' });
    },
    getTransferNotices: function () { return gasPost('owner_get_transfer_notices', {}); },
    respondTransferNotice: function (noticeId, noticeAction) {
      return gasPost('owner_respond_transfer_notice', { noticeId: noticeId, noticeAction: noticeAction });
    },
    listPastVehicles: function () { return gasPost('owner_list_past_vehicles', {}); },
    getShopReferral: function () { return gasPost('owner_get_shop_referral', {}); },
    lookupReferral: function (code) { return gasPost('owner_lookup_referral', { referralCode: code }); },
    subUserInvite: function (opts) { return gasPost('owner_sub_user_invite', opts || {}); },
    fetchMaintenancePhoto: fetchMaintenancePhoto,
    parseShakenOcrForOwner: parseShakenOcrForOwner
  };
})(typeof window !== 'undefined' ? window : globalThis);