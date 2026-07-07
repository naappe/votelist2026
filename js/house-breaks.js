(function () {
  let rendering = false;
  let timer = 0;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    installStyles();
    renderBreaks();
    const list = document.getElementById('voterList');
    if (!list) return;
    new MutationObserver(schedule).observe(list, { childList: true, subtree: false });
    window.addEventListener('resize', schedule);
  }

  function schedule() {
    if (rendering) return;
    clearTimeout(timer);
    timer = setTimeout(renderBreaks, 80);
  }

  function renderBreaks() {
    const list = document.getElementById('voterList');
    if (!list || rendering) return;
    rendering = true;

    list.querySelectorAll('.house-break').forEach((node) => node.remove());
    const cards = Array.from(list.querySelectorAll('.voter-card[data-open-voter]'));
    const counts = countHouses(cards);
    let lastHouse = '';

    cards.forEach((card) => {
      const house = houseFromCard(card) || 'Unknown house';
      const key = house.toLowerCase();
      if (key === lastHouse) return;
      lastHouse = key;
      const label = document.createElement('div');
      label.className = 'house-break';
      label.innerHTML = `<span>House / Address</span><strong>${esc(house)}</strong><small>${new Intl.NumberFormat('en-US').format(counts.get(key) || 1)} voter${(counts.get(key) || 1) === 1 ? '' : 's'} in this view</small>`;
      list.insertBefore(label, card);
    });

    rendering = false;
  }

  function countHouses(cards) {
    const map = new Map();
    cards.forEach((card) => {
      const key = (houseFromCard(card) || 'Unknown house').toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }

  function houseFromCard(card) {
    const meta = card.querySelector('.voter-info p')?.textContent || '';
    return meta.split('·')[0]?.trim() || '';
  }

  function installStyles() {
    if (document.getElementById('houseBreakStyles')) return;
    const style = document.createElement('style');
    style.id = 'houseBreakStyles';
    style.textContent = `
      .house-break{grid-column:1/-1;position:sticky;top:58px;z-index:6;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 -2px;padding:10px 13px;border:1px solid #dbeafe;border-radius:13px;background:linear-gradient(135deg,#eff6ff,#fff);box-shadow:0 10px 24px rgba(37,99,235,.08);color:#1e3a8a;scroll-margin-top:82px}
      .house-break span{font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.08em;color:#2563eb;white-space:nowrap}.house-break strong{min-width:0;flex:1;font-size:15px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.house-break small{color:#64748b;font-size:11px;font-weight:850;white-space:nowrap}
      @media(max-width:760px){.house-break{top:108px;display:grid;gap:2px}.house-break strong{white-space:normal}.house-break small{white-space:normal}}
    `;
    document.head.appendChild(style);
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }
})();