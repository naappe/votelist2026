# Votelist 2026

Static GitHub Pages voter management app for Villimale campaign work. The app uses plain HTML, CSS, JavaScript, Supabase, and GitHub Pages.

## Main Screens

| File | Purpose | Status |
|---|---|---|
| `index.html` | Entry / party selection page | Active |
| `login.html` | Login page | Active |
| `voters.html` | Main voter management workspace | Active |
| `dashboard.html` | Old dashboard URL | Redirects to `voters.html` |
| `shared.html` | No-login self-assign page for friends | Active |
| `all-voters.html` | Old all-voters link | Redirects |
| `zero-day.html` | Old Zero Day page | Redirects |

## Current Structure

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
├── css/
│   ├── style.css
│   ├── dashboard-cleanup.css
│   ├── mobile-modal-fixes.css
│   ├── voter-hotfix.css
│   ├── pro-ui.css
│   ├── voter-list-cards.css
│   ├── voter-popup-card.css
│   └── voters-stats.css
├── js/
│   ├── app.js
│   ├── config.js
│   ├── read-view-public.js
│   ├── read-only-view.js
│   ├── assign-share.js
│   ├── assign-results.js
│   ├── assigned-person-filter.js
│   ├── campaign-arrangement.js
│   ├── dashboard-cleanup.js
│   ├── d2d-count-fix.js
│   ├── house-filter-lock.js
│   ├── house-sync.js
│   ├── no-jump-fixes.js
│   ├── pro-ui.js
│   ├── save-state-fix.js
│   ├── voter-card-statuses.js
│   ├── voter-hotfix.js
│   ├── assign-filter.js
│   ├── dhafthar-force-filter.js
│   ├── house-click-filter.js
│   ├── house-dropdown-group.js
│   ├── voter-final-cleanup.js
│   └── zero-day.js
└── .github/
    └── workflows/
        └── pages.yml
