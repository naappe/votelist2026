document.addEventListener('DOMContentLoaded', async function () {
  const params = new URLSearchParams(location.search);
  const party = (params.get('party') || 'PNC').toUpperCase();
  const cfg = window.APP_CONFIG || {};
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  const status = document.getElementById('status');
  const list = document.getElementById('list');
  const total = document.getElementById('total');
  const partyName = document.getElementById('partyName');
  if (partyName) partyName.textContent = party === 'ALL' ? 'All' : party;
  const nav = document.getElementById('nav');
  if (nav) {
    nav.innerHTML = '<a class="btn active" href="residents.html?party=' + party + '&v=loader1">Residents</a><a class="btn" href="assign.html?party=' + party + '&v=loader1">Assign</a><a class="btn" href="call.html?party=' + party + '&v=loader1">Calls</a><a class="btn" href="vote.html?party=' + party + '&v=loader1">Votes</a><a class="btn" href="d2d.html?party=' + party + '&v=loader1">Visits</a><a class="btn" href="transport.html?party=' + party + '&v=loader1">Transport</a><a class="btn" href="ai-dashboard.html?party=' + party + '&v=loader1">Insights</a>';
  }
  if (status) status.textContent = 'Loading residents...';
  let query = client.from('campaign').select('id,name,national_id,house,phone,party,election_box,photo_url,vote_status,phone_status,reach_status').limit(1000);
  if (party !== 'ALL') query = query.eq('party', party);
  const result = await query;
  if (result.error) {
    if (status) { status.textContent = 'Supabase error: ' + result.error.message; status.className = 'status error'; }
    return;
  }
  const rows = result.data || [];
  if (total) total.textContent = rows.length.toLocaleString('en-US');
  const will = document.getElementById('will'); if (will) will.textContent = rows.filter(r => r.vote_status === 'will-vote').length.toLocaleString('en-US');
  const notvote = document.getElementById('notvote'); if (notvote) notvote.textContent = rows.filter(r => r.vote_status === 'no-vote').length.toLocaleString('en-US');
  const pending = document.getElementById('pending'); if (pending) pending.textContent = rows.filter(r => r.reach_status === 'reached' && r.vote_status !== 'will-vote' && r.vote_status !== 'no-vote').length.toLocaleString('en-US');
  const need = document.getElementById('need'); if (need) need.textContent = rows.filter(r => r.reach_status !== 'reached' || r.phone_status === 'need-call').length.toLocaleString('en-US');
  const sectionTotal = document.getElementById('sectionTotal'); if (sectionTotal) sectionTotal.textContent = rows.length.toLocaleString('en-US') + ' residents';
  if (status) status.textContent = 'Loaded ' + rows.length.toLocaleString('en-US') + ' residents.';
  if (list) {
    list.innerHTML = '';
    rows.forEach(function (r) {
      const card = document.createElement('article');
      card.className = 'resident-card';
      const photo = document.createElement('div');
      photo.className = 'photo';
      if (r.photo_url) {
        const img = document.createElement('img');
        img.src = r.photo_url;
        img.alt = '';
        photo.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'ph';
        ph.textContent = String(r.name || '?').slice(0, 1);
        photo.appendChild(ph);
      }
      const info = document.createElement('div');
      info.className = 'info';
      const h = document.createElement('h3');
      h.textContent = r.name || 'Unknown';
      const p = document.createElement('p');
      p.textContent = (r.house || '-') + ' · Box ' + (r.election_box || '-') + ' · ' + (r.phone || 'No phone');
      const chips = document.createElement('div');
      chips.className = 'chips';
      [r.party || '-', r.vote_status || 'pending', r.phone_status || 'need-call', r.reach_status || 'not-reached'].forEach(function (x) {
        const s = document.createElement('span');
        s.textContent = x;
        chips.appendChild(s);
      });
      info.appendChild(h); info.appendChild(p); info.appendChild(chips);
      card.appendChild(photo); card.appendChild(info);
      list.appendChild(card);
    });
  }
});