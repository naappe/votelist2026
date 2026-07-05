(function () {
  let latestDhaftharCount = 0;
  let countLoaded = false;
  let groupingScheduled = false;

  function countFromOption(text) {
    const match = String(text || '').match(/\((\d+)\)\s*$/);
    return match ? Number(match[1]) : 0;
  }

  function compactText(value) {
    return String(value || '').toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['`’.\-]/g, '')
      .replace(/\s+/g, '');
  }

  function isDhafthar(value) {
    const raw = String(value || '').toLowerCase();
    const compact = compactText(value);
    return raw.includes('dhaf')
      || raw.includes('no dh r')
      || raw.includes('dh r')
      || /^df\d*/.test(compact)
      || /^dhr\d*/.test(compact)
      || /^nodhr\d*/.test(compact)
      || compact.startsWith('dhafthar')
      || compact.startsWith('dhaftharu')
      || compact.startsWith('dafthar');
  }

  function selectedParty() {
    return (new URLSearchParams(location.search).get('party') || 'PNC').toUpperCase();
  }

  function partyAllowed(row) {
    const selected = selectedParty();
    const party = String(row.party || '').trim().toUpperCase();
    if (selected === 'ALL') return true;
    if (party === selected) return true;
    return selected === 'PNC' && !party && isDhafthar(row.house);
  }

  function setGroupedText(option, count) {
    option.dataset.count = String(count || '');
    option.textContent = count ? `House - Dhafthar (${count})` : 'House - Dhafthar';
  }

  function groupDhaftharDropdown() {
    const select = document.getElementById('houseSelect');
    if (!select || document.activeElement === select) return;

    let grouped = select.querySelector('option[value="__dhafthar__"]');
    let count = countLoaded ? latestDhaftharCount : (grouped ? Number(grouped.dataset.count || countFromOption(grouped.textContent)) : 0);
    let firstIndex = 1;

    Array.from(select.options).forEach((option, index) => {
      if (!option.value || option.value === '__dhafthar__') return;
      const text = `${option.textContent || ''} ${option.value || ''} ${option.dataset.label || ''}`;
      if (!isDhafthar(text)) return;
      if (!countLoaded) count += countFromOption(option.textContent) || 1;
      firstIndex = Math.max(1, Math.min(firstIndex || index, index));
      option.remove();
    });

    if (!grouped) {
      grouped = document.createElement('option');
      grouped.value = '__dhafthar__';
      grouped.dataset.label = 'Dhafthar';
      select.insertBefore(grouped, select.options[firstIndex] || select.options[1] || null);
    }

    setGroupedText(grouped, count);
  }

  function scheduleGroup(delay) {
    if (groupingScheduled) return;
    groupingScheduled = true;
    setTimeout(() => {
      groupingScheduled = false;
      groupDhaftharDropdown();
    }, delay || 80);
  }

  async function loadDhaftharCount() {
    try {
      const config = window.APP_CONFIG;
      if (!window.supabase || !config) return;
      const client = window.__dhaftharCountClient || window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
      window.__dhaftharCountClient = client;
      const columns = 'house,lives_in,living_place,party';
      let from = 0;
      const pageSize = 1000;
      let total = 0;

      while (true) {
        const { data, error } = await client.from(config.table).select(columns).range(from, from + pageSize - 1);
        if (error) return;
        (data || []).forEach((row) => {
          if (partyAllowed(row) && isDhafthar([row.house, row.lives_in, row.living_place].join(' '))) total += 1;
        });
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }

      latestDhaftharCount = total;
      countLoaded = true;
      scheduleGroup(0);
    } catch {
      // Keep the local option count if Supabase is temporarily unavailable.
    }
  }

  function applyDhaftharSelection(event) {
    if (event.target?.id !== 'houseSelect' || event.target.value !== '__dhafthar__') return;
    const search = document.getElementById('searchInput');
    const box = document.getElementById('boxSelect');
    if (box) box.value = '';
    if (search) search.value = 'Dhafthar';
    scheduleGroup(250);
  }

  document.addEventListener('DOMContentLoaded', () => {
    groupDhaftharDropdown();
    loadDhaftharCount();
  });
  window.addEventListener('load', () => {
    groupDhaftharDropdown();
    loadDhaftharCount();
  });
  document.addEventListener('change', applyDhaftharSelection, true);
  document.addEventListener('blur', (event) => {
    if (event.target?.id === 'houseSelect') scheduleGroup(120);
  }, true);

  const observer = new MutationObserver(() => scheduleGroup(120));
  window.addEventListener('load', () => {
    const select = document.getElementById('houseSelect');
    if (select) observer.observe(select, { childList: true });
  });
})();