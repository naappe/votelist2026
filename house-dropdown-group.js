(function () {
  function countFromOption(text) {
    const match = String(text || '').match(/\((\d+)\)\s*$/);
    return match ? Number(match[1]) : 0;
  }

  function isDhafthar(value) {
    const raw = String(value || '').toLowerCase();
    const compact = raw
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['`’.\-]/g, '')
      .replace(/\s+/g, '');
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

  function groupDhaftharDropdown() {
    const select = document.getElementById('houseSelect');
    if (!select) return;

    let grouped = select.querySelector('option[value="__dhafthar__"]');
    let count = grouped ? Number(grouped.dataset.count || countFromOption(grouped.textContent)) : 0;
    let firstIndex = 1;

    Array.from(select.options).forEach((option, index) => {
      if (!option.value || option.value === '__dhafthar__') return;
      const text = `${option.textContent || ''} ${option.value || ''} ${option.dataset.label || ''}`;
      if (!isDhafthar(text)) return;
      count += countFromOption(option.textContent) || 1;
      firstIndex = Math.max(1, Math.min(firstIndex || index, index));
      option.remove();
    });

    if (!grouped) {
      grouped = document.createElement('option');
      grouped.value = '__dhafthar__';
      grouped.dataset.label = 'Dhafthar';
      select.insertBefore(grouped, select.options[firstIndex] || select.options[1] || null);
    }

    grouped.dataset.count = String(count || grouped.dataset.count || '');
    grouped.textContent = count ? `House - Dhafthar (${count})` : 'House - Dhafthar';
  }

  function applyDhaftharSelection(event) {
    if (event.target?.id !== 'houseSelect' || event.target.value !== '__dhafthar__') return;
    const search = document.getElementById('searchInput');
    const box = document.getElementById('boxSelect');
    if (box) box.value = '';
    if (search) search.value = 'Dhafthar';
  }

  document.addEventListener('DOMContentLoaded', groupDhaftharDropdown);
  window.addEventListener('load', groupDhaftharDropdown);
  document.addEventListener('change', applyDhaftharSelection, true);

  let runs = 0;
  const timer = setInterval(() => {
    groupDhaftharDropdown();
    runs += 1;
    if (runs > 80) clearInterval(timer);
  }, 250);
})();