(function () {
  const params = new URLSearchParams(location.search);
  const party = (params.get('party') || 'PNC').toUpperCase();
  const section = ((params.get('section') || 'voters').toLowerCase() === 'residents') ? 'voters' : (params.get('section') || 'voters').toLowerCase();
  if (section !== 'assign') return;

  let rows = [];
  let client = null;
  let selectedMode = 'unassigned';
  let selectedAssignee = '';
  let busy = false;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  async function init() {
    installStyles();
    setupClient();
    await loadRows();
    compactAssignees();
    patchShareButtons();
    document.addEventListener('click', trackViewClicks, true);
    new MutationObserver(() => {
      compactAssignees();
      patchShareButtons();
    }).observe(document.body, { childList: true, subtree: true });
  }

  function setupClient() {
    const cfg = window.APP_CONFIG || {};
    if (window.supabase && cfg.supabaseUrl && cfg.supabaseKey) {
      client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
    }
  }

  async function loadRows() {
    if (!client) return;
    try {
      let query = client
        .from('campaign')
        .select('id,name,national_id,house,phone,party,election_box,photo_url,vote_status,phone_status,reach_status,d2d_status,transport_status,support_level,remarks,vote_assigned_by,vote_assigned_at')
        .limit(5000);
      if (party !== 'ALL') query = query.eq('party', party);
      const res = await query;
      if (!res.error) rows = res.data || [];
    } catch (error) {
      console.warn('Assign dropdown/share rows failed', error);
    }
  }

  function compactAssignees() {
    const panel = document.getElementById('sectionResultSummary');
    if (!panel || panel.querySelector('#assigneeSelectPanel')) return;
    const grid = panel.querySelector('.assignee-grid');
    if (!grid) return;

    const buttons = Array.from(grid.querySelectorAll('[data-assignee]'));
    if (!buttons.length) return;

    const options = buttons.map(btn => {
      const name = btn.dataset.assignee || clean(btn.querySelector('strong')?.textContent);
      const count = clean(btn.querySelector('span')?.textContent);
      return { name, count };
    }).filter(x => x.name);

    const wrapper = document.createElement('div');
    wrapper.id = 'assigneeSelectPanel';
    wrapper.className = 'assignee-select-panel';
    wrapper.innerHTML = `
      <label>Assigned person
        <select id="assigneeSelect">
          <option value="">Choose assigned person</option>
          ${options.map(opt => `<option value="${escapeAttr(opt.name)}">${escapeHtml(opt.name)} (${escapeHtml(opt.count)})</option>`).join('')}
        </select>
      </label>
      <button id="showAssigneeBtn" class="btn active" type="button">Show Assigned List</button>
    `;
    grid.insertAdjacentElement('beforebegin', wrapper);
    grid.classList.add('assignee-grid-hidden');

    const select = wrapper.querySelector('#assigneeSelect');
    const show = wrapper.querySelector('#showAssigneeBtn');
    select.onchange = () => {
      selectedAssignee = select.value;
      if (select.value) showAssignee(select.value);
    };
    show.onclick = () => {
      if (select.value) showAssignee(select.value);
      else select.focus();
    };
  }

  function showAssignee(name) {
    selectedMode = 'assignee';
    selectedAssignee = name;
    const originalButton = document.querySelector(`[data-assignee="${cssEscape(name)}"]`);
    if (originalButton) originalButton.click();
  }

  function trackViewClicks(event) {
    const filterButton = event.target.closest('[data-section-filter]');
    if (filterButton) {
      const filter = filterButton.dataset.sectionFilter || '';
      if (filter === 'assigned') selectedMode = 'assigned';
      else if (filter === 'unassigned') selectedMode = 'unassigned';
      else if (filter === 'all') selectedMode = 'all';
      else if (filter === 'assignees') selectedMode = 'unassigned';
    }
    const assignee = event.target.closest('[data-assignee]');
    if (assignee) {
      selectedMode = 'assignee';
      selectedAssignee = assignee.dataset.assignee || '';
      const select = document.getElementById('assigneeSelect');
      if (select && selectedAssignee) select.value = selectedAssignee;
    }
  }

  function patchShareButtons() {
    const assignBtn = document.getElementById('assignLinkBtn');
    const safeBtn = document.getElementById('safeLinkBtn');
    const copyBtn = document.getElementById('copyLinkBtn');
    if (assignBtn && !assignBtn.dataset.fixedShare) {
      assignBtn.dataset.fixedShare = '1';
      assignBtn.onclick = (event) => { event.preventDefault(); event.stopPropagation(); createShare('assign'); };
    }
    if (safeBtn && !safeBtn.dataset.fixedShare) {
      safeBtn.dataset.fixedShare = '1';
      safeBtn.onclick = (event) => { event.preventDefault(); event.stopPropagation(); createShare('safe'); };
    }
    if (copyBtn && !copyBtn.dataset.fixedCopy) {
      copyBtn.dataset.fixedCopy = '1';
      copyBtn.onclick = (event) => { event.preventDefault(); event.stopPropagation(); copyLink(); };
    }
  }

  function currentRowsForShare() {
    let source = rows.slice();
    const listTitle = clean(document.querySelector('#list')?.closest('.panel')?.querySelector('.panel-head h2')?.textContent).toLowerCase();
    const select = document.getElementById('assigneeSelect');
    const selected = clean(select?.value || selectedAssignee);

    if (listTitle.startsWith('assigned to') || selectedMode === 'assignee') {
      const person = selected || clean(listTitle.replace(/^assigned to/i, ''));
      return rows.filter(row => splitNames(row.vote_assigned_by).some(name => name.toLowerCase() === person.toLowerCase()));
    }
    if (listTitle.includes('assigned residents') || selectedMode === 'assigned') return rows.filter(isAssigned);
    if (listTitle.includes('unassigned') || selectedMode === 'unassigned') return rows.filter(row => !isAssigned(row));
    if (selectedMode === 'all') return source;

    return rows.filter(row => !isAssigned(row));
  }

  async function createShare(kind) {
    if (busy) return;
    busy = true;
    try {
      if (!client) setupClient();
      if (!rows.length) await loadRows();
      const source = currentRowsForShare();
      if (!source.length) {
        setStatus('No residents to share from current view.', true);
        return;
      }
      const token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
      const payload = source.map(row => ({
        row_id: row.id,
        id: row.national_id || '',
        national_id: row.national_id || '',
        name: row.name || '',
        house: row.house || '',
        mobile: row.phone || '',
        phone: row.phone || '',
        photo: row.photo_url || '',
        photo_url: row.photo_url || '',
        party: row.party || '',
        assigned_by: row.vote_assigned_by || '',
        vote_assigned_by: row.vote_assigned_by || '',
        assigned_names: splitNames(row.vote_assigned_by).join(', '),
        assigned_count: splitNames(row.vote_assigned_by).length
      }));

      setStatus(`Creating ${kind === 'safe' ? 'read-only' : 'assign'} link for ${source.length.toLocaleString()} residents...`);
      const res = await client.from('assignment_shares').insert({ token, payload }).select('token').single();
      if (res.error) throw res.error;
      const base = location.href.split('/residents.html')[0] + '/';
      const url = base + (kind === 'safe' ? 'safe-share.html?s=' : 'shared.html?s=') + encodeURIComponent(token);
      const box = document.getElementById('shareLinkBox');
      if (box) box.value = url;
      try { await navigator.clipboard.writeText(url); } catch {}
      setStatus(`Created ${kind === 'safe' ? 'read-only' : 'assign'} link for ${source.length.toLocaleString()} residents. Link copied.`);
    } catch (error) {
      setStatus('Create link failed: ' + (error.message || error), true);
    } finally {
      busy = false;
    }
  }

  function copyLink() {
    const box = document.getElementById('shareLinkBox');
    if (!box || !box.value) {
      setStatus('No link created yet.', true);
      return;
    }
    box.select();
    navigator.clipboard?.writeText(box.value);
    setStatus('Copied link.');
  }

  function setStatus(text, isError) {
    const status = document.getElementById('status');
    if (!status) return;
    status.textContent = text;
    status.className = isError ? 'status error assign-status-line' : 'status assign-status-line';
  }

  function splitNames(value) {
    return Array.from(new Set(String(value || '').split(',').map(clean).filter(Boolean).filter(name => name.toLowerCase() !== 'naappe@gmail.com')));
  }

  function isAssigned(row) { return !!clean(row.vote_assigned_by); }
  function clean(value) { return String(value || '').trim(); }
  function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch])); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value || '').replace(/"/g, '\\"');
  }

  function installStyles() {
    if (document.getElementById('assignDropdownShareStyles')) return;
    const style = document.createElement('style');
    style.id = 'assignDropdownShareStyles';
    style.textContent = `
      .assignee-grid-hidden{display:none!important}
      .assignee-select-panel{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end;margin:12px 0 4px;padding:12px;border:1px solid #dbe4f0;border-radius:16px;background:#fff}
      .assignee-select-panel label{font-size:12px;font-weight:950;color:#334155;text-transform:uppercase;letter-spacing:.04em}
      .assignee-select-panel select{height:46px;margin-top:6px;border:1px solid #cbd5e1;border-radius:12px;padding:0 12px;font:inherit;font-weight:850;background:#fff;color:#071226}
      .assignee-select-panel .btn{height:46px;border-radius:12px}
      .result-summary-note{display:none!important}
      @media(max-width:760px){.assignee-select-panel{grid-template-columns:1fr;gap:8px;padding:12px}.assignee-select-panel select{height:56px;border-radius:16px;font-size:15px}.assignee-select-panel .btn{height:54px;border-radius:16px;font-size:15px}}
    `;
    document.head.appendChild(style);
  }
})();