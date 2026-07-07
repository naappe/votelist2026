(function () {
  const storageKey = 'villimale_ai_learning_v1';
  const rowStoragePrefix = 'villimale_campaign_manager_v1';
  const sessionStartedAt = Date.now();
  let memory = loadMemory();

  function loadMemory() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return {
        questions: Array.isArray(saved.questions) ? saved.questions.slice(-50) : [],
        topics: saved.topics || {},
        clicks: saved.clicks || {},
        snapshots: saved.snapshots || {},
        sessions: Number(saved.sessions || 0) + 1,
        lastSeen: new Date().toISOString()
      };
    } catch {
      return { questions: [], topics: {}, clicks: {}, snapshots: {}, sessions: 1, lastSeen: new Date().toISOString() };
    }
  }

  function saveMemory() {
    memory.lastSeen = new Date().toISOString();
    try { localStorage.setItem(storageKey, JSON.stringify(memory)); } catch {}
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function number(value) {
    return new Intl.NumberFormat('en-US').format(value || 0);
  }

  function partyScope() {
    return (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
  }

  function rows() {
    if (Array.isArray(window.__villimaleRows) && window.__villimaleRows.length) return window.__villimaleRows;
    const keys = [
      `${rowStoragePrefix}:${partyScope()}:rows`,
      `${rowStoragePrefix}:ALL:rows`,
      `${rowStoragePrefix}:PNC:rows`,
      `${rowStoragePrefix}:MDP:rows`
    ];
    for (const key of keys) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch {}
    }
    return visibleCardsAsRows();
  }

  function visibleCardsAsRows() {
    return Array.from(document.querySelectorAll('.voter-card[data-open-voter]')).map((card) => {
      const meta = (card.querySelector('.voter-info p')?.textContent || '').split('·').map((item) => item.trim());
      const text = card.textContent || '';
      return {
        id: card.dataset.openVoter || '',
        name: card.querySelector('h3')?.textContent || '',
        house: meta[0] || '',
        phone: meta[meta.length - 1] || '',
        party: card.querySelector('.party-tag')?.textContent || '',
        phone_status: text.includes('Need Call') ? 'need-call' : text.includes('No Phone') ? 'no-phone' : '',
        reach_status: text.includes('Reached') ? 'reached' : text.includes('Not Reached') ? 'not-reached' : '',
        vote_status: text.includes('Will Vote') ? 'will-vote' : text.includes('Pending') ? 'pending' : '',
        transport_status: text.includes('Transport') ? 'need-transport' : '',
        d2d_status: text.includes('Follow') ? 'follow-up' : '',
        vote_assigned_by: card.querySelector('.assigned-result-box strong')?.textContent || ''
      };
    });
  }

  function hasPhone(row) {
    return Boolean(clean(row.phone)) && lower(row.phone) !== 'no phone';
  }

  function isFollowUp(row) {
    return row.d2d_status === 'follow-up'
      || row.vote_status === 'not-decided'
      || ['busy', 'switched-off', 'disconnected', 'wrong-number', 'out-of-range'].includes(row.phone_status);
  }

  function metrics() {
    const data = rows();
    const houses = new Map();
    const assignees = new Map();
    data.forEach((row) => {
      const house = clean(row.house) || 'Unknown house';
      houses.set(house, (houses.get(house) || 0) + 1);
      clean(row.vote_assigned_by).split(',').map(clean).filter(Boolean).forEach((name) => {
        if (lower(name) !== 'naappe@gmail.com') assignees.set(name, (assignees.get(name) || 0) + 1);
      });
    });

    const output = {
      scope: partyScope(),
      total: data.length,
      reached: data.filter((row) => row.reach_status === 'reached').length,
      needCall: data.filter((row) => row.phone_status === 'need-call' && hasPhone(row)).length,
      willVote: data.filter((row) => row.vote_status === 'will-vote').length,
      pending: data.filter((row) => row.vote_status === 'pending').length,
      noPhone: data.filter((row) => row.phone_status === 'no-phone' || !hasPhone(row)).length,
      followUp: data.filter(isFollowUp).length,
      transport: data.filter((row) => row.transport_status === 'need-transport').length,
      houses: houses.size,
      assigned: data.filter((row) => clean(row.vote_assigned_by)).length,
      topHouses: Array.from(houses.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 10),
      topAssignees: Array.from(assignees.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 10)
    };
    output.health = healthScore(output);
    return output;
  }

  function healthScore(m) {
    if (!m.total) return 0;
    const reached = m.reached / m.total;
    const committed = m.willVote / m.total;
    const risk = (m.pending + m.needCall + m.noPhone + m.followUp) / Math.max(1, m.total * 4);
    return Math.max(0, Math.min(100, Math.round((reached * 35) + (committed * 45) + ((1 - risk) * 20))));
  }

  function trackQuestion(question) {
    const q = clean(question);
    if (!q) return;
    const topic = topicOf(q);
    memory.questions.push({ question: q, topic, at: new Date().toISOString() });
    memory.questions = memory.questions.slice(-50);
    memory.topics[topic] = (memory.topics[topic] || 0) + 1;
    saveMemory();
  }

  function topicOf(question) {
    const q = lower(question);
    if (q.includes('house')) return 'houses';
    if (q.includes('assign')) return 'assignments';
    if (q.includes('predict') || q.includes('forecast')) return 'predictions';
    if (q.includes('risk')) return 'risk';
    if (q.includes('call')) return 'calls';
    if (q.includes('follow')) return 'follow-up';
    if (q.includes('status') || q.includes('stats')) return 'status';
    return 'general';
  }

  function recommendations(m) {
    const items = [];
    if (!m.total) return ['Load voters first, then ask again.'];
    if (m.willVote === 0) items.push('Start marking confirmed supporters as Will Vote.');
    if (m.needCall) items.push(`Call queue first: ${number(m.needCall)} voters still need phone contact.`);
    if (m.noPhone) items.push(`Plan direct visits for ${number(m.noPhone)} voters with no phone.`);
    if (m.followUp) items.push(`Follow up with ${number(m.followUp)} voters before they go cold.`);
    if (m.transport) items.push(`Arrange transport for ${number(m.transport)} voters.`);
    if (m.topHouses[0]) items.push(`Focus house walk on ${m.topHouses[0].name} (${number(m.topHouses[0].count)} voters).`);
    if (!items.length) items.push('Campaign view is stable. Continue checking new assignments and pending voters.');
    return items.slice(0, 5);
  }

  function trends(m) {
    const key = `${partyScope()}:latest`;
    const previous = memory.snapshots[key];
    memory.snapshots[key] = { total: m.total, willVote: m.willVote, pending: m.pending, needCall: m.needCall, at: new Date().toISOString() };
    saveMemory();
    if (!previous) return ['First snapshot saved. Ask again later to compare trend changes.'];
    const output = [];
    const willDiff = m.willVote - Number(previous.willVote || 0);
    const pendingDiff = m.pending - Number(previous.pending || 0);
    const callDiff = m.needCall - Number(previous.needCall || 0);
    output.push(`Will Vote: ${willDiff >= 0 ? '+' : ''}${willDiff}`);
    output.push(`Pending: ${pendingDiff >= 0 ? '+' : ''}${pendingDiff}`);
    output.push(`Need Call: ${callDiff >= 0 ? '+' : ''}${callDiff}`);
    return output;
  }

  function answer(question) {
    trackQuestion(question);
    const q = lower(question);
    const m = metrics();

    if (q.includes('house')) return housesAnswer(m);
    if (q.includes('assign')) return assignmentAnswer(m);
    if (q.includes('predict') || q.includes('forecast') || q.includes('trend')) return predictionAnswer(m);
    if (q.includes('what should') || q.includes('next') || q.includes('recommend')) return recommendationAnswer(m);
    if (q.includes('memory') || q.includes('learn')) return memoryAnswer();
    return statusAnswer(m);
  }

  function statusAnswer(m) {
    return [
      `Campaign Status (${m.scope})`,
      `Total: ${number(m.total)}`,
      `Reached: ${number(m.reached)}`,
      `Will Vote: ${number(m.willVote)}`,
      `Pending: ${number(m.pending)}`,
      `Need Call: ${number(m.needCall)}`,
      `No Phone: ${number(m.noPhone)}`,
      `Follow-up: ${number(m.followUp)}`,
      `Assigned: ${number(m.assigned)}`,
      `Houses: ${number(m.houses)}`,
      `Health Score: ${m.health}/100`,
      '',
      'Recommendations:',
      ...recommendations(m).map((item) => `- ${item}`)
    ].join('\n');
  }

  function housesAnswer(m) {
    return ['Top Houses:', ...m.topHouses.map((item, index) => `${index + 1}. ${item.name}: ${number(item.count)}`)].join('\n') || 'No house data found.';
  }

  function assignmentAnswer(m) {
    return [
      `Assigned voters: ${number(m.assigned)}`,
      'Top assigned people:',
      ...(m.topAssignees.length ? m.topAssignees.map((item, index) => `${index + 1}. ${item.name}: ${number(item.count)}`) : ['No assigned people found.'])
    ].join('\n');
  }

  function predictionAnswer(m) {
    return [
      `Prediction / Trend (${m.scope})`,
      `Health Score: ${m.health}/100`,
      ...trends(m).map((item) => `- ${item}`),
      '',
      'Risk:',
      `- Pending + call + no-phone pressure: ${number(m.pending + m.needCall + m.noPhone + m.followUp)}`
    ].join('\n');
  }

  function recommendationAnswer(m) {
    return ['What to do next:', ...recommendations(m).map((item, index) => `${index + 1}. ${item}`)].join('\n');
  }

  function memoryAnswer() {
    const topTopics = Object.entries(memory.topics).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const minutes = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 60000));
    return [
      'AI Memory',
      `Sessions: ${number(memory.sessions)}`,
      `This session: ${minutes} min`,
      `Questions remembered: ${number(memory.questions.length)}`,
      'Top topics:',
      ...(topTopics.length ? topTopics.map(([topic, count]) => `- ${topic}: ${number(count)}`) : ['- No topics yet'])
    ].join('\n');
  }

  function askAI(question) {
    const response = answer(question || 'status');
    console.log(response);
    return response;
  }

  document.addEventListener('click', (event) => {
    const label = event.target.closest('button,a,[data-open-voter]')?.textContent?.trim()?.slice(0, 60);
    if (!label) return;
    memory.clicks[label] = (memory.clicks[label] || 0) + 1;
    saveMemory();
  }, true);

  window.askAI = askAI;
  window.aiLearningSystem = { ask: askAI, metrics, memory: () => memory, reset: () => { localStorage.removeItem(storageKey); memory = loadMemory(); } };
  saveMemory();
  console.info('AI Learning System ready. Try: askAI("Show campaign status")');
})();
