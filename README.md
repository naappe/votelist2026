# Votelist 2026

Static GitHub Pages voter management app for Villimale campaign work.

This README is the fast-read file for any AI/developer. It documents hosting files, Supabase database, RPC/functions, restore point, and active frontend scripts.

## 1. Stable Backup / Restore Point

Stable backup branch:

```text
backup/stable-20260708-voters-fixed
```

Stable commit:

```text
91bf95d3fec0fd4282036acfafae078e65680442
```

Restore guide:

```text
BACKUP-RESTORE.md
```

If the website is damaged, restore broken files from the backup branch. Do not delete or overwrite Supabase voter data during frontend restore.

## 2. Hosting

| Item | Value |
|---|---|
| Host | GitHub Pages |
| Repository | `naappe/votelist2026` |
| Public URL | `https://naappe.github.io/votelist2026/` |
| Deploy workflow | `.github/workflows/pages.yml` |
| App type | Static HTML/CSS/JavaScript |
| Backend | Supabase |

There is no Node/Python server in this repo. All pages run in the browser.

## 3. Main Website Files

| File | Purpose |
|---|---|
| `index.html` | Entry / party selection |
| `login.html` | Login page |
| `voters.html` | Main voter management workspace |
| `ai-dashboard.html` | AI information dashboard |
| `dashboard.html` | Old dashboard route, redirects to voters |
| `shared.html` | Public self-assign page |
| `safe-share.html` | Public read-only safe voter list |
| `all-voters.html` | Old route / redirect |
| `zero-day.html` | Old route / redirect |

## 4. Supabase Database

| Item | Current Setup |
|---|---|
| Supabase project ref | `espezmdpkoixnfchomqb` |
| Project label | `voters` |
| Main voter table | `public.full_import` |
| Share table | `assignment_shares` |
| RLS | Enabled |
| Frontend config | `js/config.js` |

### Main table: `public.full_import`

Important columns used by the frontend:

| Column | Purpose |
|---|---|
| `id` | Internal row id used for updates and assignment |
| `image_number` | Voter list image/reference number |
| `photo_url` | Voter photo URL |
| `name` | Voter name |
| `national_id` | National ID |
| `house` | House/address |
| `lives_in` | Lives-in/location note |
| `phone` | Phone number |
| `party` | Party scope such as PNC / MDP |
| `election_box` | Election box |
| `phone_status` | need-call, called, no-phone, busy, wrong-number, etc. |
| `reach_status` | reached / not-reached |
| `vote_status` | pending / will-vote / no-vote / not-decided |
| `transport_status` | need-transport / arranged / picked-up / not-needed |
| `d2d_status` | follow-up / visited / not-home / not-visited |
| `remarks` | Campaign notes |
| `support_level` | guaranteed / normal etc. |
| `vote_assigned_by` | Names of people assigned to the voter |
| `vote_assigned_at` | Assignment timestamp |

### Share table: `assignment_shares`

Used for short share links.

| Column | Purpose |
|---|---|
| `token` | Short token used in URL query `?s=...` |
| `payload` | JSON payload containing selected voter details |

### RPC/functions used by public assignment page

| Function | Purpose |
|---|---|
| `claim_assignment(p_token, p_voter_row_id, p_assignee_name, p_assignee_phone)` | Adds an assignee to a voter from public self-assign page |
| `unclaim_assignment(p_token, p_voter_row_id, p_assignee_phone)` | Removes the current user's assignment |

Current frontend passes the assigner name and uses the name as the identity key. Public self-assign asks for **name only**, no mobile number.

## 5. Public Privacy Rules

| Page | Shows | Does not show |
|---|---|---|
| `safe-share.html` | photo, name, ID, address, phone | party, statuses, remarks, edit buttons |
| `shared.html` | voter details + assigned names + tick box | admin controls, remarks, campaign edit fields |
| `view=read` public mode | photo, name, ID, house, mobile | status, remarks, assignment edit fields |

## 6. Active JavaScript Files

| File | Responsibility |
|---|---|
| `js/config.js` | Supabase URL/key, table name, app config |
| `js/app.js` | Main app: auth, load voters, render cards, filters, popup, status saves |
| `js/voter-url-router.js` | Applies URL filters like `filter=assigned`, `filter=need-call`, `house=...` |
| `js/voter-info-status.js` | Builds Voters page Information Status panel |
| `js/voter-info-nav-fix.js` | Makes Voters page Information Status cards clickable |
| `js/dashboard-result-nav-fix.js` | Makes AI Dashboard result cards clickable |
| `js/assign-share.js` | Creates self-assign links and safe-share links |
| `shared.html` | Owns public self-assign UI and save behavior |
| `safe-share.html` | Owns safe read-only share UI |
| `js/assign-results.js` | Admin Assigned Results view |
| `js/assigned-person-filter.js` | Filter Assigned Results by person |
| `js/modal-assignment-panel.js` | Manual assignment section inside voter popup |
| `js/modal-phone-call.js` | Tap phone in modal to call |
| `js/vote-save-override.js` | Ensures selected vote result saves correctly |
| `js/ai-brain-live.js` | AI/information status metrics |
| `js/ai-dashboard-nav.js` | Dashboard navigation helpers |
| `js/ai-chat.js` | Floating AI help/chat |
| `js/read-view-public.js` | Allows public read links to bypass login |
| `js/read-only-view.js` | Public read-only gallery renderer |
| `js/house-sync.js` | House dropdown, Dhafthar/Sinamale grouping, top houses |
| `js/house-filter-lock.js` | Keeps house/search/filter after saves |
| `js/save-state-fix.js` | Preserves scroll/filter state |
| `js/pro-ui.js` | Card action/UI cleanup |
| `js/dashboard-cleanup.js` | UI cleanup and share tools |

## 7. Current Behavior

| Feature | Rule |
|---|---|
| Primary workspace | `voters.html` |
| Information Status cards | Clicking Visible, Need Call, Will Vote, Assigned opens matching results |
| AI Dashboard cards | Clicking dashboard metrics opens matching voter result list |
| Self-assign link | Created from selected voters; public user writes name only |
| Multiple assigners | If two people assign same voter, both names should show under that voter |
| Assigned Results | Admin can see who assigned voters and filter by assigned person |
| Photos in safe share | Shows image only when `photo` exists in payload or `photo_url` is available |
| Save behavior | Must not reload page or jump to top |
| System/default assignee | `naappe@gmail.com` is not treated as a real assignee |

## 8. Rules For Future AI/Developer Updates

1. Read `BACKUP-RESTORE.md` first.
2. Read this README second.
3. Do not create duplicate logic if an active script already owns the feature.
4. Do not delete Supabase data while fixing website code.
5. Do not expose private campaign fields in safe/public pages.
6. If a change breaks the site, restore from `backup/stable-20260708-voters-fixed`.
7. After changing hosting files, update this README if database, scripts, pages, or restore point changed.

## 9. Deployment Notes

GitHub Pages deploys from:

```text
.github/workflows/pages.yml
```

After a commit, wait 1–2 minutes and refresh the website. Browser cache may need a hard refresh on mobile.

## 10. Latest Important Updates

| Date | Update |
|---|---|
| 2026-07-08 | Created backup branch `backup/stable-20260708-voters-fixed`. |
| 2026-07-08 | Added `BACKUP-RESTORE.md`. |
| 2026-07-08 | Added Voters page result navigation. |
| 2026-07-08 | Added AI Dashboard result navigation. |
| 2026-07-08 | Updated `shared.html` so self-assign asks for name only and shows multiple assigner names. |
| 2026-07-08 | Updated `safe-share.html` so safe share can show voter photos when available. |
