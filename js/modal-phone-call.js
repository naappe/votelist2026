(function () {
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function normalizePhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 7) return `+960${digits}`;
    if (digits.length === 10 && digits.startsWith('960')) return `+${digits}`;
    return digits;
  }

  function linkModalPhone() {
    const modal = document.getElementById('voterModal');
    const meta = document.getElementById('modalMeta');
    if (!modal || modal.hidden || !meta) return;
    if (meta.querySelector('a[href^="tel:"]')) return;

    const text = meta.textContent || '';
    const match = text.match(/(?:\+?960\s*)?\b\d{7}\b/);
    if (!match) return;

    const phone = match[0].trim();
    const tel = normalizePhone(phone);
    if (!tel) return;

    const before = text.slice(0, match.index);
    const after = text.slice((match.index || 0) + match[0].length);
    meta.innerHTML = `${esc(before)}<a class="modal-phone-link" href="tel:${esc(tel)}">${esc(phone)}</a>${esc(after)}`;
  }

  function installStyles() {
    if (document.getElementById('modalPhoneCallStyles')) return;
    const style = document.createElement('style');
    style.id = 'modalPhoneCallStyles';
    style.textContent = `
      .modal-phone-link{color:#2563eb!important;font-weight:900!important;text-decoration:none!important;border-bottom:1px solid rgba(37,99,235,.35)!important}
      .modal-phone-link:active{color:#1d4ed8!important}
    `;
    document.head.appendChild(style);
  }

  installStyles();
  document.addEventListener('click', () => setTimeout(linkModalPhone, 0), true);
  new MutationObserver(linkModalPhone).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  document.addEventListener('DOMContentLoaded', linkModalPhone);
  window.addEventListener('load', linkModalPhone);
})();
