(function () {
  let lastMainSnapshot = null;
  let lastSharedSnapshot = null;

  function snapshotMain() {
    const activeFilter = document.querySelector('[data-filter].active')?.dataset.filter || '';
    const assignActive = Boolean(document.querySelector('[data-assign-filter="assigned"].active'));
    const openCardId = document.querySelector('.modal:not([hidden])') ? window.__lastOpenedVoterId || '' : '';
    return {
      type: 'main',
      activeFilter,
      assignActive,
      search: valueOf('searchInput'),
      house: valueOf('houseSelect'),
      houseLabel: selectedLabel('houseSelect'),
      box: valueOf('boxSelect'),
      scrollY: window.scrollY,
      cardId: openCardId
    };
  }

  function snapshotShared() {
    return {
      type: 'shared',
      search: valueOf('searchInput'),
      house: valueOf('houseSelect'),
      filter: valueOf('filterSelect'),
      scrollY: window.scrollY,
      rowId: window.__lastTouchedAssignRow || ''
    };
  }

  function valueOf(id) {
    return document.getElementById(id)?.value || '';
  }

  function selectedLabel(id) {
    const el = document.getElementById(id);
    return el?.selectedOptions?.[0]?.dataset?.label || el?.selectedOptions?.[0]?.textContent?.replace(/\s*\([^)]*\)\s*$/, '').trim() || '';
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

  function restoreScroll(cardSelector, fallbackY) {
    requestAnimationFrame(() => {
      const card = cardSelector ? document.querySelector(cardSelector) : null;
      if (card) {
        card.scrollIntoView({ block: 'center', behavior: 'auto' });
        return;
      }
      window.scrollTo({ top: fallbackY || 0, left: 0, behavior: 'auto' });
    });
  }

  function restoreMain(snapshot) {
    if (!snapshot) return;

    if (snapshot.house && setValue('houseSelect', snapshot.house)) {
      const search = document.getElementById('searchInput');
      if (search) search.value = snapshot.houseLabel || snapshot.search || '';
      document.getElementById('houseSelect')?.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (snapshot.box && setValue('boxSelect', snapshot.box)) {
      document.getElementById('boxSelect')?.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (snapshot.search && setValue('searchInput', snapshot.search)) {
      document.getElementById('searchInput')?.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (snapshot.assignActive) {
      document.querySelector('[data-assign-filter="assigned"]')?.click();
    } else if (snapshot.activeFilter) {
      document.querySelector(`[data-filter="${cssEscape(snapshot.activeFilter)}"]`)?.click();
    }

    const selector = snapshot.cardId ? `.voter-card[data-open-voter="${cssEscape(snapshot.cardId)}"]` : '';
    setTimeout(() => restoreScroll(selector, snapshot.scrollY), 160);
    setTimeout(() => restoreScroll(selector, snapshot.scrollY), 500);
    setTimeout(() => restoreScroll(selector, snapshot.scrollY), 1100);
  }

  function restoreShared(snapshot) {
    if (!snapshot) return;
    setValue('searchInput', snapshot.search);
    setValue('houseSelect', snapshot.house);
    setValue('filterSelect', snapshot.filter || 'all');
    document.getElementById('searchBtn')?.click();
    document.getElementById('searchInput')?.dispatchEvent(new Event('input', { bubbles: true }));
    const selector = snapshot.rowId ? `[data-row-id="${cssEscape(snapshot.rowId)}"]` : '';
    setTimeout(() => restoreScroll(selector, snapshot.scrollY), 160);
    setTimeout(() => restoreScroll(selector, snapshot.scrollY), 500);
    setTimeout(() => restoreScroll(selector, snapshot.scrollY), 1100);
  }

  document.addEventListener('click', (event) => {
    const card = event.target.closest?.('.voter-card[data-open-voter]');
    if (card) window.__lastOpenedVoterId = card.dataset.openVoter || '';

    const toggle = event.target.closest?.('[data-toggle-assign]');
    if (toggle?.dataset?.toggleAssign) window.__lastTouchedAssignRow = toggle.dataset.toggleAssign;

    if (event.target.closest?.('#saveChangesBtn, #confirmSaveBtn')) {
      lastSharedSnapshot = snapshotShared();
      [180, 600, 1300, 2200].forEach((delay) => setTimeout(() => restoreShared(lastSharedSnapshot), delay));
    }
  }, true);

  document.addEventListener('change', (event) => {
    const toggle = event.target.closest?.('[data-toggle-assign]');
    if (toggle?.dataset?.toggleAssign) window.__lastTouchedAssignRow = toggle.dataset.toggleAssign;
  }, true);

  document.addEventListener('submit', (event) => {
    if (event.target?.id !== 'voterForm') return;
    lastMainSnapshot = snapshotMain();
    [250, 700, 1400, 2400].forEach((delay) => setTimeout(() => restoreMain(lastMainSnapshot), delay));
  }, true);
})();
