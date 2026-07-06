(function () {
  if (new URLSearchParams(location.search).get('view') === 'read') return;

  let client;
  let activeVoterId = '';

  function clean(value) {
    return String(value || '').trim();
  }

  function getClient() {
    if (client) return client;
    const config = window.APP_CONFIG;
    if (!window.supabase || !config) return null;
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    return client;
  }

  function currentParty() {
    return (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
  }

  function cleanAssignee(value) {
    return String(value || '')
      .split(',')
      .map(clean)
      .filter((name) => name && name.toLowerCase() !== 'naappe@gmail.com')
      .join(', ');
  }

  function applyCallResult(updates, result) {
    const value = clean(result);
    if (!value) return;
    if (value === 'called' || value === 'connected') {
      updates.phone_status = 'called';
      updates.reach_status = 'reached';
      return;
    }
    updates.phone_status = value;
    updates.reach_status = 'not-reached';
    if (['busy', 'switched-off', 'disconnected', 'wrong-number', 'out-of-range', 'out-of-coverage', 'not-answer', 'no-phone'].includes(value)) {
      updates.d2d_status = updates.d2d_status || 'follow-up';
    }
  }

  function buildUpdates(form) {
    const fd = Object.fromEntries(new FormData(form).entries());
    const updates = {};

    if (fd.remarks !== undefined) updates.remarks = clean(fd.remarks) || null;
    if (fd.phone !== undefined && clean(fd.phone)) updates.phone = clean(fd.phone);
    if (fd.vote_status) updates.vote_status = fd.vote_status;
    if (fd.support_level) updates.support_level = fd.support_level;
    if (fd.transport_status) updates.transport_status = fd.transport_status;
    if (fd.d2d_status) updates.d2d_status = fd.d2d_status;
    if (fd.call_result) applyCallResult(updates, fd.call_result);

    if (fd.vote_assigned_by !== undefined) {
      const assignee = cleanAssignee(fd.vote_assigned_by);
      updates.vote_assigned_by = assignee || null;
      updates.vote_assigned_at = assignee ? new Date().toISOString() : null;
    }

    // The selected vote decision must always win. Do not let the current section force Will Vote.
    if (updates.vote_status === 'will-vote') updates.reach_status = 'reached';
    if (['no-vote', 'not-vote', 'not-decided'].includes(updates.vote_status)) {
      if (!updates.reach_status) updates.reach_status = 'reached';
      updates.d2d_status = updates.d2d_status || 'follow-up';
    }
    return updates;
  }

  function rememberScroll() {
    try {
      sessionStorage.setItem('villimale_after_vote_save_scroll', JSON.stringify({ y: window.scrollY, at: Date.now() }));
    } catch {}
  }

  function restoreScroll() {
    try {
      const item = JSON.parse(sessionStorage.getItem('villimale_after_vote_save_scroll') || 'null');
      if (!item || Date.now() - Number(item.at || 0) > 120000) return;
      requestAnimationFrame(() => window.scrollTo({ top: Number(item.y) || 0, left: 0, behavior: 'auto' }));
    } catch {}
  }

  function clearRowCache() {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('villimale_campaign_manager_v1:') && key.endsWith(':rows')) localStorage.removeItem(key);
      });
    } catch {}
  }

  function setMessage(form, text, isError) {
    let box = form.querySelector('#voteSaveOverrideMessage');
    if (!box) {
      box = document.createElement('div');
      box.id = 'voteSaveOverrideMessage';
      box.className = 'hotfix-message';
      const actions = form.querySelector('.modal-actions');
      if (actions) actions.before(box);
      else form.appendChild(box);
    }
    box.hidden = false;
    box.className = isError ? 'hotfix-message error' : 'hotfix-message';
    box.textContent = text;
  }

  async function saveForm(event) {
    const form = event.target;
    if (form?.id !== 'voterForm') return;
    const id = activeVoterId || window.__lastOpenedVoterId || window.__lastHotfixVoterId;
    const sb = getClient();
    const config = window.APP_CONFIG;
    if (!id || !sb || !config) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const button = form.querySelector('[type="submit"]');
    const oldText = button?.textContent || 'Save Section';
    if (button) {
      button.disabled = true;
      button.textContent = 'Saving...';
    }

    rememberScroll();
    try {
      const updates = buildUpdates(form);
      if (!Object.keys(updates).length) throw new Error('Nothing to save.');

      let query = sb.from(config.table).update(updates).eq('id', id);
      const party = currentParty();
      if (party !== 'ALL') query = query.eq('party', party);
      const { error } = await query;
      if (error) throw error;

      clearRowCache();
      setMessage(form, 'Saved.', false);
      document.getElementById('voterModal').hidden = true;
      document.getElementById('refreshBtn')?.click();
      restoreScroll();
      setTimeout(restoreScroll, 250);
      setTimeout(restoreScroll, 700);
    } catch (error) {
      setMessage(form, error.message || String(error), true);
      if (button) {
        button.disabled = false;
        button.textContent = oldText;
      }
    }
  }

  document.addEventListener('click', (event) => {
    const card = event.target.closest?.('[data-open-voter]');
    if (card?.dataset?.openVoter) {
      activeVoterId = card.dataset.openVoter;
      window.__lastOpenedVoterId = activeVoterId;
    }
  }, true);

  document.addEventListener('submit', saveForm, true);
})();
