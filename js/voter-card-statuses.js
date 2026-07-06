(function () {
  const byId = new Map();
  let loading = false;
  let applyTimer = 0;

  function ready() {
    return Boolean(window.APP_CONFIG && window.supabase);
  }

  function label(value) {
    return String(value || '-').replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function voteResult(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'will-vote') return '👍 Will Vote';
    if (normalized === 'guaranteed') return '✅ Guarantee';
    if (normalized === 'no-vote') return '🚫 Not Vote';
    if (normalized === 'not-decided') return '❔ Not Decided';
    return '⏳ Pending';
  }

  function callResult(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'called' || normalized === 'connected') return '📞 Connected';
    if (normalized === 'out-of-range' || normalized === 'out-of-coverage') return '📵 Out of Coverage';
    if (normalized === 'busy') return '☎️ Busy';
    if (normalized === 'no-answer') return '📞 Not Answer';
    if (normalized === 'disconnected') return '📵 Disconnected';
    return normalized ? `📞 ${label(normalized)}` : '📞 No Result';
  }

  function d2dResult(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'visited' || normalized === 'reach') return '🏠 Reach';
    if (normalized === 'not-home') return '🏠 Not Home';
    if (normalized === 'live-another-place') return '🏠 Live in Another Place';
    return normalized ? `🏠 ${label(normalized)}` : '🏠 No Result';
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
    if (type === 'call') {
      if (['called', 'connected'].includes(normalized)) return 'good';
      if (['no-phone', 'wrong-number', 'disconnected', 'out-of-range', 'out-of-coverage'].includes(normalized)) return 'danger';
      return 'warn';
    }
    if (type === 'd2d') {
      if (['visited', 'reach'].includes(normalized)) return 'good';
      if (['follow-up', 'not-home'].includes(normalized)) return 'warn';
      return 'neutral';
    }
    return 'neutral';
  }

  function tab(title, result, tabTone) {
    return `
      <span class="card-status-tab ${tabTone}">
        <span>${escapeHtml(title)}</span>
        <strong>${escapeHtml(result)}</strong>
      </span>
    `;
  }

  function render(row) {
    return [
      tab('Vote', voteResult(row.vote_status), tone('vote', row.vote_status)),
      tab('Call Center', callResult(row.phone_status), tone('call', row.phone_status)),
      tab('D2D', d2dResult(row.d2d_status), tone('d2d', row.d2d_status))
    ].join('');
  }

  function ensureStrip(card) {
    let strip = card.querySelector('.card-status-strip');
    if (strip) return strip;
    const old = card.querySelector('.section-label');
    if (old) {
      old.className = 'section-label card-status-strip';
      return old;
    }
    strip = document.createElement('div');
    strip.className = 'section-label card-status-strip';
    const actions = card.querySelector('.card-actions');
    if (actions) actions.before(strip);
    else card.querySelector('.voter-info')?.appendChild(strip);
    return strip;
  }

  function updateMeta(card, row) {
    if (!row || !row.id) return;
    const meta = card.querySelector('.pro-meta-line, .voter-info p');
    if (meta) {
      const address = row.house || '-';
      const id = row.national_id || 'No ID';
      meta.textContent = `${address} · ${id}`;
    }
    const partyTag = card.querySelector('.party-tag');
    if (partyTag && row.party) partyTag.textContent = row.party;
  }

  function apply() {
    document.querySelectorAll('[data-open-voter]').forEach((card) => {
      const id = String(card.dataset.openVoter || '');
      const row = byId.get(id) || {};
      updateMeta(card, row);
      const strip = ensureStrip(card);
      if (!strip) return;
      strip.className = 'section-label card-status-strip';
      strip.setAttribute('aria-label', 'Vote call center and D2D status results');
      strip.innerHTML = render(row);
    });
  }

  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(apply, 40);
  }

  async function loadStatuses() {
    if (loading || !ready()) return;
    loading = true;
    try {
      const config = window.APP_CONFIG;
      const client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
      const party = (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
      let from = 0;
      const pageSize = 1000;
      byId.clear();

      while (true) {
        let query = client
          .from(config.table)
          .select('id,national_id,house,party,vote_status,d2d_status,phone_status')
          .range(from, from + pageSize - 1);
        if (party !== 'ALL') query = query.eq('party', party);
        const { data, error } = await query;
        if (error) throw error;
        (data || []).forEach((row) => byId.set(String(row.id), row));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
    } catch (error) {
      console.warn('Voter card result blocks skipped:', error);
    } finally {
      loading = false;
      apply();
    }
  }

  function boot() {
    const list = document.getElementById('voterList');
    if (list) new MutationObserver(scheduleApply).observe(list, { childList: true, subtree: true, characterData: true });
    apply();
    loadStatuses();
    let runs = 0;
    const timer = setInterval(() => {
      if (!byId.size) loadStatuses();
      apply();
      runs += 1;
      if (runs > 120) clearInterval(timer);
    }, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
