# Votelist 2026

Static GitHub Pages voter management app for Villimale campaign work. The app is built with plain HTML, CSS, JavaScript, Supabase, and GitHub Pages.

## Quick Summary

This project has three main user flows:

1. Admin opens the dashboard, filters voters, edits voter status, assigns people, and creates share links.
2. Friends open a public self-assign link, tick voters they will call, write their name and mobile, then save.
3. Voters and house groups can be filtered by status, house, search text, Dhafthar, Sinamale, and assignment state.

## Live Pages

| File | Purpose | Status |
|---|---|---|
| `index.html` | Entry / party selection page | Active |
| `login.html` | Login page | Active |
| `dashboard.html` | Main analytics dashboard | Active |
| `voters.html` | Full voter management page | Active |
| `shared.html` | No-login self-assign link page | Active |
| `all-voters.html` | Old all-voters link | Redirects to dashboard |
| `zero-day.html` | Old Zero Day page | Redirects to voters |

## Current Folder Structure

```text
votelist2026/
├── index.html
├── login.html
├── dashboard.html
├── voters.html
├── shared.html
├── all-voters.html
├── zero-day.html
├── README.md
│
├── css/
│   ├── style.css
│   ├── dashboard-cleanup.css
│   ├── mobile-modal-fixes.css
│   ├── voter-hotfix.css
│   └── pro-ui.css
│
├── js/
│   ├── app.js
│   ├── config.js
│   ├── assign-share.js
│   ├── campaign-arrangement.js
│   ├── dashboard-cleanup.js
│   ├── d2d-count-fix.js
│   ├── house-filter-lock.js
│   ├── house-sync.js
│   ├── pro-ui.js
│   ├── save-state-fix.js
│   ├── voter-hotfix.js
│   │
│   ├── assign-filter.js
│   ├── dhafthar-force-filter.js
│   ├── house-click-filter.js
│   ├── house-dropdown-group.js
│   ├── voter-final-cleanup.js
│   └── zero-day.js
│
└── .github/
    └── workflows/
        └── pages.yml
```

## Active JavaScript Map

| File | Responsibility |
|---|---|
| `js/app.js` | Main logged-in dashboard engine: auth check, Supabase load, stats, filters, voter modal, and save logic. |
| `js/config.js` | Supabase URL/key, table name, login user mapping, shared-page scroll/filter guard. |
| `js/assign-share.js` | Creates short public self-assign links through `assignment_shares` and shows a Copy/Open link panel. |
| `js/campaign-arrangement.js` | Campaign popup/control helper layer. |
| `js/dashboard-cleanup.js` | UI polish, share selection tools, modal guard, top-house presentation helpers. |
| `js/d2d-count-fix.js` | Keeps D2D counts aligned with current D2D status logic. |
| `js/house-filter-lock.js` | Keeps selected house locked when status filters or saves rebuild the list. |
| `js/house-sync.js` | Single source of truth for house dropdown, Dhafthar/Sinamale grouping, and Top Houses. |
| `js/pro-ui.js` | Professional voter card actions: one Assign button and View Profile button per card. |
| `js/save-state-fix.js` | Preserves active house/search/filter and scroll position after saving, including list rebuilds and accidental full-page reloads. |
| `js/voter-hotfix.js` | Small voter page hotfixes. |

## Legacy / Disabled JavaScript

These files remain only so old script tags or old links do not break. They should not own new behavior.

| File | Current Role |
|---|---|
| `js/voter-final-cleanup.js` | Disabled compatibility shim. Old card/save cleanup was stopped because it conflicted with `app.js` and `pro-ui.js`. |
| `js/dhafthar-force-filter.js` | Disabled compatibility shim. Dhafthar logic now belongs to `house-sync.js`. |
| `js/house-click-filter.js` | Disabled compatibility shim. Top-house clicks now belong to `house-sync.js`. |
| `js/assign-filter.js` | Legacy assignment filter helper. Do not add new logic here unless it is formally reconnected. |
| `js/house-dropdown-group.js` | Legacy house dropdown helper. Current grouping is in `house-sync.js`. |
| `js/zero-day.js` | Legacy Zero Day logic. `zero-day.html` now redirects to `voters.html`. |

