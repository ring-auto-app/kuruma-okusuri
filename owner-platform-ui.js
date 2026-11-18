/**
 * オーナー／公開制限 UI（オーナー基盤フラグ ON 時のみ有効）
 */
(function (global) {
  'use strict';

  var OP = global.ringOwnerPlatform;
  if (!OP) return;

  function active() { return OP.active && OP.active(); }

  function ownerMarkLabel(car) {
    if (!active() || !car) return '';
    var st = String(car.ownerMark || '').trim();
    if (st === 'current') return '◎';
    if (st === 'claim_required' || car.ownerClaimRequired) return '◎?';
    if (st === 'other') return '';
  }

  function injectOwnerBadges(container) {
    if (!active() || !container) return;
    container.querySelectorAll('[data-vin]').forEach(function (el) {
      var vin = el.getAttribute('data-vin');
      var cars = typeof global.loadVehicles === 'function' ? global.loadVehicles() : [];
      var car = cars.find(function (c) { return global._normalize(c.vin) === global._normalize(vin); });
      var badge = ownerMarkLabel(car);
      if (!badge) return;
      var span = el.querySelector('.ring-owner-mark');
      if (!span) {
        span = document.createElement('span');
        span.className = 'ring-owner-mark';
        span.style.cssText = 'margin-left:6px;font-weight:900;color:#059669';
        el.appendChild(span);
      }
      span.textContent = badge;
      span.title = badge === '◎' ? '現オーナー' : 'オーナー確認が必要';
    });
  }

  function pickShakenImageFile_() {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = function () { resolve(input.files && input.files[0] ? input.files[0] : null); };
      input.click();
    });
  }

  async function showOwnerClaimModal(vin, onSuccess) {
    if (!active()) return false;
    var ok = confirm(
      'この車両のオーナー（管理責任者）ですか？\n\n' +
      '他の方が既に登録している場合、車検証写真の撮影と電子車検証の専用4桁コード照合が必要です。\n' +
      '（ナンバー下4桁・型式指定番号ではありません）'
    );
    if (!ok) return false;
    var file = await pickShakenImageFile_();
    if (!file) return false;
    var b64 = '';
    if (typeof global.ringOcrCompressImageToBase64_ === 'function') {
      b64 = await global.ringOcrCompressImageToBase64_(file);
    } else if (typeof global.ringGeminiReadFileAsBase64_ === 'function') {
      b64 = await global.ringGeminiReadFileAsBase64_(file);
    } else {
      if (typeof global.showToast === 'function') global.showToast('error', 'OCRモジュールが読み込まれていません');
      return false;
    }
    if (typeof global.showLoading === 'function') global.showLoading('照合中', '車検証を読み取っています…');
    try {
      var res = await OP.claimWithShakenOcr({ vin: vin, image: b64, clientRequestId: 'claim-' + Date.now() });
      if (typeof global.hideLoading === 'function') global.hideLoading();
      if (!res || !res.success) {
        if (typeof global.showToast === 'function') {
          global.showToast('error', (res && res.error) || 'オーナー確認に失敗しました');
        }
        return false;
      }
      if (typeof OP.purgeSensitiveCaches === 'function') OP.purgeSensitiveCaches();
      if (vin && typeof global.syncMaintenanceHistoryForVin === 'function') await global.syncMaintenanceHistoryForVin(vin);
      if (typeof global.showToast === 'function') global.showToast('success', 'オーナーを確認しました');
      if (onSuccess) onSuccess(res);
      return res;
    } catch (e) {
      if (typeof global.hideLoading === 'function') global.hideLoading();
      if (typeof global.showToast === 'function') global.showToast('error', '通信エラー');
      return false;
    }
  }

  async function archiveVehicleWithPreflight(vin) {
    if (!active() || !vin) return false;
    var pre = await OP.archivePreflight(vin);
    var choice = 'keep_private';
    if (pre && pre.needsDisclosurePrompt) {
      var disclose = confirm(
        '非公開の整備履歴が ' + pre.privateCount + ' 件あります。\n\n' +
        '公開すると、次のオーナーやかかりつけ店舗から車両の状態を正しく理解してもらえるメリットがあります。\n' +
        '公開してから登録一覧から外しますか？\n\n' +
        '「キャンセル」＝非公開のまま外す（推奨の初期選択）'
      );
      choice = disclose ? 'disclose_private' : 'keep_private';
    }
    var res = await OP.archiveVehicle(vin, choice);
    if (res && res.success && typeof global.syncVehiclesFromServer === 'function') await global.syncVehiclesFromServer();
    return res;
  }

  async function renderTransferNotices(host) {
    if (!active() || !host) return;
    try {
      var json = await OP.getTransferNotices();
      var list = (json && json.notices) || [];
      if (!list.length) return;
      host.innerHTML = list.map(function (n) {
        return '<div class="card ring-owner-notice" data-notice="' + global.escapeHtml(n.noticeId) + '" data-vin="' + global.escapeHtml(n.vin) + '">' +
          '<p style="font-weight:800">この車両（' + global.escapeHtml(n.vin) + '）の管理オーナーが変更されました。売却・譲渡した場合は登録車両から外してください。</p>' +
          '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
          '<button type="button" class="btn btn-secondary ring-notice-remove">登録車両から外す</button>' +
          '<button type="button" class="btn btn-secondary ring-notice-contact">心当たりがない・問い合わせ</button>' +
          '</div></div>';
      }).join('');
      host.querySelectorAll('.ring-notice-remove').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('.ring-owner-notice');
          var id = card && card.getAttribute('data-notice');
          var vin = card && card.getAttribute('data-vin');
          var flow = vin && typeof archiveVehicleWithPreflight === 'function'
            ? archiveVehicleWithPreflight(vin)
            : Promise.resolve({ success: true });
          flow.then(function (archRes) {
            return OP.respondTransferNotice(id, 'remove_from_list', {
              privateDisclosureChoice: (archRes && archRes.privateDisclosureChoice) || 'keep_private'
            });
          }).then(function () {
            if (typeof OP.purgeSensitiveCaches === 'function') OP.purgeSensitiveCaches();
            if (typeof global.syncVehiclesFromServer === 'function') global.syncVehiclesFromServer();
            if (card) card.remove();
          });
        });
      });
      host.querySelectorAll('.ring-notice-contact').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('.ring-owner-notice');
          var id = card && card.getAttribute('data-notice');
          OP.respondTransferNotice(id, 'contact_support').then(function () {
            global.location.href = 'contact.html';
          });
        });
      });
    } catch (e) { /* ignore */ }
  }

  function buildHistoryVisibilityBar(vin) {
    if (!active()) return '';
    return '<div id="ring-history-vis-bar" style="margin:12px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<span style="font-weight:800;font-size:13px">公開設定:</span>' +
      '<button type="button" class="btn btn-secondary" id="ring-bulk-public">一括で公開</button>' +
      '<button type="button" class="btn btn-secondary" id="ring-bulk-private">一括で非公開</button>' +
      '</div>';
  }

  function wireHistoryVisibilityBar(vin, getEditableLogIds) {
    if (!active()) return;
    var pub = document.getElementById('ring-bulk-public');
    var priv = document.getElementById('ring-bulk-private');
    if (!pub || !priv) return;
    pub.onclick = async function () {
      var ids = getEditableLogIds();
      if (!ids.length) return;
      await OP.bulkHistoryVisibility(vin, ids, 'public');
      if (typeof global.syncMaintenanceHistoryForVin === 'function') await global.syncMaintenanceHistoryForVin(vin);
      global.location.reload();
    };
    priv.onclick = async function () {
      var ids = getEditableLogIds();
      if (!ids.length) return;
      await OP.bulkHistoryVisibility(vin, ids, 'private');
      if (typeof OP.purgeSensitiveCaches === 'function') OP.purgeSensitiveCaches();
      if (typeof global.syncMaintenanceHistoryForVin === 'function') await global.syncMaintenanceHistoryForVin(vin);
      global.location.reload();
    };
  }

  function buildDetailVisibilityToggle(log) {
    if (!active() || !log || !log.historyVisibilityEditable) return '';
    var priv = log.visibility === 'private';
    return '<div style="text-align:right;margin-bottom:8px">' +
      '<label style="font-size:13px;font-weight:800"><input type="checkbox" id="ring-log-vis-toggle" ' +
      (priv ? '' : 'checked') + '> 公開</label></div>';
  }

  function wireDetailVisibilityToggle(log, vin) {
    if (!active() || !log || !log.log_id) return;
    var el = document.getElementById('ring-log-vis-toggle');
    if (!el) return;
    el.addEventListener('change', async function () {
      var vis = el.checked ? 'public' : 'private';
      await OP.setHistoryVisibility(log.log_id, vis);
      if (vis === 'private' && typeof OP.purgeSensitiveCaches === 'function') OP.purgeSensitiveCaches();
      if (typeof global.syncMaintenanceHistoryForVin === 'function') await global.syncMaintenanceHistoryForVin(vin);
    });
  }

  async function loadHistoryPhotoIfNeeded(log, vin, imgEl) {
    if (!log || !imgEl) return;
    if (log.photoUrl) { imgEl.src = log.photoUrl; return; }
    if (log.photoAccess !== 'fetch' && log.hasPhoto !== true) return;
    try {
      var res = await OP.fetchMaintenancePhoto(vin, log.log_id);
      if (res && res.success && res.photoUrl) imgEl.src = res.photoUrl;
    } catch (e) { /* ignore */ }
  }

  function appendOwnerSettings(menuEl) {
    if (!active() || !menuEl) return;
    var block = document.createElement('div');
    block.className = 'settings-group';
    block.innerHTML = '<div class="settings-group-title">整備履歴の公開</div>' +
      '<ul class="settings-list">' +
      '<li><a href="#" id="ring-owner-pref-public">新規履歴を公開で保存（既定）</a></li>' +
      '<li><a href="#" id="ring-owner-pref-private">新規履歴を非公開で保存</a></li>' +
      '<li><a href="user_past_vehicles.html">過去の車両</a></li>' +
      '<li><a href="#" id="ring-sub-invite-link">副ユーザーを招待（QR）</a></li>' +
      '</ul>';
    menuEl.insertBefore(block, menuEl.firstChild);
    var pub = block.querySelector('#ring-owner-pref-public');
    var prv = block.querySelector('#ring-owner-pref-private');
    if (pub) pub.onclick = function (e) {
      e.preventDefault();
      OP.setDefaultVisibility('public').then(function () {
        if (typeof global.showToast === 'function') global.showToast('success', '新規履歴は公開が既定です');
      });
    };
    if (prv) prv.onclick = function (e) {
      e.preventDefault();
      OP.setDefaultVisibility('private').then(function () {
        if (typeof global.showToast === 'function') global.showToast('success', '新規履歴は非公開が既定です');
      });
    };
    var subL = block.querySelector('#ring-sub-invite-link');
    if (subL) subL.onclick = async function (e) {
      e.preventDefault();
      var vin = prompt('招待する車両のVIN（空欄＝全車両）', '');
      if (vin === null) return;
      var res = await OP.createSubInvite(String(vin || '').trim());
      if (!res || !res.success) {
        if (typeof global.showToast === 'function') global.showToast('error', (res && res.error) || '招待できませんでした');
        return;
      }
      var link = global.location.origin + global.location.pathname.replace(/[^/]+$/, '') +
        'user_sub_invite_accept.html?grant=' + encodeURIComponent(res.grantId || res.inviteQrPayload);
      alert('招待リンク（QRに変換してください）:\n' + link);
    };
  }

  async function promptOwnerOnVehicleAdd(vin) {
    if (!active() || !vin) return true;
    var ok = confirm('この車両のオーナーですか？\n\n別の方が既に登録している場合は、車検証写真の読み取りと電子車検証の4桁コードが必要です。');
    if (!ok) return false;
    return true;
  }

  global.ringOwnerPlatformUi = {
    active: active,
    injectOwnerBadges: injectOwnerBadges,
    showOwnerClaimModal: showOwnerClaimModal,
    renderTransferNotices: renderTransferNotices,
    buildHistoryVisibilityBar: buildHistoryVisibilityBar,
    wireHistoryVisibilityBar: wireHistoryVisibilityBar,
    buildDetailVisibilityToggle: buildDetailVisibilityToggle,
    wireDetailVisibilityToggle: wireDetailVisibilityToggle,
    loadHistoryPhotoIfNeeded: loadHistoryPhotoIfNeeded,
    appendOwnerSettings: appendOwnerSettings,
    promptOwnerOnVehicleAdd: promptOwnerOnVehicleAdd,
    archiveVehicleWithPreflight: archiveVehicleWithPreflight,
    ownerMarkHtml: function (car) {
      var b = ownerMarkLabel(car);
      if (!b) return '';
      return '<span class="ring-owner-mark" title="オーナー状態">' + b + '</span>';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);