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
    window.addEventListener('load', scheduleRender);
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
      list.insertBefore(createBreak(house, countHouse(cards, house)), card);
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
        'grid-column:1/-1!important;' +
        'position:relative!important;' +
        'z-index:0!important;' +
        'display:grid!important;' +
        'width:100%!important;' +
        'clear:both!important;' +
        'gap:3px!important;' +
        'margin:18px 0 10px!important;' +
        'padding:10px 12px!important;' +
        'border:1px solid #dbeafe!important;' +
        'border-radius:12px!important;' +
        'background:#eff6ff!important;' +
        'color:#1e3a8a!important;' +
        'box-shadow:none!important;' +
        'pointer-events:none!important;' +
      '}' +
      '.house-inline-break + .voter-card{' +
        'margin-top:0!important;' +
      '}' +
      '.house-inline-break span{' +
        'font-size:10px!important;' +
        'font-weight:950!important;' +
        'letter-spacing:.08em!important;' +
        'text-transform:uppercase!important;' +
        'color:#2563eb!important;' +
      '}' +
      '.house-inline-break strong{' +
        'font-size:18px!important;' +
        'font-weight:950!important;' +
        'line-height:1.1!important;' +
      '}' +
      '.house-inline-break small{' +
        'font-size:12px!important;' +
        'font-weight:850!important;' +
        'color:#64748b!important;' +
      '}' +
      '@media(max-width:640px){' +
        '.house-inline-break{margin:20px 0 12px!important;padding:9px 10px!important;}' +
        '.house-inline-break strong{font-size:16px!important;}' +
      '}';
    document.head.appendChild(style);
  }
})();
