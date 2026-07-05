(function () {
  const d2dById = new Map();
  let loading = false;

  function runCleanup() {
    removeBoxControls();
    renameReachedToD2D();
    decorateVisibleCards();
  }

  function removeBoxControls() {
    document.getElementById('boxSelect')?.closest('label')?.remove();
    document.querySelectorAll('#boxQuickTabs,.box-tabs,.box-tab').forEach((node) => node.remove());
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
  document.addEventListener('click', () => setTimeout(runCleanup, 80), true);
  document.addEventListener('input', () => setTimeout(runCleanup, 80), true);
  document.addEventListener('change', () => setTimeout(runCleanup, 80), true);
  let runs = 0;
  const timer = setInterval(() => {
    runCleanup();
    runs += 1;
    if (runs > 80) clearInterval(timer);
  }, 250);
})();
