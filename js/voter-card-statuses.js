(function () {
  const byId = new Map();
  let loading = false;
  let applyTimer = 0;

  function ready() {
    return Boolean(window.APP_CONFIG && window.supabase);
  }

  function voteResult(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'guaranteed' || normalized === 'guarantee') return '✅ Guarantee';
    if (normalized === 'will-vote') return '👍 Will Vote';
    if (normalized === 'not-vote' || normalized === 'no-vote') return '👎 Not Vote';
    if (normalized === 'not-decided') return '🤔 Not Decided';
    return '⏳ Pending';
  }

  function callResult(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'called' || normalized === 'connected') return '✅ Connected';
    if (normalized === 'out-of-range' || normalized === 'out-of-coverage') return '📡 Out of Coverage';
    if (normalized === 'busy') return '📵 Busy';
    if (normalized === 'no-answer' || normalized === 'not-answer') return '🔇 Not Answer';
    if (normalized === 'disconnected') return '❌ Disconnected';
    return '⏳ No Result';
  }

  function d2dResult(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'visited' || normalized === 'reach' || normalized === 'reached') return '✅ Reach';
    if (normalized === 'not-home') return '🚪 Not Home';
    if (normalized === 'live-another-place' || normalized === 'live-in-another-place') return '📍 Live in Another Place';
    return '⏳ No Result';
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
      if (['will-vote', 'guaranteed', 'guarantee'].includes(normalized)) return 'good';
      if (['not-vote', 'no-vote'].includes(normalized)) return 'danger';
      return 'warn';
    }
    if (type === 'call') {
      if (['called', 'connected'].includes(normalized)) return 'good';
      if (['disconnected', 'out-of-range', 'out-of-coverage'].includes(normalized)) return 'danger';
      return 'warn';
    }
    if (type === 'd2d') {
      if (['visited', 'reach', 'reached'].includes(normalized)) return 'good';
      if (['not-home'].includes(normalized)) return 'warn';
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
      tab('🗳️ Vote', voteResult(row.vote_status), tone('vote', row.vote_status)),
      tab('📞 Call', callResult(row.phone_status), tone('call', row.phone_status)),
      tab('🏠 D2D', d2dResult(row.d2d_status), tone('d2d', row.d2d_status))
    ].join('');
  }

  function ensureStyle() {
    if (document.getElementById('voter-result-style')) return;
    const style = document.createElement('style');
    style.id = 'voter-result-style';
    style.textContent = `
      .voter-card .card-status-strip,
      .pro-voter-card .card-status-strip{
        width:100%!important;
        margin:0!important;
        padding:0!important;
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        border-top:1px solid #edf0f3!important;
        background:#fff!important;
      }
      .card-status-tab{
        min-height:40px!important;
        padding:6px 4px!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:2px!important;
        border-right:1px solid #edf0f3!important;
        text-align:center!important;
      }
      .card-status-tab:last-child{border-right:0!important}
      .card-status-tab span{
        display:block!important;
        max-width:100%!important;
        color:#64748b!important;
        font-size:8px!important;
        font-weight:900!important;
        letter-spacing:.01em!important;
        line-height:1!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
      }
      .card-status-tab strong{
        display:block!important;
        max-width:100%!important;
        font-size:10px!important;
        font-weight:900!important;
        line-height:1.05!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
      }
      .card-status-tab.good strong{color:#047857!important}
      .card-status-tab.warn strong{color:#b45309!important}
      .card-status-tab.danger strong{color:#b91c1c!important}
      .card-status-tab.neutral strong{color:#475467!important}
      @media (max-width:430px){
        .card-status-tab{min-height:38px!important;padding:5px 3px!important}
        .card-status-tab span{font-size:7px!important}
        .card-status-tab strong{font-size:9px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureStrip(card) {
    let strip = card.querySelector('.card-status-strip') || card.querySelector('.section-label');
    const info = card.querySelector('.voter-info') || card;
    const actions = info.querySelector('.card-actions');

    if (!strip) {
      strip = document.createElement('div');
      strip.className = 'section-label card-status-strip';
    }
    strip.className = 'section-label card-status-strip';
    if (actions) {
      actions.insertAdjacentElement('afterend', strip);
    } else if (strip.parentElement !== info) {
      info.appendChild(strip);
    }
    return strip;
  }

  function updateMeta(card, row) {
    if (!row || !row.id) return;
    const meta = card.querySelector('.pro-meta-line, .voter-info p');
    if (meta) meta.textContent = `${row.house || '-'} · ${row.national_id || 'No ID'}`;
    const partyTag = card.querySelector('.party-tag');
    if (partyTag && row.party) partyTag.textContent = row.party;
  }

  function apply() {
    ensureStyle();
    document.querySelectorAll('[data-open-voter]').forEach((card) => {
      const id = String(card.dataset.openVoter || '');
      const row = byId.get(id) || {};
      updateMeta(card, row);
      const strip = ensureStrip(card);
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
      const client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
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
