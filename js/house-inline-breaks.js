(function () {
  if (document.body.dataset.view !== 'management') return;

  var scheduled = false;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  function boot() {
    installStyles();
    renderBreaks();

    var list = document.getElementById('voterList');
    if (list && window.MutationObserver) {
      new MutationObserver(scheduleRender).observe(list, { childList: true, subtree: false });
    }

    window.addEventListener('assign-results-rendered', scheduleRender);
    window.addEventListener('assigned-person-filtered', scheduleRender);
    document.addEventListener('input', scheduleRender, true);
    document.addEventListener('change', scheduleRender, true);
  }

  function scheduleRender() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      renderBreaks();
    });
  }

  function renderBreaks() {
    var list = document.getElementById('voterList');
    if (!list) return;

    Array.prototype.slice.call(list.querySelectorAll('.house-inline-break')).forEach(function (node) {
      node.remove();
    });

    var cards = visibleCards(list);
    var lastHouse = '';

    cards.forEach(function (card) {
      var house = houseFromCard(card) || 'Unknown house';
      var key = normalize(house);
      if (!key || key === lastHouse) return;
      lastHouse = key;
      card.parentNode.insertBefore(createBreak(house, countHouse(cards, house)), card);
    });
  }

  function visibleCards(list) {
    return Array.prototype.slice.call(list.querySelectorAll('.voter-card[data-open-voter]')).filter(function (card) {
      return !card.hidden
        && !card.classList.contains('assigned-person-hidden')
        && !card.classList.contains('url-filter-hidden')
        && window.getComputedStyle(card).display !== 'none';
    });
  }

  function createBreak(house, count) {
    var node = document.createElement('div');
    node.className = 'house-inline-break';
    node.innerHTML = '<span>House / Address</span><strong></strong><small></small>';
    node.querySelector('strong').textContent = house;
    node.querySelector('small').textContent = count + ' voter' + (count === 1 ? '' : 's') + ' in this view';
    return node;
  }

  function houseFromCard(card) {
    var direct = card.dataset.house || card.getAttribute('data-house');
    if (direct) return direct.trim();

    var meta = card.querySelector('.voter-info p');
    var text = meta ? meta.textContent : '';
    return (text.split('·')[0] || '').trim();
  }

  function countHouse(cards, house) {
    var key = normalize(house);
    var total = cards.filter(function (card) {
      return normalize(houseFromCard(card)) === key;
    }).length;
    return total || 1;
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function installStyles() {
    if (document.getElementById('houseInlineBreakStyles')) return;
    var style = document.createElement('style');
    style.id = 'houseInlineBreakStyles';
    style.textContent = '' +
      '.house-inline-break{' +
        'position:static!important;' +
        'z-index:auto!important;' +
        'display:grid;' +
        'gap:3px;' +
        'margin:14px 0 8px;' +
        'padding:10px 12px;' +
        'border:1px solid #dbeafe;' +
        'border-radius:12px;' +
        'background:#eff6ff;' +
        'color:#1e3a8a;' +
        'box-shadow:none;' +
      '}' +
      '.house-inline-break span{' +
        'font-size:10px;' +
        'font-weight:950;' +
        'letter-spacing:.08em;' +
        'text-transform:uppercase;' +
        'color:#2563eb;' +
      '}' +
      '.house-inline-break strong{' +
        'font-size:18px;' +
        'font-weight:950;' +
        'line-height:1.1;' +
      '}' +
      '.house-inline-break small{' +
        'font-size:12px;' +
        'font-weight:850;' +
        'color:#64748b;' +
      '}' +
      '@media(max-width:640px){' +
        '.house-inline-break{margin:12px 0 8px;padding:9px 10px;}' +
        '.house-inline-break strong{font-size:16px;}' +
      '}';
    document.head.appendChild(style);
  }
})();
