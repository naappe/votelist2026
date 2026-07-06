# Votelist 2026

Static GitHub Pages voter management app for Villimale campaign work. The app uses plain HTML, CSS, JavaScript, Supabase, and GitHub Pages.

## Main Screens

| File | Purpose | Status |
|---|---|---|
| `index.html` | Entry / party selection page | Active |
| `login.html` | Login page | Active |
| `dashboard.html` | Main analytics dashboard | Active |
| `voters.html` | Full voter management page | Active |
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
│   ├── campaign-arrangement.js
│   ├── dashboard-cleanup.js
│   ├── d2d-count-fix.js
│   ├── house-filter-lock.js
│   ├── house-sync.js
│   ├── no-jump-fixes.js
│   ├── pro-ui.js
│   ├── save-state-fix.js
│   ├── voter-card-statuses.js
│   ├── assign-filter.js
│   ├── dhafthar-force-filter.js
│   ├── house-click-filter.js
│   ├── house-dropdown-group.js
│   ├── voter-final-cleanup.js
│   ├── voter-hotfix.js
│   └── zero-day.js
└── .github/
    └── workflows/
        └── pages.yml
```

## Active JavaScript Ownership

| File | Responsibility |
|---|---|
| `js/app.js` | Main logged-in app: auth, Supabase load, stats, filters, voter modal, and save logic. |
| `js/config.js` | Supabase URL/key, table name, login users, shared-page helpers. |
| `js/read-view-public.js` | Allows `view=read` dashboard/voters links to pass the app auth check without username/password. |
| `js/read-only-view.js` | Owns public gallery rendering: photo, name, ID, house, and mobile only; no party/status/edit fields. |
| `js/assign-share.js` | Creates short public self-assign links and the Copy/Open share panel. |
| `js/dashboard-cleanup.js` | UI polish, share selection tools, modal guard, and top-house helpers. Its old startup interval has been removed. |
| `js/d2d-count-fix.js` | Keeps D2D count labels aligned with D2D status. |
| `js/house-sync.js` | House dropdown, Dhafthar/Sinamale grouping, Top Houses. |
| `js/house-filter-lock.js` | Keeps selected house/search active while filtering or saving. |
| `js/no-jump-fixes.js` | Removes late old Assign stats and prevents old save/reload behavior if legacy code appears. |
| `js/pro-ui.js` | Clean card actions, Assign focus, View Profile button, visible meta cleanup; scheduled with `requestAnimationFrame`, not intervals. |
| `js/save-state-fix.js` | Preserves selected filter/search/house/scroll when lists rebuild, capped at 3 restore attempts. |
| `js/voter-card-statuses.js` | Voter card status display cleanup. |

## Legacy / Disabled JavaScript

| File | Current Role |
|---|---|
| `js/voter-hotfix.js` | Legacy popup/save layer. Not loaded by `dashboard.html` or `voters.html` because it caused the duplicate old popup. |
| `js/voter-final-cleanup.js` | Disabled compatibility shim. |
| `js/dhafthar-force-filter.js` | Disabled compatibility shim. House logic is in `house-sync.js`. |
| `js/house-click-filter.js` | Disabled compatibility shim. Top-house clicks belong to `house-sync.js`. |
| `js/assign-filter.js` | Legacy assignment filter helper. Not currently loaded. |
| `js/house-dropdown-group.js` | Legacy dropdown helper. |
| `js/zero-day.js` | Legacy Zero Day logic. |

## Important Current Behavior

| Feature | Rule |
|---|---|
| Share Read View | Opens with `view=read`, requires no username/password, and renders a public gallery. |
| Public gallery details | Public read links show only photo, name, ID, house/address, and mobile. Do not show party, statuses, notes, assignment names, save buttons, or edit popups. |
| Public gallery filters | Public users can search by name, ID, house, or mobile and filter by house/address. |
| Self-assign link | Friends tick/untick voters, then Save asks for name and mobile only when needed. |
| Assignment privacy | Shared assignment links do not show other assignee names. They show only whether a voter is available/assigned/full. |
| Public write access | Public users must not update voter rows directly. Assignment saves go through `claim_assignment` / `unclaim_assignment` only. |
| Public username | Do not map `public` to the admin email. A `public` login must use a separate Supabase user and a non-edit role. Public share links should normally stay no-login. |
| Voter card chips | Logged-in app keeps chips such as Reached, Will Vote, Need Call, Normal. |
| Duplicate popup | `voter-hotfix.js` must stay unloaded from dashboard/voters to prevent the old Phone/Call/Reach/Party popup. |
| Bottom duplicate result row | Removed from voter cards. Do not re-add duplicate Will Vote at the bottom. |
| Voters stats | Do not inject Assign stat late after page load; it causes layout jump. Duplicate old Assign stats are hidden by `voters-stats.css` and removed by `no-jump-fixes.js`. |
| Save from middle of list | Must not refresh the page or jump to the top. |
| House filter | Must stay selected after saving or changing voter status. |
| Dhafthar/Sinamale | House grouping belongs to `house-sync.js`. |

## Supabase Access Notes

| Item | Current Setup |
|---|---|
| Project | `espezmdpkoixnfchomqb` / `voters` |
| Table | `public.full_import` |
| RLS | Enabled |
| Public read links | `anon` can SELECT only the public gallery identity/contact columns plus hidden `party` for party-scoped filtering. |
| Public visible fields | `photo_url`, `name`, `national_id`, `house`, `phone`. |
| Hidden from public UI | Party, campaign statuses, support level, remarks, assignment names, and admin save fields. |
| Public direct updates | Revoked. Anonymous users cannot directly update `full_import`. |
| Public assignment save | Allowed only via `public.claim_assignment(...)` and `public.unclaim_assignment(...)`. |

## Update Log

| Date | Update |
|---|---|
| 2026-07-06 | Changed `js/read-only-view.js` into a public voter gallery showing photo, name, ID, house, and mobile only. |
| 2026-07-06 | Updated Supabase public grants so anon can read mobile for public gallery links, while campaign/status fields and direct public row updates are blocked. |
| 2026-07-06 | Added `js/read-only-view.js` for no-login read-only links. |
| 2026-07-06 | Removed `js/voter-hotfix.js` from dashboard/voters script tags to stop the duplicate old popup. |
| 2026-07-06 | Removed the old `dashboard-cleanup.js` startup interval and kept valid `party` dashboard links from being stripped. |
| 2026-07-06 | Bumped `js/dashboard-cleanup.js` to `v=20260706-27` on dashboard/voters. |
| 2026-07-06 | Added `js/read-view-public.js` so Share Read View links open without login while staying public-only. |
| 2026-07-06 | Removed `js/top-house-stabilizer.js` from dashboard/voters script tags to avoid conflicts. |
| 2026-07-06 | Limited `js/save-state-fix.js` restore attempts to 3 tries max. |
| 2026-07-06 | Bumped `css/pro-ui.css` to `v=20260706-11` on dashboard/voters. |
| 2026-07-06 | Changed `js/pro-ui.js` scheduling to `requestAnimationFrame` instead of timer-style enhancement. |
| 2026-07-06 | Updated `css/voters-stats.css` to hide duplicate old Assign stats and keep the stats strip stable. |
| 2026-07-06 | Removed duplicate bottom voter-card result row while keeping the status chips. |
| 2026-07-06 | Added public self-assign flow with short links, name/mobile validation, tick/untick, and privacy rules. |
| 2026-07-05 | Organized CSS into `css/` and JavaScript into `js/`. |

## Rules For Future Updates

| Feature Area | Put Logic Here |
|---|---|
| Main data, stats, filters, modal save | `js/app.js` |
| Public read-only dashboard links | `js/read-view-public.js` and `js/read-only-view.js` |
| House dropdown, Dhafthar/Sinamale, Top Houses | `js/house-sync.js` |
| House/filter/scroll after save | `js/house-filter-lock.js` and `js/save-state-fix.js` |
| Stop old hotfix jumps/reloads | `js/no-jump-fixes.js` |
| Self-assign links | `js/assign-share.js` and `shared.html` |
| Voter card actions and visual cleanup | `js/pro-ui.js` and `css/voter-list-cards.css` |
| Popup card layout | `css/voter-popup-card.css` |

Do not add a second owner for save, filter, house grouping, voter-card rendering, or public gallery rendering. Update this README after important changes.

## Deployment

GitHub Pages deploys from `.github/workflows/pages.yml`. If GitHub shows `Deployment failed, try again later`, rerun the latest failed Pages job after one or two minutes.