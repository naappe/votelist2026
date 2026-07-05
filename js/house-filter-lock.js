(function () {
  const key = 'villimale_house_filter_lock_v1';
  let applying = false;

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function compact(value) {
    return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function readLock() {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; }
  }

  function writeLock(lock) {
    try {
      if (lock?.value || lock?.label) sessionStorage.setItem(key, JSON.stringify(lock));
      else sessionStorage.removeItem(key);
    } catch {}
  }

  function selectedHouseLock() {
    const select = document.getElementById('houseSelect');
    if (!select || !select.value) return null;
    const option = select.selectedOptions?.[0];
    const label = option?.dataset?.label || option?.textContent?.replace(/\s*\([^)]*\)\s*$/, '') || select.value;
    return { value: select.value, label: clean(label), key: compact(label || select.value), savedAt: Date.now() };
  }

  function setHouseSelect(lock) {
    const select = document.getElementById('houseSelect');
    if (!select || !lock?.value) return;
    if (select.value === lock.value) return;
    if (select.querySelector(`option[value="${cssEscape(lock.value)}"]`)) select.value = lock.value;
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value || '').replace(/["\\]/g, '\\$&');
  }

  function cardHouseText(card) {
    const meta = clean(card.querySelector('.voter-info p')?.textContent || '');
    const label = clean(card.querySelector('.section-label')?.textContent || '');
    return `${meta} ${label}`;
  }

  function cardMatchesHouse(card, lock) {
    if (!lock?.key) return true;
    const text = compact(cardHouseText(card));
    const key = lock.key;
    if (!key) return true;
    return text.includes(key) || key.includes('dhafthar') && text.includes('dhafthar') || key.includes('sinamale') && text.includes('sinamale');
  }

  function activeStatusLabel() {
    const active = document.querySelector('[data-filter].active, [data-assign-filter="assigned"].active');
    if (!active) return '';
    return clean(active.textContent || '').replace(/\s+\d+$/, '');
  }

  function applyLock() {
    if (applying) return;
    const lock = readLock();
    if (!lock?.key) return;
    const list = document.getElementById('voterList');
    if (!list) return;
    const cards = Array.from(list.querySelectorAll('.voter-card'));
    if (!cards.length) return;

    applying = true;
    setHouseSelect(lock);

    let visible = 0;
    cards.forEach((card) => {
      const match = cardMatchesHouse(card, lock);
      card.hidden = !match;
      card.style.display = match ? '' : 'none';
      if (match) visible += 1;
    });

    const total = document.getElementById('sectionTotal');
    if (total) total.textContent = `${visible.toLocaleString()} voter${visible === 1 ? '' : 's'}`;

    const filter = document.getElementById('sectionFilter');
    if (filter) {
      const status = activeStatusLabel();
      filter.textContent = status
        ? `Showing ${status} voters inside ${lock.label}.`
        : `Showing voters inside ${lock.label}.`;
    }

    const title = document.getElementById('sectionTitle');
    if (title && lock.label && !title.textContent.includes(lock.label)) {
      const base = clean(title.textContent || 'Voters').replace(/\s+-\s+.+$/, '');
      title.textContent = `${base} - ${lock.label}`;
    }

    applying = false;
  }

  function clearLock() {
    writeLock(null);
    document.querySelectorAll('#voterList .voter-card').forEach((card) => {
      card.hidden = false;
      card.style.display = '';
    });
  }

  document.addEventListener('change', (event) => {
    if (event.target?.id !== 'houseSelect') return;
    const lock = selectedHouseLock();
    if (lock) writeLock(lock);
    else clearLock();
    setTimeout(applyLock, 80);
  }, true);

  document.addEventListener('click', (event) => {
    if (event.target.closest?.('#clearSearchBtn')) {
      clearLock();
      return;
    }
    if (event.target.closest?.('[data-filter], [data-assign-filter]')) {
      const current = selectedHouseLock();
      if (current) writeLock(current);
      setTimeout(applyLock, 120);
      setTimeout(applyLock, 400);
      setTimeout(applyLock, 900);
    }
    if (event.target.closest?.('#voterForm [type="submit"]')) {
      const current = selectedHouseLock();
      if (current) writeLock(current);
      [200, 600, 1200, 2200, 3600].forEach((delay) => setTimeout(applyLock, delay));
    }
  }, true);

  document.addEventListener('submit', (event) => {
    if (event.target?.id !== 'voterForm') return;
    const current = selectedHouseLock();
    if (current) writeLock(current);
    [200, 600, 1200, 2200, 3600].forEach((delay) => setTimeout(applyLock, delay));
  }, true);

  const observer = new MutationObserver(() => setTimeout(applyLock, 40));
  document.addEventListener('DOMContentLoaded', () => {
    const list = document.getElementById('voterList');
    if (list) observer.observe(list, { childList: true, subtree: false });
    setTimeout(applyLock, 500);
  });
  window.addEventListener('load', () => setTimeout(applyLock, 500));
})();
