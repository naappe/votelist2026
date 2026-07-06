(function () {
  const MAIN_KEY = 'villimale_preserve_main_view_v4';
  const SHARED_KEY = 'villimale_preserve_shared_view_v4';
  let mainSnapshot = null;
  let sharedSnapshot = null;
  let restoreMainUntil = 0;
  let restoreSharedUntil = 0;
  let restoring = false;
  let lockedScrollY = null;
  let lockUntil = 0;

  function isMainPage() {
    return document.body?.dataset?.page === 'dashboard';
  }

  function isSharedPage() {
    return /shared\.html$/i.test(location.pathname);
  }

  function valueOf(id) {
    return document.getElementById(id)?.value || '';
  }

  function selectedLabel(id) {
    const el = document.getElementById(id);
    return el?.selectedOptions?.[0]?.dataset?.label
      || el?.selectedOptions?.[0]?.textContent?.replace(/\s*\([^)]*\)\s*$/, '').trim()
      || '';
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value || '').replace(/["\\]/g, '\\$&');
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return false;
    el.value = value || '';
    return true;
  }

  function remember(key, snapshot) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ ...snapshot, savedAt: Date.now() }));
    } catch {}
  }

  function recall(key) {
    try {
      const item = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (!item || Date.now() - Number(item.savedAt || 0) > 10 * 60 * 1000) return null;
      return item;
    } catch {
      return null;
    }
  }

  function captureMain() {
    if (!isMainPage()) return mainSnapshot;
    mainSnapshot = {
      activeFilter: document.querySelector('[data-filter].active')?.dataset.filter || '',
      assignActive: Boolean(document.querySelector('[data-assign-filter="assigned"].active')),
      search: valueOf('searchInput'),
      house: valueOf('houseSelect'),
      houseLabel: selectedLabel('houseSelect'),
      box: valueOf('boxSelect'),
      scrollY: window.scrollY,
      cardId: window.__lastOpenedVoterId || ''
    };
    remember(MAIN_KEY, mainSnapshot);
    return mainSnapshot;
  }

  function captureShared() {
    if (!isSharedPage()) return sharedSnapshot;
    sharedSnapshot = {
      search: valueOf('searchInput'),
      house: valueOf('houseSelect'),
      filter: valueOf('filterSelect') || 'all',
      scrollY: window.scrollY,
      rowId: window.__lastTouchedAssignRow || ''
    };
    remember(SHARED_KEY, sharedSnapshot);
    return sharedSnapshot;
  }

  function dispatch(id, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function lockScroll(y, duration = 1800) {
    const top = Number(y);
    if (!Number.isFinite(top)) return;
    lockedScrollY = top;
    lockUntil = Date.now() + duration;
  }

  function restoreScroll(fallbackY) {
    const top = Number(fallbackY);
    if (!Number.isFinite(top)) return;
    lockScroll(top);
    requestAnimationFrame(() => window.scrollTo({ top, left: 0, behavior: 'auto' }));
    setTimeout(() => window.scrollTo({ top, left: 0, behavior: 'auto' }), 80);
  }

  function keepLockedScroll() {
    if (lockedScrollY === null || Date.now() > lockUntil) return;
    if (Math.abs(window.scrollY - lockedScrollY) > 24) {
      requestAnimationFrame(() => window.scrollTo({ top: lockedScrollY, left: 0, behavior: 'auto' }));
    }
  }

  function restoreMain(snapshot) {
    const item = snapshot || mainSnapshot || recall(MAIN_KEY);
    if (!item || !isMainPage() || restoring) return;
    restoring = true;

    if (item.house) {
      const select = document.getElementById('houseSelect');
      const hasOption = Boolean(select?.querySelector(`option[value="${cssEscape(item.house)}"]`));
      if (hasOption) {
        setValue('houseSelect', item.house);
        const search = document.getElementById('searchInput');
        if (search) search.value = item.houseLabel || item.search || '';
        dispatch('houseSelect', 'change');
      } else if (item.houseLabel || item.search) {
        setValue('searchInput', item.houseLabel || item.search);
        dispatch('searchInput', 'input');
      }
    } else if (item.box) {
      setValue('boxSelect', item.box);
      dispatch('boxSelect', 'change');
    } else if (item.search) {
      setValue('searchInput', item.search);
      dispatch('searchInput', 'input');
    } else if (item.assignActive) {
      document.querySelector('[data-assign-filter="assigned"]')?.click();
    } else if (item.activeFilter && item.activeFilter !== 'all') {
      document.querySelector(`[data-filter="${cssEscape(item.activeFilter)}"]`)?.click();
    }

    restoreScroll(item.scrollY);
    setTimeout(() => restoreScroll(item.scrollY), 180);
    setTimeout(() => { restoring = false; }, 220);
  }

  function restoreShared(snapshot) {
    const item = snapshot || sharedSnapshot || recall(SHARED_KEY);
    if (!item || !isSharedPage() || restoring) return;
    restoring = true;
    setValue('searchInput', item.search);
    setValue('houseSelect', item.house);
    setValue('filterSelect', item.filter || 'all');
    dispatch('searchInput', 'input');
    dispatch('houseSelect', 'change');
    dispatch('filterSelect', 'change');
    restoreScroll(item.scrollY);
    setTimeout(() => { restoring = false; }, 120);
  }

  function scheduleMainRestore(snapshot) {
    restoreMainUntil = Date.now() + 5000;
    lockScroll(snapshot?.scrollY ?? window.scrollY, 2200);
    [0, 40, 100, 220, 500, 900, 1500, 2400, 3400, 4800].forEach((delay) => {
      setTimeout(() => restoreMain(snapshot), delay);
    });
  }

  function scheduleSharedRestore(snapshot) {
    restoreSharedUntil = Date.now() + 5000;
    lockScroll(snapshot?.scrollY ?? window.scrollY, 2200);
    [0, 40, 100, 220, 500, 900, 1500, 2400, 3400, 4800].forEach((delay) => {
      setTimeout(() => restoreShared(snapshot), delay);
    });
  }

  document.addEventListener('scroll', keepLockedScroll, true);

  document.addEventListener('click', (event) => {
    const card = event.target.closest?.('.voter-card[data-open-voter]');
    if (card) {
      window.__lastOpenedVoterId = card.dataset.openVoter || '';
      captureMain();
    }

    const toggle = event.target.closest?.('[data-toggle-assign]');
    if (toggle?.dataset?.toggleAssign) window.__lastTouchedAssignRow = toggle.dataset.toggleAssign;

    if (event.target.closest?.('[data-filter], [data-house-filter], [data-assign-filter]')) captureMain();

    if (event.target.closest?.('#voterForm [type="submit"]')) {
      const snapshot = captureMain();
      scheduleMainRestore(snapshot);
    }

    if (event.target.closest?.('#saveChangesBtn, #confirmSaveBtn')) {
      const snapshot = captureShared();
      scheduleSharedRestore(snapshot);
    }
  }, true);

  document.addEventListener('input', (event) => {
    if (event.target?.id === 'searchInput') {
      captureMain();
      captureShared();
    }
  }, true);

  document.addEventListener('change', (event) => {
    const toggle = event.target.closest?.('[data-toggle-assign]');
    if (toggle?.dataset?.toggleAssign) window.__lastTouchedAssignRow = toggle.dataset.toggleAssign;
    if (['houseSelect', 'boxSelect', 'filterSelect'].includes(event.target?.id)) {
      captureMain();
      captureShared();
    }
  }, true);

  document.addEventListener('submit', (event) => {
    if (event.target?.id !== 'voterForm') return;
    const snapshot = captureMain();
    scheduleMainRestore(snapshot);
  }, true);

  window.addEventListener('beforeunload', () => {
    captureMain();
    captureShared();
  });

  const observer = new MutationObserver(() => {
    if (Date.now() < restoreMainUntil) restoreMain(mainSnapshot);
    if (Date.now() < restoreSharedUntil) restoreShared(sharedSnapshot);
  });

  function restoreSavedAfterLoad() {
    const main = recall(MAIN_KEY);
    const shared = recall(SHARED_KEY);
    if (main) {
      mainSnapshot = main;
      scheduleMainRestore(main);
    }
    if (shared) {
      sharedSnapshot = shared;
      scheduleSharedRestore(shared);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const list = document.getElementById('voterList') || document.getElementById('content');
    if (list) observer.observe(list, { childList: true, subtree: false });
    restoreSavedAfterLoad();
  });
  window.addEventListener('load', restoreSavedAfterLoad);
})();