```

## Active JavaScript Ownership

| File | Responsibility |
|---|---|
| `js/app.js` | Main logged-in app: auth, Supabase load, stats, filters, and base rendering. |
| `js/config.js` | Supabase URL/key, table name, login users, shared-page helpers. |
| `js/read-view-public.js` | Allows `view=read` links to pass the app auth check without username/password. |
| `js/read-only-view.js` | Owns public gallery rendering: photo, name, ID, house, and mobile only. |
| `js/assign-share.js` | Creates short public self-assign links and the Copy/Open share panel. |
| `js/assign-results.js` | Adds the admin-only `Assigned Results` button and renders assigned voters. |
| `js/assigned-person-filter.js` | Adds the Assigned Person dropdown inside Assigned Results so admins can identify who took which voters. |
| `js/voter-hotfix.js` | Owns the practical voter popup on Voters: photo, assignment field, status fields, remarks, and save. Loaded before `app.js` so the old popup does not win clicks. |
| `js/no-jump-fixes.js` | Prevents old save/reload behavior and keeps saves from jumping to the top. Loaded before popup/app scripts. |
| `js/dashboard-cleanup.js` | UI polish, share selection tools, modal guard, and top-house helpers. |
| `js/d2d-count-fix.js` | Keeps D2D count labels aligned with D2D status. |
| `js/house-sync.js` | House dropdown, Dhafthar/Sinamale grouping, Top Houses. |
| `js/house-filter-lock.js` | Keeps selected house/search active while filtering or saving. |
| `js/pro-ui.js` | Clean card actions, Assign focus, View Profile button, visible meta cleanup. |
| `js/save-state-fix.js` | Preserves selected filter/search/house/scroll when lists rebuild. |
| `js/voter-card-statuses.js` | Voter card status display cleanup. |

## Legacy / Disabled JavaScript

| File | Current Role |
|---|---|
| `js/voter-final-cleanup.js` | Disabled compatibility shim. |
| `js/dhafthar-force-filter.js` | Disabled compatibility shim. House logic is in `house-sync.js`. |
| `js/house-click-filter.js` | Disabled compatibility shim. Top-house clicks belong to `house-sync.js`. |
| `js/assign-filter.js` | Legacy assignment filter helper. Not currently loaded. |
| `js/house-dropdown-group.js` | Legacy dropdown helper. |
| `js/zero-day.js` | Legacy Zero Day logic. |

## Important Current Behavior

| Feature | Rule |
|---|---|
| Primary workspace | Use `voters.html`. `dashboard.html` immediately redirects there and keeps query parameters. |
| Top navigation | Voters page shows only Voters and Logout, removing the duplicate Dashboard path. |
| Voter popup | Card clicks open the structured assignment popup with photo, assigned person/team input, status fields, D2D, transport, remarks, and save. |
| Assigned Results | Admin can click `Assigned Results`, then filter by Assigned Person to identify who assigned each voter. |
| System email cleanup | `naappe@gmail.com` is treated as a system/default value and should not appear as a real assignee. |
| Share Read View | Opens with `view=read`, requires no username/password, and renders a public gallery. |
| Public gallery details | Public read links show only photo, name, ID, house/address, and mobile. Do not show party, statuses, notes, assignment names, save buttons, or edit popups. |
| Self-assign link | Friends tick/untick voters, then Save asks for name and mobile only when needed. |
| Assignment privacy | Shared assignment links do not show other assignee names. They show only whether a voter is available/assigned/full. |
| Public write access | Public users must not update voter rows directly. Assignment saves go through `claim_assignment` / `unclaim_assignment` only. |
| Save from middle of list | Must not refresh the page or jump to the top. |
| House filter | Must stay selected after saving or changing voter status. |
| Dhafthar/Sinamale | House grouping belongs to `house-sync.js`. |

## Supabase Access Notes

| Item | Current Setup |
|---|---|
| Project | `espezmdpkoixnfchomqb` / `voters` |
| Table | `public.full_import` |
| RLS | Enabled |
| Assignment result columns | `vote_assigned_by` and `vote_assigned_at` in `public.full_import`. |
| Public read links | `anon` can SELECT only the public gallery identity/contact columns plus hidden `party` for party-scoped filtering. |
| Public visible fields | `photo_url`, `name`, `national_id`, `house`, `phone`. |
| Hidden from public UI | Party, campaign statuses, support level, remarks, assignment names, and admin save fields. |
| Public direct updates | Revoked. Anonymous users cannot directly update `full_import`. |
| Public assignment save | Allowed only via `public.claim_assignment(...)` and `public.unclaim_assignment(...)`. |

## Update Log

| Date | Update |
|---|---|
| 2026-07-06 | Made `voters.html` the primary workspace, removed the Dashboard nav button, and changed `dashboard.html` into a redirect to Voters. |
| 2026-07-06 | Added `js/assigned-person-filter.js` so Assigned Results can be filtered by assigned person/team. |
| 2026-07-06 | Reordered Voters scripts so `no-jump-fixes.js` and `voter-hotfix.js` load before `app.js`; the structured assignment popup now wins card clicks. |
| 2026-07-06 | Added Supabase protection so `naappe@gmail.com` is cleaned from assignment results and not treated as a real assignee. |
| 2026-07-06 | Added `js/assign-results.js` so the website shows admin-only assignment results from `vote_assigned_by` / `vote_assigned_at`. |
| 2026-07-06 | Changed `js/read-only-view.js` into a public voter gallery showing photo, name, ID, house, and mobile only. |
| 2026-07-06 | Updated Supabase public grants so anon can read mobile for public gallery links, while campaign/status fields and direct public row updates are blocked. |
| 2026-07-06 | Added `js/read-view-public.js` so Share Read View links open without login while staying public-only. |
| 2026-07-06 | Removed `js/top-house-stabilizer.js` from dashboard/voters script tags to avoid conflicts. |
| 2026-07-06 | Limited `js/save-state-fix.js` restore attempts to 3 tries max. |
| 2026-07-06 | Changed `js/pro-ui.js` scheduling to `requestAnimationFrame` instead of timer-style enhancement. |
| 2026-07-06 | Removed duplicate bottom voter-card result row while keeping the status chips. |
| 2026-07-06 | Added public self-assign flow with short links, name/mobile validation, tick/untick, and privacy rules. |
| 2026-07-05 | Organized CSS into `css/` and JavaScript into `js/`. |

## Rules For Future Updates

| Feature Area | Put Logic Here |
|---|---|
| Main data, stats, and filters | `js/app.js` |
| Voter popup assignment/save | `js/voter-hotfix.js` plus `js/no-jump-fixes.js` |
| Public read-only links | `js/read-view-public.js` and `js/read-only-view.js` |
| Admin assignment results | `js/assign-results.js` and `js/assigned-person-filter.js` |
| House dropdown, Dhafthar/Sinamale, Top Houses | `js/house-sync.js` |
| House/filter/scroll after save | `js/house-filter-lock.js` and `js/save-state-fix.js` |
| Self-assign links | `js/assign-share.js` and `shared.html` |
| Voter card actions and visual cleanup | `js/pro-ui.js` and `css/voter-list-cards.css` |
| Popup card layout | `css/voter-popup-card.css` |

Do not add a second owner for save, filter, house grouping, voter-card rendering, public gallery rendering, or assigned result rendering. Update this README after important changes.

## Deployment

GitHub Pages deploys from `.github/workflows/pages.yml`. If GitHub shows `Deployment failed, try again later`, rerun the latest failed Pages job after one or two minutes.
