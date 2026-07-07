(function () {
  if (new URLSearchParams(location.search).get('view') === 'read') return;

  let activePerson = '';

  function clean(value) {
    return String(value || '').trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function number(value) {
    return new Intl.NumberFormat('en-US').format(value || 0);
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

  function personNames(value) {
    return String(value || '')
      .split(',')
      .map(clean)
      .filter((name) => name && lower(name) !== 'naappe@gmail.com');
  }

  function assignedText(card) {
    return clean(card.querySelector('.assigned-result-box strong')?.textContent || '');
  }

  function cards() {
    return Array.from(document.querySelectorAll('.admin-assigned-card'));
  }

  function optionsForCards(items) {
    const map = new Map();
    items.forEach((card) => {
      personNames(assignedText(card)).forEach((name) => {
        const key = lower(name);
        const existing = map.get(key) || { name, count: 0 };
        existing.count += 1;
        map.set(key, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  function sectionIsAssignedResults() {
    return clean(document.getElementById('sectionTitle')?.textContent) === 'Assigned Results';
  }

  function ensureStyles() {
    if (document.getElementById('assignedPersonFilterStyles')) return;
    const style = document.createElement('style');
    style.id = 'assignedPersonFilterStyles';
    style.textContent = `
      .assigned-person-filter{display:grid;grid-template-columns:minmax(220px,1fr) auto auto;gap:10px;align-items:end;margin:10px 0 16px;padding:12px;border:1px solid #dbeafe;border-radius:14px;background:#eff6ff}
      .assigned-person-filter label{display:grid;gap:6px;color:#1e3a8a;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}
      .assigned-person-filter select{width:100%;min-height:40px;border:1px solid #bfdbfe;border-radius:12px;background:#fff;color:#111827;font-size:14px;font-weight:800}
      .assigned-person-filter .btn{min-height:40px;border-radius:12px;white-space:nowrap}
      .assigned-person-filter [data-share-safe-list]{background:#2563eb;color:#fff;border-color:#2563eb}
      @media(max-width:640px){.assigned-person-filter{grid-template-columns:1fr}.assigned-person-filter .btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensureBar(items) {
    let bar = document.getElementById('assignedPersonFilter');
    const status = document.getElementById('statusMessage');
    if (!status) return null;

    const options = optionsForCards(items);
    if (!options.some((item) => lower(item.name) === activePerson)) activePerson = '';

    const html = `
      <label>Assigned person
        <select id="assignedPersonSelect">
          <option value="">All assigned people (${number(items.length)})</option>
          ${options.map((item) => `<option value="${esc(lower(item.name))}" ${lower(item.name) === activePerson ? 'selected' : ''}>${esc(item.name)} (${number(item.count)})</option>`).join('')}
        </select>
      </label>
      <button class="btn light" type="button" data-share-safe-list>Share List</button>
      <button class="btn light" type="button" id="clearAssignedPerson">Clear</button>
    `;

    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'assignedPersonFilter';
      bar.className = 'assigned-person-filter';
      status.after(bar);
    }
    bar.innerHTML = html;
    bar.querySelector('#assignedPersonSelect')?.addEventListener('change', (event) => {
      activePerson = event.target.value;
      applyFilter();
    });
    bar.querySelector('#clearAssignedPerson')?.addEventListener('click', () => {
      activePerson = '';
      applyFilter();
    });
    return bar;
  }

  function applyFilter() {
    if (!sectionIsAssignedResults()) {
      document.getElementById('assignedPersonFilter')?.remove();
      return;
    }

    ensureStyles();
    const allCards = cards();
    ensureBar(allCards);

    let shown = 0;
    allCards.forEach((card) => {
      const match = !activePerson || personNames(assignedText(card)).some((name) => lower(name) === activePerson);
      card.hidden = !match;
      if (match) shown += 1;
    });

    const total = document.getElementById('sectionTotal');
    if (total) total.textContent = `${number(shown)} assigned`;

    const status = document.getElementById('statusMessage');
    if (status) {
      status.textContent = activePerson
        ? `Showing ${number(shown)} assigned voter${shown === 1 ? '' : 's'} for the selected person.`
        : `Showing ${number(shown)} assigned voter${shown === 1 ? '' : 's'}.`;
      status.className = `status-message ${shown ? 'ok' : 'error'}`;
    }
  }

  window.addEventListener('assign-results-rendered', applyFilter);
  document.addEventListener('input', (event) => {
    if (event.target?.id === 'searchInput' && sectionIsAssignedResults()) setTimeout(applyFilter, 0);
  }, true);
  document.addEventListener('change', (event) => {
    if (event.target?.id === 'houseSelect' && sectionIsAssignedResults()) setTimeout(applyFilter, 0);
  }, true);
})();
