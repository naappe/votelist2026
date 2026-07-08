(function () {
  const params = new URLSearchParams(location.search);
  const party = (params.get('party') || 'PNC').toUpperCase();
  let timer = 0;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  function init() {
    installStyles();
    refreshStats();
    showAssignedLines();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    setInterval(() => {
      refreshStats();
      showAssignedLines();
    }, 15000);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(showAssignedLines, 120);
  }

  async function refreshStats() {
    try {
      const cfg = window.APP_CONFIG || {};
      if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseKey) return;
      const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
      let query = client
        .from('campaign')
        .select('vote_status,reach_status,phone_status,d2d_status', { count: 'exact', head: false });
      if (party !== 'ALL') query = query.eq('party', party);
      const res = await query.limit(5000);
      if (res.error) return;
      const rows = res.data || [];
      setNum('total', rows.length);
      setNum('will', rows.filter(r => r.vote_status === 'will-vote').length);
      setNum('notvote', rows.filter(r => ['no-vote', 'not-vote'].includes(r.vote_status)).length);
      setNum('pending', rows.filter(r => r.vote_status === 'pending').length);
      setNum('need', rows.filter(r => r.reach_status !== 'reached' || r.phone_status === 'need-call' || r.d2d_status === 'not-visited').length);
    } catch (error) {
      console.warn('Resident display stats refresh failed', error);
    }
  }

  function showAssignedLines() {
    document.querySelectorAll('.resident-card').forEach(card => {
      const info = card.querySelector('.info');
      if (!info || info.querySelector('.assigned-visible-line')) return;
      const chips = Array.from(card.querySelectorAll('.chips span'));
      const assignedChip = chips.find(span => /^assigned\s*:/i.test(span.textContent || ''));
      const unassignedChip = chips.find(span => /^unassigned$/i.test((span.textContent || '').trim()));
      const line = document.createElement('div');
      line.className = 'assigned-visible-line';
      if (assignedChip) {
        const name = assignedChip.textContent.replace(/^assigned\s*:/i, '').trim();
        line.innerHTML = '<strong>Assigned:</strong> ' + escapeHtml(name || '-');
        line.classList.add('assigned-ok');
      } else if (unassignedChip) {
        line.innerHTML = '<strong>Assigned:</strong> Not assigned';
        line.classList.add('assigned-empty');
      } else {
        line.innerHTML = '<strong>Assigned:</strong> Not assigned';
        line.classList.add('assigned-empty');
      }
      const meta = info.querySelector('p');
      if (meta) meta.insertAdjacentElement('afterend', line);
      else info.prepend(line);
    });
  }

  function setNum(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = Number(value || 0).toLocaleString('en-US');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function installStyles() {
    if (document.getElementById('residentsDisplayFixStyles')) return;
    const style = document.createElement('style');
    style.id = 'residentsDisplayFixStyles';
    style.textContent = `
      .assigned-visible-line{margin:0 0 10px;padding:8px 10px;border-radius:12px;font-size:12px;font-weight:900;border:1px solid #dbe4f0;background:#f8fafc;color:#334155}
      .assigned-visible-line strong{color:#0f172a}
      .assigned-visible-line.assigned-ok{background:#ecfdf5;border-color:#bbf7d0;color:#047857}
      .assigned-visible-line.assigned-empty{background:#f8fafc;border-color:#e2e8f0;color:#64748b}
      @media(max-width:850px){.assigned-visible-line{font-size:11px;padding:7px 8px;margin-bottom:8px}}
    `;
    document.head.appendChild(style);
  }
})();