# Votelist 2026

Static GitHub Pages voter dashboard for Villimale campaign work.

## Live Pages

- `index.html` - party selection / entry page
- `dashboard.html` - dashboard numbers, filters, top houses and voter work list
- `voters.html` - voter management view using the same dashboard engine
- `login.html` - login page
- `shared.html` - no-login shared assignment card/list page

## Core App Files

- `app.js` - main dashboard engine, Supabase load/save, filters and modal logic
- `config.js` - Supabase configuration and login user mapping
- `style.css` - main layout and design system

## Feature Scripts

- `assign-filter.js` - Assign count/filter card and Assign To popup field
- `assign-share.js` - selected voter assignment share links
- `campaign-arrangement.js` - simplified campaign popup controls
- `dashboard-cleanup.js` - dashboard polish, read-only links, Dhafthar handling and helper UI
- `dhafthar-force-filter.js` - Dhafthar house search/filter support
- `house-click-filter.js` - top-house click behavior
- `house-dropdown-group.js` - house dropdown grouping
- `voter-final-cleanup.js` - final voter card/list cleanup behavior
- `voter-hotfix.js` - voter page fixes loaded after the main app

## CSS Fix Layers

- `dashboard-cleanup.css` - dashboard cleanup styling
- `mobile-modal-fixes.css` - mobile modal behavior and layout fixes
- `voter-hotfix.css` - voter page hotfix styling

## Legacy / Special Pages

- `all-voters.html` - older all-voters dashboard page kept for compatibility
- `zero-day.html` and `zero-day.js` - voting-day priority view kept for compatibility

## Deployment

GitHub Pages deploys from `.github/workflows/pages.yml`.

The workflow uploads the static repository files and deploys with `actions/deploy-pages@v5`. Older in-progress deploys are cancelled so a stale commit does not deploy after a newer push.
