(function () {
  if (document.body.dataset.view !== 'management') return;

  var ticking = false;
  var lastKey = '';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  function boot() {
    installStyles();
    ensureIndicator();
    updateIndicator();

    var voterList = document.getElementById('voterList');
    if (voterList && window.MutationObserver) {
      new MutationObserver(scheduleUpdate).observe(voterList, { childList: true });
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('assign-results-rendered', scheduleUpdate);
    document.addEventListener('input', scheduleUpdate, true);
    document.addEventListener('change', scheduleUpdate, true);
  }

  function ensureIndicator() {
    if (document.getElementById('houseScrollIndicator')) return;

    var voterList = document.getElementById('voterList');
    var voterPanel = document.querySelector('.voter-panel');
    if (!voterList && !voterPanel) return;

    var indicator = document.createElement('div');
    indicator.id = 'houseScrollIndicator';
    indicator.hidden = true;
    indicator.setAttribute('aria-live', 'polite');
    indicator.innerHTML = '<span>House / Address</span><strong></strong><small></small>';

    if (voterList) {
      voterList.parentNode.insertBefore(indicator, voterList);
    } else {
      voterPanel.appendChild(indicator);
    }
  }

  function scheduleUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      updateIndicator();
    });
  }

  function updateIndicator() {
    var indicator = document.getElementById('houseScrollIndicator');
    if (!indicator) return;

    var cards = getVisibleCards();
    if (!cards.length) {
      indicator.hidden = true;
      return;
    }

    var active = getActiveCard(cards);
    var house = getHouse(active) || 'Unknown house';
    var count = countHouse(cards, house);
    var key = house + '|' + count;

    if (key !== lastKey) {
      lastKey = key;
      indicator.querySelector('strong').textContent = house;
      indicator.querySelector('small').textContent = count + ' voter' + (count === 1 ? '' : 's') + ' in this view';
    }

    indicator.hidden = false;
  }

  function getVisibleCards() {
    return Array.prototype.slice.call(document.querySelectorAll('#voterList .voter-card[data-open-voter]')).filter(function (card) {
      return !card.hidden && window.getComputedStyle(card).display !== 'none';
    });
  }

  function getActiveCard(cards) {
    var line = getStickyTop() + 16;
    var selected = cards[0];

    for (var i = 0; i < cards.length; i += 1) {
      var rect = cards[i].getBoundingClientRect();
      if (rect.top <= line && rect.bottom > line) return cards[i];
      if (rect.top <= line) selected = cards[i];
      if (rect.top > line) break;
    }

    return selected;
  }

  function getStickyTop() {
    return window.matchMedia('(max-width: 760px)').matches ? 108 : 66;
  }

  function getHouse(card) {
    if (!card) return '';
    var direct = card.dataset.house || card.getAttribute('data-house');
    if (direct) return direct.trim();

    var meta = card.querySelector('.voter-info p');
    var text = meta ? meta.textContent : '';
    return (text.split('·')[0] || '').trim();
  }

  function countHouse(cards, house) {
    var key = normalize(house);
    var total = cards.filter(function (card) {
      return normalize(getHouse(card)) === key;
    }).length;
    return total || 1;
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function installStyles() {
    if (document.getElementById('houseScrollIndicatorStyles')) return;

    var style = document.createElement('style');
    style.id = 'houseScrollIndicatorStyles';
    style.textContent = '' +
      '#houseScrollIndicator{' +
        'position:sticky;' +
        'top:66px;' +
        'z-index:5;' +
        'display:flex;' +
        'align-items:center;' +
        'gap:10px;' +
        'margin:0 0 10px;' +
        'padding:8px 10px;' +
        'border:1px solid #dbeafe;' +
        'border-radius:12px;' +
        'background:rgba(239,246,255,.96);' +
        'box-shadow:0 8px 18px rgba(37,99,235,.08);' +
        'color:#1e3a8a;' +
        'backdrop-filter:blur(8px);' +
      '}' +
      '#houseScrollIndicator[hidden]{display:none!important;}' +
      '#houseScrollIndicator span{' +
        'font-size:10px;' +
        'font-weight:950;' +
        'letter-spacing:.08em;' +
        'text-transform:uppercase;' +
        'color:#2563eb;' +
        'white-space:nowrap;' +
      '}' +
      '#houseScrollIndicator strong{' +
        'min-width:0;' +
        'flex:1;' +
        'font-size:14px;' +
        'font-weight:950;' +
        'overflow:hidden;' +
        'text-overflow:ellipsis;' +
        'white-space:nowrap;' +
      '}' +
      '#houseScrollIndicator small{' +
        'font-size:11px;' +
        'font-weight:850;' +
        'color:#64748b;' +
        'white-space:nowrap;' +
      '}' +
      '@media(max-width:760px){' +
        '#houseScrollIndicator{top:108px;margin-bottom:8px;}' +
        '#houseScrollIndicator small{display:none;}' +
      '}';

    document.head.appendChild(style);
  }
})();
