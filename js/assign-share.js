(function () {
  function selectedIds() {
    return Array.from(document.querySelectorAll('[data-share-select]:checked')).map((input) => input.value).filter(Boolean);
  }

  function visibleIds() {
    return Array.from(document.querySelectorAll('.voter-card[data-open-voter]'))
      .map((card) => card.dataset.openVoter)
      .filter(Boolean);
  }

  function labelAssignButtons() {
    document.querySelectorAll('.share-pick span').forEach((span) => {
      if (span.textContent.trim() !== 'Pick') span.textContent = 'Pick';
    });
    document.querySelectorAll('[data-share-selected]').forEach((button) => {
      const countText = button.querySelector('#shareSelectedCount')?.textContent || '0';
      button.innerHTML = `Share Picked <span id="shareSelectedCount">${escapeHtml(countText)}</span>`;
    });
  }

  function client() {
    const config = window.APP_CONFIG;
    if (!window.supabase || !config) return null;
    if (!window.__assignShareClient) {
      window.__assignShareClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    }
    return window.__assignShareClient;
  }

  async function fetchRows(ids) {
    const fallback = ids.map(rowFromCard).filter(Boolean);
    try {
      const sb = client();
      const config = window.APP_CONFIG;
      if (!sb || !config || !ids.length) return fallback;
      const { data, error } = await sb
        .from(config.table)
        .select('id,national_id,name,house,phone,photo_url,vote_assigned_by')
        .in('id', ids);
      if (error || !data) return fallback;
      const byId = new Map(data.map((row) => [String(row.id), row]));
      return ids.map((id) => {
        const row = byId.get(String(id));
        const backup = rowFromCard(id) || {};
        return {
          row_id: String(row?.id || backup.row_id || id),
          id: row?.national_id || backup.id || '',
          name: row?.name || backup.name || '',
          house: row?.house || backup.house || '',
          mobile: row?.phone || backup.mobile || '',
          photo: row?.photo_url || backup.photo || '',
          assigned_count: countAssignments(row?.vote_assigned_by || '')
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
      row_id: String(id),
      id: '',
      name: card.querySelector('h3')?.textContent.trim() || '',
      house: meta[0] || '',
      mobile: meta[meta.length - 1] || '',
      photo: card.querySelector('.voter-photo img')?.src || '',
      assigned_count: 0
    };
  }

  function countAssignments(value) {
    return String(value || '').split(',').map((item) => item.trim()).filter(Boolean).length;
  }

  function token() {
    const random = new Uint32Array(2);
    crypto.getRandomValues(random);
    return `${Date.now().toString(36)}${random[0].toString(36)}${random[1].toString(36)}`.slice(0, 24);
  }

  async function saveShare(rows) {
    const sb = client();
    if (!sb) throw new Error('Supabase is not ready.');
    const shareToken = token();
    const { error } = await sb
      .from('assignment_shares')
      .insert({ token: shareToken, payload: rows });
    if (error) throw error;
    return shareToken;
  }

  async function shareAssignment(useVisible) {
    const ids = selectedIds();
    const finalIds = ids.length ? ids : (useVisible ? visibleIds() : []);
    if (!finalIds.length) {
      showStatus('Select voters to assign first.', true);
      return;
    }

    const rows = await fetchRows(finalIds);
    if (!rows.length) {
      showStatus('Could not prepare assignment link.', true);
      return;
    }

    try {
      const shareToken = await saveShare(rows);
      const url = new URL('shared.html', location.href);
      url.username = '';
      url.password = '';
      url.search = '';
      url.hash = '';
      url.searchParams.set('s', shareToken);
      const link = url.toString();

      try {
        await navigator.clipboard.writeText(link);
        showLink(link, `Self-assign link copied for ${rows.length} voter${rows.length === 1 ? '' : 's'}. Friends can write their name and save.`);
      } catch {
        showLink(link, `Self-assign link ready for ${rows.length} voter${rows.length === 1 ? '' : 's'}. Friends can write their name and save.`);
      }
    } catch (error) {
      showStatus(error.message || 'Could not create short assignment link.', true);
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
      box.style.cssText = 'display:grid;gap:10px;margin:0 0 14px;padding:14px;border:1px solid #bfdbfe;border-radius:14px;background:#eff6ff;color:#1f3b66;font-weight:800';
      host.after(box);
    }
    box.innerHTML = `
      <div style="display:grid;gap:3px">
        <strong style="font-size:14px;color:#1e3a8a">Self-assign link ready</strong>
        <span style="font-size:13px;color:#475467">${escapeHtml(message)}</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn compact" type="button" data-copy-assign-link style="background:#2563eb;color:#fff;border:0">Copy Link</button>
        <a class="btn compact light" href="${escapeHtml(link)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;text-decoration:none">Open Link</a>
      </div>
      <input readonly value="${escapeHtml(link)}" aria-label="Assignment link" style="width:100%;min-height:36px;border:1px solid #bfdbfe;border-radius:10px;padding:8px;background:#fff;color:#334155;font-size:12px;font-weight:700">
    `;
    box.dataset.assignLink = link;
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
    const copy = event.target.closest('[data-copy-assign-link]');
    if (copy) {
      event.preventDefault();
      event.stopPropagation();
      const box = document.getElementById('assignShareLinkBox');
      const link = box?.dataset?.assignLink || box?.querySelector('input')?.value || '';
      if (!link) return;
      try {
        await navigator.clipboard.writeText(link);
        showStatus('Self-assign link copied.', false);
      } catch {
        const input = box.querySelector('input');
        input?.select();
        showStatus('Copy blocked. Link selected below.', true);
      }
      return;
    }

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