## Active CSS Map

| File | Responsibility |
|---|---|
| `css/style.css` | Main layout, dashboard, cards, forms, modal, theme. |
| `css/dashboard-cleanup.css` | Dashboard polish and helper UI styling. |
| `css/mobile-modal-fixes.css` | Mobile popup and responsive fixes. |
| `css/voter-hotfix.css` | Voter page specific fixes. |
| `css/pro-ui.css` | Professional profile-card voter theme, Assign/View actions, and matching profile-style modal photo/card spacing. |

## Supabase Map

| Item | Purpose |
|---|---|
| Project | `espezmdpkoixnfchomqb` |
| Main table | `full_import` |
| Share table | `assignment_shares` |
| Public RPC | `claim_assignment` |
| Public RPC | `unclaim_assignment` |

Main voter fields used by the app:

```text
id, image_number, photo_url, name, national_id, house, lives_in, phone,
party, election_box, phone_status, reach_status, vote_status,
transport_status, d2d_status, remarks, support_level,
vote_assigned_by, vote_assigned_at
```

## Important Current Behavior

| Feature | Current Rule |
|---|---|
| House dropdown | Controlled by `house-sync.js`; selected house is locked by `house-filter-lock.js` while filtering/saving. |
| Top Houses | Shows only focused groups like Dhafthar and Sinamale on the voters page. |
| Dhafthar grouping | Detects Dhafthar, DH R, No DH R, No RS, RS No, DF, and similar text. |
| Popup voter photo | `pro-ui.css` uses a larger circular profile photo inside a soft white modal card for easier identification. |
| Voter card spacing | `pro-ui.css` uses a profile-card theme with larger circular photos, centered text, soft gray page spacing, footer action buttons, and Pick share checkboxes. |
| Voter card meta | `pro-ui.js` cleans the visible card and popup text to `house · phone`, hiding helper text like `(Box 392 | Villimale'-2)` without changing saved data. |
| Save after house filter | `save-state-fix.js` and `house-filter-lock.js` restore selected house/search/filter after saving. |
| Save from All voters | `save-state-fix.js` restores the saved voter card or previous scroll after the list rebuilds, so middle-list saves do not jump to the top. |
| Save after assign filter | `save-state-fix.js` restores Assign/filter view and scroll position after saving. |
| Self assign page | Friends tick/untick voters, write name/mobile only when needed, then save. |
| Assignment privacy | Public shared links do not show other assignee names. They only show private assignment status/count. |
| Assignment limit | Up to 3 assignees can be attached to one voter. |
| Unassign | A friend can untick their own saved voter using their mobile number. |
| Legacy pages | `all-voters.html` and `zero-day.html` redirect to current screens. |

## Assignment Share Flow

1. Admin filters voters on `dashboard.html` or `voters.html`.
2. Admin picks voters with small Pick checkboxes, or uses Create Self-Assign Link for the current visible list.
3. `assign-share.js` saves a short payload in Supabase `assignment_shares`.
4. Admin uses the Copy Link or Open Link button from the share panel.
5. Friend opens `shared.html?s=TOKEN`.
6. Friend searches/filters, ticks voters, writes name and mobile, then saves.
7. Supabase RPC appends that person to `vote_assigned_by` without exposing other assigners publicly.

## Update Log

