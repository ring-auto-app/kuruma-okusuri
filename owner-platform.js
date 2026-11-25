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
    if (typeof ringHistoryView_ !== 'undefined') ringHistoryView_.clear();
    if (typeof global.ringSyncEngine !== 'undefined' &&
        typeof global.ringSyncEngine.invalidateAllLocalPartitions === 'function') {
      global.ringSyncEngine.invalidateAllLocalPartitions().catch(function () { /* ignore */ });
    }
    try {
      global.sessionStorage.removeItem('ring_factory_vin_search_flash_v1');
    } catch (e2) { /* ignore */ }
  }

  async function resyncAllCachedVins() {
    if (typeof global.loadVehicles !== 'function' || typeof global.syncMaintenanceHistoryForVin !== 'function') return;
    var vs = global.loadVehicles().map(function (c) { return c.vin; }).filter(Boolean);
    for (var i = 0; i < vs.length; i++) {
      try { await global.syncMaintenanceHistoryForVin(vs[i]); } catch (e) { /* ignore */ }
    }
  }

  async function fetchMaintenancePhoto(vin, logId) {
    return gasPost('get_maintenance_photo', { vin: vin, log_id: logId });
  }

  global.ringRenderLocalQr_ = function (host, value) {
    var qr = global.qrcode(0, 'M');
    qr.addData(value); qr.make();
    host.innerHTML = qr.createSvgTag({ scalable: true, margin: 8 });
    host.style.maxWidth = '216px';
  };
  global.ringOwnerPlatform = {
    active: ownerPlatformActive,
    ready: async function () {
      if (ownerPlatformActive()) return true;
      var result = await global.ringVerifySession(global.ringResolveActiveAuthToken(), global.ringGetActiveMode());
      return !!(result.success && !result.offline && ownerPlatformActive());
    },
    purgeSensitiveCaches: purgeSensitiveCaches,
    claimTransfer: function (p) { return gasPost('owner_claim_transfer', p); },
    claimWithShakenOcr: function (p) { return gasPost('owner_claim_shaken_ocr', p); },
    archivePreflight: function (vin) { return gasPost('owner_archive_preflight', { vin: vin }); },
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
    respondTransferNotice: function (noticeId, noticeAction, extra) {
      extra = extra || {};
      return gasPost('owner_respond_transfer_notice', Object.assign({ noticeId: noticeId, noticeAction: noticeAction }, extra));
    },
    listPastVehicles: function () { return gasPost('owner_list_past_vehicles', {}); },
    getShopReferral: function () { return gasPost('owner_get_shop_referral', {}); },
    lookupReferral: function (code) { return gasPost('owner_lookup_referral', { referralCode: code }); },
    subUserInvite: function (opts) { return gasPost('owner_sub_user_invite', opts || {}); },
    fetchMaintenancePhoto: fetchMaintenancePhoto,
    parseShakenOcrForOwner: parseShakenOcrForOwner,
    resyncAllCachedVins: resyncAllCachedVins,
    listFavoriteShops: function () { return gasPost('owner_list_favorite_shops', {}); },
    setFavoriteVehiclePermission: function (o) { return gasPost('owner_set_favorite_vehicle_permission', o || {}); },
    acceptSubInvite: function (grantId) { return gasPost('owner_accept_sub_invite', { grantId: grantId }); },
    createSubInvite: function (vin) { return gasPost('owner_sub_user_invite', { vin: vin }); }
  };
})(typeof window !== 'undefined' ? window : globalThis);