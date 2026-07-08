(function () {
  const project = {
    name: 'Votelist 2026',
    repo: 'naappe/votelist2026',
    url: 'https://naappe.github.io/votelist2026/',
    host: 'GitHub Pages',
    supabaseProject: 'espezmdpkoixnfchomqb',
    mainTable: 'public.full_import',
    shareTable: 'assignment_shares',
    backupBranch: 'backup/stable-20260708-voters-fixed',
    backupCommit: '91bf95d3fec0fd4282036acfafae078e65680442',
    restoreFile: 'BACKUP-RESTORE.md'
  };

  const samples = [
    'What is the main database table?',
    'What is the backup branch?',
    'Which file controls self-assign?',
    'Check project health'
  ];

  const pages = [
    ['index.html', 'Entry / party selection page.'],
    ['login.html', 'Login page.'],
    ['voters.html', 'Main voter management workspace.'],
    ['ai-dashboard.html', 'AI / information dashboard.'],
    ['dashboard.html', 'Old dashboard route that redirects to voters.html.'],
    ['shared.html', 'Public self-assign page. It asks for assigner name only and shows assigned names.'],
    ['safe-share.html', 'Read-only safe share list showing photo, name, ID, address, and phone.'],
    ['all-voters.html', 'Old route / redirect.'],
    ['zero-day.html', 'Old route / redirect.']
  ];

  const owners = [
    ['js/config.js', 'Supabase URL/key, table name, app config.'],
    ['js/app.js', 'Main app: auth, load voters, render cards, filters, popup, status saves.'],
    ['js/voter-url-router.js', 'URL filters like filter=assigned, filter=need-call, and house=...'],
    ['js/voter-info-status.js', 'Builds the Voters page Information Status panel.'],
    ['js/voter-info-nav-fix.js', 'Makes Voters page Information Status cards clickable.'],
    ['js/dashboard-result-nav-fix.js', 'Makes AI Dashboard result cards clickable.'],
    ['js/assign-share.js', 'Creates self-assign links and safe-share links.'],
    ['shared.html', 'Owns public self-assign UI and save behavior.'],
    ['safe-share.html', 'Owns safe read-only share UI.'],
    ['js/assign-results.js', 'Admin Assigned Results view.'],
    ['js/assigned-person-filter.js', 'Filter Assigned Results by person.'],
    ['js/modal-assignment-panel.js', 'Manual assignment inside voter popup.'],
    ['js/modal-phone-call.js', 'Tap phone in modal to call.'],
    ['js/vote-save-override.js', 'Ensures selected vote result saves correctly.'],
    ['js/ai-brain-live.js', 'AI/information status metrics.'],
    ['js/ai-chat.js', 'This AI Host chat.'],
    ['js/read-view-public.js', 'Allows public read links to bypass login.'],
    ['js/read-only-view.js', 'Public read-only gallery renderer.'],
    ['js/house-sync.js', 'House dropdown, Dhafthar/Sinamale grouping, top houses.'],
    ['js/house-filter-lock.js', 'Keeps house/search/filter after saves.'],
    ['js/save-state-fix.js', 'Preserves scroll/filter state.'],
    ['js/pro-ui.js', 'Card action/UI cleanup.'],
    ['js/dashboard-cleanup.js', 'UI cleanup and share tools.']
  ];

  const fields = [
    ['id', 'Internal row id used for updates and assignment.'],
    ['image_number', 'Voter list image/reference number.'],
    ['photo_url', 'Voter photo URL.'],
    ['name', 'Voter name.'],
    ['national_id', 'National ID.'],
    ['house', 'House/address.'],
    ['lives_in', 'Lives-in/location note.'],
    ['phone', 'Phone number.'],
    ['party', 'Party scope such as PNC / MDP.'],
    ['election_box', 'Election box.'],
    ['phone_status', 'Call status: need-call, called, no-phone, busy, wrong-number, etc.'],
    ['reach_status', 'reached / not-reached.'],
    ['vote_status', 'pending / will-vote / no-vote / not-decided.'],
    ['transport_status', 'need-transport / arranged / picked-up / not-needed.'],
    ['d2d_status', 'follow-up / visited / not-home / not-visited.'],
    ['remarks', 'Campaign notes.'],
    ['support_level', 'Support strength such as guaranteed.'],
    ['vote_assigned_by', 'Names of people assigned to the voter.'],
    ['vote_assigned_at', 'Assignment timestamp.']
  ];

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  function init() {
    if (document.getElementById('aiChatContainer')) return;
    installStyles();
    const container = document.createElement('div');
    container.id = 'aiChatContainer';
    container.innerHTML = `
      <button id="aiChatToggle" type="button" aria-label="Open AI Host">AI</button>
      <section id="aiChatWindow" aria-label="AI Host" hidden>
        <header><div><strong>AI Host</strong><span>Project-aware support</span></div><button type="button" id="aiChatClose" aria-label="Close chat">Close</button></header>
        <div id="aiChatMessages" role="log" aria-live="polite"></div>
        <form id="aiChatForm"><input id="aiChatInput" autocomplete="off" placeholder="Ask database, backup, files, bugs..."><button type="submit">Send</button></form>
      </section>`;
    document.body.appendChild(container);

    const toggle = document.getElementById('aiChatToggle');
    const close = document.getElementById('aiChatClose');
    const win = document.getElementById('aiChatWindow');
    const form = document.getElementById('aiChatForm');
    const input = document.getElementById('aiChatInput');

    toggle.addEventListener('click', () => {
      win.hidden = !win.hidden;
      if (!win.hidden) {
        seed();
        setTimeout(() => input.focus(), 80);
      }
    });
    close.addEventListener('click', () => { win.hidden = true; });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question) return;
      addMessage(question, 'user');
      input.value = '';
      addMessage(answer(question), 'bot');
    });
  }

  function seed() {
    const messages = document.getElementById('aiChatMessages');
    if (!messages || messages.dataset.seeded) return;
    messages.dataset.seeded = '1';
    addMessage('AI Host is now project-aware. I know the hosting setup, Supabase tables, restore branch, active scripts, share/assign flow, and current page data.', 'bot');
    addMessage(`Try: ${samples.join(' | ')}`, 'hint');
  }

  function answer(question) {
    const q = normalize(question);

    if (/(health|check project|working|test ai|ai host|purpose)/.test(q)) return healthAnswer();
    if (/(database|table|supabase|rpc|function|schema|column|field)/.test(q)) return databaseAnswer(q);
    if (/(backup|restore|rollback|stable|commit|branch|lost|mistake|mistakenly)/.test(q)) return backupAnswer();
    if (/(hosting|host|github pages|deploy|workflow|url|site)/.test(q)) return hostingAnswer();
    if (/(self assign|self-assign|assign link|shared.html|share assign|assignment share|assigner|assigned name)/.test(q)) return selfAssignAnswer();
    if (/(safe share|safe-share|read only|read-only|public share|photo|image not show|image missing|picture)/.test(q)) return safeShareAnswer(q);
    if (/(owner|which file|file controls|where fix|script|duplicate|old function|read full files)/.test(q)) return ownerAnswer(q);
    if (/(structure|pages|website structure|all files)/.test(q)) return structureAnswer();
    if (/(status|campaign|stats|count|summary|predict|prediction|what should|next|recommend|house|dhaf|d2d|call|phone|transport|will vote|pending|reached)/.test(q)) return liveOrLearningAnswer(question);
    if (/(help|commands|ask)/.test(q)) return helpAnswer();

    return liveOrLearningAnswer(question);
  }

  function healthAnswer() {
    const loaded = scriptStatus();
    return [
      'Project health check:',
      `- Host: ${project.host}`,
      `- Repo: ${project.repo}`,
      `- Main DB table: ${project.mainTable}`,
      `- Share table: ${project.shareTable}`,
      `- Backup branch: ${project.backupBranch}`,
      `- Restore commit: ${project.backupCommit}`,
      `- Current page: ${location.pathname.split('/').pop() || 'index.html'}`,
      `- Visible voter cards: ${document.querySelectorAll('.voter-card[data-open-voter]').length}`,
      `- Information status loaded: ${Boolean(document.getElementById('aiBrainLive'))}`,
      `- AI Host loaded: yes`,
      `- Key scripts detected: ${loaded}`,
      '',
      'If a result card does not open a list, check js/voter-info-nav-fix.js on voters.html or js/dashboard-result-nav-fix.js on ai-dashboard.html.'
    ].join('\n');
  }

  function databaseAnswer(q) {
    if (/rpc|function/.test(q)) {
      return [
        'Supabase RPC/functions used:',
        '- claim_assignment(p_token, p_voter_row_id, p_assignee_name, p_assignee_phone): adds assignee from public self-assign page.',
        '- unclaim_assignment(p_token, p_voter_row_id, p_assignee_phone): removes assignment.',
        '',
        'Current frontend asks the user for name only. The name is used as the public assignment identity key.'
      ].join('\n');
    }
    if (/field|schema|column/.test(q)) return ['Main voter fields:', ...fields.map(([f, d]) => `- ${f}: ${d}`)].join('\n');
    return [
      'Database setup:',
      `- Supabase project ref: ${project.supabaseProject}`,
      `- Main voter table: ${project.mainTable}`,
      `- Share table: ${project.shareTable}`,
      '- RLS: enabled',
      '- Frontend config: js/config.js',
      '- Assignment columns: vote_assigned_by, vote_assigned_at',
      '- Public visible fields: photo_url, name, national_id, house, phone'
    ].join('\n');
  }

  function backupAnswer() {
    return [
      'Restore / backup information:',
      `- Backup branch: ${project.backupBranch}`,
      `- Stable commit: ${project.backupCommit}`,
      `- Restore guide: ${project.restoreFile}`,
      '',
      'Restore rule: restore website files from the backup branch if code is broken. Do not delete or overwrite Supabase voter data during frontend restore.'
    ].join('\n');
  }

  function hostingAnswer() {
    return [
      'Hosting setup:',
      `- Host: ${project.host}`,
      `- Repository: ${project.repo}`,
      `- Public URL: ${project.url}`,
      '- Deploy workflow: .github/workflows/pages.yml',
      '- App type: static HTML/CSS/JavaScript',
      '- Backend: Supabase',
      '',
      'After a commit, wait 1-2 minutes and refresh. Mobile browser cache may need a hard refresh.'
    ].join('\n');
  }

  function selfAssignAnswer() {
    return [
      'Self-assign flow:',
      '- js/assign-share.js creates the short share token in assignment_shares.',
      '- shared.html opens the token and renders selected voters.',
      '- Public user ticks voters and writes name only. No mobile number is needed.',
      '- shared.html calls claim_assignment / unclaim_assignment.',
      '- If two people assign the same voter, both names should show under Assigned.',
      '- Admin result view is controlled by js/assign-results.js and js/assigned-person-filter.js.'
    ].join('\n');
  }

  function safeShareAnswer(q) {
    const photoDiagnosis = /photo|image|picture/.test(q)
      ? '\nPhoto issue check: safe-share.html can show images only if the share payload contains photo or photo_url, or the source row has photo_url. If initials show instead of photo, the token payload likely has no photo URL or the image URL is private/broken.'
      : '';
    return [
      'Safe share flow:',
      '- safe-share.html is read-only.',
      '- It should show photo, name, ID, address, and phone.',
      '- It must not show party, campaign statuses, remarks, or edit controls.',
      '- The token comes from assignment_shares.payload.',
      photoDiagnosis
    ].join('\n');
  }

  function ownerAnswer(q) {
    if (/self assign|assign link/.test(q)) return 'Self-assign is controlled by js/assign-share.js and shared.html.';
    if (/safe/.test(q)) return 'Safe read-only share is controlled by safe-share.html. Public read gallery is controlled by js/read-view-public.js and js/read-only-view.js.';
    if (/status|information/.test(q)) return 'Voters page Information Status is controlled by js/voter-info-status.js. Card click navigation is controlled by js/voter-info-nav-fix.js.';
    if (/dashboard/.test(q)) return 'AI Dashboard cards are controlled by js/ai-brain-live.js and navigation is fixed by js/dashboard-result-nav-fix.js.';
    if (/phone|call/.test(q)) return 'Tap-to-call is controlled by js/modal-phone-call.js.';
    if (/vote|save/.test(q)) return 'Vote save correctness is controlled by js/vote-save-override.js, with base save/render logic in js/app.js.';
    return ['Active file ownership:', ...owners.map(([f, d]) => `- ${f}: ${d}`)].join('\n');
  }

  function structureAnswer() {
    return ['Website structure:', ...pages.map(([p, d]) => `- ${p}: ${d}`), '', 'Primary workspace: voters.html. Database backend: Supabase. Hosting: GitHub Pages.'].join('\n');
  }

  function helpAnswer() {
    return [
      'Ask me:',
      '- What is the main database table?',
      '- What is the backup branch?',
      '- Which file controls self-assign?',
      '- Why is safe-share photo not showing?',
      '- Which file controls result card clicks?',
      '- Check project health',
      '- Show campaign stats',
      '- Who assigned voters?'
    ].join('\n');
  }

  function liveOrLearningAnswer(question) {
    try {
      if (typeof window.askAI === 'function') return window.askAI(question);
      if (window.aiLearningSystem && typeof window.aiLearningSystem.ask === 'function') return window.aiLearningSystem.ask(question);
    } catch (error) {
      console.warn('AI learning answer failed', error);
    }
    return visibleFallback(question);
  }

  function visibleFallback(question) {
    const data = analyzeVisibleCards();
    const q = normalize(question);
    if (/assign|assigned|assignment/.test(q)) return assignmentFallback();
    if (/house|dhaf|daf|df\b/.test(q)) return data.topHouse ? `Top visible house: ${data.topHouse.name} (${data.topHouse.count} voter(s)). Houses visible: ${data.houses.size}.` : 'No visible house data yet.';
    return [
      'Campaign Status (visible page fallback)',
      `Visible: ${data.visible}`,
      `Page total label: ${data.totalLabel}`,
      `Will Vote: ${data.willVote}`,
      `Need Call: ${data.needCall}`,
      `Follow-up: ${data.followUp}`,
      `No Phone: ${data.noPhone}`,
      `Transport: ${data.transport}`,
      `Houses visible: ${data.houses.size}`
    ].join('\n');
  }

  function assignmentFallback() {
    const rows = readCachedRows();
    const assigned = rows.filter((row) => clean(row.vote_assigned_by));
    if (!assigned.length) {
      const domAssigned = Array.from(document.querySelectorAll('.assigned-result-box strong,.assigners')).map((el) => clean(el.textContent)).filter(Boolean);
      return domAssigned.length ? `Visible assignment areas found: ${domAssigned.length}.` : 'No assignment data is visible in the current page cache yet. Open Assigned Results to load more assignment details.';
    }
    const counts = new Map();
    assigned.forEach((row) => clean(row.vote_assigned_by).split(',').map(clean).filter(Boolean).forEach((name) => counts.set(name, (counts.get(name) || 0) + 1)));
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => `${name}: ${count}`).join(' | ');
    return `Assigned voters in this scope: ${assigned.length}. Top assignees: ${top || 'none'}.`;
  }

  function analyzeVisibleCards() {
    const cards = Array.from(document.querySelectorAll('.voter-card[data-open-voter]'));
    const houses = new Map();
    const data = { visible: cards.length, totalLabel: document.getElementById('sectionTotal')?.textContent || `${cards.length} voters`, needCall: 0, followUp: 0, noPhone: 0, transport: 0, willVote: 0, guaranteed: 0, houses, topHouse: null };
    cards.forEach((card) => {
      const text = normalize(card.textContent);
      const house = houseFromCard(card) || 'Unknown house';
      const key = house.toLowerCase();
      houses.set(key, { name: house, count: (houses.get(key)?.count || 0) + 1 });
      if (/need call/.test(text)) data.needCall += 1;
      if (/follow up|follow-up|not decided|wrong number|switched off|busy|out of range/.test(text)) data.followUp += 1;
      if (/no phone/.test(text)) data.noPhone += 1;
      if (/transport|need transport/.test(text)) data.transport += 1;
      if (/will vote/.test(text)) data.willVote += 1;
      if (/guaranteed/.test(text)) data.guaranteed += 1;
    });
    data.topHouse = Array.from(houses.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0] || null;
    return data;
  }

  function readCachedRows() {
    const party = (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
    try {
      if (Array.isArray(window.__villimaleRows)) return window.__villimaleRows;
      const rows = JSON.parse(localStorage.getItem(`villimale_campaign_manager_v1:${party}:rows`) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch { return []; }
  }

  function houseFromCard(card) {
    const meta = card.querySelector('.voter-info p')?.textContent || '';
    return meta.split('·')[0]?.trim() || '';
  }

  function scriptStatus() {
    const scripts = Array.from(document.scripts).map((s) => s.src || '');
    const keys = ['voter-info-nav-fix', 'dashboard-result-nav-fix', 'assign-share', 'assign-results', 'ai-chat'];
    return keys.map((key) => `${key}:${scripts.some((src) => src.includes(key)) ? 'yes' : 'no'}`).join(' | ');
  }

  function addMessage(text, type) {
    const messages = document.getElementById('aiChatMessages');
    if (!messages) return;
    const item = document.createElement('div');
    item.className = `ai-chat-message ${type}`;
    item.textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }

  function installStyles() {
    if (document.getElementById('aiChatStyles')) return;
    const style = document.createElement('style');
    style.id = 'aiChatStyles';
    style.textContent = `
      #aiChatContainer{position:fixed;right:18px;bottom:18px;z-index:9999;font-family:inherit}
      #aiChatToggle{width:56px;height:56px;border:0;border-radius:18px;background:#10204a;color:#fff;font-weight:950;box-shadow:0 18px 42px rgba(16,32,74,.28);cursor:pointer}
      #aiChatWindow{position:absolute;right:0;bottom:68px;width:min(410px,calc(100vw - 28px));max-height:min(640px,calc(100vh - 120px));background:#fff;border:1px solid #e4e7ec;border-radius:18px;box-shadow:0 26px 80px rgba(15,23,42,.24);overflow:hidden}
      #aiChatWindow header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 15px;background:#f8fafc;border-bottom:1px solid #e4e7ec}
      #aiChatWindow header div{display:grid;gap:2px}#aiChatWindow header strong{font-size:15px;color:#101828}#aiChatWindow header span{font-size:12px;color:#667085;font-weight:800}
      #aiChatClose{border:1px solid #e4e7ec;background:#fff;color:#344054;border-radius:10px;min-height:32px;padding:6px 10px;font-weight:850;cursor:pointer}
      #aiChatMessages{display:grid;gap:9px;max-height:440px;overflow:auto;padding:14px;background:#fff}
      .ai-chat-message{padding:10px 11px;border-radius:13px;font-size:13px;line-height:1.45;font-weight:650;white-space:pre-wrap}.ai-chat-message.bot{background:#eff6ff;color:#1e3a8a}.ai-chat-message.user{background:#10204a;color:#fff;justify-self:end;max-width:86%}.ai-chat-message.hint{background:#f8fafc;color:#667085;font-size:12px}
      #aiChatForm{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:12px;border-top:1px solid #e4e7ec;background:#f8fafc}#aiChatInput{min-height:40px;border:1px solid #d8e0ee;border-radius:12px;padding:8px 10px;font-size:14px}#aiChatForm button{border:0;border-radius:12px;background:#2563eb;color:#fff;font-weight:900;padding:0 13px;cursor:pointer}
      body.clean-read-view #aiChatContainer{display:none!important}@media(max-width:760px){#aiChatContainer{right:12px;bottom:12px}#aiChatToggle{width:52px;height:52px;border-radius:16px}#aiChatWindow{bottom:62px}}
    `;
    document.head.appendChild(style);
  }

  function normalize(value) { return String(value || '').toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function clean(value) { return String(value || '').trim(); }
})();