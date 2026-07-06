(function () {
  let focusAssign = false;
  let enhanceTimer = 0;

  function scheduleEnhance(delay = 40) {
    clearTimeout(enhanceTimer);
    enhanceTimer = setTimeout(enhance, delay);
  }

  function enhance() {
    removeOldAssignControls();
    document.querySelectorAll('.voter-card[data-open-voter]').forEach((card) => {
      card.classList.add('pro-voter-card');
      card.classList.toggle('is-blank-party', isAdminAllView() && isBlankParty(card));
      if (isAssigned(card)) card.classList.add('is-assigned');
      const meta = card.querySelector('.voter-info p');
      if (meta) {
        meta.classList.add('pro-meta-line');
        cleanMetaLine(meta);
      }
      if (!card.querySelector('.card-actions')) addActions(card);
    });
    const modalMeta = document.getElementById('modalMeta');
    if (modalMeta) cleanMetaLine(modalMeta);
    focusAssignInput();
  }

  function isAdminAllView() {
    const party = (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
    return party === 'ALL';
  }

  function isBlankParty(card) {
    const tag = card.querySelector('.party-tag');
    const text = String(tag?.textContent || '').trim().toLowerCase();
    if (['', '-', 'not party', 'blank party', 'no party'].includes(text)) {
      if (tag) tag.textContent = 'Blank party';
      return true;
    }
    return false;
  }

  function removeOldAssignControls() {
    document.querySelectorAll('[data-assign-filter]').forEach((node) => node.remove());
  }

  function isAssigned(card) {
    return Array.from(card.querySelectorAll('.chip')).some((chip) => /^assign(ed)?:/i.test(chip.textContent.trim()));
  }

  function cleanMetaLine(meta) {
    const parts = String(meta.textContent || '').split('·').map((item) => item.trim()).filter(Boolean);
    if (!parts.length) return;
    const house = displayHouse(parts[0]);
    const phone = parts.slice().reverse().find((item) => item && !/^box\b/i.test(item)) || '';
    meta.textContent = [house, phone && phone !== house ? phone : ''].filter(Boolean).join(' · ');
  }

  function displayHouse(value) {
    const text = String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\bbox\s*\d+\b/ig, ' ')
      .replace(/\s*[|/-]\s*villimale.*$/i, ' ')
      .replace(/\s*[·|/-]\s*$/g, ' ')
      .replace(/^\s*[·|/-]\s*/g, ' ')
      .trim();
    return text || '-';
  }

  function addActions(card) {
    const id = card.dataset.openVoter || '';
    const section = card.querySelector('.section-label');
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.innerHTML = `
      <button class="btn compact assign-card-btn" type="button" data-pro-assign="${escapeAttr(id)}">Assign</button>
      <button class="btn compact light" type="button" data-pro-view="${escapeAttr(id)}">View Profile</button>
    `;
    if (section) section.before(actions);
    else card.querySelector('.voter-info')?.appendChild(actions);
  }

  function focusAssignInput() {
    if (!focusAssign) return;
    const modal = document.getElementById('voterModal');
    if (!modal || modal.hidden) return;
    const input = modal.querySelector('[name="vote_assigned_by"]');
    if (!input) return;
    focusAssign = false;
    input.focus();
    input.select?.();
  }

  function escapeAttr(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  document.addEventListener('click', (event) => {
    const assign = event.target.closest('[data-pro-assign]');
    if (assign) focusAssign = true;
    scheduleEnhance(80);
  }, true);

  document.addEventListener('input', () => scheduleEnhance(80), true);
  document.addEventListener('change', () => scheduleEnhance(80), true);
  document.addEventListener('DOMContentLoaded', () => {
    enhance();
    const list = document.getElementById('voterList');
    if (list) new MutationObserver(() => scheduleEnhance(40)).observe(list, { childList: true, subtree: true });
  });
  window.addEventListener('load', () => scheduleEnhance(200));
})();
