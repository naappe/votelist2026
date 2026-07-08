(function () {
  const params = new URLSearchParams(location.search);
  const section = ((params.get('section') || 'voters').toLowerCase() === 'residents') ? 'voters' : (params.get('section') || 'voters').toLowerCase();
  if (section !== 'assign') return;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  function init() {
    installStyles();
    cleanLayout();
    new MutationObserver(cleanLayout).observe(document.body, { childList: true, subtree: true });
    setInterval(cleanLayout, 1200);
  }

  function cleanLayout() {
    const dashboard = document.getElementById('sectionResultSummary');
    const searchPanel = document.querySelector('.search')?.closest('.panel');
    const listPanel = document.getElementById('list')?.closest('.panel');
    const stats = document.getElementById('sectionResultCards') || document.querySelector('.stats');

    if (stats) stats.classList.add('assign-kpi-row');

    if (dashboard) {
      dashboard.classList.add('assign-dashboard-clean');
      if (searchPanel && dashboard.compareDocumentPosition(searchPanel) & Node.DOCUMENT_POSITION_PRECEDING) {
        searchPanel.insertAdjacentElement('beforebegin', dashboard);
      }
    }

    if (searchPanel) {
      searchPanel.classList.add('assign-tools-panel');
      const shareTools = searchPanel.querySelector('#shareTools,.share-tools');
      if (shareTools && !shareTools.closest('details')) {
        const details = document.createElement('details');
        details.className = 'assign-share-details';
        details.innerHTML = '<summary>Create share links</summary>';
        shareTools.parentNode.insertBefore(details, shareTools);
        details.appendChild(shareTools);
      }
    }

    if (listPanel) listPanel.classList.add('assign-list-panel');

    const status = document.getElementById('status');
    if (status) status.classList.add('assign-status-line');

    const title = document.querySelector('.hero h1');
    if (title && /unassigned residents/i.test(title.textContent)) {
      title.innerHTML = '<span id="partyName">PNC</span> Assign Workspace';
    }
  }

  function installStyles() {
    if (document.getElementById('assignLayoutCleanupStyles')) return;
    const style = document.createElement('style');
    style.id = 'assignLayoutCleanupStyles';
    style.textContent = `
      body{background:#f3f6fb!important}
      .hero{margin-bottom:12px!important}
      .assign-kpi-row{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:10px!important;margin-bottom:12px!important}
      .assign-kpi-row .stat{padding:14px!important;border-radius:18px!important;min-height:86px!important}
      .assign-kpi-row .stat span{font-size:10px!important;line-height:1.1!important}
      .assign-kpi-row .stat strong{font-size:28px!important}
      .assign-dashboard-clean{order:1!important;margin-bottom:12px!important;background:#fff!important;border:1px solid #dbe4f0!important;box-shadow:0 14px 38px rgba(15,23,42,.06)!important}
      .assign-dashboard-clean .panel-head{align-items:flex-start!important;margin-bottom:10px!important}
      .assign-dashboard-clean .panel-head h2{font-size:28px!important;letter-spacing:-.035em!important;line-height:1.05!important}
      .assign-dashboard-clean .pill{font-size:12px!important;background:#eef4ff!important;color:#1647bb!important;white-space:normal!important;line-height:1.2!important;text-align:center!important}
      .assign-actions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;margin:12px 0!important}
      .assign-actions .btn{height:44px!important;border-radius:14px!important;font-size:14px!important}
      .result-summary-note{font-size:13px!important;line-height:1.35!important;margin:12px 0!important;color:#52627a!important;font-weight:900!important}
      .assignee-grid{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(135px,1fr))!important;gap:8px!important}
      .assignee-chip{width:100%!important;justify-content:space-between!important;border-radius:14px!important;padding:9px 10px!important;background:#f8fbff!important;border:1px solid #cfe3ff!important;color:#173b75!important;box-shadow:none!important}
      .assignee-chip strong{font-size:14px!important;line-height:1.1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .assignee-chip span{min-width:28px!important;text-align:center!important;background:#1f3b66!important;color:#fff!important}
      .assign-tools-panel{margin-bottom:12px!important}
      .assign-tools-panel .search{grid-template-columns:1fr 220px auto!important;gap:10px!important}
      .assign-status-line{font-size:13px!important;line-height:1.35!important;background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:12px!important;padding:10px 12px!important;margin-top:10px!important;color:#475569!important}
      .assign-share-details{margin-top:10px!important;border:1px solid #dbe4f0!important;border-radius:16px!important;background:#f8fafc!important;overflow:hidden!important}
      .assign-share-details summary{cursor:pointer!important;padding:12px 14px!important;font-weight:950!important;color:#1f3b66!important;list-style:none!important}
      .assign-share-details summary::-webkit-details-marker{display:none!important}
      .assign-share-details summary:after{content:'Open';float:right;background:#fff;border:1px solid #dbe4f0;border-radius:999px;padding:3px 9px;font-size:11px}
      .assign-share-details[open] summary:after{content:'Close'}
      .assign-share-details .share-tools{border:0!important;border-top:1px solid #dbe4f0!important;border-radius:0!important;margin:0!important;background:#fff!important}
      .assign-list-panel{margin-top:12px!important}
      .assign-list-panel .panel-head h2{font-size:24px!important;line-height:1.1!important}
      .assign-list-panel .pill{font-size:11px!important;line-height:1.25!important;text-align:center!important}
      .resident-card{border-radius:18px!important}
      .assigned-visible-line{font-size:11px!important;line-height:1.25!important;padding:7px 9px!important}
      @media(max-width:760px){
        .page{width:min(100% - 28px,1180px)!important;margin:16px auto!important}
        .topbar{padding:14px!important;gap:12px!important;background:#fff!important;position:sticky!important;top:0!important;z-index:30!important}
        .brand{font-size:20px!important;line-height:1.1!important}
        .mark{width:44px!important;height:44px!important;border-radius:14px!important}
        .nav{display:flex!important;width:100%!important;gap:10px!important;overflow-x:auto!important;padding-bottom:8px!important;scroll-snap-type:x proximity!important}
        .nav .btn{height:58px!important;min-width:118px!important;border-radius:18px!important;font-size:18px!important;scroll-snap-align:start!important}
        .hero{padding:16px!important;border-radius:18px!important}
        .hero h1{font-size:30px!important;line-height:1.05!important}
        .hero p{font-size:13px!important}
        .assign-kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
        .assign-kpi-row .stat{min-height:74px!important;padding:12px!important}
        .assign-kpi-row .stat strong{font-size:24px!important}
        .assign-dashboard-clean{padding:16px!important;border-radius:20px!important}
        .assign-dashboard-clean .panel-head{display:grid!important;grid-template-columns:1fr!important;gap:10px!important}
        .assign-dashboard-clean .panel-head h2{font-size:32px!important}
        .assign-dashboard-clean .pill{justify-self:start!important;font-size:15px!important;padding:10px 14px!important}
        .assign-actions{grid-template-columns:1fr 1fr!important;gap:8px!important}
        .assign-actions .btn:first-child{grid-column:1/-1!important}
        .assign-actions .btn{height:52px!important;font-size:16px!important;border-radius:17px!important}
        .assignee-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
        .assignee-chip{min-height:48px!important;border-radius:999px!important;padding:8px 10px!important}
        .assignee-chip strong{font-size:15px!important}
        .assign-tools-panel{padding:16px!important;border-radius:20px!important}
        .assign-tools-panel .search{grid-template-columns:1fr!important}
        .assign-tools-panel input,.assign-tools-panel select{height:58px!important;border-radius:17px!important;font-size:15px!important}
        .assign-tools-panel .btn{height:54px!important;border-radius:16px!important;font-size:15px!important}
        .assign-status-line{font-size:15px!important}
        .assign-share-details summary{font-size:18px!important;padding:15px!important}
        .share-row{display:grid!important;grid-template-columns:1fr!important}
        .share-tools textarea{font-size:15px!important;min-height:70px!important}
        .assign-list-panel{padding:16px!important;border-radius:20px!important}
        .assign-list-panel .panel-head{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}
        .assign-list-panel .panel-head h2{font-size:28px!important}
        .list{grid-template-columns:1fr!important;gap:10px!important}
        .resident-card{grid-template-columns:76px 1fr!important;gap:10px!important;padding:10px!important}
        .photo{width:76px!important;height:76px!important;border-radius:14px!important}
        .info h3{font-size:17px!important;line-height:1.1!important}
        .info p{font-size:12px!important;line-height:1.25!important;margin-bottom:8px!important}
        .chips{gap:5px!important}.chips span{font-size:10px!important;padding:4px 7px!important}
      }
    `;
    document.head.appendChild(style);
  }
})();