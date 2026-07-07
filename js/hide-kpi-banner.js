(function () {
  if (document.body.dataset.view !== 'management') return;

  const selectors = [
    '#summary',
    '.page > .stats-grid[aria-label="Campaign statistics"]'
  ];

  function hideKpiBanner() {
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        node.hidden = true;
        node.setAttribute('aria-hidden', 'true');
        node.style.setProperty('display', 'none', 'important');
        node.style.setProperty('height', '0', 'important');
        node.style.setProperty('margin', '0', 'important');
        node.style.setProperty('padding', '0', 'important');
        node.style.setProperty('overflow', 'hidden', 'important');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideKpiBanner);
  } else {
    hideKpiBanner();
  }

  window.addEventListener('load', hideKpiBanner);
  new MutationObserver(hideKpiBanner).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden']
  });

  [100, 300, 700, 1500, 3000].forEach((delay) => setTimeout(hideKpiBanner, delay));
})();