| Date | Update |
|---|---|
| 2026-07-06 | Cleaned voter card/popup meta to hide bracket helper text and extended the profile-card theme to the voter popup. |
| 2026-07-06 | Applied profile-card voter theme inspired by the reference: larger circular photos, centered typography, softer spacing, and footer action buttons. |
| 2026-07-06 | Cleaned voter card spacing and share-link UX: share checkboxes now say Pick, long names wrap, and self-assign links show Copy/Open buttons. |
| 2026-07-06 | Fixed All voters save position: `save-state-fix.js` syntax was repaired and cache keys were bumped to restore same-card scroll after save. |
| 2026-07-06 | Changed Pages workflow concurrency to queue deployments instead of cancelling in-progress Pages deploys. |
| 2026-07-06 | Added `house-filter-lock.js` so selected house stays locked when choosing status filters or saving voter status. |
| 2026-07-06 | Increased popup voter photo to medium gallery size in `pro-ui.css` and bumped CSS cache keys. |
| 2026-07-06 | Persisted `save-state-fix.js` state in sessionStorage so house/filter/scroll can recover even if the browser refreshes during save. |
| 2026-07-06 | Bumped `save-state-fix.js` cache key to `v=20260706-2` on `dashboard.html` and `voters.html`. |
| 2026-07-06 | Strengthened `save-state-fix.js` so it watches voter-list rebuilds and restores house/filter/scroll after save. |
| 2026-07-06 | Added `save-state-fix.js` to stop saving from jumping to top or resetting house/filter to All. |
| 2026-07-06 | Busted cache for disabled legacy scripts in `dashboard.html` and `voters.html`. |
| 2026-07-06 | Disabled `voter-final-cleanup.js` because it was intercepting voter saves and conflicting with the new UI. |
| 2026-07-06 | Disabled `dhafthar-force-filter.js` and `house-click-filter.js`; `house-sync.js` is now the house source of truth. |
| 2026-07-06 | Redirected `zero-day.html` to `voters.html`. |
| 2026-07-06 | Strengthened shared assignment privacy: public links do not show other assignee names. |
| 2026-07-06 | Added public self-assign flow with tick/untick, name/mobile validation, and unassign by mobile. |
| 2026-07-05 | Organized CSS into `css/` and JavaScript into `js/`. |
| 2026-07-05 | Added professional UI layer for cleaner voter cards, Assign action, and popup spacing. |

## Rules For Future Updates

Before adding a new script, check if one of these already owns the feature:

| Feature Area | Put Logic Here |
|---|---|
| Dashboard data, stats, voter modal save | `js/app.js` |
| House dropdown, Dhafthar/Sinamale, Top Houses | `js/house-sync.js` |
| House + status lock after save/filter | `js/house-filter-lock.js` |
| Self-assign links | `js/assign-share.js` and `shared.html` |
| Keep filters/scroll after save | `js/save-state-fix.js` |
| Card buttons and professional UI layer | `js/pro-ui.js` |
| Visual styling | `css/style.css` or `css/pro-ui.css` |

Do not re-add behavior into disabled legacy files unless the README is updated and the old behavior is intentionally reactivated.

## Copy-Ready Prompt For Future Work

Use this prompt when asking for another update:

```text
Project: naappe/votelist2026
Hosting: GitHub Pages
Backend: Supabase project espezmdpkoixnfchomqb, table full_import

Important structure:
- dashboard.html and voters.html are the logged-in active screens.
- shared.html is the no-login self-assign page.
- js/app.js owns main dashboard load, filters, modal save, and Supabase updates.
- js/house-sync.js owns house dropdown, Dhafthar/Sinamale grouping, and Top Houses.
- js/house-filter-lock.js keeps selected house active when status filters or saves rebuild the voter list.
- js/assign-share.js owns short assignment share links and Copy/Open share panel.
- js/save-state-fix.js preserves selected house/filter/scroll after save, including list rebuilds and accidental full-page reloads.
- js/pro-ui.js owns clean card buttons, Assign focus, and display-only meta cleanup; css/pro-ui.css owns the profile-card voter theme, large circular card photos, modal photo/card styling, and spacing.
- voter-final-cleanup.js, dhafthar-force-filter.js, and house-click-filter.js are disabled shims.

When changing the app:
1. Do not create duplicate filter/save logic.
2. Keep house logic in house-sync.js.
3. Keep house + status lock working after every save.
4. Keep save state preservation working after every save.
5. Keep public assignment links private: do not show other assignee names.
6. Update README.md with every important change.
```

## Deployment

GitHub Pages deploys from `.github/workflows/pages.yml`.

The workflow uploads the static repository files and deploys with GitHub Pages. Deployments are queued instead of cancelled so rapid commits do not interrupt an in-progress Pages deployment. If GitHub still reports `Deployment failed, try again later`, rerun the latest failed job after one or two minutes.
