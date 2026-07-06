(function () {
  const byId = new Map();
  let loaded = false;
  let loading = false;
  let observerStarted = false;
  let applyTimer = 0;

  function configReady() {
    return Boolean(window.APP_CONFIG && window.supabase);
  }

  function label(value) {
    return String(value || '-').replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function tone(type, value) {
    const normalized = String(value || '').toLowerCase();
    if (type === 'vote') {
      if (['will-vote', 'guaranteed'].includes(normalized)) return 'good';
      if (['no-vote', 'not-decided'].includes(normalized)) return 'danger';
      return 'warn';
    }
    if (type === 'd2d') {
      if (['visited', 'reach'].includes(normalized)) return 'good';
      if (['follow-up', 'not-home'].includes(normalized)) return 'warn';
      return 'neutral';
    }
    if (type === 'call') {
      if (['called', 'connected'].includes(normalized)) return 'good';
      if (['no-phone', 'wrong-number', 'disconnected', 'out-of-range'].includes(normalized)) return 'danger';
      return 'warn';
    }
    return 'neutral';
  }

  function tab(title, value, tabTone) {
    return `
      <span class="card-status-tab ${tabTone}">
        <span>${escapeHtml(title)}</span>
        <strong>${escapeHtml(label(value))}</strong>
      </span>
    `;
  }

  function render(row) {
    return [
      tab('Vote', row.vote_status || 'pending', tone('vote', row.vote_status)),
      tab('D2D', row.d2d_status || 'not-visited', tone('d2d', row.d2d_status)),
      tab('Call', row.phone_status || 'need-call', tone('call', row.phone_status))
    ].join('');
  }

  function apply() {
    if (!loaded) return;
    document.querySelectorAll('.voter-card[data-open-voter]').forEach((card) => {
      const row = byId.get(String(card.dataset.openVoter || ''));
      if (!row) return;
      const strip = card.querySelector('.card-status-strip') || card.querySelector('.section-label');
      if (!strip) return;
      strip.className = 'section-label card-status-strip';
      strip.setAttribute('aria-label', 'Voter quick statuses');
      strip.innerHTML = render(row);
    });
  }

  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(apply, 80);
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;
    const list = document.getElementById('voterList');
    if (!list) return;
    new MutationObserver(scheduleApply).observe(list, { childList: true, subtree: true });
  }

  async function loadStatuses() {
    if (loading || loaded || !configReady()) return;
    loading = true;

    try {
      const config = window.APP_CONFIG;
      const client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
      const party = (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
      let from = 0;
      const pageSize = 1000;
      byId.clear();

      while (true) {
        let query = client
          .from(config.table)
          .select('id,vote_status,d2d_status,phone_status')
          .range(from, from + pageSize - 1);
        if (party !== 'ALL') query = query.eq('party', party);

        const { data, error } = await query;
        if (error) throw error;
        (data || []).forEach((row) => byId.set(String(row.id), row));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }

      loaded = byId.size > 0;
      scheduleApply();
    } catch (error) {
      console.warn('Voter card statuses skipped:', error);
    } finally {
      loading = false;
    }
  }

  function boot() {
    startObserver();
    setTimeout(loadStatuses, 1200);
  }

  if (document.readyState === 'complete') {
    boot();
  } else {
    window.addEventListener('load', boot, { once: true });
  }
})();
