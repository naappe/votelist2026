# Votelist 2026

Static GitHub Pages voter management app for Villimale campaign work. The app uses plain HTML, CSS, JavaScript, Supabase, and GitHub Pages.

## Stable Backup / Restore Point

A stable backup branch exists for quick restore:

```text
backup/stable-20260708-voters-fixed
```

Stable commit:

```text
91bf95d3fec0fd4282036acfafae078e65680442
```

Full restore notes are in:

```text
BACKUP-RESTORE.md
```

If a future change breaks the website, compare current `main` against that backup branch or restore damaged files from that branch. Do not delete Supabase data while restoring website code.

## Main Screens

| File | Purpose | Status |
|---|---|---|
| `index.html` | Entry / party selection page | Active |
| `login.html` | Login page | Active |
| `voters.html` | Main voter management workspace | Active |
| `ai-dashboard.html` | AI / information dashboard | Active |
| `dashboard.html` | Old dashboard URL | Redirects to `voters.html` |
| `shared.html` | No-login self-assign page for friends | Active |
| `safe-share.html` | Read-only safe share list | Active |
| `all-voters.html` | Old all-voters link | Redirects |
| `zero-day.html` | Old Zero Day page | Redirects |

## Current Structure

```text
votelist2026/
├── index.html
├── login.html
├── dashboard.html
├── voters.html
├── ai-dashboard.html
├── shared.html
├── safe-share.html
├── all-voters.html
├── zero-day.html
├── README.md
├── BACKUP-RESTORE.md
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
│   ├── voter-url-router.js
│   ├── voter-info-status.js
│   ├── voter-info-nav-fix.js
│   ├── dashboard-result-nav-fix.js
│   ├── ai-brain-live.js
│   ├── ai-dashboard-nav.js
│   ├── ai-chat.js
│   ├── modal-assignment-panel.js
│   ├── modal-phone-call.js
│   ├── vote-save-override.js
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
| `js/app.js` | Main logged-in app: auth, Supabase load, stats, filters, popup, and base rendering. |
| `js/config.js` | Supabase URL/key, table name, login users, shared-page helpers. |
| `js/voter-url-router.js` | Applies URL filters like `filter=assigned`, `filter=need-call`, and `house=...`. |
| `js/voter-info-status.js` | Builds the Voters page Information Status panel. |
| `js/voter-info-nav-fix.js` | Makes Voters page Information Status cards clickable and navigates to matching results. |
| `js/dashboard-result-nav-fix.js` | Makes AI Dashboard metric cards/insights clickable and navigates to matching Voters results. |
| `js/read-view-public.js` | Allows `view=read` links to pass the app auth check without username/password. |
| `js/read-only-view.js` | Owns public gallery rendering: photo, name, ID, house, and mobile only. |
| `js/modal-assignment-panel.js` | Adds the Assign this voter section to the main popup and saves manual assignee names without auto-stamping the admin email. |
| `js/modal-phone-call.js` | Converts the phone number in the voter popup header into a `tel:` link so mobile users can tap to call. |
| `js/vote-save-override.js` | Catches voter popup saves before `app.js` so the selected vote result wins; prevents Will Vote section from forcing `will-vote`, clears stale row cache, and preserves scroll. |
| `js/assign-share.js` | Creates short public self-assign links and safe read-only share links. |
| `shared.html` | Public self-assign page. Asks for assigner name only and shows assigned names under each voter. |
| `safe-share.html` | Read-only safe voter list. Shows photo, name, ID, address, and phone. |
| `js/assign-results.js` | Adds the admin-only `Assigned Results` button and renders assigned voters. |
| `js/assigned-person-filter.js` | Adds the Assigned Person dropdown inside Assigned Results so admins can identify who took which voters. |
| `js/ai-brain-live.js` | Live information status and AI metrics. |
| `js/ai-chat.js` | Floating AI chat/help panel. |
| `js/no-jump-fixes.js` | Prevents old save/reload behavior and keeps saves from jumping to the top. |
| `js/dashboard-cleanup.js` | UI polish, share selection tools, modal guard, and top-house helpers. |
| `js/d2d-count-fix.js` | Keeps D2D count labels aligned with D2D status. |
| `js/house-sync.js` | House dropdown, Dhafthar/Sinamale grouping, Top Houses. |
| `js/house-filter-lock.js` | Keeps selected house/search active while filtering or saving. |
| `js/pro-ui.js` | Clean card actions, Assign focus, View Profile button, visible meta cleanup. |
| `js/save-state-fix.js` | Preserves selected filter/search/house/scroll when lists rebuild. |
| `js/voter-card-statuses.js` | Voter card status display cleanup. |

## Important Current Behavior

| Feature | Rule |
|---|---|
| Primary workspace | Use `voters.html`. `dashboard.html` redirects there and keeps query parameters. |
| Information Status cards | Clicking Visible, Need Call, Will Vote, or Assigned opens the matching result list. |
| AI Dashboard cards | Clicking dashboard metrics/insights navigates to matching Voters results. |
| Voter popup | Card clicks open the main app popup with photo/status blocks. `modal-assignment-panel.js` adds the assignment field inside that same popup. |
| Tap to call | In the voter popup, tapping the phone number opens the mobile phone dialer through `tel:+960...`. |
| Vote save | `vote-save-override.js` makes the selected vote result win, so saving Not Vote from Will Vote does not get forced back to Will Vote. |
| Assigned Results | Admin can click `Assigned Results`, then filter by Assigned Person to identify who assigned each voter. |
| System email cleanup | `naappe@gmail.com` is treated as a system/default value and should not appear as a real assignee. |
| Share Read View | Opens with `view=read`, requires no username/password, and renders a public gallery. |
| Safe share | `safe-share.html` is read-only and shows photo, name, ID, address, and phone. |
| Self-assign link | `shared.html` asks only for assigner name. No mobile number is required. |
| Multiple assigners | If two people assign the same voter, both names should show under that voter. |
| Save from middle of list | Must not refresh the page or jump to the top. |
| House filter | Must stay selected after saving or changing voter status. |
| Dhafthar/Sinamale | House grouping belongs to `house-sync.js`. |

## Supabase Access Notes

| Item | Current Setup |
|---|---|
| Project | `espezmdpkoixnfchomqb` / `voters` |
| Main table | `public.full_import` |
| Share table | `assignment_shares` |
| RLS | Enabled |
| Assignment result columns | `vote_assigned_by` and `vote_assigned_at` in `public.full_import`. |
| Public visible fields | `photo_url`, `name`, `national_id`, `house`, `phone`. |
| Hidden from safe public UI | Party, campaign statuses, support level, remarks, and admin save fields. |
| Public assignment save | Allowed only via `public.claim_assignment(...)` and `public.unclaim_assignment(...)`. |

## AI Fast-Read Instructions

For any future AI/helper:

1. Read `BACKUP-RESTORE.md` first.
2. Read this `README.md` second.
3. Use the file ownership table above before editing.
4. Do not create duplicate logic for the same feature unless the current owner file is broken and the change is documented.
5. Do not delete Supabase rows while fixing frontend code.
6. If a mistake happens, restore from `backup/stable-20260708-voters-fixed` or commit `91bf95d3fec0fd4282036acfafae078e65680442`.

## Update Log

| Date | Update |
|---|---|
| 2026-07-08 | Created stable backup branch `backup/stable-20260708-voters-fixed` at commit `91bf95d3fec0fd4282036acfafae078e65680442`. |
| 2026-07-08 | Added `BACKUP-RESTORE.md` with restore instructions for future AI/developer use. |
| 2026-07-08 | Added `js/voter-info-nav-fix.js` so Voters page Information Status cards navigate to matching results. |
| 2026-07-08 | Added `js/dashboard-result-nav-fix.js` so AI Dashboard metrics navigate to matching result lists. |
| 2026-07-08 | Updated `shared.html` so self-assign asks for name only and shows multiple assigner names under each voter. |
| 2026-07-08 | Updated `safe-share.html` so read-only safe share can show photos when the payload contains photo URLs. |
| 2026-07-06 | Added `js/modal-phone-call.js` so tapping the voter popup phone number opens the mobile dialer. |
| 2026-07-06 | Added `js/vote-save-override.js` and loaded it before `app.js` so selected vote results save correctly from any section and stale row cache is cleared. |
| 2026-07-06 | Corrected Hussain Zahir in Supabase from Will Vote/Pending display to `no-vote`, `reached`, and `follow-up`. |
| 2026-07-06 | Added `js/modal-assignment-panel.js` so the main popup has an Assign this voter section without bringing back the old popup. |
| 2026-07-06 | Made `voters.html` the primary workspace, removed the Dashboard nav button, and changed `dashboard.html` into a redirect to Voters. |
| 2026-07-06 | Added `js/assigned-person-filter.js` so Assigned Results can be filtered by assigned person/team. |
| 2026-07-06 | Added Supabase protection so `naappe@gmail.com` is cleaned from assignment results and not treated as a real assignee. |
| 2026-07-06 | Added public self-assign flow with short links, name validation, tick/untick, and privacy rules. |
| 2026-07-05 | Organized CSS into `css/` and JavaScript into `js/`. |

## Rules For Future Updates

| Feature Area | Put Logic Here |
|---|---|
| Main data, stats, filters, and popup status blocks | `js/app.js` |
| Voters page Information Status panel | `js/voter-info-status.js` |
| Voters page Information Status result navigation | `js/voter-info-nav-fix.js` |
| AI Dashboard result navigation | `js/dashboard-result-nav-fix.js` |
| Popup assignment field/manual assignee save | `js/modal-assignment-panel.js` |
| Popup tap-to-call phone link | `js/modal-phone-call.js` |
| Correct vote save override | `js/vote-save-override.js` |
| Public read-only links | `js/read-view-public.js`, `js/read-only-view.js`, and `safe-share.html` |
| Admin assignment results | `js/assign-results.js` and `js/assigned-person-filter.js` |
| House dropdown, Dhafthar/Sinamale, Top Houses | `js/house-sync.js` |
| House/filter/scroll after save | `js/house-filter-lock.js` and `js/save-state-fix.js` |
| Self-assign links | `js/assign-share.js` and `shared.html` |
| Voter card actions and visual cleanup | `js/pro-ui.js` and `css/voter-list-cards.css` |
| Popup card layout | `css/voter-popup-card.css` |

Do not add a second owner for save, filter, house grouping, voter-card rendering, public gallery rendering, assigned result rendering, vote-result saving, or popup phone links.

## Deployment

GitHub Pages deploys from `.github/workflows/pages.yml`. If GitHub shows `Deployment failed, try again later`, rerun the latest failed Pages job after one or two minutes.
