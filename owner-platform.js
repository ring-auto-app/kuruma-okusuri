/**
 * オーナー／公開制限 — クライアント補助（serverFeatures.ownerPlatformOperational 時のみ）
 * 本番公開前は無効（GAS フラグ・シート未作成時はサーバーが legacy のまま）
 */
(function (global) {
  'use strict';

  var API = global.ringApiPost || global.ringGasPost;
  if (typeof API !== 'function') return;

  function ownerPlatformActive() {
    var sf = global.ringServerFeatures || {};
    return !!(sf.ownerPlatform && sf.ownerPlatformOperational);
  }

  function ownerClaimTransfer(payload) {
    return API(Object.assign({ action: 'owner_claim_transfer' }, payload));
  }

  function ownerSetHistoryVisibility(logId, visibility) {
    return API({ action: 'owner_set_history_visibility', log_id: logId, visibility: visibility });
  }

  function ownerSetDefaultVisibility(visibility) {
    return API({ action: 'owner_set_user_prefs', defaultHistoryVisibility: visibility });
  }

  function ownerRegisterFavoriteShop(opts) {
    return API(Object.assign({ action: 'owner_register_favorite_shop' }, opts || {}));
  }

  function ownerArchiveVehicle(vin, privateDisclosureChoice) {
    return API({
      action: 'owner_archive_vehicle',
      vin: vin,
      privateDisclosureChoice: privateDisclosureChoice || 'keep_private'
    });
  }

  function parseShakenOcrForOwner(ocrResult) {
    if (!ocrResult || typeof ocrResult !== 'object') return { vin: '', securityCode: '' };
    var vin = String(ocrResult.vin || ocrResult.VIN || '').trim();
    var code = String(
      ocrResult.eshakenSecurityCode || ocrResult.securityCode || ocrResult.eShakenSecurityCode || ''
    ).trim().replace(/\s+/g, '');
    if (!/^[0-9]{4}$/.test(code)) code = '';
    return { vin: vin, securityCode: code };
  }

  global.ringOwnerPlatform = {
    active: ownerPlatformActive,
    claimTransfer: ownerClaimTransfer,
    setHistoryVisibility: ownerSetHistoryVisibility,
    setDefaultVisibility: ownerSetDefaultVisibility,
    registerFavoriteShop: ownerRegisterFavoriteShop,
    archiveVehicle: ownerArchiveVehicle,
    parseShakenOcrForOwner: parseShakenOcrForOwner
  };
})(typeof window !== 'undefined' ? window : globalThis);