(function () {
  const samples = [
    'Show campaign stats',
    'Show predictions',
    'What should I do next?',
    'What is the structure of this website?'
  ];

  const pages = [
    ['index.html', 'Entry page with party choices and AI status links.'],
    ['login.html', 'Supabase login page.'],
    ['voters.html', 'Main voter workspace for search, filters, popups, assignment, and saves.'],
    ['dashboard.html', 'Redirect page that opens voters.html while preserving the party query.'],
    ['ai-dashboard.html', 'Separate AI Brain information/status page for MDP, PNC, or ALL.'],
    ['zero-day.html', 'Election-day tracking page for will-vote and guaranteed voters.'],
    ['shared.html', 'Read-only/public shared view when available.']
  ];

  const fields = [
    ['id', 'Voter row id.'],
    ['image_number', 'Image/list reference number.'],
    ['photo_url', 'Voter photo URL.'],
    ['name', 'Voter name.'],
    ['national_id', 'National ID.'],
    ['house', 'House or address.'],
    ['lives_in', 'Lives-in/location note.'],
    ['phone', 'Phone number.'],
    ['party', 'Party scope such as PNC or MDP.'],
    ['election_box', 'Election box.'],
    ['phone_status', 'Call status such as need-call, called, no-phone, busy, wrong-number.'],
    ['reach_status', 'Whether contact reached the voter.'],
    ['vote_status', 'Vote decision such as pending, will-vote, no-vote, not-decided.'],
    ['transport_status', 'Transport need such as need-transport, arranged, picked-up.'],
    ['d2d_status', 'Door-to-door status such as follow-up, visited, not-home.'],
    ['remarks', 'Campaign notes.'],
    ['support_level', 'Support strength such as guaranteed.'],
    ['vote_assigned_by', 'Assigned person or team name.'],
    ['vote_assigned_at', 'Assignment date/time.']
  ];

  const features = [
    'Party-scoped voter pages for PNC, MDP, and Admin/ALL.',
    'Search by voter details, house, and party fields.',
    'Inline house/address breaks between voter groups.',
    'Voter popup for campaign updates.',
    'Assignment panel and assigned-results view.',
    'Safe share list with only name, ID, house/address, and phone.',
    'Phone tap-to-call behavior.',
    'Follow-up, call, transport, pending, and will-vote filters.',
    'Separate AI Dashboard information/status page.',
    'AI learning system for campaign stats, predictions, recommendations, and memory.',
    'Offline save queue/local cache support.'
  ];

  const missing = [
    'Event creation and RSVP tracking are not fully implemented.',
    'Automated email/SMS/Slack notifications are not connected.',
    'PDF or scheduled report generation is not connected.',
    'External AI model calls are not connected in the browser.',
    'Full audit/activity log and 2FA are not currently implemented.',
    'Device, city, country, and IP tracking are not currently implemented.'
  ];

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    if (document.getElementById('aiChatContainer')) return;
    installStyles();

    const container = document.createElement('div');
    container.id = 'aiChatContainer';
    container.innerHTML = `
      <button id="aiChatToggle" type="button" aria-label="Open Smart Chat">AI</button>
      <section id="aiChatWindow" aria-label="Smart Chat" hidden>
        <header><div><strong>Smart Chat</strong><span>AI learning / read-only</span></div><button type="button" id="aiChatClose" aria-label="Close chat">Close</button></header>
        <div id="aiChatMessages" role="log" aria-live="polite"></div>
        <form id="aiChatForm">
          <input id="aiChatInput" autocomplete="off" placeholder="Ask stats, predictions, fields...">
          <button type="submit">Send</button>
        </form>
      </section>
    `;
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
    addMessage('Ask me campaign stats, predictions, recommendations, assignments, houses, website structure, voter fields, current features, or missing features. I read the current page and never save voter data.', 'bot');
    addMessage(`Try: ${samples.join(' | ')}`, 'hint');
  }

  function answer(question) {
    const q = question.toLowerCase();
    const pageParty = new URLSearchParams(location.search).get('party') || 'current page';

    if (/(structure|organized|organisation|pages|page exist|website)/.test(q)) {
      return [
        'Website structure:',
        ...pages.map(([page, purpose]) => `- ${page}: ${purpose}`),
        '',
        'Recommendation: keep voters.html as the main fast work page, and use ai-dashboard.html for information/status so the voter list stays clean.'
      ].join('\n');
    }
    if (/(field|schema|data column|columns|all voter fields)/.test(q)) {
      return [
        'Voter fields I know:',
        ...fields.map(([field, purpose]) => `- ${field}: ${purpose}`)
      ].join('\n');
    }
    if (/(status mean|statuses|status values|call center|transportation|d2d|vote status)/.test(q)) {
      return [
        'Main status groups:',
        '- Vote: pending, will-vote, no-vote, not-decided, plus support_level guaranteed.',
        '- Call/phone: need-call, called/connected, busy, not-answer, switched-off, disconnected, wrong-number, out-of-range, no-phone.',
        '- Transport: need-transport, arranged, picked-up, not-needed.',
        '- D2D: follow-up, visited/reach, not-home, not-visited.',
        '- Remarks: free campaign note.'
      ].join('\n');
    }
    if (/(feature|what can|can i do|current features)/.test(q)) {
      return ['Current features:', ...features.map((item) => `- ${item}`)].join('\n');
    }
    if (/(missing|not implemented|improvement|remove|roadmap)/.test(q)) {
      return [
        'Not fully implemented yet:',
        ...missing.map((item) => `- ${item}`),
        '',
        'Best next UI move: avoid adding more clutter to voters.html. Put status, reports, and broad information in ai-dashboard.html.'
      ].join('\n');
    }
    if (/(tab|tabs|separate pages|separate page|organize|organise)/.test(q)) {
      return 'Recommendation: do not split every status into many new pages yet. Keep voters.html as the single fast work page with filters, and use ai-dashboard.html for information/status. Separate pages only make sense later for big team workflows like Call Center, D2D, Transport, or Zero Day.';
    }
    if (/(pnc|mdp|party|scope)/.test(q) && !/(stat|status|predict|forecast|trend|recommend|next|assign|house|call|follow|phone|transport|vote)/.test(q)) {
      return `This page scope is ${pageParty}. PNC pages should show only PNC voters, MDP pages only MDP voters, and Admin/ALL can show the full allowed scope. I do not change that scope.`;
    }

    if (shouldAskLearningSystem(q)) {
      return learningAnswer(question);
    }

    if (/(help|commands|ask)/.test(q)) {
      return 'You can ask: campaign stats, show predictions, what should I do next, memory, houses, assignments, calls, follow-up, transport, will vote, website structure, pages, fields, features, or missing features.';
    }

    return learningAnswer(question);
  }

  function shouldAskLearningSystem(q) {
    return /(campaign|stat|count|summary|total|analytics|health|risk|predict|prediction|forecast|trend|what should|next|recommend|memory|learn|assign|assigned|assignment|who assign|last assign|house|dhaf|daf|df\b|follow|d2d|not home|another place|call|phone|contact|transport|pickup|ride|will vote|support|guaranteed|pending|reached|status)/.test(q);
  }

  function learningAnswer(question) {
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
    const q = question.toLowerCase();
    if (/(predict|forecast|trend)/.test(q)) {
      return [
        'Prediction / Trend',
        'The learning system is still loading, so this is based on visible cards only.',
        `Visible voters: ${data.visible}`,
        `Will Vote: ${data.willVote}`,
        `Need Call: ${data.needCall}`,
        `Pending label: ${data.totalLabel}`
      ].join('\n');
    }
    if (/(assign|assigned|assignment)/.test(q)) return assignmentFallback();
    if (/(house|dhaf|daf|df\b)/.test(q)) {
      return data.topHouse ? `Top visible house: ${data.topHouse.name} (${data.topHouse.count} voter(s)). Houses visible: ${data.houses.size}.` : 'No visible house data yet.';
    }
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
      const domAssigned = Array.from(document.querySelectorAll('.assigned-result-box strong')).map((el) => clean(el.textContent)).filter(Boolean);
      return domAssigned.length
        ? `Visible assigned results show ${domAssigned.length} assigned voter(s). Open AI Dashboard for assignment summary.`
        : 'No assignment data is visible in the current page cache yet. Open AI Dashboard or Assigned Results to load more assignment details.';
    }

    const latest = assigned.slice().sort((a, b) => dateMs(b.vote_assigned_at) - dateMs(a.vote_assigned_at))[0];
    const counts = new Map();
    assigned.forEach((row) => {
      clean(row.vote_assigned_by).split(',').map(clean).filter(Boolean).forEach((name) => counts.set(name, (counts.get(name) || 0) + 1));
    });
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count]) => `${name}: ${count}`).join(' | ');
    return `Assigned voters in this scope: ${assigned.length}. Latest assignment: ${latest.vote_assigned_by || 'Assigned'}${latest.vote_assigned_at ? ` at ${formatTime(latest.vote_assigned_at)}` : ''}. Top assignees: ${top || 'none'}.`;
  }

  function analyzeVisibleCards() {
    const cards = Array.from(document.querySelectorAll('.voter-card[data-open-voter]'));
    const houses = new Map();
    const data = {
      visible: cards.length,
      totalLabel: document.getElementById('sectionTotal')?.textContent || `${cards.length} voters`,
      needCall: 0,
      followUp: 0,
      noPhone: 0,
      transport: 0,
      willVote: 0,
      guaranteed: 0,
      houses,
      topHouse: null
    };

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
    } catch {
      return [];
    }
  }

  function houseFromCard(card) {
    const meta = card.querySelector('.voter-info p')?.textContent || '';
    return meta.split('·')[0]?.trim() || '';
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
      #aiChatWindow{position:absolute;right:0;bottom:68px;width:min(390px,calc(100vw - 28px));max-height:min(620px,calc(100vh - 120px));background:#fff;border:1px solid #e4e7ec;border-radius:18px;box-shadow:0 26px 80px rgba(15,23,42,.24);overflow:hidden}
      #aiChatWindow header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 15px;background:#f8fafc;border-bottom:1px solid #e4e7ec}
      #aiChatWindow header div{display:grid;gap:2px}#aiChatWindow header strong{font-size:15px;color:#101828}#aiChatWindow header span{font-size:12px;color:#667085;font-weight:800}
      #aiChatClose{border:1px solid #e4e7ec;background:#fff;color:#344054;border-radius:10px;min-height:32px;padding:6px 10px;font-weight:850;cursor:pointer}
      #aiChatMessages{display:grid;gap:9px;max-height:420px;overflow:auto;padding:14px;background:#fff}
      .ai-chat-message{padding:10px 11px;border-radius:13px;font-size:13px;line-height:1.45;font-weight:650;white-space:pre-wrap}.ai-chat-message.bot{background:#eff6ff;color:#1e3a8a}.ai-chat-message.user{background:#10204a;color:#fff;justify-self:end;max-width:86%}.ai-chat-message.hint{background:#f8fafc;color:#667085;font-size:12px}
      #aiChatForm{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:12px;border-top:1px solid #e4e7ec;background:#f8fafc}#aiChatInput{min-height:40px;border:1px solid #d8e0ee;border-radius:12px;padding:8px 10px;font-size:14px}#aiChatForm button{border:0;border-radius:12px;background:#2563eb;color:#fff;font-weight:900;padding:0 13px;cursor:pointer}
      body.clean-read-view #aiChatContainer{display:none!important}
      @media(max-width:760px){#aiChatContainer{right:12px;bottom:12px}#aiChatToggle{width:52px;height:52px;border-radius:16px}#aiChatWindow{bottom:62px}}
    `;
    document.head.appendChild(style);
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/[_-]/g, ' ');
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function dateMs(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || '');
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
})();