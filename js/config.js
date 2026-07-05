window.APP_CONFIG = {
  supabaseUrl: 'https://espezmdpkoixnfchomqb.supabase.co',
  supabaseKey: 'sb_publishable_xP8z74zcMuCkj6xlu1bJ3w_Kudqbcu1',
  table: 'full_import',
  loginUsers: {
    admin: { username: 'admin', email: 'naappe@gmail.com' },
    pnc: { username: 'pnc2026', email: 'pnc2026@villimaledhaaira.local' }
  },
  sections: [
    { key: 'need-call', label: 'Need Call', field: 'phone_status', value: 'need-call' },
    { key: 'reached', label: 'Reached', field: 'reach_status', value: 'reached' },
    { key: 'will-vote', label: 'Will Vote', field: 'vote_status', value: 'will-vote' },
    { key: 'pending', label: 'Pending', field: 'vote_status', value: 'pending' },
    { key: 'no-phone', label: 'No Phone', field: 'phone_status', value: 'no-phone' },
    { key: 'need-transport', label: 'Need Transport', field: 'transport_status', value: 'need-transport' },
    { key: 'follow-up', label: 'Follow-up', field: 'd2d_status', value: 'follow-up' }
  ]
};

(function () {
  if (!/shared\.html$/i.test(location.pathname)) return;

  let lastTouchedRowId = '';

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function restoreToLastTouched(anchorId) {
    const id = anchorId || lastTouchedRowId;
    if (!id) return;
    const card = document.querySelector(`[data-row-id="${cssEscape(id)}"]`);
    if (!card) return;
    card.scrollIntoView({ block: 'center', behavior: 'auto' });
  }

  document.addEventListener('change', (event) => {
    const toggle = event.target.closest?.('[data-toggle-assign]');
    if (toggle?.dataset?.toggleAssign) lastTouchedRowId = toggle.dataset.toggleAssign;
  }, true);

  document.addEventListener('click', (event) => {
    if (!event.target.closest?.('#saveChangesBtn, #confirmSaveBtn')) return;
    const anchorId = lastTouchedRowId;
    [120, 350, 800, 1400].forEach((delay) => {
      setTimeout(() => restoreToLastTouched(anchorId), delay);
    });
  }, true);
})();
