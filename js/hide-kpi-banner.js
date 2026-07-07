(function () {
  if (document.body.dataset.view !== 'management') return;

  function hideKpiBanner() {
    const summary = document.getElementById('summary');
    if (!summary) return;

    if (!summary.hidden) summary.hidden = true;
    if (summary.getAttribute('aria-hidden') !== 'true') summary.setAttribute('aria-hidden', 'true');
    if (summary.style.getPropertyValue('display') !== 'none') {
      summary.style.setProperty('display', 'none', 'important');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideKpiBanner, { once: true });
  } else {
    hideKpiBanner();
  }

  window.addEventListener('load', hideKpiBanner, { once: true });
  [100, 300, 800, 1600, 3000].forEach((delay) => setTimeout(hideKpiBanner, delay));
})();