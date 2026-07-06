(function () {
  const byId = new Map();
  let loading = false;
  let applyTimer = 0;

  function ready() {
    return Boolean(window.APP_CONFIG && window.supabase);
  }

  function updateMeta(card, row) {
    if (!row || !row.id) return;
    const meta = card.querySelector('.pro-meta-line, .voter-info p');
    if (meta) meta.textContent = `${row.house || '-'} · ${row.national_id || 'No ID'}`;
    const partyTag = card.querySelector('.party-tag');
    if (partyTag && row.party) partyTag.textContent = row.party;
  }

  function removeBottomStatus(card) {
    card.querySelectorAll('.section-label, .card-status-strip').forEach((node) => node.remove());
  }

  function apply() {
    document.querySelectorAll('[data-open-voter]').forEach((card) => {
      const id = String(card.dataset.openVoter || '');
      const row = byId.get(id) || {};
      updateMeta(card, row);
      removeBottomStatus(card);
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
      console.warn('Voter card status cleanup skipped:', error);
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
