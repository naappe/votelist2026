(function () {
  let mainSnapshot = null;
  let sharedSnapshot = null;
  let restoreMainUntil = 0;
  let restoreSharedUntil = 0;
  let restoring = false;

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

  function captureMain() {
    mainSnapshot = {
      activeFilter: document.querySelector('[data-filter].active')?.dataset.filter || '',
      assignActive: Boolean(document.querySelector('[data-assign-filter="assigned"].active)),
      search: valueOf('searchInput'),
      house: valueOf('houseSelect'),
      houseLabel: selectedLabel('houseSelect'),
      box: valueOf('boxSelect'),
      scrollY: window.scrollY,
      cardId: window.__lastOpenedVoterId || document.querySelector('.voter-card[data-open-voter]')?.dataset.openVoter || ''
    };
    return mainSnapshot;
  }

  function captureShared() {
    sharedSnapshot = {
      search: valueOf('searchInput'),
      house: valueOf('houseSelect'),
      filter: valueOf('filterSelect') || 'all',
      scrollY: window.scrollY,
      rowId: window.__lastTouchedAssignRow || ''
    };
    return sharedSnapshot;
  }

  function dispatch(id, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function restoreScroll(selector, fallbackY) {
    requestAnimationFrame(() => {
      const card = selector ? document.querySelector(selector) : null;
      if (card) {
        card.scrollIntoView({ block: 'center', behavior: 'auto' });
        return;
      }
      window.scrollTo({ top: fallbackY || 0, left: 0, behavior: 'auto' });
    });
  }

  function restoreMain(snapshot) {
    const item = snapshot || mainSnapshot;
    if (!item || restoring) return;
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
    } else if (item.activeFilter) {
      document.querySelector(`[data-filter="${cssEscape(item.activeFilter)}"]`)?.click();
    }

    const selector = item.cardId ? `.voter-card[data-open-voter="${cssEscape(item.cardId)}"]` : '';
    restoreScroll(selector, item.scrollY);
    setTimeout(() => { restoring = false; }, 80);
  }

  function restoreShared(snapshot) {
    const item = snapshot || sharedSnapshot;
    if (!item || restoring) return;
    restoring = true;
    setValue('searchInput', item.search);
    setValue('houseSelect', item.house);
    setValue('filterSelect', item.filter || 'all');
    dispatch('searchInput', 'input');
    dispatch('houseSelect', 'change');
    dispatch('filterSelect', 'change');
    const selector = item.rowId ? `[data-row-id="${cssEscape(item.rowId)}"]` : '';
    restoreScroll(selector, item.scrollY);
    setTimeout(() => { restoring = false; }, 80);
  }

  function scheduleMainRestore(snapshot) {
    restoreMainUntil = Date.now() + 3500;
    [80, 220, 500, 900, 1500, 2400, 3400].forEach((delay) => {
      setTimeout(() => restoreMain(snapshot), delay);
    });
  }

  function scheduleSharedRestore(snapshot) {
    restoreSharedUntil = Date.now() + 3500;
    [80, 220, 500, 900, 1500, 2400, 3400].forEach((delay) => {
      setTimeout(() => restoreShared(snapshot), delay);
    });
  }

  document.addEventListener('click', (event) => {
    const card = event.target.closest?.('.voter-card[data-open-voter]');
    if (card) window.__lastOpenedVoterId = card.dataset.openVoter || '';

    const toggle = event.target.closest?.('[data-toggle-assign]');
    if (toggle?.dataset?.toggleAssign) window.__lastTouchedAssignRow = toggle.dataset.toggleAssign;

    if (event.target.closest?.('[data-filter], [data-house-filter], [data-assign-filter]')) captureMain();

    if (event.target.closest?.('#saveChangesBtn, #confirmSaveBtn')) {
      const snapshot = captureShared();
      scheduleSharedRestore(snapshot);
    }
  }, true);

  document.addEventListener('input', (event) => {
    if (event.target?.id === 'searchInput') captureMain();
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

  const observer = new MutationObserver(() => {
    if (Date.now() < restoreMainUntil) restoreMain(mainSnapshot);
    if (Date.now() < restoreSharedUntil) restoreShared(sharedSnapshot);
  });

  document.addEventListener('DOMContentLoaded', () => {
    const list = document.getElementById('voterList') || document.getElementById('content');
    if (list) observer.observe(list, { childList: true, subtree: false });
  });
})();
