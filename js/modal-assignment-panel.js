(function () {
  if (new URLSearchParams(location.search).get('view') === 'read') return;

  let client;
  let activeVoterId = '';
  let loadingAssignmentFor = '';

  function clean(value) {
    return String(value || '').trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function cleanAssignee(value) {
    return String(value || '')
      .split(',')
      .map(clean)
      .filter((name) => name && lower(name) !== 'naappe@gmail.com')
      .join(', ');
  }

  function getClient() {
    if (client) return client;
    const config = window.APP_CONFIG;
    if (!window.supabase || !config) return null;
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    return client;
  }

  function currentForm() {
    const modal = document.getElementById('voterModal');
    const form = document.getElementById('voterForm');
    if (!modal || modal.hidden || !form) return null;
    return form;
  }

  function showMessage(form, message, isError) {
    let box = form.querySelector('#modalAssignMessage');
    if (!box) {
      box = document.createElement('div');
      box.id = 'modalAssignMessage';
      box.className = 'hotfix-message';
      const actions = form.querySelector('.modal-actions');
      if (actions) actions.before(box);
      else form.appendChild(box);
    }
    box.hidden = false;
    box.className = isError ? 'hotfix-message error' : 'hotfix-message';
    box.textContent = message;
  }

  function ensureStyles() {
    if (document.getElementById('modalAssignmentPanelStyles')) return;
    const style = document.createElement('style');
    style.id = 'modalAssignmentPanelStyles';
    style.textContent = `
      #modalAssignPanel{grid-column:1/-1!important;display:grid!important;gap:10px!important;margin:0 0 12px!important;padding:14px!important;border:1px solid #b9d6ff!important;border-radius:14px!important;background:#eff6ff!important}
      #modalAssignPanel strong{margin:0!important;color:#1d4ed8!important;font-size:13px!important;font-weight:900!important}
      #modalAssignPanel .assign-inline{display:grid!important;grid-template-columns:minmax(0,1fr) 96px!important;gap:10px!important;align-items:end!important}
      #modalAssignPanel label{display:grid!important;gap:6px!important;color:#667085!important;font-size:11px!important;font-weight:900!important;letter-spacing:.035em!important;text-transform:uppercase!important}
      #modalAssignPanel input{width:100%!important;min-height:42px!important;border:1px solid #d6e0ee!important;border-radius:12px!important;background:#fff!important;color:#1f2937!important;font-size:14px!important;font-weight:800!important}
      #modalAssignPanel .btn{min-height:42px!important;border-radius:12px!important;font-weight:900!important}
      @media(max-width:640px){#modalAssignPanel .assign-inline{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  async function loadExistingAssignee(input, id) {
    const sb = getClient();
    const config = window.APP_CONFIG;
    if (!sb || !config || !id || loadingAssignmentFor === id) return;
    loadingAssignmentFor = id;
    try {
      const { data, error } = await sb.from(config.table).select('vote_assigned_by').eq('id', id).single();
      if (error) throw error;
      input.value = cleanAssignee(data?.vote_assigned_by || '');
    } catch (error) {
      console.warn('Could not load assignee:', error);
    } finally {
      loadingAssignmentFor = '';
    }
  }

  function ensurePanel() {
    const form = currentForm();
    if (!form || form.querySelector('#modalAssignPanel')) return;
    ensureStyles();

    const panel = document.createElement('section');
    panel.id = 'modalAssignPanel';
    panel.innerHTML = `
      <strong>Assign this voter</strong>
      <div class="assign-inline">
        <label>Assigned person / team name
          <input name="vote_assigned_by" autocomplete="off" placeholder="Example: Ahmed / Ali / Team 1">
        </label>
        <button class="btn" type="button" id="modalAssignBtn">Assign</button>
      </div>
    `;
    form.prepend(panel);

    const input = panel.querySelector('[name="vote_assigned_by"]');
    if (input && activeVoterId) loadExistingAssignee(input, activeVoterId);
    panel.querySelector('#modalAssignBtn')?.addEventListener('click', () => saveAssignmentOnly(form));
  }

  function applyCallResult(updates, result) {
    const value = clean(result) || 'need-call';
    if (value === 'called' || value === 'connected') {
      updates.phone_status = 'called';
      updates.reach_status = 'reached';
      return;
    }
    if (value === 'no-phone') {
      updates.phone_status = 'no-phone';
      updates.reach_status = 'not-reached';
      updates.d2d_status = updates.d2d_status || 'follow-up';
      return;
    }
    updates.phone_status = value;
    updates.reach_status = updates.reach_status || 'not-reached';
    if (['busy', 'switched-off', 'disconnected', 'wrong-number', 'out-of-range', 'out-of-coverage', 'not-answer'].includes(value)) {
      updates.d2d_status = updates.d2d_status || 'follow-up';
    }
  }

  function buildUpdates(form) {
    const fd = Object.fromEntries(new FormData(form).entries());
    const updates = {
      remarks: clean(fd.remarks) || null,
      vote_assigned_by: cleanAssignee(fd.vote_assigned_by) || null
    };
    updates.vote_assigned_at = updates.vote_assigned_by ? new Date().toISOString() : null;

    if (fd.phone !== undefined && clean(fd.phone)) updates.phone = clean(fd.phone);
    if (fd.vote_status) updates.vote_status = fd.vote_status;
    if (fd.support_level) updates.support_level = fd.support_level;
    if (fd.transport_status) updates.transport_status = fd.transport_status;
    if (fd.d2d_status) updates.d2d_status = fd.d2d_status;
    if (fd.call_result) applyCallResult(updates, fd.call_result);
    if (updates.vote_status === 'will-vote') updates.reach_status = 'reached';
    return updates;
  }

  async function saveAssignmentOnly(form) {
    const sb = getClient();
    const config = window.APP_CONFIG;
    const input = form.querySelector('[name="vote_assigned_by"]');
    const id = activeVoterId || window.__lastOpenedVoterId;
    if (!sb || !config || !id || !input) return;

    const button = form.querySelector('#modalAssignBtn');
    const assignee = cleanAssignee(input.value);
    if (button) {
      button.disabled = true;
      button.textContent = 'Saving...';
    }
    try {
      const { error } = await sb.from(config.table).update({
        vote_assigned_by: assignee || null,
        vote_assigned_at: assignee ? new Date().toISOString() : null
      }).eq('id', id);
      if (error) throw error;
      showMessage(form, assignee ? 'Assignment saved.' : 'Assignment cleared.', false);
    } catch (error) {
      showMessage(form, error.message || String(error), true);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Assign';
      }
    }
  }

  async function saveWholeForm(event) {
    const form = event.target;
    if (form?.id !== 'voterForm' || !form.querySelector('#modalAssignPanel')) return;

    const sb = getClient();
    const config = window.APP_CONFIG;
    const id = activeVoterId || window.__lastOpenedVoterId;
    if (!sb || !config || !id) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const button = form.querySelector('[type="submit"]');
    const oldText = button?.textContent || 'Save Section';
    if (button) {
      button.disabled = true;
      button.textContent = 'Saving...';
    }

    const scrollY = window.scrollY;
    try {
      const updates = buildUpdates(form);
      const { error } = await sb.from(config.table).update(updates).eq('id', id);
      if (error) throw error;
      showMessage(form, 'Saved.', false);
      document.getElementById('voterModal').hidden = true;
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' }));
      document.dispatchEvent(new CustomEvent('modal-assignment-saved', { detail: { id, updates } }));
    } catch (error) {
      showMessage(form, error.message || String(error), true);
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

  document.addEventListener('submit', saveWholeForm, true);
  new MutationObserver(() => ensurePanel()).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', ensurePanel);
  window.addEventListener('load', ensurePanel);
})();