/**
 * スタッフ管理（工場・販売店共通）
 * factory_admin.html / dealer_admin.html から ringStaffAdminMount_(division) で起動
 */
(function (global) {
    'use strict';

    var ROLE_MAP = {
        staff: { cls: 'r-staff', label: '✅ 全入力可' },
        inspector: { cls: 'r-inspector', label: '🔵 日常点検のみ' },
        viewer: { cls: 'r-viewer', label: '👁 閲覧のみ' }
    };

    var state_ = { profile: null, config: null };

    function pageConfig_(division) {
        if (division === 'dealer') {
            return {
                division: 'dealer',
                authMode: 'business',
                loginTab: 'business',
                homeUrl: 'dealer_home.html',
                pageTitle: 'スタッフ管理',
                listHint: 'スタッフが未登録の店舗では、日常点検の入力者表示に「会社情報」の代表者名が使われます。'
            };
        }
        return {
            division: 'factory',
            authMode: 'shop',
            loginTab: 'shop',
            homeUrl: 'factory_home.html',
            pageTitle: 'スタッフ管理',
            listHint: 'スタッフが未登録の店舗では、日常点検の入力者表示に「会社・工場情報」の代表者名が使われます。'
        };
    }

    function staffLocalKey_(shopId) {
        return 'nappy_staff_' + String(shopId || '').trim();
    }

    function escapeHtml_(str) {
        return String(str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
        });
    }

    function resolveAuthToken_() {
        if (typeof ringResolveActiveAuthToken === 'function') {
            var t = ringResolveActiveAuthToken();
            if (t) return t;
        }
        return localStorage.getItem('ring_auth_token') || '';
    }

    /**
     * ガード + 起動。失敗時は null
     * @param {'factory'|'dealer'} expectedDivision
     */
    function boot_(expectedDivision) {
        var config = pageConfig_(expectedDivision);
        if (typeof ringBootAuthForMode === 'function') {
            var boot = ringBootAuthForMode(config.authMode);
            if (!boot.ok) {
                location.replace('login.html?tab=' + config.loginTab);
                return null;
            }
        }
        var profile = typeof getCurrentProfile === 'function' ? getCurrentProfile() : null;
        if (!profile || profile.shopType !== expectedDivision) {
            location.replace('login.html?tab=' + config.loginTab);
            return null;
        }
        if (profile.role !== 'master') {
            alert('このページにアクセスする権限がありません。（オーナー専用）');
            location.replace('index.html');
            return null;
        }
        if (!resolveAuthToken_()) {
            alert('ログインセッションが切れています。再度ログインしてください。');
            location.replace('login.html?tab=' + config.loginTab);
            return null;
        }
        return { profile: profile, config: config };
    }

    function applyRoleStyle_(sel) {
        sel.className = 'role-select ' + (ROLE_MAP[sel.value]?.cls || 'r-staff');
    }

    function renderTable_(list) {
        var tbody = document.getElementById('staffList');
        if (!tbody) return;
        tbody.innerHTML = '';

        list.forEach(function (staff) {
            var isMaster = staff.role === 'master';
            var role = staff.role || 'staff';
            var rm = ROLE_MAP[role] || ROLE_MAP.staff;
            var eid = escapeHtml_(staff.loginId);

            var restrictCell = isMaster
                ? '<span class="badge-master">👑 オーナー</span>'
                : '<div class="role-wrap">' +
                  '<select class="role-select ' + rm.cls + '" ' +
                  'onchange="ringStaffAdminChangeRole(\'' + eid + '\', this.value); ringStaffAdminApplyRoleStyle(this);">' +
                  '<option value="staff"' + (role === 'staff' ? ' selected' : '') + '>✅ 全入力可</option>' +
                  '<option value="inspector"' + (role === 'inspector' ? ' selected' : '') + '>🔵 日常点検のみ</option>' +
                  '<option value="viewer"' + (role === 'viewer' ? ' selected' : '') + '>👁 閲覧のみ</option>' +
                  '</select></div>';

            var deleteCell = isMaster
                ? ''
                : '<button class="btn-delete" onclick="ringStaffAdminDeleteStaff(\'' + eid + '\')" title="削除">🗑</button>';

            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td class="col-id">' + eid + '</td>' +
                '<td class="col-name">' + escapeHtml_(staff.realName) + '</td>' +
                '<td class="col-name">' + escapeHtml_(staff.displayName) + '</td>' +
                '<td>' + restrictCell + '</td>' +
                '<td>' + deleteCell + '</td>';
            tbody.appendChild(tr);
        });
    }

    function renderLocalStaff_() {
        var profile = state_.profile;
        if (!profile) return;
        var key = staffLocalKey_(profile.shopId);
        var local = typeof safeJsonParse === 'function'
            ? safeJsonParse(localStorage.getItem(key), [])
            : [];
        var tbody = document.getElementById('staffList');
        if (!tbody) return;
        if (local.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="5" class="empty-note">📡 サーバー未接続<br>' +
                '<span style="font-size:12px;">まだスタッフが追加されていません</span></td></tr>';
        } else {
            renderTable_(local);
        }
    }

    async function loadStaffList_() {
        var profile = state_.profile;
        if (!profile) return;
        if (!resolveAuthToken_()) {
            renderLocalStaff_();
            return;
        }
        if (typeof showLoading === 'function') {
            showLoading('データ取得中', 'スタッフ一覧を読み込んでいます...');
        }
        try {
            var controller = new AbortController();
            var timer = setTimeout(function () { controller.abort(); }, 8000);
            var res = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'get_staff',
                    authToken: resolveAuthToken_(),
                    shopId: profile.shopId
                }),
                signal: controller.signal
            });
            clearTimeout(timer);
            var data = await res.json();

            if (data.success) {
                var key = staffLocalKey_(profile.shopId);
                var local = typeof safeJsonParse === 'function'
                    ? safeJsonParse(localStorage.getItem(key), [])
                    : [];
                var gasIds = new Set(data.staffList.map(function (s) { return s.loginId; }));
                var merged = data.staffList.concat(local.filter(function (s) {
                    return !gasIds.has(s.loginId);
                }));
                renderTable_(merged);
            } else {
                renderLocalStaff_();
            }
        } catch (e) {
            renderLocalStaff_();
        } finally {
            if (typeof hideLoading === 'function') hideLoading();
        }
    }

    async function changeRole_(loginId, newRole) {
        var profile = state_.profile;
        if (!profile) return;
        try {
            var res = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'update_staff_status',
                    authToken: resolveAuthToken_(),
                    shopId: profile.shopId,
                    loginId: loginId,
                    newRole: newRole
                })
            });
            var data = await res.json();
            if (!data.success) throw new Error(data.error || '権限変更に失敗しました');

            var key = staffLocalKey_(profile.shopId);
            var staff = typeof safeJsonParse === 'function'
                ? safeJsonParse(localStorage.getItem(key), [])
                : [];
            var idx = staff.findIndex(function (s) { return s.loginId === loginId; });
            if (idx >= 0) {
                staff[idx].role = newRole;
                localStorage.setItem(key, JSON.stringify(staff));
            }
            if (typeof showToast === 'function') showToast('success', '権限を変更しました');
        } catch (e) {
            if (typeof showToast === 'function') {
                showToast('error', '権限変更に失敗しました: ' + e.message);
            }
            await loadStaffList_();
        }
    }

    async function deleteStaff_(loginId) {
        var profile = state_.profile;
        if (!profile) return;
        var ok = typeof showRingConfirm === 'function'
            ? await showRingConfirm({
                title: 'スタッフの削除',
                message: '本当にID「' + loginId + '」を削除しますか？',
                okLabel: '削除する',
                cancelLabel: 'キャンセル',
                danger: true
            })
            : confirm('本当にID「' + loginId + '」を削除しますか？');
        if (!ok) return;

        if (typeof showLoading === 'function') showLoading('削除中', 'スタッフ情報を削除しています...');

        try {
            var res = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'delete_staff',
                    authToken: resolveAuthToken_(),
                    shopId: profile.shopId,
                    loginId: loginId
                })
            });
            var data = await res.json();
            if (!data.success) throw new Error(data.error || '削除失敗');

            var key = staffLocalKey_(profile.shopId);
            var staff = typeof safeJsonParse === 'function'
                ? safeJsonParse(localStorage.getItem(key), [])
                : [];
            localStorage.setItem(key, JSON.stringify(staff.filter(function (s) {
                return s.loginId !== loginId;
            })));
            if (typeof showToast === 'function') showToast('success', 'スタッフを削除しました');
            await loadStaffList_();
        } catch (e) {
            if (typeof showToast === 'function') {
                showToast('error', '削除に失敗しました: ' + e.message);
            }
        } finally {
            if (typeof hideLoading === 'function') hideLoading();
        }
    }

    function showIssuedId_(loginId, displayName) {
        var existing = document.getElementById('issuedIdCard');
        if (existing) existing.remove();

        var card = document.createElement('div');
        card.id = 'issuedIdCard';
        card.style.cssText =
            'background:#ecfdf5;border:2px solid #6ee7b7;border-radius:16px;' +
            'padding:20px;margin:20px 0;text-align:center;';
        card.innerHTML =
            '<div style="font-size:13px;font-weight:800;color:#065f46;margin-bottom:8px;">✅ スタッフを追加しました</div>' +
            '<div style="font-size:13px;font-weight:700;color:#047857;margin-bottom:12px;">' +
            escapeHtml_(displayName) + ' さんのログインID</div>' +
            '<div style="font-size:28px;font-weight:900;letter-spacing:0.15em;font-family:monospace;color:#064e3b;' +
            'background:#d1fae5;padding:12px 24px;border-radius:10px;display:inline-block;">' +
            escapeHtml_(loginId) + '</div>' +
            '<div style="font-size:11px;font-weight:700;color:#6b7280;margin-top:10px;">' +
            '※このIDとパスワードでログインできます。必ずスタッフに伝えてください。</div>' +
            '<button type="button" id="issuedIdCardClose" style="margin-top:14px;padding:8px 20px;border-radius:999px;' +
            'border:1px solid #6ee7b7;background:#fff;color:#047857;font-weight:800;font-size:13px;cursor:pointer;">閉じる</button>';
        var addBtn = document.getElementById('addBtn');
        if (addBtn && addBtn.parentNode) {
            addBtn.parentNode.insertBefore(card, addBtn.nextSibling);
        }
        var closeBtn = document.getElementById('issuedIdCardClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () { card.remove(); });
        }
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function addStaff_() {
        var profile = state_.profile;
        if (!profile) return;
        var displayName = document.getElementById('newDisplayName').value.trim();
        var realName = document.getElementById('newRealName').value.trim();
        if (!displayName || !realName) {
            alert('表示名とスタッフネームを入力してください。');
            return;
        }

        var btn = document.getElementById('addBtn');
        btn.disabled = true;
        if (typeof showLoading === 'function') {
            showLoading('スタッフ追加中', '新しいスタッフを登録しています...');
        }

        function genLocalId() {
            var pin = String(Math.floor(1000 + Math.random() * 9000));
            return profile.shopId + '-' + pin;
        }

        function completeAdd(newLoginId) {
            var key = staffLocalKey_(profile.shopId);
            var staff = typeof safeJsonParse === 'function'
                ? safeJsonParse(localStorage.getItem(key), [])
                : [];
            if (!staff.some(function (s) { return s.loginId === newLoginId; })) {
                staff.push({
                    loginId: newLoginId,
                    displayName: displayName,
                    realName: realName,
                    role: 'staff',
                    shopId: profile.shopId
                });
                localStorage.setItem(key, JSON.stringify(staff));
            }
            document.getElementById('newDisplayName').value = '';
            document.getElementById('newRealName').value = '';
            if (typeof hideLoading === 'function') hideLoading();
            showIssuedId_(newLoginId, displayName);
            renderLocalStaff_();
        }

        var gasReady = typeof GAS_URL !== 'undefined' && GAS_URL && GAS_URL.startsWith('https://');

        if (!gasReady) {
            completeAdd(genLocalId());
            btn.disabled = false;
            return;
        }

        try {
            var controller = new AbortController();
            var timer = setTimeout(function () { controller.abort(); }, 8000);
            var res = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'add_staff',
                    authToken: resolveAuthToken_(),
                    shopId: profile.shopId,
                    displayName: displayName,
                    realName: realName,
                    role: 'staff'
                }),
                signal: controller.signal
            });
            clearTimeout(timer);
            var data = await res.json();
            if (data.success) {
                completeAdd(data.newLoginId);
                if (typeof showToast === 'function') {
                    showToast('success', 'シートに登録しました（ID: ' + data.newLoginId + '）');
                }
            } else {
                if (typeof hideLoading === 'function') hideLoading();
                if (typeof showToast === 'function') {
                    showToast('error', '追加失敗: ' + (data.error || '不明なエラー'));
                }
            }
        } catch (e) {
            completeAdd(genLocalId());
            if (typeof showToast === 'function') {
                showToast('info', 'オフライン登録しました。次回オンライン時にシートへ反映してください。');
            }
        } finally {
            btn.disabled = false;
        }
    }

    function initDom_(profile, config) {
        var backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.innerText = '≪戻る';
            backBtn.onclick = function () {
                if (typeof goBackSmart === 'function') goBackSmart(config.homeUrl);
                else location.href = config.homeUrl;
            };
        }
        var titleEl = document.querySelector('h1.title');
        if (titleEl) titleEl.textContent = config.pageTitle;
        var hintEl = document.getElementById('staffListHint');
        if (hintEl) hintEl.textContent = config.listHint;
        var shopInfo = document.getElementById('shopInfo');
        if (shopInfo) {
            shopInfo.textContent = profile.shopName + ' (ID: ' + profile.shopId + ')';
        }
        var addBtn = document.getElementById('addBtn');
        if (addBtn) addBtn.addEventListener('click', addStaff_);
        loadStaffList_();
    }

    /**
     * @param {'factory'|'dealer'} expectedDivision
     */
    function mount_(expectedDivision) {
        window.addEventListener('DOMContentLoaded', function () {
            var boot = boot_(expectedDivision);
            if (!boot) return;
            state_.profile = boot.profile;
            state_.config = boot.config;
            initDom_(boot.profile, boot.config);
        });
    }

    global.ringStaffAdminMount_ = mount_;
    global.ringStaffAdminChangeRole = function (loginId, newRole) {
        changeRole_(loginId, newRole);
    };
    global.ringStaffAdminDeleteStaff = function (loginId) {
        deleteStaff_(loginId);
    };
    global.ringStaffAdminApplyRoleStyle = applyRoleStyle_;
    global.addStaff = addStaff_;
}(typeof window !== 'undefined' ? window : global));
