(function () {
  const samples = [
    'Show campaign stats',
    'Who needs follow-up?',
    'Dhafthar voters',
    'Call recommendations'
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
        <header><div><strong>Smart Chat</strong><span>Read-only voter help</span></div><button type="button" id="aiChatClose" aria-label="Close chat">Close</button></header>
        <div id="aiChatMessages" role="log" aria-live="polite"></div>
        <form id="aiChatForm">
          <input id="aiChatInput" autocomplete="off" placeholder="Ask about stats, follow-up, house...">
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
    addMessage('Ask me about visible voters, follow-ups, calls, houses, Dhafthar, transport, or PNC status. I only read the current page and never save data.', 'bot');
    addMessage(`Try: ${samples.join(' | ')}`, 'hint');
  }

  function answer(question) {
    const q = question.toLowerCase();
    const data = analyzeVisibleCards();
    const pageParty = new URLSearchParams(location.search).get('party') || 'current page';

    if (/(pnc|party|scope)/.test(q)) {
      return `This page scope is ${pageParty}. I read only the voters currently shown by this page and filters.`;
    }
    if (/(dhaf|daf|df|house)/.test(q)) {
      if (/dhaf|daf|df/.test(q)) {
        return `${data.dhafthar} visible voter(s) appear to be in Dhafthar-related houses. Use the House filter/search for Dhafthar to focus them.`;
      }
      return data.topHouse ? `Top visible house: ${data.topHouse.name} (${data.topHouse.count} voter(s)). House breaks on the list show where each address group starts.` : 'No visible house data yet.';
    }
    if (/(follow|d2d|not home|another place)/.test(q)) {
      return `${data.followUp} visible voter(s) need follow-up. Start with cards marked Follow-up, Busy, Switched Off, Wrong Number, or Not Decided.`;
    }
    if (/(call|phone|contact)/.test(q)) {
      return `${data.needCall} visible voter(s) need calls and ${data.noPhone} visible voter(s) have no phone. Call voters with phone numbers first, then send no-phone voters to D2D.`;
    }
    if (/(transport|pickup|ride)/.test(q)) {
      return `${data.transport} visible voter(s) need transport. Keep these separate for pickup planning.`;
    }
    if (/(will|vote|support|guaranteed)/.test(q)) {
      return `${data.willVote} visible voter(s) are marked Will Vote. ${data.guaranteed} visible voter(s) look guaranteed.`;
    }
    if (/(stat|count|summary|total|analytics)/.test(q)) {
      return `Visible: ${data.visible}. Page total label: ${data.totalLabel}. Will Vote: ${data.willVote}. Need Call: ${data.needCall}. Follow-up: ${data.followUp}. No Phone: ${data.noPhone}. Houses visible: ${data.houses.size}.`;
    }
    if (/(help|what can|commands)/.test(q)) {
      return 'You can ask: show campaign stats, who needs follow-up, call recommendations, Dhafthar voters, transport, will vote, or PNC page status.';
    }
    return `I can answer from the current visible voter cards. ${data.visible} voter card(s) are visible now. Ask about stats, calls, follow-up, house, Dhafthar, transport, or will vote.`;
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
      dhafthar: 0,
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
      if (/dhaf|daf|df\b|dh r|no dh r/.test(normalize(house))) data.dhafthar += 1;
    });

    data.topHouse = Array.from(houses.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0] || null;
    return data;
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
      #aiChatWindow{position:absolute;right:0;bottom:68px;width:min(360px,calc(100vw - 28px));max-height:min(560px,calc(100vh - 120px));background:#fff;border:1px solid #e4e7ec;border-radius:18px;box-shadow:0 26px 80px rgba(15,23,42,.24);overflow:hidden}
      #aiChatWindow header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 15px;background:#f8fafc;border-bottom:1px solid #e4e7ec}
      #aiChatWindow header div{display:grid;gap:2px}#aiChatWindow header strong{font-size:15px;color:#101828}#aiChatWindow header span{font-size:12px;color:#667085;font-weight:800}
      #aiChatClose{border:1px solid #e4e7ec;background:#fff;color:#344054;border-radius:10px;min-height:32px;padding:6px 10px;font-weight:850;cursor:pointer}
      #aiChatMessages{display:grid;gap:9px;max-height:360px;overflow:auto;padding:14px;background:#fff}
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
})();