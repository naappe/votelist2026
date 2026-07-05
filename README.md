# Votelist 2026

Static GitHub Pages voter dashboard for Villimale campaign work.

## File Map

```text
votelist2026/
├── index.html              # Party selection / entry page
├── dashboard.html          # Main dashboard with filters & voter list
├── voters.html             # Full voter management view
├── login.html              # Login page
├── shared.html             # No-login shared assignment view
├── all-voters.html         # Legacy all-voters dashboard redirect
├── zero-day.html           # Legacy voting-day priority view
├── css/
│   ├── style.css              # Main design system & layout
│   ├── dashboard-cleanup.css  # Dashboard polish & helper UI
│   ├── mobile-modal-fixes.css # Mobile responsiveness fixes
│   └── voter-hotfix.css       # Voter page hotfix styling
├── js/
│   ├── app.js                  # Main dashboard engine
│   ├── config.js               # Supabase config & user mapping
│   ├── assign-filter.js        # Assignment count/filter logic
│   ├── assign-share.js         # Voter assignment share links
│   ├── campaign-arrangement.js # Campaign popup controls
│   ├── dashboard-cleanup.js    # Dashboard polish & helper UI
│   ├── dhafthar-force-filter.js # Dhafthar house search/filter
│   ├── house-click-filter.js   # Top-house click behavior
│   ├── house-dropdown-group.js # House dropdown grouping
│   ├── voter-final-cleanup.js  # Voter card/list cleanup
│   ├── voter-hotfix.js         # Voter page fixes
│   └── zero-day.js             # Legacy zero-day logic
├── .github/
│   └── workflows/
│       └── pages.yml           # GitHub Pages deployment workflow
└── README.md                   # Project documentation
```

## Deployment

GitHub Pages deploys from `.github/workflows/pages.yml`.

The workflow uploads the static repository files and deploys with `actions/deploy-pages@v5`. Older in-progress deploys are cancelled so a stale commit does not deploy after a newer push.
