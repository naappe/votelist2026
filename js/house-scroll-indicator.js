(function () {
  function removeOldIndicator() {
    document.getElementById('houseScrollIndicator')?.remove();
    document.getElementById('houseScrollIndicatorStyles')?.remove();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeOldIndicator, { once: true });
  } else {
    removeOldIndicator();
  }

  window.addEventListener('load', removeOldIndicator);
})();
