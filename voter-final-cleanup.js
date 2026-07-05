(function () {
  const d2dById = new Map();
  let loading = false;
  let currentVoterId = '';

  function runCleanup() {
    removeBoxControls();
    removeBoxText();
    renameReachedToD2D();
    decorateVisibleCards();
  }

  function removeBoxControls() {
    document.getElementById('boxSelect')?.closest('label')?.remove();
    document.querySelectorAll('#boxQuickTabs,.box-tabs,.box-tab').forEach((node) => node.remove());
  }

  function removeBoxText() {
    document.querySelectorAll('.voter-info p,#modalMeta').forEach((node) => {
      const next = stripBoxPart(node.textContent || '');
      if (next && next !== node.textContent) node.textContent = next;
    });
  }

  function stripBoxPart(text) {
    const parts = String(text || '').split(/[·|]/).map((part) => part.trim()).filter(Boolean);
    if (parts.length <= 1) return text;
    const cleaned = parts.filter((part) => !/^box\s*\d+/i.test(part) && !/^box$/i.test(part));
    return cleaned.join(' · ');
  }

  function renameReachedToD2D() {
    document.querySelectorAll('.stat-text small').forEach((node) => {
      if (/^Reached$/i.test(node.textContent.trim())) node.textContent = 'D2D';
    });
    document.querySelectorAll('.tab').forEach((tab) => {
      const first = Array.from(tab.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && /Reached/i.test(node.textContent));
      if (first) first.textContent = first.textContent.replace(/Reached/i, 'D2D');
    });
    const title = document.getElementById('sectionTitle');
    if (title && /^Reached$/i.test(title.textContent.trim())) title.textContent = 'D2D';
    const modalSection = document.getElementById('modalSection');
    if (modalSection && /^Reached$/i.test(modalSection.textContent.trim())) modalSection.textContent = 'D2D';
    document.querySelectorAll('.section-label').forEach((label) => {
      if (/Reached/i.test(label.textContent || '')) label.textContent = label.textContent.replace(/Reached/i, 'D2D');
    });
  }

  function decorateVisibleCards() {
    const cards = Array.from(document.querySelectorAll('.voter-card[data-open-voter]'));
    const ids = cards.map((card) => card.dataset.openVoter).filter(Boolean);
    const missing = ids.filter((id) => !d2dById.has(String(id)));
    if (missing.length) loadD2D(missing);

    cards.forEach((card) => {
      const chips = card.querySelector('.chips');
      if (!chips) return;
      chips.querySelectorAll('.chip').forEach((chip) => {
        const text = chip.textContent.trim().toLowerCase();
        if (text === 'reached' || text === 'not reached' || text === 'not-reached') chip.remove();
      });
      if (chips.querySelector('[data-d2d-chip]')) return;
      const id = String(card.dataset.openVoter || '');
      const status = d2dById.get(id);
      if (!status) return;
      chips.insertAdjacentHTML('afterbegin', `<span class="chip ${d2dTone(status)}" data-d2d-chip>${d2dLabel(status)}</span>`);
    });
  }

  async function handleVoteOverride(event) {
    const form = event.target;
    if (!form || form.id !== 'voterForm') return;
    const voteStatus = form.elements.vote_status?.value;
    if (!['no-vote', 'not-decided'].includes(voteStatus)) return;

    const voterId = currentVoterId || findOpenVoterId();
    if (!voterId || !window.supabase || !window.APP_CONFIG) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const button = form.querySelector('[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = 'Saving...';
    }

    const updates = buildVoteOverrideUpdates(form, voteStatus);
    try {
      const client = window.__d2dCleanupClient || window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseKey);
      window.__d2dCleanupClient = client;
      const { data: userData } = await client.auth.getUser();
      if (userData?.user?.email) updates.vote_assigned_by = userData.user.email;
      const { error } = await client.from(window.APP_CONFIG.table).update(updates).eq('id', voterId);
      if (error) throw error;
      document.getElementById('voterModal').hidden = true;
      showStatus('Saved. Voter removed from Will Vote.');
      setTimeout(() => location.reload(), 450);
    } catch (error) {
      showStatus(error.message || 'Save failed. Please try again.', true);
      if (button) {
        button.disabled = false;
        button.textContent = 'Save Section';
      }
    }
  }

  function buildVoteOverrideUpdates(form, voteStatus) {
    const d2d = form.elements.d2d_status?.value || 'follow-up';
    const callResult = form.elements.call_result?.value || '';
    const updates = {
      vote_status: voteStatus,
      support_level: 'normal',
      d2d_status: d2d,
      vote_assigned_at: new Date().toISOString()
    };
    const remarks = clean(form.elements.remarks?.value);
    if (remarks) updates.remarks = remarks;
    const transport = form.elements.transport_status?.value;
    if (transport) updates.transport_status = transport;
    if (callResult) {
      updates.phone_status = callResult;
      updates.reach_status = callResult === 'called' ? 'reached' : 'not-reached';
      if (callResult !== 'called' && !form.elements.d2d_status?.value) updates.d2d_status = 'follow-up';
    }
    if (updates.d2d_status === 'visited') updates.reach_status = 'reached';
    if (['not-home', 'follow-up'].includes(updates.d2d_status)) updates.reach_status = 'not-reached';
    return updates;
  }

  async function loadD2D(ids) {
    if (loading || !window.supabase || !window.APP_CONFIG) return;
    loading = true;
    try {
      const client = window.__d2dCleanupClient || window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseKey);
      window.__d2dCleanupClient = client;
      const { data } = await client.from(window.APP_CONFIG.table).select('id,d2d_status').in('id', ids.slice(0, 100));
      (data || []).forEach((row) => d2dById.set(String(row.id), row.d2d_status || 'not-visited'));
    } catch (error) {
      // Keep the UI usable if the D2D lookup fails.
    } finally {
      loading = false;
      setTimeout(runCleanup, 60);
    }
  }

  function findOpenVoterId() {
    const title = document.getElementById('modalTitle')?.textContent.trim();
    if (!title) return '';
    const card = Array.from(document.querySelectorAll('.voter-card[data-open-voter]')).find((item) => {
      return item.querySelector('h3')?.textContent.trim() === title;
    });
    return card?.dataset.openVoter || '';
  }

  function showStatus(message, isError) {
    const status = document.getElementById('statusMessage');
    if (!status) {
      alert(message);
      return;
    }
    status.textContent = message;
    status.className = `status-message ${isError ? 'error' : 'ok'}`;
  }

  function clean(value) {
    const text = String(value || '').trim();
    return text || null;
  }

  function d2dLabel(value) {
    if (value === 'visited') return 'D2D Reach';
    if (value === 'not-home') return 'D2D Not Home';
    if (value === 'follow-up') return 'D2D Another Place';
    if (value === 'not-visited') return 'D2D Not Visited';
    return String(value || 'D2D').replace(/-/g, ' ');
  }

  function d2dTone(value) {
    if (value === 'visited') return 'green';
    if (value === 'not-home') return 'amber';
    if (value === 'follow-up') return 'red';
    return '';
  }

  document.addEventListener('DOMContentLoaded', runCleanup);
  document.addEventListener('submit', handleVoteOverride, true);
  document.addEventListener('click', (event) => {
    const card = event.target.closest('.voter-card[data-open-voter]');
    if (card) currentVoterId = card.dataset.openVoter || '';
    setTimeout(runCleanup, 80);
  }, true);
  document.addEventListener('input', () => setTimeout(runCleanup, 80), true);
  document.addEventListener('change', () => setTimeout(runCleanup, 80), true);
  let runs = 0;
  const timer = setInterval(() => {
    runCleanup();
    runs += 1;
    if (runs > 80) clearInterval(timer);
  }, 250);
})();
