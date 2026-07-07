(function () {
  const heartbeatMs = 30000;
  let pulse = 0;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    installStyles();
    ensurePanel();
    render();
    setInterval(() => {
      pulse += 1;
      render();
    }, heartbeatMs);

    const target = document.getElementById('voterList') || document.body;
    new MutationObserver(debounce(render, 120)).observe(target, { childList: true, subtree: true });
    window.addEventListener('online', render);
    window.addEventListener('offline', render);
  }

  function ensurePanel() {
    if (document.getElementById('aiBrainLive')) return;
    const sync = document.getElementById('syncNotice');
    const panel = document.createElement('section');
    panel.id = 'aiBrainLive';
    panel.className = 'panel ai-brain-live';
    panel.setAttribute('aria-label', 'AI Brain live status');
    if (sync) sync.after(panel);
    else document.querySelector('.page')?.prepend(panel);
  }

  function render() {
    const panel = document.getElementById('aiBrainLive');
    if (!panel || document.body.classList.contains('clean-read-view')) return;
    const metrics = readMetrics();
    const status = navigator.onLine ? 'Alive' : 'Offline';
    const tone = navigator.onLine ? 'ok' : 'warn';

    panel.innerHTML = `
      <div class="ai-brain-head">
        <div>
          <p class="eyebrow">AI Brain Live</p>
          <h2>Smart Insights</h2>
          <p>${esc(navigator.onLine ? 'Watching the live voter list without heavy AI processing.' : 'Using the current screen while connection is offline.')}</p>
        </div>
        <div class="ai-brain-status ${tone}">
          <span class="live-dot"></span>
          <strong>${status}</strong>
          <small>pulse ${pulse}</small>
        </div>
      </div>
      <div class="ai-brain-metrics">
        ${metric('Visible', metrics.visible)}
        ${metric('Page Total', metrics.total)}
        ${metric('Houses', metrics.houses)}
        ${metric('Need Call', metrics.needCall)}
      </div>
      <div class="ai-brain-insights">
        ${insights(metrics).map((item) => `<article class="ai-insight ${item.tone}"><strong>${esc(item.title)}</strong><span>${esc(item.text)}</span></article>`).join('')}
      </div>
    `;
  }

  function readMetrics() {
    const cards = Array.from(document.querySelectorAll('.voter-card[data-open-voter]'));
    const houses = new Set();
    let needCall = 0;
    let followUp = 0;
    let willVote = 0;

    cards.forEach((card) => {
      const text = card.textContent.toLowerCase();
      const house = houseFromCard(card);
      if (house) houses.add(house.toLowerCase());
      if (text.includes('need call')) needCall += 1;
      if (text.includes('follow up') || text.includes('follow-up')) followUp += 1;
      if (text.includes('will vote')) willVote += 1;
    });

    const totalText = document.getElementById('sectionTotal')?.textContent || '';
    const total = Number((totalText.match(/\d+/) || [cards.length])[0]) || cards.length;

    return { visible: cards.length, total, houses: houses.size, needCall, followUp, willVote };
  }

  function insights(metrics) {
    const items = [];
    if (!metrics.visible) {
      return [{ tone: 'warn', title: 'Waiting for voters', text: 'The brain is ready. Load or filter voters to see live suggestions.' }];
    }
    if (metrics.needCall) items.push({ tone: 'warn', title: 'Call queue', text: `${metrics.needCall} visible voters need call attention.` });
    if (metrics.followUp) items.push({ tone: 'bad', title: 'Follow-up', text: `${metrics.followUp} visible voters need follow-up.` });
    if (metrics.houses > 1) items.push({ tone: 'info', title: 'House breaks active', text: `${metrics.houses} house groups are visible in this list.` });
    if (metrics.willVote) items.push({ tone: 'good', title: 'Support pool', text: `${metrics.willVote} visible voters are marked will vote.` });
    if (!items.length) items.push({ tone: 'good', title: 'Stable view', text: 'No urgent visible pattern detected. Continue from the filters.' });
    return items.slice(0, 4);
  }

  function metric(label, value) {
    return `<div class="ai-metric"><strong>${new Intl.NumberFormat('en-US').format(value || 0)}</strong><span>${esc(label)}</span></div>`;
  }

  function houseFromCard(card) {
    const meta = card.querySelector('.voter-info p')?.textContent || '';
    return meta.split('·')[0]?.trim() || '';
  }

  function installStyles() {
    if (document.getElementById('aiBrainLiveStyles')) return;
    const style = document.createElement('style');
    style.id = 'aiBrainLiveStyles';
    style.textContent = `
      .ai-brain-live{margin:0 0 14px!important;padding:16px!important;background:linear-gradient(135deg,#fff,#f8fbff)!important}
      .ai-brain-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:12px}
      .ai-brain-head h2{margin:0 0 5px!important;font-size:22px!important;letter-spacing:-.02em!important}
      .ai-brain-head p{margin:0!important;color:#667085!important;line-height:1.45!important}
      .ai-brain-status{display:grid;justify-items:end;gap:2px;min-width:120px;border:1px solid #e4e7ec;border-radius:13px;background:#fff;padding:9px 11px}
      .ai-brain-status strong{font-size:12px;text-transform:uppercase;letter-spacing:.08em}.ai-brain-status small{font-size:11px;color:#667085;font-weight:800}.live-dot{width:10px;height:10px;border-radius:99px;background:#16a34a;box-shadow:0 0 0 6px rgba(22,163,74,.12);justify-self:end}.ai-brain-status.warn .live-dot{background:#d97706;box-shadow:0 0 0 6px rgba(217,119,6,.13)}.ai-brain-status.ok strong{color:#166534}.ai-brain-status.warn strong{color:#92400e}
      .ai-brain-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:10px}.ai-metric{border:1px solid #e4e7ec;border-radius:12px;background:#fff;padding:10px}.ai-metric strong{display:block;font-size:20px;line-height:1}.ai-metric span{display:block;margin-top:4px;color:#667085;font-size:11px;font-weight:900;text-transform:uppercase}
      .ai-brain-insights{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ai-insight{border:1px solid #e4e7ec;border-radius:12px;background:#fff;padding:10px}.ai-insight strong{display:block;margin-bottom:4px;font-size:13px}.ai-insight span{display:block;color:#667085;font-size:12px;line-height:1.4}.ai-insight.good{border-color:#bbf7d0;background:#f0fdf4}.ai-insight.warn{border-color:#fde68a;background:#fffbeb}.ai-insight.bad{border-color:#fecaca;background:#fef2f2}.ai-insight.info{border-color:#bfdbfe;background:#eff6ff}
      @media(max-width:760px){.ai-brain-head,.ai-brain-metrics,.ai-brain-insights{display:grid;grid-template-columns:1fr}.ai-brain-status{justify-items:start}.live-dot{justify-self:start}}
    `;
    document.head.appendChild(style);
  }

  function debounce(fn, delay) {
    let timer;
    return function debounced() {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
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