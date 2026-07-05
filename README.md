# Votelist 2026

Static GitHub Pages voter dashboard for Villimale campaign work.

## Current UI Status

The voter management screens now use a staged professional UI layer:

- `css/pro-ui.css` improves the stats, voter cards, Assign action, and popup spacing.
- `js/pro-ui.js` keeps one clear Assign action per voter card and focuses the assignment field when Assign is clicked.
- `js/assign-filter.js` is legacy and is not loaded by `dashboard.html` or `voters.html`.
- `js/voter-final-cleanup.js` is still active for D2D cleanup and special vote-status saves. It preserves the visible Assign field instead of auto-stamping the logged-in email.

## Cleanup Roadmap

The project is being cleaned in safe stages so GitHub Pages stays working:

1. Keep the active pages stable: `dashboard.html`, `voters.html`, `login.html`, `shared.html`, and `index.html`.
2. Keep active helpers loaded only where needed: `app.js`, `config.js`, `assign-share.js`, `campaign-arrangement.js`, `dhafthar-force-filter.js`, `dashboard-cleanup.js`, `house-dropdown-group.js`, `house-click-filter.js`, `pro-ui.js`, `voter-final-cleanup.js`, and `voter-hotfix.js`.
3. Treat `assign-filter.js`, `all-voters.html`, and `zero-day.html` as legacy until their behavior is either merged or formally removed.
4. Future consolidation target:
   - assignment helpers -> `js/features/assignments.js`
   - house/search filters -> `js/features/filters.js`
   - cleanup utilities -> `js/utils/helpers.js`

## File Structure

```text
votelist2026/
│
├── 📄 index.html              # Party selection / entry page
├── 📄 dashboard.html          # Main dashboard with filters & voter list
├── 📄 voters.html             # Full voter management view
├── 📄 login.html              # Login page
├── 📄 shared.html             # No-login shared assignment view
├── 📄 all-voters.html         # Legacy all-voters dashboard
├── 📄 zero-day.html           # Legacy voting-day priority view
│
├── 📁 css/
│   ├── style.css              # Main design system & layout
│   ├── dashboard-cleanup.css  # Dashboard polish & helper UI
│   ├── mobile-modal-fixes.css # Mobile responsiveness fixes
│   ├── voter-hotfix.css       # Voter page hotfix styling
│   └── pro-ui.css             # Professional voter card & popup layer
│
├── 📁 js/
│   ├── app.js                 # Main dashboard engine
│   ├── config.js              # Supabase config & user mapping
│   ├── assign-filter.js       # Legacy assignment filter helper
│   ├── assign-share.js        # Voter assignment share links
│   ├── campaign-arrangement.js # Campaign popup controls
│   ├── dashboard-cleanup.js   # Dashboard polish & helper UI
│   ├── dhafthar-force-filter.js # Dhafthar house search/filter
│   ├── house-click-filter.js  # Top-house click behavior
│   ├── house-dropdown-group.js # House dropdown grouping
│   ├── pro-ui.js              # Professional card actions & assign focus
│   ├── voter-final-cleanup.js # Voter card/list cleanup
│   ├── voter-hotfix.js        # Voter page fixes
│   └── zero-day.js            # Legacy zero-day logic
│
├── 📁 .github/
│   └── workflows/
│       └── pages.yml          # GitHub Pages deployment workflow
│
└── 📄 README.md               # Project documentation
```

## Deployment

GitHub Pages deploys from `.github/workflows/pages.yml`.

The workflow uploads the static repository files and deploys with `actions/deploy-pages@v5`. Older in-progress deploys are cancelled so a stale commit does not deploy after a newer push.
