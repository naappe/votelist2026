(function () {
  const nativeSetInterval = window.setInterval.bind(window);
  window.setInterval = function guardedSetInterval(callback, delay, ...args) {
    const source = typeof callback === 'function' ? Function.prototype.toString.call(callback) : String(callback || '');
    if (Number(delay) === 500 && source.includes('tidyDashboard')) {
      requestAnimationFrame(() => callback());
      window.addEventListener('load', () => requestAnimationFrame(() => callback()), { once: true });
      return 0;
    }
    return nativeSetInterval(callback, delay, ...args);
  };

  const hiddenStyle = document.createElement('style');
  hiddenStyle.textContent = '[data-hotfix-assign], .assign-stat[data-hotfix-assign]{display:none!important}';
  document.head.appendChild(hiddenStyle);

  function removeLateAssignControls() {
    document.querySelectorAll('[data-hotfix-assign]').forEach((node) => node.remove());
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function cleanAssigner(value) {
    const name = clean(value);
    return name.toLowerCase() === 'naappe@gmail.com' ? '' : name;
  }

  function getClient() {
    if (!window.supabase || !window.APP_CONFIG) return null;
    if (!window.__noJumpFixClient) {
      window.__noJumpFixClient = window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseKey);
    }
    return window.__noJumpFixClient;
  }

  function buildUpdates(form) {
    const fd = Object.fromEntries(new FormData(form).entries());
    const assigner = cleanAssigner(fd.vote_assigned_by);
    const updates = {
      phone: clean(fd.phone) || null,
      phone_status: fd.phone_status || 'need-call',
      reach_status: fd.reach_status || 'not-reached',
      vote_status: fd.vote_status || 'pending',
      d2d_status: fd.d2d_status || 'not-visited',
      transport_status: fd.transport_status || 'not-needed',
      support_level: fd.support_level || 'normal',
      remarks: clean(fd.remarks) || null,
      vote_assigned_by: assigner || null,
      vote_assigned_at: assigner ? new Date().toISOString() : null
    };

    if (updates.phone_status === 'called' || updates.vote_status === 'will-vote' || updates.support_level === 'guaranteed') updates.reach_status = 'reached';
    if (updates.phone_status === 'no-phone' || !updates.phone) updates.d2d_status = updates.d2d_status === 'not-visited' ? 'follow-up' : updates.d2d_status;
    if (['busy', 'switched-off', 'disconnected', 'wrong-number', 'out-of-range'].includes(updates.phone_status)) updates.d2d_status = 'follow-up';
    if (updates.vote_status === 'will-vote') updates.reach_status = 'reached';
    return updates;
  }

  function setMessage(form, text, isError) {
    const msg = form.querySelector('#hotfixMessage');
    if (!msg) return;
    msg.hidden = false;
    msg.className = isError ? 'hotfix-message error' : 'hotfix-message';
    msg.textContent = text;
  }

  document.addEventListener('click', (event) => {
    const card = event.target.closest?.('[data-open-voter]');
    if (card?.dataset?.openVoter) {
      window.__lastHotfixVoterId = card.dataset.openVoter;
      window.__lastOpenedVoterId = card.dataset.openVoter;
    }
  }, true);

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (form?.id !== 'voterForm' || !form.querySelector('#quickAssignBtn')) return;

    const id = window.__lastHotfixVoterId || window.__lastOpenedVoterId;
    const client = getClient();
    const config = window.APP_CONFIG;
    if (!id || !client || !config) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const button = form.querySelector('[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = 'Saving...';
    }

    const scrollY = window.scrollY;
    try {
      const updates = buildUpdates(form);
      const { error } = await client.from(config.table).update(updates).eq('id', id);
      if (error) throw error;
      setMessage(form, 'Saved.', false);
      document.getElementById('voterModal').hidden = true;
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' }));
      document.dispatchEvent(new CustomEvent('voter-no-jump-saved', { detail: { id, updates } }));
    } catch (error) {
      setMessage(form, error.message || String(error), true);
      if (button) {
        button.disabled = false;
        button.textContent = 'Save Voter';
      }
    }
  }, true);

  removeLateAssignControls();
  window.addEventListener('load', removeLateAssignControls);
  new MutationObserver(removeLateAssignControls).observe(document.documentElement, { childList: true, subtree: true });
})();