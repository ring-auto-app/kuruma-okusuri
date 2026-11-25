/**
 * オーナー／公開制限 UI（オーナー基盤フラグ ON 時のみ有効）
 */
(function (global) {
  'use strict';

  var OP = global.ringOwnerPlatform;
  if (!OP) return;

  function active() { return OP.active && OP.active(); }

  function ownerDialog(title, message, choices, extra) {
    var dialog = document.createElement('dialog');
    dialog.className = 'owner-dialog';
    dialog.setAttribute('aria-label', title);
    var heading = document.createElement('h2');
    heading.textContent = title;
    var description = document.createElement('p');
    description.textContent = message;
    dialog.append(heading, description);
    if (extra) dialog.append(extra);
    return new Promise(function (resolve) {
      var scope = ringCaptureRequestContext_();
      function invalidate() {
        if (!ringRequestContextIsCurrent_(scope)) finish(null);
      }
      function finish(value) {
        global.removeEventListener('storage', invalidate);
        global.removeEventListener('ring-auth-context-changed', invalidate);
        dialog.close(); dialog.remove(); resolve(value);
      }
      global.addEventListener('storage', invalidate);
      global.addEventListener('ring-auth-context-changed', invalidate);
      choices.forEach(function (choice) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-secondary';
        button.textContent = choice[1];
        button.onclick = function () {
          if (typeof choice[0] === 'function') {
            var value = choice[0]();
            if (value !== undefined) finish(value);
          } else finish(choice[0]);
        };
        dialog.append(button);
      });
      dialog.oncancel = function (event) { event.preventDefault(); finish(null); };
      document.body.append(dialog);
      dialog.showModal();
    });
  }

  function ownerInputDialog(title, message, label, submit, isCode) {
    var field = document.createElement('label');
    field.className = 'owner-input-field';
    field.textContent = label;
    var input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.autocapitalize = isCode ? 'off' : 'characters';
    input.autofocus = true;
    if (isCode) {
      input.inputMode = 'numeric';
      input.maxLength = 4;
    }
    var error = document.createElement('span');
    error.setAttribute('role','alert');
    field.append(input, error);
    function collect() {
      var value = input.value.trim();
      if (isCode && !/^[0-9]{4}$/.test(value)) {
        error.textContent = '半角の数字4桁を入力してください。';
        input.setAttribute('aria-invalid','true'); input.focus();
        return;
      }
      return isCode ? value : value.toUpperCase();
    }
    input.oninput = function () { error.textContent = ''; input.removeAttribute('aria-invalid'); };
    input.onkeydown = function (e) {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); field.closest('dialog').querySelector('button').click(); }
    };
    return ownerDialog(title, message, [[collect,submit],[null,'キャンセル']], field);
  }

  function ownerMarkLabel(car) {
    if (!active() || !car) return '';
    var st = String(car.ownerMark || '').trim();
    if (st === 'current') return '◎ オーナー確認済み';
    if (st === 'claim_required' || car.ownerClaimRequired) return '◎? オーナーを確認';
    if (st === 'other' || st === 'unset') return '◎? オーナーを確認';
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
      span.title = badge;
    });
  }

  function pickShakenImageFile_() {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.oncancel = function () { resolve(null); };
      input.onchange = function () { resolve(input.files && input.files[0] ? input.files[0] : null); };
      input.click();
    });
  }

  async function showOwnerClaimModal(vin, onSuccess) {
    if (!await OP.ready()) { global.showToast('error','接続とログイン状態を確認してください'); return false; }
    var context = ringCaptureRequestContext_();
    var securityCode = await ownerInputDialog('オーナーの確認', '対象車両 ' + vin +
      '。ご本人の電子車検証を用意してください。写真のVIN・専用コードと照合します。',
      '電子車検証の専用4桁（先頭の0を含む）', '車検証の写真を選ぶ', true);
    if (securityCode === null || !ringRequestContextIsCurrent_(context)) return false;
    var file = await pickShakenImageFile_();
    if (!file || !ringRequestContextIsCurrent_(context)) return false;
    try {
      if (typeof global.showLoading === 'function') global.showLoading('照合中', '車検証を読み取っています…');
      var read = global.ringOcrCompressImageToBase64_ || global.ringGeminiReadFileAsBase64_;
      if (!read) throw new Error('OCR_UNAVAILABLE');
      var b64 = await read(file);
      if (!ringRequestContextIsCurrent_(context)) return false;
      var res = await OP.claimWithShakenOcr({ vin: vin, image: b64, securityCode: securityCode, clientRequestId: 'claim-' + Date.now() });
      if (!ringRequestContextIsCurrent_(context)) return false;
      if (!res || !res.success) throw new Error((res && res.error) || 'OCR_FAILED');
      OP.purgeSensitiveCaches();
      if (typeof global.syncMaintenanceHistoryForVin === 'function') await global.syncMaintenanceHistoryForVin(vin);
      if (!ringRequestContextIsCurrent_(context)) return false;
      global.showToast('success', 'オーナーを確認しました');
      if (onSuccess) onSuccess(res);
      return res;
    } catch (e) {
      if (!ringRequestContextIsCurrent_(context)) return false;
      var message = /MISMATCH/.test(String(e)) ? '車台番号または専用4桁が一致しません。写真と入力を確認してください。'
        : /OCR|NO_IMAGES/.test(String(e)) ? '車検証を読み取れませんでした。文字が鮮明な写真で再試行してください。'
        : '確認結果を取得できません。通信復旧後に車両情報を再読み込みしてください。';
      global.showToast('error', message);
      return false;
    } finally {
      if (ringRequestContextIsCurrent_(context) && typeof global.hideLoading === 'function') global.hideLoading();
    }
  }

  async function archiveVehicleWithPreflight(vin) {
    if (!active() || !vin) return false;
    var pre = await OP.archivePreflight(vin);
    if (!pre || !pre.success) throw new Error('登録状況を取得できませんでした');
    var choices = [['keep_private', '非公開のまま外す']];
    if (pre.needsDisclosurePrompt) choices.push(['disclose_private', '自分の期間の履歴を公開して外す']);
    choices.push([null, '操作を中止']);
    var choice = await ownerDialog('登録車両から外す', '履歴は過去の車両に残ります。公開すると、車台番号で検索した利用者がその履歴を閲覧できます。', choices);
    if (!choice) return false;
    var res = await OP.archiveVehicle(vin, choice);
    if (res && res.success && typeof global.syncVehiclesFromServer === 'function') await global.syncVehiclesFromServer();
    return res;
  }

  async function renderTransferNotices(host) {
    if (!host || !await OP.ready()) return;
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
          btn.disabled = true;
          flow.then(function (archRes) {
            if (!archRes || !archRes.success) return null;
            return OP.respondTransferNotice(id, 'remove_from_list', {
              privateDisclosureChoice: (archRes && archRes.privateDisclosureChoice) || 'keep_private'
            });
          }).then(function (result) {
            if (!result || !result.success) return;
            if (typeof OP.purgeSensitiveCaches === 'function') OP.purgeSensitiveCaches();
            if (typeof global.syncVehiclesFromServer === 'function') global.syncVehiclesFromServer();
            if (card) card.remove();
          }).catch(function () { global.showToast('error','変更できませんでした。再試行してください'); }).finally(function () { btn.disabled = false; });
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

  function isMaintenanceVisibilityLog_(log) {
    if (!log) return false;
    var t = log.type;
    if (t === 'inspection' || t === 'inspection_user') return false;
    if (t && String(t).startsWith('inspection')) return false;
    return true;
  }

  /** @returns {'public'|'private'} */
  function ringNormalizeHistoryVisibility_(value) {
    return String(value == null ? 'public' : value).trim().toLowerCase() === 'private' ? 'private' : 'public';
  }

  function ringHistoryIsPrivate_(log) {
    return ringNormalizeHistoryVisibility_(log && log.visibility) === 'private';
  }

  function ringHistoryVisibilityLabel_(log) {
    return ringHistoryIsPrivate_(log) ? '非公開' : '公開';
  }

  /** checked=true は非公開（チェックあり＝非公開） */
  function ringHistoryVisibilityUiState_(log) {
    var isPrivate = ringHistoryIsPrivate_(log);
    return {
      isPrivate: isPrivate,
      visibility: isPrivate ? 'private' : 'public',
      label: isPrivate ? '非公開' : '公開',
      checked: isPrivate
    };
  }

  async function ringRefreshLogVisibilityFromCache_(log, vin) {
    if (!log || !log.log_id || typeof global.getMaintenanceLogsByVin !== 'function') return log;
    var fresh = global.getMaintenanceLogsByVin(vin).find(function (l) { return l && l.log_id === log.log_id; });
    if (fresh) {
      log.visibility = ringNormalizeHistoryVisibility_(fresh.visibility);
      return fresh;
    }
    log.visibility = ringNormalizeHistoryVisibility_(log.visibility);
    return log;
  }

  function filterEditableVisibilityLogs_(logs) {
    return (logs || []).filter(function (l) {
      return isMaintenanceVisibilityLog_(l) && l.historyVisibilityEditable;
    });
  }

  function bulkPrivateCheckboxState_(logs) {
    var editable = filterEditableVisibilityLogs_(logs);
    if (!editable.length) return { show: false };
    var priv = editable.filter(function (l) { return ringHistoryIsPrivate_(l); });
    if (!priv.length) return { show: true, checked: false, indeterminate: false, count: editable.length };
    if (priv.length === editable.length) return { show: true, checked: true, indeterminate: false, count: editable.length };
    return { show: true, checked: false, indeterminate: true, count: editable.length };
  }

  function syncBulkPrivateCheckboxUi_(el, state) {
    if (!el) return;
    el.indeterminate = !!state.indeterminate;
    el.checked = !!state.checked;
    el.disabled = !active();
  }

  async function applyBulkVisibilityChange_(vin, logs, makePrivate) {
    var editable = filterEditableVisibilityLogs_(logs);
    if (!editable.length) {
      global.showToast('error', '変更できる履歴がありません');
      return false;
    }
    var ids = editable.map(function (l) { return l.log_id; });
    var vis = makePrivate ? 'private' : 'public';
    var verb = makePrivate ? '非公開' : '公開';
    if (!confirm('現在の検索・年度条件で対象となる変更可能な整備履歴 ' + ids.length + ' 件を一括で' + verb + 'にしますか？')) return false;
    try {
      var res = await OP.bulkHistoryVisibility(vin, ids, vis);
      if (!res || res.success !== true || res.updated !== ids.length) throw new Error('PARTIAL');
      if (vis === 'private' && typeof OP.purgeSensitiveCaches === 'function') OP.purgeSensitiveCaches();
      if (typeof global.syncMaintenanceHistoryForVin === 'function') await global.syncMaintenanceHistoryForVin(vin);
      editable.forEach(function (l) { l.visibility = vis; });
      return true;
    } catch (eBulk) {
      global.showToast('error', '変更結果を確認できません。履歴を再取得してください。');
      if (typeof global.syncMaintenanceHistoryForVin === 'function') await global.syncMaintenanceHistoryForVin(vin);
      return false;
    }
  }

  /** @param {HTMLElement} host */
  function mountHistoryListVisibility(host, vin, getFilteredLogs, onAfterChange) {
    if (!host || !vin || typeof getFilteredLogs !== 'function') return;
    host.setAttribute('data-ring-vis-list', vin);
    host._ringVisGetLogs = getFilteredLogs;
    host._ringVisOnAfter = onAfterChange;
    var logs = getFilteredLogs();
  var state = bulkPrivateCheckboxState_(logs);
    if (!state.show || !active()) {
      host.innerHTML = '';
      host._ringVisWired = false;
      return;
    }
    if (!host._ringVisWired) {
      host.innerHTML = '<label class="ring-vis-compact" title="検索・年度条件内で変更可能な整備履歴が対象">' +
        '<input type="checkbox" id="ring-bulk-private-toggle" aria-label="一括非公開">一括非公開</label>';
      var toggle = host.querySelector('#ring-bulk-private-toggle');
      toggle.addEventListener('change', async function () {
        if (toggle.disabled) return;
        var wantPrivate = toggle.checked;
        var prevIndet = toggle.indeterminate;
        toggle.disabled = true;
        var ok = await applyBulkVisibilityChange_(vin, host._ringVisGetLogs(), wantPrivate);
        if (!ok) {
          var st = bulkPrivateCheckboxState_(host._ringVisGetLogs());
          syncBulkPrivateCheckboxUi_(toggle, st);
        } else if (typeof host._ringVisOnAfter === 'function') host._ringVisOnAfter();
        else syncBulkPrivateCheckboxUi_(toggle, bulkPrivateCheckboxState_(host._ringVisGetLogs()));
        toggle.disabled = !active();
        if (prevIndet && !ok) toggle.indeterminate = true;
      });
      host._ringVisWired = true;
    }
    syncBulkPrivateCheckboxUi_(host.querySelector('#ring-bulk-private-toggle'), state);
  }

  function buildHistoryVisibilityBar() {
    return '';
  }

  function wireHistoryVisibilityBar(vin, getEditableLogIds) {
    var host = document.getElementById('ring-history-vis-host') || document.getElementById('ownerBulkBar');
    if (!host) return;
    mountHistoryListVisibility(host, vin, function () {
      return (getEditableLogIds && getEditableLogIds()) ? [] : [];
    });
  }

  function buildDetailVisibilityToggle(log) {
    if (!log || !isMaintenanceVisibilityLog_(log)) return '';
    var state = ringHistoryVisibilityUiState_(log);
    if (!log.historyVisibilityEditable) {
      return '<span class="ring-vis-compact ring-vis-readonly" aria-live="polite">' + state.label + '</span>';
    }
    return '<label class="ring-vis-compact ring-vis-detail-slot">' +
      '<input type="checkbox" id="ring-log-vis-toggle" aria-label="非公開"' + (state.checked ? ' checked' : '') + '>非公開</label>';
  }

  function wireDetailVisibilityToggle(log, vin, onUpdated) {
    if (!log || !log.log_id) return;
    var el = document.getElementById('ring-log-vis-toggle');
    if (!el) return;
    if (el._ringVisWired) return;
    el._ringVisWired = true;
    el.addEventListener('change', async function () {
      var wantPrivate = el.checked;
      var vis = wantPrivate ? 'private' : 'public';
      el.disabled = true;
      var saved = false;
      try {
        var result = await OP.setHistoryVisibility(log.log_id, vis);
        if (!result || result.success !== true) throw new Error('SAVE_FAILED');
        saved = true;
        log.visibility = ringNormalizeHistoryVisibility_(vis);
        if (typeof global.showToast === 'function') global.showToast('success', '公開設定を保存しました');
      } catch (e) {
        global.showToast('error', '公開設定の保存を確認できません。再取得してください。');
        if (typeof global.syncMaintenanceHistoryForVin === 'function') {
          try { await global.syncMaintenanceHistoryForVin(vin); } catch (eSync) { /* ignore */ }
        }
        await ringRefreshLogVisibilityFromCache_(log, vin);
        var failState = ringHistoryVisibilityUiState_(log);
        el.checked = failState.checked;
        if (typeof onUpdated === 'function') onUpdated(log);
        return;
      } finally { el.disabled = false; }
      if (saved && vis === 'private' && typeof OP.purgeSensitiveCaches === 'function') OP.purgeSensitiveCaches();
      if (saved && typeof global.syncMaintenanceHistoryForVin === 'function') {
        try { await global.syncMaintenanceHistoryForVin(vin); } catch (eSync2) { /* ignore */ }
      }
      if (saved) {
        await ringRefreshLogVisibilityFromCache_(log, vin);
        var okState = ringHistoryVisibilityUiState_(log);
        el.checked = okState.checked;
        if (typeof onUpdated === 'function') onUpdated(log);
      }
    });
  }

  async function loadHistoryPhotoIfNeeded(log, vin, img) {
    if (log && img) await global.ringShowMaintenancePhoto_(log, img);
  }

  async function appendOwnerSettings(menuEl) {
    if (!menuEl || menuEl.querySelector('#ring-owner-pref-public')) return;
    try { if (!await OP.ready() || !menuEl.isConnected) return; }
    catch (err) { return; }
    if (menuEl.querySelector('#ring-owner-pref-public')) return;
    var block = document.createElement('div');
    block.className = 'settings-group';
    block.innerHTML = '<div class="settings-group-title">🔒 整備履歴の公開設定</div>' +
      '<ul class="settings-list">' +
      '<li><a href="history_visibility_settings.html">設定画面を開く</a></li>' +
      '<li><a href="#" id="ring-owner-pref-public">新規履歴を公開で保存（既定）</a></li>' +
      '<li><a href="#" id="ring-owner-pref-private">新規履歴を非公開で保存</a></li>' +
      '<li><a href="user_past_vehicles.html">過去の車両</a></li>' +
      '<li><a href="#" id="ring-sub-invite-link">副ユーザーを招待（QR）</a></li>' +
      '</ul>';
    menuEl.insertBefore(block, menuEl.firstChild);
    var pub = block.querySelector('#ring-owner-pref-public');
    var prv = block.querySelector('#ring-owner-pref-private');
    function bindPreference(link, value, label) {
      link.onclick = async function (e) {
        e.preventDefault();
        if (block.dataset.saving) return;
        block.dataset.saving = '1';
        try {
          await OP.setDefaultVisibility(value);
          try { global.localStorage.setItem('ring_owner_default_vis', value === 'private' ? '非公開' : '公開'); } catch (eLS) { /* ignore */ }
          global.showToast('success', label);
        }
        catch (err) { global.showToast('error', '初期設定を保存できませんでした。再試行してください。'); }
        finally { delete block.dataset.saving; }
      };
    }
    bindPreference(pub, 'public', '新規履歴は公開が既定です');
    bindPreference(prv, 'private', '新規履歴は非公開が既定です');
    var subL = block.querySelector('#ring-sub-invite-link');
    if (subL) subL.onclick = async function (e) {
      e.preventDefault();
      if (subL.dataset.saving) return;
      subL.dataset.saving = '1';
      var context = ringCaptureRequestContext_();
      var vin = await ownerInputDialog('副ユーザーの招待', '車両を指定してください。空欄の場合は現在管理している全車両が対象です。',
        '招待する車両のVIN', '招待QRを作成', false);
      if (vin === null || !ringRequestContextIsCurrent_(context)) { delete subL.dataset.saving; return; }
      global.showLoading('招待を作成中','');
      var res;
      try { res = await OP.createSubInvite(String(vin || '').trim()); }
      catch (err) { if (ringRequestContextIsCurrent_(context)) global.showToast('error','招待を作成できませんでした。対象車両と通信を確認してください。'); return; }
      finally { if (ringRequestContextIsCurrent_(context)) global.hideLoading(); delete subL.dataset.saving; }
      if (!ringRequestContextIsCurrent_(context)) return;
      if (!res || !res.success) {
        if (typeof global.showToast === 'function') global.showToast('error', (res && res.error) || '招待できませんでした');
        return;
      }
      var link = global.location.origin + global.location.pathname.replace(/[^/]+$/, '') +
        'user_sub_invite_accept.html?grant=' + encodeURIComponent(res.grantId || res.inviteQrPayload);
      var box = document.createElement('div');
      global.ringRenderLocalQr_(box, link);
      var url = document.createElement('input');
      url.readOnly = true; url.value = link; url.setAttribute('aria-label','招待リンク');
      url.onclick = function () { url.select(); }; box.append(url);
      await ownerDialog('副ユーザー招待', 'このQRまたはリンクを招待する相手だけに渡してください。受諾期限は24時間です。', [[null,'閉じる']], box);
    };
  }

  async function promptOwnerOnVehicleAdd(vin) {
    if (!vin) return false;
    return ownerDialog('オーナーの登録', '車台番号 ' + vin + ' のオーナーですか？ 別の登録者がいる場合は車検証で確認します。',
      [[true,'はい、オーナーです'],[false,'オーナーではありません'],[null,'登録を中止']]);
  }

  async function promptFleetOwnerOnVehicleAdd(vin) {
    if (!vin) return null;
    return ownerDialog('自社所有の確認', '車台番号 ' + vin + ' は貴社が所有するレンタカー・代車ですか？ 別のオーナーがいる場合は車検証で確認します。',
      [[true,'はい、自社所有です'],[false,'自社所有ではありません'],[null,'登録を中止']]);
  }

  document.addEventListener('click', async function (event) {
    var button = event.target.closest && event.target.closest('[data-owner-claim]');
    if (!button || button.disabled) return;
    button.disabled = true;
    try { if (await showOwnerClaimModal(button.dataset.ownerClaim)) { await global.syncVehiclesFromServer(); global.location.reload(); } }
    catch (err) { global.showToast('error','車両情報を更新できませんでした'); }
    finally { button.disabled = false; }
  });

  global.addEventListener('ring-gas-features-updated', function () {
    document.querySelectorAll('[data-ring-vis-list]').forEach(function (host) {
      if (!host._ringVisGetLogs) return;
      var vin = host.getAttribute('data-ring-vis-list');
      mountHistoryListVisibility(host, vin, host._ringVisGetLogs, host._ringVisOnAfter);
    });
  });

  global.ringOwnerPlatformUi = {
    active: active,
    injectOwnerBadges: injectOwnerBadges,
    showOwnerClaimModal: showOwnerClaimModal,
    renderTransferNotices: renderTransferNotices,
    mountHistoryListVisibility: mountHistoryListVisibility,
    buildHistoryVisibilityBar: buildHistoryVisibilityBar,
    wireHistoryVisibilityBar: wireHistoryVisibilityBar,
    buildDetailVisibilityToggle: buildDetailVisibilityToggle,
    wireDetailVisibilityToggle: wireDetailVisibilityToggle,
    loadHistoryPhotoIfNeeded: loadHistoryPhotoIfNeeded,
    appendOwnerSettings: appendOwnerSettings,
    promptOwnerOnVehicleAdd: promptOwnerOnVehicleAdd,
    promptFleetOwnerOnVehicleAdd: promptFleetOwnerOnVehicleAdd,
    archiveVehicleWithPreflight: archiveVehicleWithPreflight,
    filterEditableVisibilityLogs: filterEditableVisibilityLogs_,
    historyVisibilityUiState: ringHistoryVisibilityUiState_,
    historyVisibilityLabel: ringHistoryVisibilityLabel_,
    syncHistoryVisibilityRowDom: function (rowEl, log) {
      if (!rowEl || !log) return;
      var state = ringHistoryVisibilityUiState_(log);
      var meta = rowEl.querySelector('[data-ring-vis-state]');
      if (meta) meta.textContent = state.label;
      var cb = rowEl.querySelector('input[type="checkbox"]');
      if (cb) {
        cb.checked = state.checked;
        cb.removeAttribute('aria-invalid');
      }
    },
    ownerMarkHtml: function (car) {
      var b = ownerMarkLabel(car);
      if (!b) return '';
      if (car.ownerMark !== 'current') return '<button type="button" class="btn btn-secondary" data-owner-claim="' + global.escapeHtml(car.vin) + '">' + b + '</button>';
      return '<span class="ring-owner-mark" title="オーナー状態">' + b + '</span>';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);