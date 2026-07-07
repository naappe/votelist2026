(function () {
  if (!['management', 'analytics'].includes(document.body.dataset.view)) return;

  const formatter = new Intl.NumberFormat('en-US');
  let timer = 0;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  function boot() {
    installStyles();
    polish();
    const panel = document.getElementById('aiBrainLive');
    if (!panel) {
      setTimeout(boot, 250);
      return;
    }
    new MutationObserver(schedule).observe(panel, { childList: true, subtree: true });
    window.addEventListener('online', schedule);
    window.addEventListener('offline', schedule);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(polish, 50);
  }

  function polish() {
    const panel = document.getElementById('aiBrainLive');
    if (!panel) return;

    const status = panel.querySelector('.ai-brain-status');
    const statusText = status?.querySelector('strong');
    const statusMeta = status?.querySelector('small');
    if (statusText) statusText.textContent = navigator.onLine ? 'Connected' : 'Offline';
    if (statusMeta) statusMeta.textContent = `Last updated ${timeNow()}`;

    const metrics = metricMap(panel);
    const assignedMetric = metrics.get('assigned');

    if (document.body.dataset.view === 'management') {
      if (assignedMetric) assignedMetric.hidden = true;
      panel.querySelector('#aiAssignmentStatus')?.remove();
      relabelCallQueue(panel);
      return;
    }

    if (assignedMetric) assignedMetric.hidden = true;

    const all = metricValue(metrics.get('all'));
    const assigned = metricValue(assignedMetric);
    const coverage = all ? Math.min(100, Math.round((assigned / all) * 100)) : 0;
    const existing = panel.querySelector('#aiAssignmentStatus');
    const markup = `
      <div class="ai-assignment-card">
        <div>
          <span>Assignment Status</span>
          <strong>${formatter.format(assigned)} assigned</strong>
          <small>${coverage}% of ${formatter.format(all)} voters in this scope</small>
        </div>
        <div class="ai-assignment-progress" aria-label="Assignment coverage"><span style="width:${coverage}%"></span></div>
      </div>
    `;

    if (existing) {
      if (existing.innerHTML !== markup) existing.innerHTML = markup;
    } else {
      const wrap = document.createElement('section');
      wrap.id = 'aiAssignmentStatus';
      wrap.setAttribute('aria-label', 'Assignment status');
      wrap.innerHTML = markup;
      panel.querySelector('.ai-brain-metrics')?.after(wrap);
    }

    relabelCallQueue(panel);
  }

  function relabelCallQueue(panel) {
    panel.querySelectorAll('.ai-metric span').forEach((label) => {
      if (label.textContent.trim().toLowerCase() === 'need call') label.textContent = 'Call Queue';
    });
  }

  function metricMap(panel) {
    const output = new Map();
    panel.querySelectorAll('.ai-metric').forEach((metric) => {
      const label = metric.querySelector('span')?.textContent || '';
      output.set(label.trim().toLowerCase(), metric);
    });
    return output;
  }

  function metricValue(metric) {
    const raw = metric?.querySelector('strong')?.textContent || '0';
    const value = Number(raw.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(value) ? value : 0;
  }

  function timeNow() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function installStyles() {
    if (document.getElementById('aiBrainCleanupStyles')) return;
    const style = document.createElement('style');
    style.id = 'aiBrainCleanupStyles';
    style.textContent = `
      body[data-view="management"] #aiAssignmentStatus{display:none!important}
      #aiAssignmentStatus{margin:0 0 10px!important}
      .ai-assignment-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,.35fr);gap:12px;align-items:center;border:1px solid #bfdbfe;border-radius:13px;background:#eff6ff;padding:12px;color:#1f3b66}
      .ai-assignment-card span{display:block;margin-bottom:4px;color:#2563eb;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.06em}
      .ai-assignment-card strong{display:block;color:#101828;font-size:18px;line-height:1.1;font-weight:950}
      .ai-assignment-card small{display:block;margin-top:4px;color:#475467;font-size:12px;font-weight:800}
      .ai-assignment-progress{height:10px;border-radius:999px;background:#dbeafe;overflow:hidden}.ai-assignment-progress span{display:block;height:100%;border-radius:inherit;background:#2563eb;transition:width .2s ease}
      @media(max-width:760px){.ai-assignment-card{grid-template-columns:1fr}.ai-assignment-progress{width:100%}}
    `;
    document.head.appendChild(style);
  }
})();
