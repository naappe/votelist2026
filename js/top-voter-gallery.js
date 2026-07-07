(function () {
  if (document.body.dataset.view !== 'management') return;

  const maxItems = 24;
  let timer = 0;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  function boot() {
    installStyles();
    ensureGallery();
    renderGallery();

    const list = document.getElementById('voterList');
    if (list) new MutationObserver(schedule).observe(list, { childList: true, subtree: false });
    document.addEventListener('input', (event) => {
      if (event.target?.id === 'searchInput') schedule();
    }, true);
    document.addEventListener('change', (event) => {
      if (event.target?.id === 'houseSelect') schedule();
    }, true);
    window.addEventListener('assign-results-rendered', schedule);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(renderGallery, 100);
  }

  function ensureGallery() {
    if (document.getElementById('topVoterGallery')) return;
    const searchPanel = document.querySelector('[aria-label="Search voters"]');
    const panel = document.createElement('section');
    panel.id = 'topVoterGallery';
    panel.className = 'panel top-voter-gallery';
    panel.setAttribute('aria-label', 'Voter photo gallery');
    panel.innerHTML = `
      <div class="top-gallery-head">
        <div>
          <p class="eyebrow">Quick Voter View</p>
          <h2>Photo Gallery</h2>
        </div>
        <span id="topGalleryCount">Loading...</span>
      </div>
      <div id="topGalleryTrack" class="top-gallery-track" role="list"></div>
    `;
    if (searchPanel) searchPanel.after(panel);
    else document.querySelector('.page')?.prepend(panel);

    panel.addEventListener('click', (event) => {
      const item = event.target.closest('[data-gallery-open]');
      if (!item) return;
      event.preventDefault();
      openVoterCard(item.dataset.galleryOpen);
    });
  }

  function renderGallery() {
    const panel = ensurePanel();
    if (!panel) return;
    const track = document.getElementById('topGalleryTrack');
    const count = document.getElementById('topGalleryCount');
    if (!track || !count) return;

    const cards = currentCards();
    count.textContent = cards.length ? `${cards.length} visible` : 'Waiting for voters';
    track.innerHTML = cards.length
      ? cards.slice(0, maxItems).map(galleryCard).join('')
      : '<div class="top-gallery-empty">Voter photos will show here after the list loads.</div>';
  }

  function ensurePanel() {
    ensureGallery();
    return document.getElementById('topVoterGallery');
  }

  function currentCards() {
    return Array.from(document.querySelectorAll('#voterList .voter-card[data-open-voter]'))
      .filter((card) => !card.hidden && !card.classList.contains('url-filter-hidden'));
  }

  function galleryCard(card) {
    const id = card.dataset.openVoter || '';
    const name = clean(card.querySelector('h3')?.textContent) || 'Voter';
    const meta = clean(card.querySelector('.voter-info p')?.textContent) || '';
    const house = clean(meta.split('·')[0]) || 'No house';
    const img = card.querySelector('.voter-photo img');
    const photo = img?.getAttribute('src')
      ? `<img src="${esc(img.getAttribute('src'))}" alt="${esc(name)}" loading="lazy">`
      : `<span>${esc(initials(name))}</span>`;

    return `
      <button class="top-gallery-card" type="button" role="listitem" data-gallery-open="${esc(id)}">
        <span class="top-gallery-photo">${photo}</span>
        <strong>${esc(name)}</strong>
        <small>${esc(house)}</small>
      </button>
    `;
  }

  function openVoterCard(id) {
    if (!id) return;
    const card = document.querySelector(`#voterList .voter-card[data-open-voter="${cssEscape(id)}"]`);
    if (!card) return;
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }

  function initials(name) {
    return clean(name).split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '?';
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function installStyles() {
    if (document.getElementById('topVoterGalleryStyles')) return;
    const style = document.createElement('style');
    style.id = 'topVoterGalleryStyles';
    style.textContent = `
      .top-voter-gallery{margin:0 0 14px!important;padding:14px!important}
      .top-gallery-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.top-gallery-head h2{margin:0!important;font-size:20px!important;line-height:1.1!important}.top-gallery-head p{margin:0 0 3px!important}.top-gallery-head span{display:inline-flex;min-height:28px;align-items:center;border:1px solid #dbeafe;border-radius:999px;background:#eff6ff;color:#1d4ed8;padding:5px 10px;font-size:12px;font-weight:900;white-space:nowrap}
      .top-gallery-track{display:flex;gap:10px;overflow-x:auto;overscroll-behavior-x:contain;padding:2px 2px 8px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}.top-gallery-track::-webkit-scrollbar{height:6px}.top-gallery-track::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:999px}
      .top-gallery-card{flex:0 0 92px;scroll-snap-align:start;display:grid;gap:6px;justify-items:center;min-height:132px;border:1px solid #e4e7ec;border-radius:14px;background:#fff;padding:8px;color:#101828;text-align:center;box-shadow:0 10px 24px rgba(15,23,42,.06);cursor:pointer}.top-gallery-card:active{transform:scale(.98)}
      .top-gallery-photo{width:70px;height:76px;border-radius:12px;overflow:hidden;border:1px solid #e4e7ec;background:#eef4ff;display:grid;place-items:center;color:#1d4ed8;font-size:20px;font-weight:950}.top-gallery-photo img{width:100%;height:100%;object-fit:cover;display:block}
      .top-gallery-card strong{width:100%;font-size:12px;line-height:1.15;font-weight:900;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.top-gallery-card small{width:100%;color:#667085;font-size:10px;line-height:1.15;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.top-gallery-empty{min-width:100%;padding:14px;color:#667085;font-size:13px;font-weight:800;text-align:center;border:1px dashed #d0d5dd;border-radius:12px;background:#f8fafc}
      @media(max-width:760px){.top-voter-gallery{padding:12px!important;margin-bottom:12px!important}.top-gallery-card{flex-basis:84px;min-height:126px}.top-gallery-photo{width:64px;height:72px}.top-gallery-head h2{font-size:18px!important}}
    `;
    document.head.appendChild(style);
  }
})();