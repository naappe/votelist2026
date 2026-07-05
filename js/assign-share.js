(function () {
  function selectedIds() {
    return Array.from(document.querySelectorAll('[data-share-select]:checked')).map((input) => input.value).filter(Boolean);
  }

  function visibleIds(limit) {
    return Array.from(document.querySelectorAll('.voter-card[data-open-voter]'))
      .map((card) => card.dataset.openVoter)
      .filter(Boolean)
      .slice(0, limit || 30);
  }

  function labelAssignButtons() {
    document.querySelectorAll('.share-pick span').forEach((span) => {
      if (span.textContent.trim() !== 'Assign') span.textContent = 'Assign';
    });
    document.querySelectorAll('[data-share-selected]').forEach((button) => {
      const count = button.querySelector('#shareSelectedCount')?.outerHTML || '';
      button.innerHTML = `Share Assign ${count}`;
    });
  }

  async function fetchRows(ids) {
    const fallback = ids.map(rowFromCard).filter(Boolean);
    try {
      const config = window.APP_CONFIG;
      if (!window.supabase || !config || !ids.length) return fallback;
      const client = window.__assignShareClient || window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
      window.__assignShareClient = client;
      const { data, error } = await client
        .from(config.table)
        .select('id,national_id,name,house,phone,photo_url')
        .in('id', ids);
      if (error || !data) return fallback;
      const byId = new Map(data.map((row) => [String(row.id), row]));
      return ids.map((id) => {
        const row = byId.get(String(id));
        const backup = rowFromCard(id) || {};
        return {
          id: row?.national_id || backup.id || id,
          name: row?.name || backup.name || '',
          house: row?.house || backup.house || '',
          mobile: row?.phone || backup.mobile || '',
          photo: row?.photo_url || backup.photo || ''
        };
      });
    } catch {
      return fallback;
    }
  }

  function rowFromCard(id) {
    const card = document.querySelector(`.voter-card[data-open-voter="${cssEscape(id)}"]`);
    if (!card) return null;
    const meta = (card.querySelector('.voter-info p')?.textContent || '').split('·').map((item) => item.trim()).filter(Boolean);
    return {
      id,
      name: card.querySelector('h3')?.textContent.trim() || '',
      house: meta[0] || '',
      mobile: meta[meta.length - 1] || '',
      photo: card.querySelector('.voter-photo img')?.src || ''
    };
  }

  function encodePayload(rows) {
    const safeRows = rows.map((row) => ({
      id: String(row.id || ''),
      name: String(row.name || ''),
      house: String(row.house || ''),
      mobile: String(row.mobile || ''),
      photo: String(row.photo || '')
    }));
    const json = JSON.stringify(safeRows);
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  async function shareAssignment(useVisible) {
    const ids = selectedIds();
    const finalIds = ids.length ? ids : (useVisible ? visibleIds(30) : []);
    if (!finalIds.length) {
      showStatus('Select voters to assign first.', true);
      return;
    }
    const rows = await fetchRows(finalIds);
    if (!rows.length) {
      showStatus('Could not prepare assignment link.', true);
      return;
    }

    const url = new URL('shared.html', location.href);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    url.searchParams.set('list', encodePayload(rows));
    const link = url.toString();

    try {
      await navigator.clipboard.writeText(link);
      showLink(link, `Assignment link copied for ${rows.length} voter${rows.length === 1 ? '' : 's'}. No login needed.`);
    } catch {
      showLink(link, `Assignment link ready for ${rows.length} voter${rows.length === 1 ? '' : 's'}. No login needed.`);
    }
  }

  function showStatus(message, isError) {
    const status = document.getElementById('statusMessage');
    if (!status) return;
    status.textContent = message;
    status.className = `status-message ${isError ? 'error' : 'ok'}`;
  }

  function showLink(link, message) {
    showStatus(message, false);
    const host = document.getElementById('statusMessage') || document.querySelector('.voter-panel');
    if (!host) return;
    let box = document.getElementById('assignShareLinkBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'assignShareLinkBox';
      box.style.cssText = 'display:grid;gap:8px;margin:0 0 14px;padding:12px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;color:#1f3b66;font-weight:800';
      host.after(box);
    }
    box.innerHTML = `<span>${escapeHtml(message)}</span><input readonly value="${escapeHtml(link)}" style="width:100%;min-height:38px;border:1px solid #bfdbfe;border-radius:10px;padding:8px;background:#fff;color:#111827;font-weight:700"><a href="${escapeHtml(link)}" target="_blank" rel="noopener" style="color:#1d4ed8;font-weight:950">Open assignment link</a>`;
    box.querySelector('input')?.select();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
  }

  document.addEventListener('click', async (event) => {
    if (event.target.closest('[data-share-selected]')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      await shareAssignment(false);
      return;
    }
    if (event.target.closest('[data-share-read-view], #shareViewBtn')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      await shareAssignment(true);
    }
  }, true);

  window.addEventListener('load', labelAssignButtons);
  setInterval(labelAssignButtons, 800);
})();