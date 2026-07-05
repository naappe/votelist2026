(function () {
  const storageKey = 'villimale_pending_house_filter_v1';

  function partyParam() {
    return new URLSearchParams(location.search).get('party') || 'PNC';
  }

  function houseLabel(row) {
    return row.dataset.houseLabel
      || row.querySelector('.house-main span')?.textContent.replace(/^\d+\.\s*/, '').trim()
      || row.textContent.replace(/\d+\s*$/, '').replace(/^\d+\.\s*/, '').trim();
  }

  function openVotersForHouse(row) {
    if (document.body.dataset.view !== 'analytics') return false;
    const search = row.dataset.cleanupHouse || row.dataset.houseFilter || '';
    const label = houseLabel(row) || search;
    sessionStorage.setItem(storageKey, JSON.stringify({ search, label }));
    const url = new URL('voters.html', location.href);
    url.searchParams.set('party', partyParam());
    location.href = url.toString();
    return true;
  }

  function applyPendingHouse() {
    if (document.body.dataset.view !== 'management') return;
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return;
    if (!document.querySelector('#summary .stat-card')) return;

    let item;
    try {
      item = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(storageKey);
      return;
    }

    const search = document.getElementById('searchInput');
    const house = document.getElementById('houseSelect');
    const box = document.getElementById('boxSelect');
    if (!search) return;
    if (item.search === '__dhafthar__' && house && !house.querySelector('option[value="__dhafthar__"]')) return;

    sessionStorage.removeItem(storageKey);
    if (box) box.value = '';

    if (item.search === '__dhafthar__') {
      search.value = 'Dhafthar';
      if (house) {
        house.value = '__dhafthar__';
        house.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else {
      if (house) house.value = item.search || '';
      search.value = item.label || item.search || '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }

    setTimeout(() => {
      document.querySelector('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const status = document.getElementById('statusMessage');
      if (status) {
        status.textContent = `Showing ${item.label || 'selected house'} voters.`;
        status.className = 'status-message ok';
      }
    }, 180);
  }

  document.addEventListener('click', (event) => {
    const row = event.target.closest('[data-cleanup-house], [data-house-filter]');
    if (!row || !openVotersForHouse(row)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener('DOMContentLoaded', applyPendingHouse);
  window.addEventListener('load', applyPendingHouse);
  let tries = 0;
  const timer = setInterval(() => {
    applyPendingHouse();
    tries += 1;
    if (tries > 40 || !sessionStorage.getItem(storageKey)) clearInterval(timer);
  }, 300);
})();