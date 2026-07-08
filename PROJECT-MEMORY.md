# PROJECT MEMORY — Votelist 2026

This file is the memory document for future AI/developer work on `naappe/votelist2026`.

Do not copy all voter personal data into GitHub. The real data must stay in Supabase. This file records structure, fields, rules, and current logic so the project can be continued without confusion.

---

## 1. Project Identity

| Item | Value |
|---|---|
| Repo | `naappe/votelist2026` |
| Live site | `https://naappe.github.io/votelist2026/` |
| Hosting | GitHub Pages |
| Backend | Supabase |
| Supabase project ref | `espezmdpkoixnfchomqb` |
| Main table | `public.campaign` |
| Current main page | `residents.html` |
| Current main JS | `js/residents-loader.js` |
| Current CSS | `css/residents-simple.css` |

---

## 2. Current Page System

The system was simplified because old files had duplicate scripts, old login checks, and conflicting functions.

Current rule:

```text
index.html -> residents.html -> public.campaign
```

Old pages should not run their old code anymore. They redirect into `residents.html`.

| Old file | Redirect target |
|---|---|
| `voters.html` | `residents.html?section=residents` |
| `dashboard.html` | `residents.html` |
| `all-voters.html` | `residents.html?party=ALL` |
| `assign.html` | `residents.html?section=assign` |
| `call.html` | `residents.html?section=calls` |
| `vote.html` | `residents.html?section=votes` |
| `d2d.html` | `residents.html?section=visits` |
| `transport.html` | `residents.html?section=transport` |
| `ai-dashboard.html` | `residents.html?section=insights` |
| `zero-day.html` | `residents.html` |

`safe-share.html` and `shared.html` are separate public share pages and should stay separate.

---

## 3. Party / User Scope

Current URL party scopes:

```text
party=PNC
party=MDP
party=ALL
```

Known Supabase Auth users:

| Username / Role | Email | Scope |
|---|---|---|
| admin | `naappe@gmail.com` | ALL/admin |
| pnc2026 | `pnc2026@gmail.com` | PNC |
| mdp2026 | `mdp2026@gmail.com` | MDP |

The current clean page has no login. It uses the `party` URL parameter to filter the rows.

---

## 4. Current Navigation

`residents.html` has:

```html
<nav id="nav" class="nav"></nav>
```

`js/residents-loader.js` generates the nav.

| Label | Target |
|---|---|
| Residents | `residents.html?party={party}&section=voters` |
| Assign | `residents.html?party={party}&section=assign` |
| Calls | `residents.html?party={party}&section=calls` |
| Votes | `residents.html?party={party}&section=votes` |
| Visits | `residents.html?party={party}&section=visits` |
| Transport | `residents.html?party={party}&section=transport` |
| Insights | `residents.html?party={party}&section=insights` |
| Logout | `index.html` |

Active section is read from URL `section=`.

---

## 5. Main Supabase Table: `public.campaign`

Important columns:

| Column | Purpose |
|---|---|
| `id` | Primary key. Used for save/update. |
| `photo_url` | Resident/voter photo URL. |
| `name` | Name. |
| `national_id` | ID card number. |
| `house` | House/address. |
| `lives_in` | Living location note. |
| `phone` | Phone number. |
| `sex` | `M` / `F`. |
| `age` | Age. |
| `party` | PNC / MDP / other. |
| `image_number` | Original image/reference number. |
| `vote_status` | Vote result. |
| `phone_status` | Call result. |
| `reach_status` | Reached or not reached. |
| `d2d_status` | Visit status. |
| `transport_status` | Transport status. |
| `support_level` | Support confidence. |
| `remarks` | Notes. |
| `vote_assigned_by` | Assignment person/name(s). |
| `vote_assigned_at` | Assignment timestamp. |
| `election_box` | Election box. |
| `area` | Area. |

---

## 6. Valid Status Values

Use only these values. Invalid values can cause Supabase save errors because of CHECK constraints.

### Vote Status

```text
pending
will-vote
no-vote
not-decided
```

### Phone Status

```text
need-call
called
busy
switched-off
disconnected
wrong-number
out-of-range
no-phone
```

### Reach Status

```text
not-reached
reached
```

### D2D / Visits

```text
not-visited
visited
not-home
follow-up
```

### Transport

```text
not-needed
need-transport
arranged
picked-up
```

### Support Level

```text
normal
guaranteed
```

---

## 7. Current Counts Remembered

Counts from current working screenshots / checks:

```text
Total Supabase campaign rows: 3264
PNC rows: 420
MDP rows: 457
```

PNC screenshot after updates:

```text
Total Residents: 420
Will Vote: 92
Not Vote: 1
Need Call / Visit: 355
```

These counts can change as the campaign team updates the database.

---

## 8. Assignment People / Assignment Data

Assignment data should stay in Supabase, not copied fully into GitHub.

Important assignment fields:

```text
vote_assigned_by
vote_assigned_at
```

Public assignment pages:

| File | Purpose |
|---|---|
| `shared.html` | Public self-assign page. User writes their name and assigns themselves. |
| `safe-share.html` | Public read-only voter list. No edit fields. |

