# AI-BRAIN.md — Votelist 2026 Project Brain

This file is the fast-read project brain for AI Host, ChatGPT, Codex, or any developer working on this repository.

Last updated: 2026-07-08

## Core Identity

| Item | Value |
|---|---|
| Project | Votelist 2026 / Villimale Campaign Manager |
| Repo | `naappe/votelist2026` |
| Public site | `https://naappe.github.io/votelist2026/` |
| Hosting | GitHub Pages |
| Backend | Supabase PostgreSQL |
| App type | Static HTML/CSS/JavaScript, no server runtime |

## Restore First

Stable backup branch:

```text
backup/stable-20260708-voters-fixed
```

Stable commit:

```text
91bf95d3fec0fd4282036acfafae078e65680442
```

Restore instructions:

```text
BACKUP-RESTORE.md
```

Important rule: restoring frontend files must not delete or overwrite Supabase voter data.

## Architecture

```text
GitHub Pages static frontend
        ↓
HTML/CSS/JavaScript in browser
        ↓
Supabase client from js/config.js
        ↓
public.full_import + assignment_shares + RPC functions
```

## Active Pages

| Page | Role |
|---|---|
| `index.html` | Entry / party selection |
| `login.html` | Authentication page |
| `voters.html` | Main workspace and primary app |
| `ai-dashboard.html` | AI metrics and insights dashboard |
| `dashboard.html` | Legacy redirect to `voters.html` |
| `shared.html` | Public self-assign page |
| `safe-share.html` | Public read-only safe voter list |
| `all-voters.html` | Legacy redirect |
| `zero-day.html` | Legacy redirect |

## Database

### Main table

```text
public.full_import
```

Important fields:

| Field | Meaning |
|---|---|
| `id` | Internal row id |
| `image_number` | Voter image/list reference |
| `photo_url` | Voter photo URL |
| `name` | Voter name |
| `national_id` | National ID |
| `house` | House/address |
| `lives_in` | Location note |
| `phone` | Phone number |
| `party` | PNC / MDP / other scope |
| `election_box` | Polling box |
| `phone_status` | need-call / called / no-phone / busy / wrong-number etc. |
| `reach_status` | reached / not-reached |
| `vote_status` | pending / will-vote / no-vote / not-decided |
| `transport_status` | need-transport / arranged / picked-up / not-needed |
| `d2d_status` | follow-up / visited / not-home / not-visited |
| `support_level` | guaranteed / normal etc. |
| `remarks` | Campaign notes |
| `vote_assigned_by` | Names of assigned people |
| `vote_assigned_at` | Assignment timestamp |

### Share table

```text
assignment_shares
```

| Field | Meaning |
|---|---|
| `token` | Short public share token |
| `payload` | JSON voter payload for share page |

### RPC functions

```text
claim_assignment(p_token, p_voter_row_id, p_assignee_name, p_assignee_phone)
unclaim_assignment(p_token, p_voter_row_id, p_assignee_phone)
```

Current frontend rule: public self-assign asks for **name only**. No mobile number is required.

## Script Ownership

| File | Owner responsibility |
|---|---|
| `js/config.js` | Supabase credentials and app config |
| `js/app.js` | Main app: auth, Supabase load, render voters, filters, popup, saves |
| `js/voter-url-router.js` | URL filter parser and special route filters |
| `js/voter-info-status.js` | Builds Information Status panel on Voters page |
| `js/voter-info-nav-fix.js` | Makes Information Status cards clickable |
| `js/dashboard-result-nav-fix.js` | Makes AI Dashboard result cards clickable |
| `js/assign-share.js` | Creates safe-share and self-assign links |
| `shared.html` | Self-assign page UI and public assignment save |
| `safe-share.html` | Safe read-only public list |
| `js/assign-results.js` | Admin assigned result view |
| `js/assigned-person-filter.js` | Filter assigned results by assigned person |
| `js/modal-assignment-panel.js` | Manual assignment inside voter popup |
| `js/modal-phone-call.js` | Tap phone number to call |
| `js/vote-save-override.js` | Ensures selected vote status saves correctly |
| `js/house-sync.js` | House dropdown, grouping, top houses |
| `js/house-filter-lock.js` | Keeps house/search/filter after save |
| `js/save-state-fix.js` | Preserves scroll/filter state |
| `js/ai-brain-live.js` | AI live metrics and information dashboard values |
| `js/ai-dashboard-nav.js` | AI Dashboard navigation helper |
| `js/ai-chat.js` | Floating AI Host chat |

## Current Expected Behavior

1. `voters.html` is the main work page.
2. Information Status cards on `voters.html` must be clickable.
3. Clicking Visible, Need Call, Will Vote, or Assigned must show the matching voter result list.
4. AI Dashboard cards must also navigate to matching voter result lists.
5. `shared.html` must ask assigner name only.
6. If two people assign the same voter, both names must show under the voter.
7. `safe-share.html` must be read-only and show photo/name/ID/address/phone only.
8. If safe-share shows initials instead of photo, likely causes are missing `photo` in payload, empty `photo_url`, private image URL, or broken URL.
9. `naappe@gmail.com` is system/default data and must not show as a real assigned person.
10. Save actions must not jump to top or refresh unnecessarily.

## Public Privacy Rules

| Page | Allowed | Not allowed |
|---|---|---|
| `safe-share.html` | photo, name, ID, address, phone | party, status, remarks, edit fields |
| `shared.html` | voter details, checkbox, assigned names | admin save controls and private remarks |
| `view=read` mode | public voter details | campaign private fields |

## Known Recent Fixes

| Date | Fix |
|---|---|
| 2026-07-08 | Added backup branch and restore doc |
| 2026-07-08 | Added full README database/hosting map |
| 2026-07-08 | Updated `AI-BRAIN.md` |
| 2026-07-08 | Fixed self-assign to name-only |
| 2026-07-08 | Fixed multiple assigned names display |
| 2026-07-08 | Fixed safe-share photo support when payload has photo |
| 2026-07-08 | Fixed AI Dashboard result card navigation |
| 2026-07-08 | Fixed Voters page Information Status click handler and cache busting |

## Debug Checklist

### Voters page status cards not clicking

Check:

1. `voters.html` loads latest `js/voter-info-status.js` and `js/voter-info-nav-fix.js` cache versions.
2. `js/voter-info-status.js` outputs buttons with `data-info-filter`.
3. `js/voter-info-nav-fix.js` catches `[data-info-filter]` and applies filters.
4. Mobile browser may need tab close/reopen after deploy.

### Safe-share image not showing

Check:

1. Existing token may be old and missing `photo`.
2. New token should include `photo` from `photo_url`.
3. `safe-share.html` must render `photo` or `photo_url`.
4. If initials show, inspect `assignment_shares.payload` for photo field.

### Multiple assigners not showing

Check:

1. `shared.html` refreshes `vote_assigned_by` from `public.full_import`.
2. RPC appends name rather than replacing previous names.
3. UI displays assigned names under `.assigners`.

## AI Host Mission

AI Host should act as first checker inside the website. It should be able to answer:

- What is the main database table?
- What is the backup branch?
- Which file controls self-assign?
- Which file controls status card clicks?
- Why is safe-share photo not showing?
- Who assigned voters?
- What should be restored if a mistaken change breaks the site?

If AI Host cannot answer these, update `js/ai-chat.js` using this file as the source of truth.
