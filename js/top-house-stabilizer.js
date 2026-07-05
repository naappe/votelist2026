(function () {
  const originalGetElementById = document.getElementById.bind(document);
  const blockedIds = new Set(['topHouses', 'houseSelect']);

  document.getElementById = function patchedGetElementById(id) {
    if (blockedIds.has(id) && calledFromDashboardCleanup()) return null;
    return originalGetElementById(id);
  };

  function calledFromDashboardCleanup() {
    try {
      throw new Error();
    } catch (error) {
      return String(error.stack || '').includes('dashboard-cleanup.js');
    }
  }
})();