Share table:

```text
assignment_shares
```

Important public assignment RPC/functions:

```text
claim_assignment(p_token, p_voter_row_id, p_assignee_name, p_assignee_phone)
unclaim_assignment(p_token, p_voter_row_id, p_assignee_phone)
get_assignment_share(p_token)
```

Rules:

1. Assignment people are names written by users.
2. More than one person may be assigned to one voter.
3. `naappe@gmail.com` should not be treated as a real assignee in public assignment lists.
4. Assignment save should not scroll the page to the top.
5. Shared/public assignment links should not expose admin-only controls.
6. Safe share should show only photo, name, ID, house/address, and phone.

---

## 9. Current Main Functions in `js/residents-loader.js`

### Load Rows

Loads from:

```text
public.campaign
```

Uses URL party filter:

```text
PNC -> only party PNC
MDP -> only party MDP
ALL -> all rows
```

Uses range/pagination so it can load more than 1000 rows.

### Build Navigation

Creates nav buttons inside:

```html
<nav id="nav"></nav>
```

### Stats

Shows:

```text
Total Residents
Will Vote
Not Vote
Reached Pending
Need Call / Visit
```

### Clickable Stats

Clicking stat cards filters the list.

### Search

Searches:

```text
name
national_id
house
phone
party
election_box
remarks
```

### House Filter

Builds dropdown from loaded `house` values.

### Edit Modal

Click resident card to edit:

```text
vote_status
phone_status
reach_status
d2d_status
transport_status
support_level
remarks
```

### Save Update

Writes to:

```text
public.campaign
```

Auto status logic:

```text
will-vote -> reached
no-vote -> reached
guaranteed -> reached
called -> reached
```

---

## 10. Supabase RLS / Permissions Memory

Current needed behavior:

```text
SELECT: public read for current app
UPDATE: working fields update from current app
```

Working update columns:

```text
vote_status
phone_status
reach_status
d2d_status
transport_status
remarks
support_level
vote_assigned_by
vote_assigned_at
```

Security note:

Because login was removed, public users with the link can update allowed working fields. If security becomes more important, restore login and authenticated RLS.

---

## 11. Common Errors and Causes

### Data not loading

Possible causes:

```text
js/config.js not loading
Supabase CDN blocked/not loaded
wrong table name
RLS SELECT policy blocked
browser cache loading old JS
```

### Stats show but click does nothing

Cause:

```text
Stats are only visual unless click handlers are bound in residents-loader.js.
```

### Save fails

Possible causes:

```text
UPDATE policy blocked
invalid CHECK value
wrong column name
cached old JS using old values like pending for d2d_status or none for transport_status
```

### Old page appears

Cause:

```text
Legacy route did not redirect or cache opened old HTML.
```

### Page works on direct link but not root

Check:

```text
index.html links
GitHub Pages deployment delay
browser cache
```

---

## 12. Debug Console Memory

Paste this in browser Console on `residents.html`:

```js
(async function () {
  console.clear();
  const params = new URLSearchParams(location.search);
  const party = (params.get('party') || 'PNC').toUpperCase();
  const cfg = window.APP_CONFIG || {};
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  console.log('URL:', location.href);
  console.log('APP_CONFIG exists:', !!window.APP_CONFIG);
  console.log('Supabase exists:', !!window.supabase);
  console.log('Nav:', document.getElementById('nav')?.innerHTML);
  console.log('Cards:', document.querySelectorAll('.resident-card').length);
  console.log('Edit modal:', !!document.getElementById('editModal'));

  const read = await client
    .from('campaign')
    .select('id,name,party,vote_status,phone_status,reach_status')
    .eq('party', party)
    .limit(5);

  console.log('Read error:', read.error);
  console.table(read.data);
})();
```

Expected:

```text
APP_CONFIG exists: true
Supabase exists: true
Cards: more than 0
Edit modal: true
Read error: null
```

---

## 13. Test Links

```text
Home:
https://naappe.github.io/votelist2026/

PNC:
https://naappe.github.io/votelist2026/residents.html?party=PNC&section=voters&v=filter1

MDP:
https://naappe.github.io/votelist2026/residents.html?party=MDP&section=voters&v=filter1

ALL/Admin:
https://naappe.github.io/votelist2026/residents.html?party=ALL&section=voters&v=filter1
```

---

## 14. Developer Rules

1. Do not copy all voter personal data into GitHub.
2. Keep real campaign data in Supabase.
3. Keep `residents.html` as the main app page.
4. Keep old files as redirects unless rebuilding intentionally.
5. Use only allowed status values.
6. Avoid reintroducing old login/dashboard scripts into `residents.html`.
7. Update `README.md` and this file after structural changes.
8. Check `public.campaign` schema before adding save fields.

---

## 15. Quick Summary

Current clean architecture:

```text
GitHub Pages
  index.html
    -> residents.html
        -> js/config.js
        -> js/residents-loader.js
        -> Supabase public.campaign
```

Current project memory:

```text
The app is now a single clean residents system with party/section URL parameters.
Assignment people and voter data live in Supabase.
README.md and PROJECT-MEMORY.md document how to continue safely.
```
