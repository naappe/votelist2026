(function () {
  let focusAssign = false;

  function enhance() {
    removeVotersNav();
    removeOldAssignControls();
    document.querySelectorAll('.voter-card[data-open-voter]').forEach((card) => {
      card.classList.add('pro-voter-card');
      card.classList.toggle('is-blank-party', isAdminAllView() && isBlankParty(card));
      if (isAssigned(card)) card.classList.add('is-assigned');
      const meta = card.querySelector('.voter-info p');
      if (meta) meta.classList.add('pro-meta-line');
      if (!card.querySelector('.card-actions')) addActions(card);
    });
    focusAssignInput();
  }

  function removeVotersNav() {
    document.querySelectorAll('#votersLink, a[href*="voters.html"]').forEach((node) => node.remove());
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
    setTimeout(enhance, 80);
    setTimeout(enhance, 350);
  }, true);

  document.addEventListener('input', () => setTimeout(enhance, 80), true);
  document.addEventListener('change', () => setTimeout(enhance, 80), true);
  document.addEventListener('DOMContentLoaded', enhance);
  window.addEventListener('load', () => setTimeout(enhance, 500));

  let runs = 0;
  const timer = setInterval(() => {
    enhance();
    runs += 1;
    if (runs > 80) clearInterval(timer);
  }, 300);
})();